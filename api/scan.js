import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing QR ID');
  }

  try {
    await redis.incr(`qr:${id}:count`);
    const url = await redis.get(`qr:${id}:url`);

    if (!url) {
      return res.status(404).send('QR code not found');
    }

    res.redirect(302, url);
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).send('Server error');
  }
}