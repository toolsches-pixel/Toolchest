import { useEffect, useState, useMemo } from "react";
import QRCode from "qrcode";
import ToolShell from "../../components/ui/ToolShell";
import { getToolById } from "../../data/tools";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import "./QrTracker.css";

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

export default function QrTracker() {
  const tool = getToolById("qr-tracker");

  useDocumentTitle("QR Code Tracker — Track QR Scans | toolchest");

  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content =
      "Free QR code tracker. Generate trackable QR codes and see how many people scanned them. Real-time counts.";
    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
    };
  }, []);

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrId, setQrId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [savedQrs, setSavedQrs] = useState([]);
  const [stats, setStats] = useState({});
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  // ✅ Copy feedback state
  const [copiedId, setCopiedId] = useState("");

  // Filter states
  const [filterId, setFilterId] = useState("");
  const [filterUrl, setFilterUrl] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("toolchest-qr-tracker") || "[]",
      );
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
            newStats[qr.id] = { count: data.count, protected: data.protected };
          }
        } catch (e) {}
      }
      setStats(newStats);
    };
    if (savedQrs.length > 0) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedQrs]);

  const generateId = () => Math.random().toString(36).substring(2, 10);

  // Filtered QRs
  const filteredQrs = useMemo(() => {
    return savedQrs.filter((qr) => {
      if (filterId && !qr.id.toLowerCase().includes(filterId.toLowerCase())) {
        return false;
      }
      if (
        filterUrl &&
        !qr.url.toLowerCase().includes(filterUrl.toLowerCase())
      ) {
        return false;
      }
      if (filterDateFrom) {
        const from = new Date(filterDateFrom).getTime();
        if (qr.createdAt < from) return false;
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo).getTime() + 86400000;
        if (qr.createdAt > to) return false;
      }
      return true;
    });
  }, [savedQrs, filterId, filterUrl, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterId("");
    setFilterUrl("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const handleGenerate = async () => {
    let finalUrl = url.trim();
    if (!finalUrl) return setError("Please enter a URL");

    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl;
    try {
      new URL(finalUrl);
    } catch (e) {
      return setError("Invalid URL");
    }

    setError("");
    setGenerating(true);

    try {
      const id = generateId();
      let qrContent;

      if (trackingEnabled) {
        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            url: finalUrl,
            label: label.trim(),
            protected: false,
          }),
        });
        if (!res.ok) throw new Error("Failed to save QR");
        qrContent = `${window.location.origin}/api/scan?id=${id}`;
      } else {
        qrContent = finalUrl;
      }

      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
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
          localStorage.setItem("toolchest-qr-tracker", JSON.stringify(updated));
        } catch (e) {}
        setStats((s) => ({ ...s, [id]: { count: 0, protected: false } }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate QR: " + (err?.message || "unknown"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
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
      alert("Tracking link copied!");
    } catch (e) {}
  };

  // ✅ Updated: uses copiedId state for visual feedback
  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const handleRefreshStats = async (id) => {
    try {
      const res = await fetch(`/api/stats?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setStats((s) => ({
          ...s,
          [id]: { count: data.count, protected: data.protected },
        }));
      }
    } catch (e) {}
  };

  const handleToggleProtect = async (qr) => {
    const current = stats[qr.id]?.protected || false;
    const next = !current;

    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: qr.id,
          url: qr.url,
          label: qr.label,
          protected: next,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setStats((s) => ({
        ...s,
        [qr.id]: { ...s[qr.id], protected: next },
      }));

      if (next) {
        alert(
          "✅ Protected!\n\nIs QR ko 2 mahine ke baad delete nahi kiya jayega.\n\n⚠️ Zyada waqt ke liye rakhna hai toh contact karo: contact@toolchest.in",
        );
      }
    } catch (e) {
      alert("Failed to update: " + e.message);
    }
  };

  const reset = () => {
    setUrl("");
    setLabel("");
    setQrDataUrl("");
    setQrId("");
    setError("");
  };

  const getDaysLeft = (createdAt, isProtected) => {
    if (isProtected) return null;
    const ageMs = Date.now() - createdAt;
    const leftMs = TWO_MONTHS_MS - ageMs;
    const days = Math.floor(leftMs / 86400000);
    return days;
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
            {generating ? "⟳ Generating…" : "📱 Generate QR Code"}
          </button>

          {error && <div className="qrt-error">⚠️ {error}</div>}
        </div>

        {qrDataUrl && (
          <div className="qrt-result">
            <div className="qrt-result-header">
              <span className="qrt-result-label">
                {trackingEnabled ? "✅ Trackable QR" : "✅ QR Code"}
              </span>
            </div>

            <div className="qrt-qr-wrap">
              <img src={qrDataUrl} alt="QR Code" className="qrt-qr-img" />
            </div>

            <div className="qrt-result-actions">
              <button
                className="qrt-btn qrt-btn-primary"
                onClick={handleDownload}
              >
                ⬇ Download PNG
              </button>
              {trackingEnabled && (
                <button
                  className="qrt-btn qrt-btn-secondary"
                  onClick={handleCopyLink}
                >
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
              <div>
                <span className="qrt-dashboard-title">
                  📈 Your QR Codes ({filteredQrs.length}
                  {filteredQrs.length !== savedQrs.length &&
                    ` of ${savedQrs.length}`}
                  )
                </span>
              </div>
              <button
                className="qrt-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "▲ Hide filters" : "▼ Filters"}
              </button>
            </div>

            {showFilters && (
              <div className="qrt-filters">
                <div className="qrt-filter-field">
                  <label className="qrt-filter-label">ID</label>
                  <input
                    type="text"
                    value={filterId}
                    onChange={(e) => setFilterId(e.target.value)}
                    className="qrt-filter-input"
                    placeholder="Search by ID…"
                  />
                </div>
                <div className="qrt-filter-field">
                  <label className="qrt-filter-label">URL</label>
                  <input
                    type="text"
                    value={filterUrl}
                    onChange={(e) => setFilterUrl(e.target.value)}
                    className="qrt-filter-input"
                    placeholder="Search by URL…"
                  />
                </div>
                <div className="qrt-filter-field">
                  <label className="qrt-filter-label">From date</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="qrt-filter-input"
                  />
                </div>
                <div className="qrt-filter-field">
                  <label className="qrt-filter-label">To date</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="qrt-filter-input"
                  />
                </div>
                <button className="qrt-filter-clear" onClick={clearFilters}>
                  ✕ Clear
                </button>
              </div>
            )}

            {filteredQrs.length === 0 ? (
              <div className="qrt-empty">No QRs match your filters.</div>
            ) : (
              <div className="qrt-list">
                {filteredQrs.map((qr) => {
                  const qrStat = stats[qr.id] || {};
                  const isProtected = qrStat.protected || false;
                  const daysLeft = getDaysLeft(qr.createdAt, isProtected);
                  const isExpiring = daysLeft !== null && daysLeft < 7;

                  return (
                    <div key={qr.id} className="qrt-item">
                      <div className="qrt-item-main">
                        <div className="qrt-item-label">{qr.label}</div>
                        <div className="qrt-item-url">{qr.url}</div>
                        <div className="qrt-item-meta">
                          ID: <code>{qr.id}</code>
                          {/* ✅ Copy button with feedback */}
                          <button
                            className={`qrt-copy-id-btn ${
                              copiedId === qr.id ? "copied" : ""
                            }`}
                            onClick={() => handleCopyId(qr.id)}
                            title="Copy ID"
                          >
                            {copiedId === qr.id ? "✓" : "📋"}
                          </button>
                          {" · "}
                          {new Date(qr.createdAt).toLocaleDateString()}
                        </div>
                        {isProtected ? (
                          <div className="qrt-badge qrt-badge-protected">
                            🔒 Protected — never auto-deleted
                          </div>
                        ) : daysLeft !== null ? (
                          <div
                            className={`qrt-badge ${
                              isExpiring
                                ? "qrt-badge-warning"
                                : "qrt-badge-info"
                            }`}
                          >
                            ⏳ Auto-delete in {daysLeft} day
                            {daysLeft === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                      <div className="qrt-item-stats">
                        <div className="qrt-stat-value">
                          {qrStat.count ?? "—"}
                        </div>
                        <div className="qrt-stat-label">scans</div>
                      </div>
                      <div className="qrt-item-actions">
                        <button
                          className="qrt-icon-btn"
                          onClick={() => handleRefreshStats(qr.id)}
                          title="Refresh count"
                        >
                          🔄
                        </button>
                        <button
                          className={`qrt-icon-btn ${
                            isProtected ? "qrt-icon-btn-protected" : ""
                          }`}
                          onClick={() => handleToggleProtect(qr)}
                          title={
                            isProtected
                              ? "Unprotect"
                              : "Protect from auto-delete"
                          }
                        >
                          {isProtected ? "🔒" : "🔓"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="qrt-info-footer">
              <div className="qrt-info-footer-title">ℹ️ Auto-delete policy</div>
              <div className="qrt-info-footer-text">
                Unprotected QRs are{" "}
                <strong>automatically deleted after 2 months</strong>. To keep
                them longer, click the <strong>🔓</strong> icon to protect them.
                For extended storage, contact{" "}
                <a href="mailto:contact@toolchest.in">contact@toolchest.in</a>.
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}