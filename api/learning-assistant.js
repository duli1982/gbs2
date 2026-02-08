// Vercel Serverless Function: Learning Assistant Chatbot via Gemini
// Supports:
// 1) Chat mode: { messages: [{ role, content }], context?: [{ title, url, snippet }], page?: { title, url } }
// 2) Direct mode (legacy): { message, context?: string, systemPrompt?: string, maxTokens?: number }

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;
const SEARCH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SEARCH_RATE_LIMIT_MAX = 20;
const rateLimit = new Map(); // key -> { count, resetAt }

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map(); // key -> { value, expiresAt }

const RETRIEVAL_SOURCE_LIMIT = 5;
const RETRIEVAL_SEARCH_CANDIDATE_LIMIT = 30;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
  'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'what', 'when',
  'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

const TERM_EXPANSIONS = {
  ai: ['artificial intelligence', 'genai', 'llm'],
  prompt: ['prompts', 'template', 'templates'],
  sourcing: ['source', 'boolean', 'talent search'],
  screen: ['screening', 'truth check', 'pre-hm'],
  submission: ['confidence pack', 'shortlist'],
  governance: ['policy', 'compliance', 'gdpr'],
  training: ['academy', 'program', 'learning'],
  metrics: ['telemetry', 'analytics', 'kpi'],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
let corpusPromise = null;

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

function checkRateLimit(key, maxCount, windowMs) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    rateLimit.set(key, next);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count <= maxCount) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { allowed: false, retryAfterSeconds };
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

function makeCacheKey(fields) {
  const stable = JSON.stringify(fields);
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

function cleanText(value, maxLen) {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (maxLen && text.length > maxLen) return text.slice(0, maxLen);
  return text;
}

function sanitizeSearchQuery(value, maxLen = 180) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>`"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length > 1);
}

function expandTokens(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach((token) => {
    const extras = TERM_EXPANSIONS[token];
    if (!extras) return;
    extras.forEach((term) => {
      tokenize(term).forEach((t) => expanded.add(t));
    });
  });
  return Array.from(expanded);
}

function normalizeUrl(url) {
  const raw = cleanText(url, 240);
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

function makeSnippet(text, maxLen = 800) {
  const flat = cleanText(text, maxLen + 50);
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen).trim()}...`;
}

function sanitizeContextArray(context) {
  if (!Array.isArray(context)) return [];
  return context
    .slice(0, RETRIEVAL_SOURCE_LIMIT)
    .map((item) => ({
      title: cleanText(item?.title || '', 140) || 'Untitled',
      url: normalizeUrl(item?.url || ''),
      snippet: makeSnippet(item?.snippet || item?.description || '', 800),
    }))
    .filter((item) => item.url || item.snippet);
}

