// Vercel Serverless Function: Generate an improved "Gem" prompt via Google Gemini
// Expects POST JSON: { persona, task, context, audience, tone, format, seed }
// Returns: { gem: string }

import { createHash } from 'crypto';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise<string>

// Bump to invalidate cached gems when instruction changes.
const INSTRUCTION_VERSION = '2026-01-03-v3';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8; // per IP, per window
const rateLimit = new Map(); // ip -> { count, resetAt }

// Per-model cooldown: when Gemini returns 429 with retryDelay, pause requests for that model.
const modelCooldownUntil = new Map(); // model -> epochMs

function parseList(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function getRequestOrigin(req) {
  const origin = req.headers?.origin ? String(req.headers.origin) : '';
  if (origin) return origin;
  const referer = req.headers?.referer ? String(req.headers.referer) : '';
  if (!referer) return '';
  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

function isAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return false;

  const allowedOrigins = parseList(process.env.ALLOWED_ORIGINS);
  if (allowedOrigins.length) return allowedOrigins.includes(origin);

  // Default: allow only same-origin requests
  const forwardedHost = req.headers?.['x-forwarded-host'] ? String(req.headers['x-forwarded-host']) : '';
  const host = forwardedHost || (req.headers?.host ? String(req.headers.host) : '');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length) return String(xff[0]).trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const current = rateLimit.get(ip);
  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimit.set(ip, next);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count <= RATE_LIMIT_MAX) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { allowed: false, retryAfterSeconds };
}

function parseRetryAfterSeconds(detailsText) {
  try {
    const data = JSON.parse(detailsText);

    const stack = [data];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      if (typeof node === 'object') {
        if (typeof node.retryDelay === 'string') {
          const match = node.retryDelay.match(/(\d+)\s*s/i);
          if (match) return Number(match[1]);
        }
        for (const value of Object.values(node)) stack.push(value);
      }
    }
  } catch {
    // ignore
  }

  const match = String(detailsText || '').match(/"retryDelay"\s*:\s*"(\d+)\s*s"/i);
  if (match) return Number(match[1]);
  return null;
}

function getCooldownRemainingSeconds(model) {
  const until = modelCooldownUntil.get(model) || 0;
  const remainingMs = until - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

function setModelCooldownSeconds(model, seconds) {
  if (!seconds || seconds <= 0) return;
  modelCooldownUntil.set(model, Date.now() + seconds * 1000);
}

function makeCacheKey(model, fields) {
  const stable = JSON.stringify({
    v: INSTRUCTION_VERSION,
    model,
    persona: fields.persona || '',
    task: fields.task || '',
    context: fields.context || '',
    audience: fields.audience || '',
    tone: fields.tone || '',
    format: fields.format || '',
    seed: fields.seed || '',
  });
  return createHash('sha256').update(stable).digest('hex');
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size <= CACHE_MAX) return;
  const oldestKey = cache.keys().next().value;
  if (oldestKey) cache.delete(oldestKey);
}

