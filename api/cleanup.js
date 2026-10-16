import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

export default async function handler(req, res) {
  // Optional: add a secret token to prevent public access
  const authHeader = req.headers['authorization'];
  const secret = process.env.CLEANUP_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const allIds = await redis.smembers('qr:all');
    const now = Date.now();

    let deleted = 0;
    let kept = 0;

    for (const id of allIds) {
      const [created, isProtected] = await Promise.all([
        redis.get(`qr:${id}:created`),
        redis.get(`qr:${id}:protected`),
      ]);

      if (!created) {
        // No created date — cleanup
        await deleteQr(id);
        deleted++;
        continue;
      }

      const ageMs = now - Number(created);

      // Skip protected QRs
      if (isProtected === '1') {
        kept++;
        continue;
      }

      // Delete if older than 2 months
      if (ageMs > TWO_MONTHS_MS) {
        await deleteQr(id);
        deleted++;
      } else {
        kept++;
      }
    }

    res.status(200).json({
      success: true,
      deleted,
      kept,
      total: allIds.length,
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteQr(id) {
  await Promise.all([
    redis.del(`qr:${id}:url`),
    redis.del(`qr:${id}:label`),
    redis.del(`qr:${id}:created`),
    redis.del(`qr:${id}:count`),
    redis.del(`qr:${id}:protected`),
  ]);
  await redis.srem('qr:all', id);
}