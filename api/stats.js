import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing QR ID' });
  }

  try {
    const [count, url, label, isProtected] = await Promise.all([
      redis.get(`qr:${id}:count`),
      redis.get(`qr:${id}:url`),
      redis.get(`qr:${id}:label`),
      redis.get(`qr:${id}:protected`),
    ]);

    res.status(200).json({
      id,
      count: Number(count) || 0,
      url: url || '',
      label: label || '',
      protected: isProtected === '1',
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}