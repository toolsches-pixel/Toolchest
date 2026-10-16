import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './QrTracker.css';

export default function QrTracker() {
  const tool = getToolById('qr-tracker');

  useDocumentTitle('QR Code Tracker — Track QR Scans | toolchest');

  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      'Free QR code tracker. Generate trackable QR codes and see how many people scanned them. Real-time counts.';
    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
    };
  }, []);

  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrId, setQrId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [savedQrs, setSavedQrs] = useState([]);
  const [stats, setStats] = useState({});
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('toolchest-qr-tracker') || '[]');
      setSavedQrs(saved);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const newStats = {};
      for (const qr of savedQrs) {
        try {
          const res = await fetch(`/api/stats?id=${qr.id}`);
          if (res.ok) {
            const data = await res.json();
            newStats[qr.id] = data.count;
          }
        } catch (e) {}
      }
      setStats(newStats);
    };
    if (savedQrs.length > 0) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQrs]);

  const generateId = () => Math.random().toString(36).substring(2, 10);

  const handleGenerate = async () => {
    let finalUrl = url.trim();
    if (!finalUrl) return setError('Please enter a URL');

    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    try { new URL(finalUrl); } catch (e) { return setError('Invalid URL'); }

    setError('');
    setGenerating(true);

    try {
      const id = generateId();
      let qrContent;

      if (trackingEnabled) {
        const res = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, url: finalUrl, label: label.trim() }),
        });
        if (!res.ok) throw new Error('Failed to save QR');
        qrContent = `${window.location.origin}/api/scan?id=${id}`;
      } else {
        qrContent = finalUrl;
      }

      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      setQrDataUrl(dataUrl);
      setQrId(id);

      if (trackingEnabled) {
        const newQr = {
          id,
          url: finalUrl,
          label: label.trim() || finalUrl,
          createdAt: Date.now(),
        };
        const updated = [newQr, ...savedQrs].slice(0, 50);
        setSavedQrs(updated);
        try {
          localStorage.setItem('toolchest-qr-tracker', JSON.stringify(updated));
        } catch (e) {}
        setStats((s) => ({ ...s, [id]: 0 }));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate QR: ' + (err?.message || 'unknown'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${qrId || Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    if (!qrId) return;
    const link = `${window.location.origin}/api/scan?id=${qrId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Tracking link copied!');
    } catch (e) {}
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this QR record?')) return;
    const updated = savedQrs.filter((q) => q.id !== id);
    setSavedQrs(updated);
    try {
      localStorage.setItem('toolchest-qr-tracker', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRefreshStats = async (id) => {
    try {
      const res = await fetch(`/api/stats?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setStats((s) => ({ ...s, [id]: data.count }));
      }
    } catch (e) {}
  };

  const reset = () => {
    setUrl('');
    setLabel('');
    setQrDataUrl('');
    setQrId('');
    setError('');
  };

  return (
    <ToolShell tool={tool}>
      <div className="qrt-root">
        <div className="qrt-hero">
          <h1 className="qrt-hero-title">📊 QR Code Tracker</h1>
          <p className="qrt-hero-subtitle">
            Create a QR code that tracks how many people scanned it.
          </p>
        </div>

        <div className="qrt-section">
          <div className="qrt-field">
            <label className="qrt-label">Website URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="qrt-input"
              placeholder="https://example.com"
              spellCheck="false"
            />
          </div>

          <div className="qrt-field">
            <label className="qrt-label">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="qrt-input"
              placeholder="e.g. Store front poster"
              maxLength={60}
            />
          </div>

          <label className="qrt-toggle">
            <input
              type="checkbox"
              checked={trackingEnabled}
              onChange={(e) => setTrackingEnabled(e.target.checked)}
            />
            <span>Enable scan tracking (recommended)</span>
          </label>

          <button
            className="qrt-generate-btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⟳ Generating…' : '📱 Generate QR Code'}
          </button>

          {error && <div className="qrt-error">⚠️ {error}</div>}
        </div>

        {qrDataUrl && (
          <div className="qrt-result">
            <div className="qrt-result-header">
              <span className="qrt-result-label">
                {trackingEnabled ? '✅ Trackable QR' : '✅ QR Code'}
              </span>
            </div>

            <div className="qrt-qr-wrap">
              <img src={qrDataUrl} alt="QR Code" className="qrt-qr-img" />
            </div>

            <div className="qrt-result-actions">
              <button className="qrt-btn qrt-btn-primary" onClick={handleDownload}>
                ⬇ Download PNG
              </button>
              {trackingEnabled && (
                <button className="qrt-btn qrt-btn-secondary" onClick={handleCopyLink}>
                  📋 Copy link
                </button>
              )}
              <button className="qrt-btn qrt-btn-secondary" onClick={reset}>
                ⟳ New QR
              </button>
            </div>
          </div>
        )}

        {savedQrs.length > 0 && (
          <div className="qrt-dashboard">
            <div className="qrt-dashboard-header">
              <span className="qrt-dashboard-title">
                📈 Your QR Codes ({savedQrs.length})
              </span>
            </div>

            <div className="qrt-list">
              {savedQrs.map((qr) => (
                <div key={qr.id} className="qrt-item">
                  <div className="qrt-item-main">
                    <div className="qrt-item-label">{qr.label}</div>
                    <div className="qrt-item-url">{qr.url}</div>
                    <div className="qrt-item-meta">
                      ID: <code>{qr.id}</code> ·{' '}
                      {new Date(qr.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="qrt-item-stats">
                    <div className="qrt-stat-value">{stats[qr.id] ?? '—'}</div>
                    <div className="qrt-stat-label">scans</div>
                  </div>
                  <div className="qrt-item-actions">
                    <button
                      className="qrt-icon-btn"
                      onClick={() => handleRefreshStats(qr.id)}
                      title="Refresh"
                    >
                      🔄
                    </button>
                    <button
                      className="qrt-icon-btn qrt-icon-btn-danger"
                      onClick={() => handleDelete(qr.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}