function isLikelyIncompleteGem(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return true;

  // Our instruction requires an Inputs line and an Output Format block at the end.
  if (!/\bInputs\s*:/i.test(normalized)) return true;
  if (!/\bOutput\s*Format\s*:/i.test(normalized)) return true;

  // Common truncation patterns (ends mid-enumeration / mid-sentence).
  if (/\n\s*1\s*$/.test(normalized)) return true;
  if (/[,:;–-]\s*$/.test(normalized)) return true;

  const idx = normalized.toLowerCase().lastIndexOf('output format:');
  if (idx >= 0) {
    const tail = normalized.slice(idx);
    if (tail.length < 40) return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({
      error: 'Forbidden',
      details: 'Request origin not allowed. Please ensure you are accessing this from the correct domain.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Configuration error',
      details: 'GEMINI_API_KEY is not configured. Please contact support.'
    });
  }

  try {
    const ip = getClientIp(req);
    const gate = checkRateLimit(ip);
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds: gate.retryAfterSeconds,
      });
    }

    const {
      persona = '',
      task = '',
      context = '',
      audience = '',
      tone = '',
      format = '',
      seed = '',
      model: modelOverride,
    } = req.body || {};

    // Input validation: prevent extremely long inputs that could cause API errors
    const MAX_FIELD_LENGTH = 5000;
    const fields = { persona, task, context, audience, tone, format, seed };
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      if (typeof fieldValue === 'string' && fieldValue.length > MAX_FIELD_LENGTH) {
        return res.status(400).json({
          error: 'Input too long',
          details: `The "${fieldName}" field exceeds the maximum length of ${MAX_FIELD_LENGTH} characters (current: ${fieldValue.length}). Please shorten your input.`,
        });
      }
    }

    // Ensure at least task or persona is provided
    if (!task.trim() && !persona.trim()) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Please provide at least a "task" or "persona" field to generate a gem.',
      });
    }

    // Model selection:
    // - Primary model: request override -> GEMINI_MODEL -> gemini-2.5-flash
    // - Rate-limit fallbacks (ordered): gemini-2.5-flash-lite -> gemini-3-flash
    // - Optional extra fallbacks: GEMINI_FALLBACK_MODELS (comma-separated)
    const primaryModel = (modelOverride || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const extraFallbackModels = parseList(process.env.GEMINI_FALLBACK_MODELS);
    const modelsToTry = Array.from(
      new Set([primaryModel, 'gemini-2.5-flash-lite', 'gemini-3-flash', ...extraFallbackModels])
    ).filter(Boolean);

    // Build a structured instruction for Gemini to craft a CREATE-style, ready-to-use prompt (the "Gem")
    // Few-shot examples below help Gemini match the desired style and completeness.
    const instruction = `You are an expert prompt engineer for Google Gemini.
Craft a single, polished prompt (a "Gem") using the CREATE framework internally, but OUTPUT a clean, unified prompt WITHOUT any section labels (no Title/C/R/E/A/T/E labels). The result must be copy-ready, concise, and clearly structured so a user immediately sees value yet can edit easily.

Desired shape of the final text (no labels):
- Begin with a short, task-focused title line.
- Immediately follow with an instruction paragraph that includes the role ("Act as..."), context, and the core task.
- Provide 3–6 numbered constraints/steps (expectations) as a single list.
- Include an "Inputs" line/block that states exactly what the user must paste/provide (e.g., job role, JD, resumes, constraints).
- Include a single sentence clarifying the intended audience.
- Include one concise sentence for tone/style.
- End with an explicit Output Format block (Markdown headings + bullets OR a fenced code block with schema). The Output Format must be the LAST part of the prompt.

Rules:
- DO NOT include any explicit section labels like "Title", "C — Context", etc.
- Be directive and specific; avoid filler.
- Keep the total length focused; only expand if the Output Format needs it.
- If some fields are missing, infer ONLY structural defaults (e.g., scoring scale, headings). Do NOT invent domain requirements (must-have skills, years, location, industry, compliance constraints). Use placeholders like {{job_role}}, {{must_haves}}, {{location}} when details are missing.
- Do not add clarifying questions unless missing info prevents completing the task. If questions are necessary, ask at most 2, at the very top of the prompt.
- Avoid tables unless the user explicitly requests them; prefer headings + bullets or a fenced schema.
- If seed text is provided, harmonize phrasing and terminology with it.
- Return ONLY the final prompt text (no commentary, no alternatives).

Examples (study the pattern, then produce a similar result for the user's inputs):

EXAMPLE A: Boolean Search String Generator
Boolean Search String Generator
Act as an expert recruiter. Create an optimized Boolean search string to find qualified candidates for the specified role.
1) Include the core must-have skills and 3–5 related skills.
2) Add synonyms and common variants (but avoid irrelevant noise).
3) Exclude junior/irrelevant terms.
4) If location/radius is missing, use {{location}} and {{radius}} placeholders.
Inputs: {{job_role}}, {{must_haves}}, {{nice_to_haves}} (optional), {{location}} (optional), {{radius}} (optional), {{target_platform}} (optional).
Audience: Non-technical recruiters.
Tone: Professional and practical.
Output Format:
- Boolean String:
- Explanation (2–3 sentences):
- How to Adjust (3 bullets):

EXAMPLE B: Outreach Email
Outreach Email Draft
Act as a recruitment marketing specialist. Write a short outreach email for a passive candidate with a low-friction call-to-action.
1) Use placeholders ({{candidate_name}}, {{role_title}}, {{company_name}}, {{personal_hook}}).
2) Include 2-3 value propositions without exaggeration.
3) End with a 15-minute chat CTA and two scheduling options.
Inputs: {{candidate_name}}, {{role_title}}, {{company_name}}, {{personal_hook}}, {{value_props}} (optional), {{scheduling_link}} (optional).
Audience: Busy professionals reading on mobile.
Tone: Warm, respectful, non-salesy.
Output Format:
- Subject Line:
- Email Body (3 short paragraphs):

EXAMPLE C: Interview Questions + Rubric
Interview Questions + Rubric
Act as an I/O psychologist. Generate behavioral interview questions with follow-ups and a simple scoring rubric.
1) Use STAR prompts; ask for real past experiences (no hypotheticals).
2) Provide 2 follow-up probes per question.
3) Include a 1/3/5 scoring rubric with behavioral anchors.
Inputs: {{role_title}}, {{competencies}}, {{level}} (optional), {{team_context}} (optional).
Audience: Hiring managers with limited HR training.
Tone: Clear, neutral, and defensible.
Output Format:
- Questions (each):
  - Question:
  - Follow-ups (2):
  - Scoring (1/3/5 anchors):

Fields:
Persona: ${persona}
Task: ${task}
Context: ${context}
Audience: ${audience}
Tone: ${tone}
Output Format Preferences: ${format}

Seed prompt (optional): ${seed || ''}`;

    function buildPayload(instructionText) {
      return {
        contents: [
          {
            role: 'user',
            parts: [{ text: instructionText }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          // Gem output can be fairly long (title + instructions + constraints + output format)
          // Increased to 4000 to provide buffer for very complex prompts with extensive examples
          maxOutputTokens: 4000,
          // responseMimeType is not supported on all Gemini endpoints/models; omit for compatibility.
        },
      };
    }

    const payload = buildPayload(instruction);

    let lastError = null;

    for (const model of modelsToTry) {
      const remaining = getCooldownRemainingSeconds(model);
      if (remaining > 0) {
        lastError = Object.assign(new Error(`Model ${model} is in cooldown`), { status: 429, retryAfterSeconds: remaining });
        continue;
      }

      const cacheKey = makeCacheKey(model, { persona, task, context, audience, tone, format, seed });

      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ gem: cached });
      }

      const existing = inFlight.get(cacheKey);
      if (existing) {
        const gem = await existing;
        res.setHeader('X-Cache', 'COALESCED');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ gem });
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const run = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for complex gem generation
        try {
          async function callGemini(payloadToSend) {
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadToSend),
              signal: controller.signal,
            });

            if (!resp.ok) {
              const details = await resp.text();
              const retryAfterSeconds = resp.status === 429 ? parseRetryAfterSeconds(details) : null;
              const err = new Error(`Gemini API error (${resp.status})`);
              err.status = resp.status;
              err.details = details;
              err.retryAfterSeconds = retryAfterSeconds;
              throw err;
            }

            const data = await resp.json();
            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
              ? parts.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('')
              : (data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
            return String(text || '');
          }

          let text = await callGemini(payload);
          if (!text) {
            const err = new Error('Empty response from Gemini API. Please try again.');
            err.status = 502;
            err.details = 'The Gemini API returned an empty response. This may be a temporary issue. Please wait a moment and try generating the gem again.';
            throw err;
          }

          // Retry once if Gemini returned a clearly incomplete "Gem" (e.g., ends mid-list like "\n\n1").
          if (isLikelyIncompleteGem(text)) {
            const retryInstruction =
              `IMPORTANT: Your previous output was incomplete or cut off.\n` +
              `Regenerate the FULL final Gem from scratch. It MUST include an "Inputs:" line and MUST end with the "Output Format:" block as the LAST part of the prompt.\n` +
              `Do not end mid-sentence or mid-numbered list.\n\n` +
              instruction;
            const retryPayload = buildPayload(retryInstruction);
            const retryText = await callGemini(retryPayload);
            if (retryText && !isLikelyIncompleteGem(retryText)) {
              text = retryText;
            }
          }

          return text;
        } finally {
          clearTimeout(timeout);
        }
      })();

      inFlight.set(cacheKey, run);

      try {
        const gem = await run;
        setCached(cacheKey, gem);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ gem });
      } catch (err) {
        lastError = err;
        const status = err?.status || 500;

        // If Gemini tells us to back off, respect it for this model and try another model.
        if (status === 429) {
          if (err?.retryAfterSeconds) {
            setModelCooldownSeconds(model, err.retryAfterSeconds);
          }
          continue;
        }

        // If a fallback model isn't available/valid for this key, try the next one.
        if ((status === 404 || status === 400) && modelsToTry.length > 1) {
          continue;
        }

        // Non-rate-limit errors: return immediately.
        // Avoid returning 404/400 to the browser (it looks like the route is missing);
        // treat those as upstream/model issues instead.
        const outwardStatus = status === 404 || status === 400 ? 502 : status;
        const userFriendlyMessage = status === 404 || status === 400
          ? 'The AI model encountered an error. Please try again in a few moments.'
          : (status === 500
            ? 'An unexpected error occurred while generating the gem. Please try again.'
            : err?.details ?? String(err));

        return res.status(outwardStatus).json({
          error: 'Failed to generate gem',
          details: userFriendlyMessage,
        });
      } finally {
        inFlight.delete(cacheKey);
      }
    }

    // All models failed (likely due to rate limits/cooldowns).
    const status = lastError?.status || 500;
    if (status === 429) {
      const retryAfterSeconds = lastError?.retryAfterSeconds || 30;
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds,
        details: `The Gemini API is temporarily rate-limited. Please wait ${retryAfterSeconds} seconds and try again. If this persists, try again later.`,
      });
    }

    const outwardStatus = status === 404 || status === 400 ? 502 : status;
    const userFriendlyMessage = status === 404 || status === 400
      ? 'The AI model is temporarily unavailable. Please try again in a few moments.'
      : lastError?.details ?? String(lastError);

    return res.status(outwardStatus).json({
      error: 'Failed to generate gem',
      details: userFriendlyMessage,
    });
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || String(err).includes('abort');
    const userMessage = isTimeout
      ? 'The request took too long to complete. This may happen with very complex prompts. Please try again or simplify your input.'
      : 'An unexpected server error occurred. Please try again. If the problem persists, contact support.';

    return res.status(500).json({
      error: 'Server error',
      details: userMessage,
      technicalDetails: process.env.NODE_ENV === 'development' ? String(err) : undefined
    });
  }
}
