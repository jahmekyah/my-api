import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: kv,                                  // используем Vercel KV
  limiter: Ratelimit.slidingWindow(60, '10 m'), // 60 запросов / 10 мин на IP
  analytics: true,
});

function getIp(req: VercelRequest) {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  return xf.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { success, limit, remaining, reset } = await ratelimit.limit(`ip:${getIp(req)}`);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(reset));

  if (!success) return res.status(429).send('Слишком много запросов. Попробуй позже.');

  res.status(200).send('Кот, скушай сосисочку 🌭');
}
