// Simple Admin Auth: issues a signed token when password matches ADMIN_PASSWORD
// Env: ADMIN_PASSWORD, ADMIN_JWT_SECRET

import crypto from 'crypto';

function sign(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!adminPassword || !jwtSecret) {
    return res.status(500).json({ error: 'Admin auth not configured' });
  }
  const { password } = req.body || {};
  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const now = Math.floor(Date.now() / 1000);
  const token = sign({ role: 'admin', iat: now, exp: now + 60 * 60 * 8 }, jwtSecret); // 8h
  return res.status(200).json({ token, expires_in: 60 * 60 * 8 });
}

