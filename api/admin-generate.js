// Admin Content Generation via Gemini
// Secured by x-admin-token JWT signed with ADMIN_JWT_SECRET
// Env: GEMINI_API_KEY, ADMIN_JWT_SECRET, GEMINI_MODEL (optional)

import crypto from 'crypto';

function verify(token, secret) {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return null;
    const data = `${h}.${b}`;
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== s) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!jwtSecret || !apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }
  const token = req.headers['x-admin-token'];
  const payload = token ? verify(String(token), jwtSecret) : null;
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, params } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: 'Missing type' });
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  const instruction = buildInstruction(type, params);
  if (!instruction) return res.status(400).json({ error: 'Invalid type or params' });

  const body = {
    contents: [{ role: 'user', parts: [{ text: instruction }]}],
    generationConfig: { temperature: 0.4, topK: 40, topP: 0.95, maxOutputTokens: 1200 },
  };
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text();
      const outwardStatus = resp.status === 404 || resp.status === 400 ? 502 : resp.status;
      return res.status(outwardStatus).json({ error: 'Gemini API error', details: text });
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ result: text });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: String(e) });
  }
}

function buildInstruction(type, params = {}) {
  switch (type) {
    case 'generateModule': {
      const { topic = '', audience = 'GBS leaders', level = 'intermediate', learningObjectives = [] } = params;
      return `Create a training module for ${audience} on the topic: ${topic}.
Level: ${level}
Learning objectives: ${learningObjectives.join('; ')}
Return: Title, Overview (150-250 words), 3-5 Sections with bullet points, 3 Exercises, and a short Conclusion.
Format as Markdown.`;
    }
    case 'createQuiz': {
      const { topic = '', count = 10, difficulty = 'mixed' } = params;
      return `Create ${count} ${difficulty}-difficulty multiple-choice quiz questions for: ${topic}.
Return JSON with keys: questions[{ question, choices[4], answerIndex, rationale }].`;
    }
    case 'writePrompts': {
      const { theme = '', count = 10, style = 'professional' } = params;
      return `Write ${count} example AI prompts on the theme: ${theme} in a ${style} style.
Return a numbered list; keep each under 2 lines.`;
    }
    case 'summarize': {
      const { content = '', target = 'executive brief' } = params;
      return `Summarize the following content into an ${target}.
Be concise, structured, and preserve key facts.
Content:\n---\n${content}\n---`;
    }
    case 'translateLevel': {
      const { content = '', level = 'beginner' } = params;
      return `Rewrite the following content for a ${level}-level audience without losing core meaning.
Content:\n---\n${content}\n---`;
    }
    case 'batch': {
      const { action = 'summarize', items = [] } = params;
      return `Perform this action on each item and concatenate results separated by \n\n---\n\nAction: ${action}
Items:\n${items.map((x,i)=>`${i+1}. ${x}`).join('\n')}`;
    }
    default:
      return null;
  }
}
