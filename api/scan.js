import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id, confirm } = req.query;

  if (!id) {
    return res.status(400).send('Missing QR ID');
  }

  try {
    const url = await redis.get(`qr:${id}:url`);
    const label = await redis.get(`qr:${id}:label`);

    if (!url) {
      return res.status(404).send('QR code not found');
    }

    // ✅ If already confirmed → count + redirect
    if (confirm === '1') {
      await redis.incr(`qr:${id}:count`);
      return res.redirect(302, url);
    }

    // ✅ Otherwise → show safety confirmation page
    const safeUrl = escapeHtml(url);
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redirect Notice — Toolchest</title>
<meta name="robots" content="noindex, nofollow">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'JetBrains Mono', -apple-system, sans-serif;
    background: #0a0b0d;
    color: #e8e6e3;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .wrap {
    max-width: 460px;
    width: 100%;
    background: #16181c;
    border: 1px solid #26292f;
    border-radius: 16px;
    padding: 36px 28px;
    text-align: center;
  }
  .icon { font-size: 3rem; margin-bottom: 18px; line-height: 1; }
  h1 { font-size: 1.2rem; font-weight: 700; color: #e8e6e3; margin-bottom: 10px; }
  .sub { font-size: 0.85rem; color: #8b8f96; margin-bottom: 26px; line-height: 1.6; }
  .url-box {
    background: #1a1c21;
    border: 1px solid #26292f;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 22px;
    text-align: left;
  }
  .url-box-label {
    font-size: 0.65rem;
    color: #5a5e66;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .hostname { font-size: 1rem; font-weight: 800; color: #e2b714; margin-bottom: 6px; word-break: break-all; }
  .full-url { color: #8b8f96; font-size: 0.75rem; word-break: break-all; line-height: 1.5; }
  .actions { display: flex; gap: 10px; flex-direction: column; margin-bottom: 20px; }
  .btn {
    display: block;
    padding: 14px 22px;
    border-radius: 10px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s;
    border: none;
    width: 100%;
    text-align: center;
  }
  .btn-primary { background: #e2b714; color: #0a0b0d; }
  .btn-primary:hover { filter: brightness(1.1); }
  .btn-secondary { background: transparent; color: #8b8f96; border: 1px solid #26292f; }
  .btn-secondary:hover { color: #e8e6e3; border-color: #34383f; }
  .warning {
    font-size: 0.72rem;
    color: #5a5e66;
    line-height: 1.6;
    padding-top: 20px;
    border-top: 1px solid #26292f;
  }
  .warning strong { color: #8b8f96; }
  .warning a { color: #e2b714; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="icon">🔗</div>
    <h1>You're about to visit an external site</h1>
    <p class="sub">This QR code was shared through <strong>Toolchest</strong>. We don't own or control the destination.</p>

    <div class="url-box">
      <div class="url-box-label">Destination</div>
      <div class="hostname">${safeHostname(hostname)}</div>
      <div class="full-url">${safeUrl}</div>
    </div>

    <div class="actions">
      <a href="/api/scan?id=${encodeURIComponent(id)}&confirm=1" class="btn btn-primary">
        Continue to ${safeHostname(hostname)} →
      </a>
      <a href="/" class="btn btn-secondary">Cancel</a>
    </div>

    <p class="warning">
      ⚠️ <strong>Safety tip:</strong> Never enter passwords or personal info on sites you don't trust. If you didn't expect this link, just close the page.
      <br><br>
      Suspicious? <a href="mailto:report@toolchest.in?subject=Report%20QR%20${encodeURIComponent(id)}">Report this link</a>
    </p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.status(200).send(html);
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).send('Server error');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeHostname(str) {
  return escapeHtml(str);
}