async function readJsonRelative(relativePath) {
  try {
    const filePath = path.join(PROJECT_ROOT, relativePath);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function loadRetrievalCorpus() {
  if (corpusPromise) return corpusPromise;

  corpusPromise = (async () => {
    const [prompts, assets, stages, academy, searchIndexPayload] = await Promise.all([
      readJsonRelative('prompts/prompts.json'),
      readJsonRelative('library/assets.json'),
      readJsonRelative('stages/stages.json'),
      readJsonRelative('academy/academy.json'),
      readJsonRelative('shared/search-index.json'),
    ]);

    const entries = [];
    const seen = new Set();

    const addEntry = (item) => {
      const id = cleanText(item?.id, 120);
      const title = cleanText(item?.title, 180);
      const url = normalizeUrl(item?.url);
      const text = cleanText(item?.text, 6000);
      const snippet = makeSnippet(item?.snippet || item?.text || '', 1000);
      const keywords = cleanText(item?.keywords, 300);
      const type = cleanText(item?.type, 80);

      if (!title || !url || !text) return;
      const key = `${id || title}|${url}`;
      if (seen.has(key)) return;
      seen.add(key);

      entries.push({ id: id || key, title, url, text, snippet, keywords, type });
    };

    asArray(prompts).forEach((item) => {
      addEntry({
        id: `prompt-${item?.id || ''}`,
        title: item?.title || 'Prompt',
        url: '/prompts/',
        text: [item?.title, item?.preview, item?.content, item?.usageNotes, item?.stageTitle].filter(Boolean).join(' '),
        snippet: item?.preview || item?.content || '',
        keywords: [item?.type, item?.stageTitle, item?.stage].filter(Boolean).join(' '),
        type: 'prompt',
      });
    });

    asArray(assets).forEach((item) => {
      addEntry({
        id: `asset-${item?.id || ''}`,
        title: item?.title || 'Asset',
        url: '/library/',
        text: [item?.title, item?.description, item?.content, item?.stageLabel].filter(Boolean).join(' '),
        snippet: item?.description || item?.content || '',
        keywords: [item?.category, item?.stageLabel].filter(Boolean).join(' '),
        type: 'asset',
      });
    });

    asArray(stages).forEach((item) => {
      addEntry({
        id: `stage-${item?.id || ''}`,
        title: item?.title || `Stage ${item?.id || ''}`,
        url: '/stages/',
        text: [
          item?.title,
          item?.subtitle,
          ...(asArray(item?.whatAIDoes)),
          ...(asArray(item?.agentBehavior)),
          ...(asArray(item?.metrics)),
          item?.teamAdvantage,
        ].filter(Boolean).join(' '),
        snippet: item?.subtitle || item?.teamAdvantage || '',
        keywords: [item?.cluster, item?.slug].filter(Boolean).join(' '),
        type: 'stage',
      });
    });

    const weeks = asArray(academy?.weeks);
    if (academy?.program) {
      addEntry({
        id: 'academy-program',
        title: cleanText(academy.program.title || 'Academy Program', 160),
        url: '/academy/',
        text: [academy.program.title, academy.program.subtitle, academy.program.description].filter(Boolean).join(' '),
        snippet: academy.program.description || '',
        keywords: 'academy learning program',
        type: 'academy',
      });
    }
    weeks.forEach((week) => {
      addEntry({
        id: `academy-week-${week?.id || ''}`,
        title: week?.title || `Academy Week ${week?.id || ''}`,
        url: '/academy/',
        text: [
          week?.title,
          week?.outcome,
          week?.focus,
          week?.deliverable,
          week?.howToRun,
          ...(asArray(week?.exercises)),
        ].filter(Boolean).join(' '),
        snippet: week?.outcome || week?.focus || '',
        keywords: [week?.shortLabel, 'academy'].filter(Boolean).join(' '),
        type: 'academy-week',
      });
    });

    asArray(searchIndexPayload?.searchIndex).forEach((item) => {
      addEntry({
        id: `index-${item?.id || ''}`,
        title: item?.title || 'Page',
        url: item?.url || '',
        text: [item?.title, item?.description, item?.keywords, item?.content].filter(Boolean).join(' '),
        snippet: item?.description || item?.content || '',
        keywords: item?.keywords || '',
        type: 'index-fallback',
      });
    });

    return entries;
  })();

  return corpusPromise;
}

function buildRetrievalCycles(query, messages) {
  const safeQuery = sanitizeSearchQuery(query).toLowerCase();
  const baseTokens = tokenize(safeQuery).filter((token) => !STOP_WORDS.has(token));
  const expanded = expandTokens(baseTokens);
  const recentConversation = asArray(messages)
    .filter((m) => String(m?.role || '').toLowerCase() === 'user')
    .slice(-2)
    .map((m) => cleanText(m?.content, 200))
    .join(' ');
  const convoTokens = tokenize(recentConversation).filter((token) => !STOP_WORDS.has(token));
  const blended = Array.from(new Set([...expanded, ...convoTokens]));

  return [
    { name: 'strict', phrase: safeQuery, tokens: baseTokens, minScore: 3 },
    { name: 'expanded', phrase: '', tokens: expanded, minScore: 2 },
    { name: 'blended', phrase: '', tokens: blended, minScore: 1 },
  ].filter((cycle) => cycle.tokens.length > 0 || cycle.phrase);
}

function scoreDocument(doc, cycle) {
  const title = String(doc.title || '').toLowerCase();
  const text = String(doc.text || '').toLowerCase();
  const keywords = String(doc.keywords || '').toLowerCase();
  const snippet = String(doc.snippet || '').toLowerCase();
  if (!title && !text) return 0;

  let score = 0;
  if (cycle.phrase && cycle.phrase.length >= 4) {
    if (title.includes(cycle.phrase)) score += 8;
    if (text.includes(cycle.phrase) || snippet.includes(cycle.phrase)) score += 5;
  }

  cycle.tokens.forEach((token) => {
    if (title.includes(token)) score += 4;
    if (keywords.includes(token)) score += 3;
    if (snippet.includes(token)) score += 2;
    if (text.includes(token)) score += 1;
  });

  return score;
}

function runCycleSearch(corpus, cycle) {
  return corpus
    .map((doc) => ({ doc, score: scoreDocument(doc, cycle) }))
    .filter((item) => item.score >= cycle.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVAL_SEARCH_CANDIDATE_LIMIT);
}

function extractLatestUserText(messages) {
  const latest = asArray(messages)
    .slice()
    .reverse()
    .find((m) => String(m?.role || '').toLowerCase() === 'user');
  return cleanText(latest?.content || '', 1200);
}

async function retrieveContextAgentic({ messages, query, clientContext }) {
  const safeQuery = sanitizeSearchQuery(query || extractLatestUserText(messages));
  const fallback = sanitizeContextArray(clientContext);
  if (!safeQuery) {
    return {
      context: fallback,
      retrieval: {
        cyclesUsed: 0,
        candidateCount: 0,
        sourceCount: fallback.length,
        usedClientFallback: fallback.length > 0,
      },
    };
  }

  const corpus = await loadRetrievalCorpus();
  const cycles = buildRetrievalCycles(safeQuery, messages);
  const candidates = new Map();
  let cyclesUsed = 0;

  for (const cycle of cycles) {
    cyclesUsed += 1;
    const hits = runCycleSearch(corpus, cycle);
    hits.forEach((hit) => {
      const key = `${hit.doc.id}|${hit.doc.url}`;
      const current = candidates.get(key);
      if (!current || hit.score > current.score) {
        candidates.set(key, { ...hit, cycle: cycle.name });
      }
    });

    if (candidates.size >= RETRIEVAL_SOURCE_LIMIT * 3) break;
  }

  const strictCycle = cycles[0] || { phrase: safeQuery, tokens: tokenize(safeQuery), minScore: 1 };
  const ranked = Array.from(candidates.values())
    .map((item) => {
      const recheck = scoreDocument(item.doc, strictCycle);
      return { ...item, finalScore: item.score + Math.floor(recheck * 0.5) };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, RETRIEVAL_SOURCE_LIMIT)
    .map((item) => ({
      title: cleanText(item.doc.title, 140),
      url: normalizeUrl(item.doc.url),
      snippet: makeSnippet(item.doc.snippet || item.doc.text, 800),
    }))
    .filter((item) => item.url || item.snippet);

  const context = ranked.length ? ranked : fallback;
  return {
    context,
    retrieval: {
      cyclesUsed,
      candidateCount: candidates.size,
      sourceCount: context.length,
      usedClientFallback: ranked.length === 0 && fallback.length > 0,
    },
  };
}

function buildChatPrompt({ messages, context, page }) {
  const intro = [
    'You are the GBS EMEA Learning Assistant.',
    'You help employees learn and apply AI tools and recruiting best practices.',
    'Rules:',
    '- Use the provided sources first. If the answer is not covered, say so and offer general guidance.',
    '- Do not request or infer personal data. Avoid sensitive or confidential info.',
    '- Keep responses concise, structured, and practical.',
    '- When using sources, cite them inline as [1], [2], etc and end with a "Sources:" list.',
    '- If no sources apply, omit the Sources section.',
  ].join('\n');

  const pageLine = page?.title || page?.url
    ? `Current page: ${cleanText(page.title || '', 120)} (${cleanText(page.url || '', 200)})`
    : '';

  const sourcesText = asArray(context)
    .slice(0, RETRIEVAL_SOURCE_LIMIT)
    .map((item, idx) => {
      const title = cleanText(item?.title, 120);
      const url = cleanText(item?.url, 240);
      const snippet = cleanText(item?.snippet, 800);
      return `Source ${idx + 1}:\nTitle: ${title}\nURL: ${url}\nSnippet: ${snippet}`;
    })
    .join('\n\n');

  const convoText = asArray(messages)
    .slice(-10)
    .map((m) => `${String(m?.role || 'user').toUpperCase()}: ${cleanText(m?.content, 1200)}`)
    .join('\n');

  return [intro, pageLine, sourcesText ? `Sources:\n${sourcesText}` : '', 'Conversation:', convoText]
    .filter(Boolean)
    .join('\n\n');
}

function buildDirectPrompt({ message, context }) {
  const messagePart = cleanText(message, 6000);
  const contextPart = cleanText(context, 4000);
  if (!contextPart) return messagePart;
  return `Context:\n${contextPart}\n\nRequest:\n${messagePart}`;
}

async function callGemini({ apiKey, model, payload }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
      const outwardStatus = resp.status === 404 || resp.status === 400 ? 502 : resp.status;
      const err = new Error('Gemini API error');
      err.status = outwardStatus;
      err.details = details;
      throw err;
    }

    const data = await resp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!reply) {
      const err = new Error('Empty response from Gemini');
      err.status = 502;
      throw err;
    }

    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const origin = getRequestOrigin(req);
  if (origin && isAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const gate = checkRateLimit(`req:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!gate.allowed) {
      res.setHeader('Retry-After', String(gate.retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterSeconds: gate.retryAfterSeconds,
      });
    }

    const body = req.body || {};
    const messages = asArray(body.messages);
    const page = body.page || null;
    const model = cleanText(process.env.GEMINI_MODEL || 'gemini-2.5-flash', 80);
    const isChatMode = messages.length > 0;

    if (isChatMode) {
      const searchGate = checkRateLimit(`search:${ip}`, SEARCH_RATE_LIMIT_MAX, SEARCH_RATE_LIMIT_WINDOW_MS);
      if (!searchGate.allowed) {
        res.setHeader('Retry-After', String(searchGate.retryAfterSeconds));
        return res.status(429).json({
          error: 'Search rate limit exceeded',
          retryAfterSeconds: searchGate.retryAfterSeconds,
        });
      }

      const latestUserQuery = extractLatestUserText(messages);
      const { context, retrieval } = await retrieveContextAgentic({
        messages,
        query: latestUserQuery,
        clientContext: body.context,
      });

      const prompt = buildChatPrompt({ messages, context, page });
      const cacheKey = makeCacheKey({ mode: 'chat', model, prompt });
      const cached = getCached(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json({ ...cached, cache: 'HIT' });
      }

      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 1200,
        },
      };

      const reply = await callGemini({ apiKey, model, payload });
      const responseBody = {
        reply,
        response: reply,
        text: reply,
        message: reply,
        sources: context,
        retrieval,
      };

      setCached(cacheKey, responseBody);
      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json({ ...responseBody, cache: 'MISS' });
    }

    const message = cleanText(body.message || '', 6000);
    if (!message) {
      return res.status(400).json({ error: 'Messages or message are required' });
    }

    const directContext = typeof body.context === 'string' ? body.context : '';
    const systemPrompt = cleanText(body.systemPrompt || '', 5000);
    const maxTokens = Math.min(4096, Math.max(128, Number(body.maxTokens) || 2048));
    const prompt = buildDirectPrompt({ message, context: directContext });
    const cacheKey = makeCacheKey({ mode: 'direct', model, prompt, systemPrompt, maxTokens });

    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ ...cached, cache: 'HIT' });
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const reply = await callGemini({ apiKey, model, payload });
    const responseBody = {
      reply,
      response: reply,
      text: reply,
      message: reply,
      sources: [],
      retrieval: { cyclesUsed: 0, candidateCount: 0, sourceCount: 0, usedClientFallback: false },
    };

    setCached(cacheKey, responseBody);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json({ ...responseBody, cache: 'MISS' });
  } catch (err) {
    console.error('Learning assistant error:', err);
    const status = Number(err?.status) || 500;
    if (status >= 400 && status < 600 && err?.details) {
      return res.status(status).json({ error: 'Gemini API error', details: err.details });
    }
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}
