import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, url, label } = req.body || {};

  if (!id || !url) {
    return res.status(400).json({ error: 'Missing id or url' });
  }

  try {
    await redis.set(`qr:${id}:url`, url);
    await redis.set(`qr:${id}:label`, label || '');
    await redis.set(`qr:${id}:created`, Date.now());
    res.status(200).json({ success: true, id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}