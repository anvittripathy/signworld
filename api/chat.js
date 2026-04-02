// api/chat.js — SignWorld AI Proxy (production-hardened)

// In-memory rate limit store (resets on cold start — fine for serverless)
const ipHits = new Map();
const RATE_WINDOW_MS = 2000;
const MAX_MESSAGES   = 8;
const MAX_TOKENS     = 300;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://signworld.vercel.app',   // ← replace with YOUR Vercel URL
];

export default async function handler(req, res) {

  // ── CORS ──────────────────────────────────────────────────────────────────
  const origin = req.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ── RATE LIMIT ────────────────────────────────────────────────────────────
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const now  = Date.now();
  const last = ipHits.get(ip) || 0;

  if (now - last < RATE_WINDOW_MS) {
    return res.status(429).json({ error: 'Too many requests — wait a moment.' });
  }
  ipHits.set(ip, now);

  // ── VALIDATE ──────────────────────────────────────────────────────────────
  const { messages, chatLang, chatMode } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const safeMessages = messages
    .slice(-MAX_MESSAGES)
    .filter(m => m.role && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 800) }));

  const lang = String(chatLang || 'ASL').slice(0, 20);
  const mode = String(chatMode || 'chat').slice(0, 20);

  // ── SYSTEM PROMPT ─────────────────────────────────────────────────────────
  const system = `You are a ${lang} sign language tutor in ${mode} mode. Be warm, educational, concise (max 80 words). Respond with EXACTLY this XML — no text outside the tags:
<reply>Your response here</reply>
<feedback>[{"type":"good","text":"One positive note"},{"type":"info","text":"One useful tip"}]</feedback>
<signs>[{"emoji":"👋","word":"Hello","desc":"Wave flat hand from forehead"}]</signs>
If no signs apply, use: <signs>[]</signs>`;

  // ── CALL ANTHROPIC ────────────────────────────────────────────────────────
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: MAX_TOKENS,
        system,
        messages:   safeMessages,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      console.error('[signworld] Anthropic error:', err);
      return res.status(upstream.status).json({
        error: err.error?.message || 'Upstream API error',
      });
    }

    const data = await upstream.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('[signworld] Server error:', err);
    return res.status(500).json({ error: 'Internal server error — please try again.' });
  }
}
