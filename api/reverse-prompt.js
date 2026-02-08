// Vercel Serverless Function: Reverse Prompt Generator via Google Gemini
// Expects POST JSON: { text, model? }
// Returns: { generated_prompt, reasoning, optimization_tips, examples, use_cases }

import { createHash } from 'crypto';

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise<any>

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6; // per IP, per window
const rateLimit = new Map(); // ip -> { count, resetAt }

const modelCooldownUntil = new Map(); // model -> epochMs

function parseList(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map((x) => x.trim()).filter(Boolean);
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
  const stable = JSON.stringify({ model, text: fields.text || '' });
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

  const forwardedHost = req.headers?.['x-forwarded-host'] ? String(req.headers['x-forwarded-host']) : '';
  const host = forwardedHost || (req.headers?.host ? String(req.headers.host) : '');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const { text = '', model: modelOverride } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const ip = getClientIp(req);
    const gate = checkRateLimit(ip);
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds: gate.retryAfterSeconds,
      });
    }

    const primaryModel = (modelOverride || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const extraFallbackModels = parseList(process.env.GEMINI_FALLBACK_MODELS);
    const modelsToTry = Array.from(
      new Set([primaryModel, 'gemini-2.5-flash-lite', 'gemini-3-flash', ...extraFallbackModels])
    ).filter(Boolean);

    // Instruct Gemini to return strict JSON we can parse server-side
    const instruction = `You are an expert in prompt engineering and reverse-prompt analysis.
Analyze the provided text and infer the high-quality prompt that could have produced it.
Explain your reasoning, provide prompt optimization tips, and suggest practical examples and use cases.

Return ONLY strict minified JSON (no markdown, no backticks) with these keys:
{
  "generated_prompt": string, // a single, polished prompt ready to paste
  "reasoning": string,        // concise explanation of how you inferred it
  "optimization_tips": string[], // 4-7 specific improvements to strengthen the prompt
  "examples": string[],          // 3-5 brief, concrete prompt examples in similar style
  "use_cases": string[]          // 4-7 situations where this prompt is useful
}

Guidelines:
- Include a clear role (e.g., "Act as …"), task, context, audience, tone, and output format in generated_prompt when appropriate.
- Keep reasoning short but insightful.
- Use simple strings in the arrays (no nested objects).
- Do not include any text before or after the JSON.

Text to analyze:
---
${text}
---`;

    const payload = {
      contents: [
        { role: 'user', parts: [{ text: instruction }] },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 800,
      },
    };

    let lastError = null;

    for (const model of modelsToTry) {
      const remaining = getCooldownRemainingSeconds(model);
      if (remaining > 0) {
        lastError = Object.assign(new Error(`Model ${model} is in cooldown`), { status: 429, retryAfterSeconds: remaining });
        continue;
      }

      const cacheKey = makeCacheKey(model, { text });
      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json(cached);
      }

      const existing = inFlight.get(cacheKey);
      if (existing) {
        const result = await existing;
        res.setHeader('X-Cache', 'COALESCED');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json(result);
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const run = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
          let textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!textOut) {
            const err = new Error('Empty response from Gemini');
            err.status = 502;
            throw err;
          }

          // Strip potential code fences and parse JSON safely
          textOut = textOut.replace(/```json|```/g, '').trim();
          let parsed;
          try {
            parsed = JSON.parse(textOut);
          } catch {
            const err = new Error('Invalid JSON from Gemini');
            err.status = 502;
            err.details = textOut;
            throw err;
          }

          const {
            generated_prompt = '',
            reasoning = '',
            optimization_tips = [],
            examples = [],
            use_cases = [],
          } = parsed || {};

          return { generated_prompt, reasoning, optimization_tips, examples, use_cases };
        } finally {
          clearTimeout(timeout);
        }
      })();

      inFlight.set(cacheKey, run);

      try {
        const result = await run;
        setCached(cacheKey, result);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json(result);
      } catch (err) {
        lastError = err;
        const status = err?.status || 500;

        if (status === 429) {
          if (err?.retryAfterSeconds) setModelCooldownSeconds(model, err.retryAfterSeconds);
          continue;
        }

        if ((status === 404 || status === 400) && modelsToTry.length > 1) {
          continue;
        }

        const outwardStatus = status === 404 || status === 400 ? 502 : status;
        return res.status(outwardStatus).json({ error: 'Gemini API error', details: err?.details ?? String(err) });
      } finally {
        inFlight.delete(cacheKey);
      }
    }

    const status = lastError?.status || 500;
    if (status === 429) {
      const retryAfterSeconds = lastError?.retryAfterSeconds || 30;
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Gemini API rate-limited', retryAfterSeconds, details: lastError?.details ?? String(lastError) });
    }

    const outwardStatus = status === 404 || status === 400 ? 502 : status;
    return res.status(outwardStatus).json({ error: 'Gemini API error', details: lastError?.details ?? String(lastError) });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}
