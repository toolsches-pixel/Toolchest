import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing QR ID' });
  }

  try {
    const count = (await redis.get(`qr:${id}:count`)) || 0;
    const url = await redis.get(`qr:${id}:url`);
    const label = await redis.get(`qr:${id}:label`);

    res.status(200).json({
      id,
      count: Number(count),
      url,
      label,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}