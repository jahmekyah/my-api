// /api/grammar.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '10 m'), // 30 запросов / 10 минут на IP
  analytics: true,
});

function getIp(req: VercelRequest) {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  return xf.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const ip = getIp(req);
  const { success, limit, remaining, reset } = await ratelimit.limit(`ip:${ip}`);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(reset));
  if (!success) return res.status(429).json({ error: 'Too Many Requests' });

  try {
    const { text } = (req.body || {}) as { text?: string };
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Provide body { "text": string }' });
    }
    if (text.length > 4000) {
      return res.status(400).json({ error: 'Text too long (max 4000 chars)' });
    }

    const body = {
      model: 'gpt-4.1-mini',
      temperature: 0,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text:
                'Ты — строгий проверяющий грамматики. Подсчитай количество грамматических, орфографических и пунктуационных ошибок в присланном тексте. ' +
                'Ответь ТОЛЬКО одним JSON без пояснений, строго вида: {"errorCount": <целое число>}.',
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'text', text }],
        },
      ],
      stream: false,
      max_output_tokens: 50,
    };

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error ?? 'OpenAI error' });
    }

    // У Responses API есть удобное поле output_text с собранным текстом ответа
    const txt: string = data?.output_text ?? '';
    let errorCount = 0;

    try {
      const parsed = JSON.parse(txt);
      errorCount = Number(parsed?.errorCount ?? 0);
    } catch {
      // запасной план: вытащить число из текста
      const m = txt.match(/-?\d+/);
      errorCount = m ? Number(m[0]) : 0;
    }

    if (!Number.isFinite(errorCount) || errorCount < 0) errorCount = 0;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({ errorCount });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
