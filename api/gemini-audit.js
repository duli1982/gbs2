// Vercel Serverless Function: Gemini API for AI Skills Audit Enhancement
// Expects POST JSON: { prompt, temperature, maxTokens }
// Returns: { text: string, response: string }

import { createHash } from 'crypto';

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map(); // key -> { value, expiresAt }
const inFlight = new Map(); // key -> Promise<string>

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 4; // per IP, per window (audit calls are heavier)
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
  const stable = JSON.stringify({
    model,
    prompt: fields.prompt || '',
    temperature: fields.temperature,
    maxTokens: fields.maxTokens,
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

export default async function handler(req, res) {
  // CORS (restricted to same-origin by default; configurable via ALLOWED_ORIGINS)
  const origin = getRequestOrigin(req);
  if (origin && isAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      prompt = '',
      temperature = 0.7,
      maxTokens = 2000,
      model: modelOverride,
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const primaryModel = (modelOverride || process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
    const extraFallbackModels = parseList(process.env.GEMINI_FALLBACK_MODELS);
    const modelsToTry = Array.from(
      new Set([primaryModel, 'gemini-2.5-flash-lite', 'gemini-3-flash', ...extraFallbackModels])
    ).filter(Boolean);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens,
        // Encourage strict JSON outputs (the client-side parsers expect JSON).
        responseMimeType: 'application/json',
      },
    };

    let lastError = null;

    for (const model of modelsToTry) {
      const remaining = getCooldownRemainingSeconds(model);
      if (remaining > 0) {
        lastError = Object.assign(new Error(`Model ${model} is in cooldown`), { status: 429, retryAfterSeconds: remaining });
        continue;
      }

      const cacheKey = makeCacheKey(model, { prompt, temperature, maxTokens });

      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ text: cached, response: cached });
      }

      const existing = inFlight.get(cacheKey);
      if (existing) {
        const text = await existing;
        res.setHeader('X-Cache', 'COALESCED');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ text, response: text });
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const run = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for longer audit analysis
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
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!text) {
            const err = new Error('Empty response from Gemini');
            err.status = 502;
            throw err;
          }

          return text;
        } finally {
          clearTimeout(timeout);
        }
      })();

      inFlight.set(cacheKey, run);

      try {
        const text = await run;
        setCached(cacheKey, text);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Gemini-Model', model);
        return res.status(200).json({ text, response: text });
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

        console.error('Gemini API error:', err?.details ?? String(err));
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
    console.error('Gemini audit error:', err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}
