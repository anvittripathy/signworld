export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key missing' });
  }

  const { messages, chatLang, chatMode } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const system = `You are a ${chatLang || 'ASL'} sign language tutor in ${chatMode || 'chat'} mode. Be warm, educational, concise (max 80 words). Respond with EXACTLY this XML — no text outside the tags:
<reply>Your response here</reply>
<feedback>[{"type":"good","text":"One positive note"},{"type":"info","text":"One useful tip"}]</feedback>
<signs>[{"emoji":"👋","word":"Hello","desc":"Wave flat hand from forehead"}]</signs>
If no signs apply, use: <signs>[]</signs>`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: messages.slice(-8).map(m => ({
          role: m.role,
          content: String(m.content).slice(0, 800),
        })),
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Anthropic error:', data);
      return res.status(upstream.status).json({ error: data?.error?.message || 'Anthropic error' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
