// Usage analytics ingest endpoint
// Accepts POST { name, data, ts } and logs to server logs.
// Extend later to persist to a database (e.g., Firestore) or a data warehouse.

function cleanString(value, maxLen = 120) {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function cleanNumber(value, { min = 0, max = 1_000_000 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function sanitizeEvent(name, rawData) {
  const eventName = cleanString(name, 80);
  const data = rawData && typeof rawData === 'object' ? rawData : {};

  if (eventName === 'retrieval_quality') {
    return {
      name: eventName,
      data: {
        kind: cleanString(data.kind, 40),
        source_count: cleanNumber(data.source_count, { min: 0, max: 100 }),
        source_hits: cleanNumber(data.source_hits, { min: 0, max: 100 }),
        no_source: Boolean(data.no_source),
        cycles: cleanNumber(data.cycles, { min: 0, max: 20 }),
        retries: cleanNumber(data.retries, { min: 0, max: 20 }),
        latency_ms: cleanNumber(data.latency_ms, { min: 0, max: 120000 }),
        candidate_count: cleanNumber(data.candidate_count, { min: 0, max: 5000 }),
        cache: cleanString(data.cache, 20),
        page_path: cleanString(data.page_path, 200),
      },
    };
  }

  // Generic fallback for other event types.
  const sanitized = {};
  Object.keys(data).slice(0, 20).forEach((key) => {
    const safeKey = cleanString(key, 40);
    const value = data[key];
    if (typeof value === 'boolean') {
      sanitized[safeKey] = value;
    } else if (typeof value === 'number') {
      sanitized[safeKey] = cleanNumber(value, { min: -1_000_000, max: 1_000_000 });
    } else {
      sanitized[safeKey] = cleanString(value, 200);
    }
  });

  return { name: eventName, data: sanitized };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { name, data, ts } = req.body || {};
    const sanitized = sanitizeEvent(name, data);
    const event = { name: sanitized.name, data: sanitized.data, ts: cleanNumber(ts || Date.now(), { min: 0, max: 9_999_999_999_999 }) };
    const meta = {
      ip: cleanString(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '', 120),
      ua: cleanString(req.headers['user-agent'] || '', 300),
    };

    // Minimal log; replace with persistence.
    console.log('[usage_event]', JSON.stringify({ event, meta }));

    if (event.name === 'retrieval_quality') {
      console.log('[retrieval_summary]', JSON.stringify({
        kind: event.data.kind,
        source_count: event.data.source_count,
        no_source: event.data.no_source,
        cycles: event.data.cycles,
        retries: event.data.retries,
        latency_ms: event.data.latency_ms,
      }));
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
