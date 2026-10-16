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

  // Basic state
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrId, setQrId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [savedQrs, setSavedQrs] = useState([]);
  const [stats, setStats] = useState({});
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState("");

  // ✅ Per-QR expand state
  const [expandedQrs, setExpandedQrs] = useState({});

  // ✅ Filter drawer state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    id: "",
    url: "",
    fromDate: "",
    toDate: "",
  });

  const [filterId, setFilterId] = useState("");
  const [filterUrl, setFilterUrl] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Collapsible filter sections
  const [collapsed, setCollapsed] = useState({
    id: false,
    url: false,
    date: false,
  });

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
      if (filterUrl && !qr.url.toLowerCase().includes(filterUrl.toLowerCase())) {
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

  // ✅ Toggle single QR expand
  const toggleQrExpand = (id) => {
    setExpandedQrs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // ✅ Toggle all
  const toggleAllExpand = () => {
    const allExpanded =
      filteredQrs.length > 0 && filteredQrs.every((q) => expandedQrs[q.id]);
    const next = {};
    filteredQrs.forEach((q) => {
      next[q.id] = !allExpanded;
    });
    setExpandedQrs(next);
  };

  const allExpanded =
    filteredQrs.length > 0 && filteredQrs.every((q) => expandedQrs[q.id]);

  // Filter drawer controls
  const openFilterDrawer = () => {
    setTempFilters({
      id: filterId,
      url: filterUrl,
      fromDate: filterDateFrom,
      toDate: filterDateTo,
    });
    setFiltersOpen(true);
  };

  const closeFilterDrawer = () => {
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setFilterId(tempFilters.id);
    setFilterUrl(tempFilters.url);
    setFilterDateFrom(tempFilters.fromDate);
    setFilterDateTo(tempFilters.toDate);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setTempFilters({ id: "", url: "", fromDate: "", toDate: "" });
    setFilterId("");
    setFilterUrl("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const clearTempFilters = () => {
    setTempFilters({ id: "", url: "", fromDate: "", toDate: "" });
  };

  const toggleCollapse = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters =
    filterId || filterUrl || filterDateFrom || filterDateTo;

  // URL validation
  const BLOCKED_KEYWORDS = [
    "porn", "xxx", "adult", "sex", "escort",
    "casino", "betting", "gambling", "lottery", "poker",
    "scam", "phishing", "malware", "virus", "hack",
    "drugs", "cocaine", "heroin", "weed", "cannabis",
    "weapon", "gun", "bomb", "explosive",
    "hate", "racist", "nazi",
    "torrent", "pirate", "warez",
  ];

  const BLOCKED_TLDS = [".xyz", ".tk", ".ml", ".ga", ".cf", ".gq"];

  const validateUrl = (urlStr) => {
    try {
      const urlObj = new URL(urlStr);
      const hostname = urlObj.hostname.toLowerCase();
      const fullUrl = urlStr.toLowerCase();

      for (const keyword of BLOCKED_KEYWORDS) {
        if (fullUrl.includes(keyword)) {
          return {
            ok: false,
            reason: `URL contains blocked keyword: "${keyword}"`,
          };
        }
      }

      for (const tld of BLOCKED_TLDS) {
        if (hostname.endsWith(tld)) {
          return {
            ok: false,
            reason: `TLD "${tld}" is not allowed (spam prevention)`,
          };
        }
      }

      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return { ok: false, reason: "Only http/https URLs are allowed" };
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "Invalid URL format" };
    }
  };

  const handleGenerate = async () => {
    let finalUrl = url.trim();
    if (!finalUrl) return setError("Please enter a URL");

    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = "https://" + finalUrl;

    const validation = validateUrl(finalUrl);
    if (!validation.ok) {
      setError("❌ " + validation.reason);
      return;
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

  const handleCopyId = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const handleDownloadFromList = async (qr) => {
    try {
      const qrContent = `${window.location.origin}/api/scan?id=${qr.id}`;
      const dataUrl = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${qr.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Download failed:", e);
      alert("Failed to download QR: " + e.message);
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

        {/* Generator */}
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

        {/* QR Result */}
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

        {/* Dashboard */}
        {savedQrs.length > 0 && (
          <div className="qrt-dashboard">
            {/* Header */}
            <div className="qrt-dashboard-header">
              <div>
                <span className="qrt-dashboard-title">
                  📈 Your QR Codes ({filteredQrs.length}
                  {filteredQrs.length !== savedQrs.length &&
                    ` of ${savedQrs.length}`}
                  )
                </span>
                {hasActiveFilters && (
                  <span className="qrt-dashboard-filter-badge">
                    ● filtered
                  </span>
                )}
              </div>
              <div className="qrt-header-actions">
                {filteredQrs.length > 1 && (
                  <button
                    className="qrt-expand-all-btn"
                    onClick={toggleAllExpand}
                    title={allExpanded ? "Collapse all" : "Expand all"}
                  >
                    {allExpanded ? "▲ Collapse all" : "▼ Expand all"}
                  </button>
                )}
                {hasActiveFilters && (
                  <button
                    className="qrt-filter-clear-inline"
                    onClick={clearFilters}
                    title="Clear all filters"
                  >
                    ✕ Clear
                  </button>
                )}
                <button
                  className={`qrt-filter-btn ${hasActiveFilters ? "active" : ""}`}
                  onClick={openFilterDrawer}
                >
                  <span>⚙️</span>
                  <span>Filters</span>
                  {hasActiveFilters && <span className="qrt-filter-dot" />}
                </button>
              </div>
            </div>

            {/* List */}
            {filteredQrs.length === 0 ? (
              <div className="qrt-empty">
                <div className="qrt-empty-icon">🔍</div>
                <div className="qrt-empty-title">No QRs match your filters</div>
                <button className="qrt-empty-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="qrt-list">
                {filteredQrs.map((qr) => {
                  const qrStat = stats[qr.id] || {};
                  const isProtected = qrStat.protected || false;
                  const daysLeft = getDaysLeft(qr.createdAt, isProtected);
                  const isExpiring = daysLeft !== null && daysLeft < 7;
                  const isExpanded = !!expandedQrs[qr.id];

                  return (
                    <div
                      key={qr.id}
                      className={`qrt-item ${isExpanded ? "expanded" : "collapsed"}`}
                    >
                      {/* Header — always visible */}
                      <button
                        className="qrt-item-header"
                        onClick={() => toggleQrExpand(qr.id)}
                        aria-expanded={isExpanded}
                        type="button"
                      >
                        <span className="qrt-item-toggle-icon">
                          {isExpanded ? "▼" : "▶"}
                        </span>
<span className="qrt-item-header-label" title={qr.url}>
  {isExpanded ? qr.label : qr.id}
</span>                        <span className="qrt-item-header-scans">
                          <span className="qrt-item-header-count">
                            {qrStat.count ?? "—"}
                          </span>
                          <span className="qrt-item-header-unit">scans</span>
                        </span>
                      </button>

                      {/* Body — hidden unless expanded */}
                      {isExpanded && (
                        <div className="qrt-item-body">
                          <div className="qrt-item-url">{qr.url}</div>
                          <div className="qrt-item-meta">
                            ID: <code>{qr.id}</code>
                            <button
                              className={`qrt-copy-id-btn ${
                                copiedId === qr.id ? "copied" : ""
                              }`}
                              onClick={() => handleCopyId(qr.id)}
                              title="Copy ID"
                              type="button"
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

                          <div className="qrt-item-actions">
                            <button
                              className="qrt-icon-btn qrt-icon-btn-download"
                              onClick={() => handleDownloadFromList(qr)}
                              title="Download QR"
                              type="button"
                            >
                              ⬇
                            </button>
                            <button
                              className="qrt-icon-btn"
                              onClick={() => handleRefreshStats(qr.id)}
                              title="Refresh count"
                              type="button"
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
                              type="button"
                            >
                              {isProtected ? "🔒" : "🔓"}
                            </button>
                          </div>
                        </div>
                      )}
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

        {/* ============================================ */}
        {/* FILTER DRAWER */}
        {/* ============================================ */}
        <div
          className={`qrt-drawer-overlay ${filtersOpen ? "open" : ""}`}
          onClick={closeFilterDrawer}
        />

        <div className={`qrt-drawer ${filtersOpen ? "open" : ""}`}>
          <div className="qrt-drawer-header">
            <div className="qrt-drawer-title">
              <span>⚙️</span> Filters
            </div>
            <button
              className="qrt-drawer-close"
              onClick={closeFilterDrawer}
              title="Close"
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="qrt-drawer-body">
            {/* ID section */}
            <div className="qrt-drawer-section">
              <button
                className="qrt-drawer-section-header"
                onClick={() => toggleCollapse("id")}
                type="button"
              >
                <span className="qrt-drawer-section-title">ID</span>
                <span className="qrt-drawer-section-icon">
                  {collapsed.id ? "▶" : "▼"}
                </span>
              </button>
              {!collapsed.id && (
                <div className="qrt-drawer-section-body">
                  <input
                    type="text"
                    value={tempFilters.id}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, id: e.target.value })
                    }
                    className="qrt-drawer-input"
                    placeholder="Search by ID…"
                    spellCheck="false"
                  />
                  <div className="qrt-drawer-hint">
                    Partial match — type "abc" to find any ID containing "abc"
                  </div>
                </div>
              )}
            </div>

            {/* URL section */}
            <div className="qrt-drawer-section">
              <button
                className="qrt-drawer-section-header"
                onClick={() => toggleCollapse("url")}
                type="button"
              >
                <span className="qrt-drawer-section-title">URL</span>
                <span className="qrt-drawer-section-icon">
                  {collapsed.url ? "▶" : "▼"}
                </span>
              </button>
              {!collapsed.url && (
                <div className="qrt-drawer-section-body">
                  <input
                    type="text"
                    value={tempFilters.url}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, url: e.target.value })
                    }
                    className="qrt-drawer-input"
                    placeholder="Search by URL…"
                    spellCheck="false"
                  />
                  <div className="qrt-drawer-hint">
                    Partial match — type "google" to find any URL with "google"
                  </div>
                </div>
              )}
            </div>

            {/* Date section */}
            <div className="qrt-drawer-section">
              <button
                className="qrt-drawer-section-header"
                onClick={() => toggleCollapse("date")}
                type="button"
              >
                <span className="qrt-drawer-section-title">Date range</span>
                <span className="qrt-drawer-section-icon">
                  {collapsed.date ? "▶" : "▼"}
                </span>
              </button>
              {!collapsed.date && (
                <div className="qrt-drawer-section-body">
                  <div className="qrt-drawer-field">
                    <label className="qrt-drawer-sublabel">From</label>
                    <input
                      type="date"
                      value={tempFilters.fromDate}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          fromDate: e.target.value,
                        })
                      }
                      className="qrt-drawer-input"
                    />
                  </div>
                  <div className="qrt-drawer-field">
                    <label className="qrt-drawer-sublabel">To</label>
                    <input
                      type="date"
                      value={tempFilters.toDate}
                      onChange={(e) =>
                        setTempFilters({
                          ...tempFilters,
                          toDate: e.target.value,
                        })
                      }
                      className="qrt-drawer-input"
                    />
                  </div>
                  <div className="qrt-drawer-hint">
                    Leave empty for no date restriction
                  </div>
                </div>
              )}
            </div>

            {/* Quick presets */}
            <div className="qrt-drawer-quick">
              <div className="qrt-drawer-quick-title">Quick presets</div>
              <div className="qrt-drawer-quick-btns">
                <button
                  className="qrt-drawer-quick-btn"
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const week = new Date(today.getTime() - 7 * 86400000);
                    setTempFilters({
                      ...tempFilters,
                      fromDate: week.toISOString().split("T")[0],
                      toDate: today.toISOString().split("T")[0],
                    });
                  }}
                >
                  Last 7 days
                </button>
                <button
                  className="qrt-drawer-quick-btn"
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const month = new Date(today.getTime() - 30 * 86400000);
                    setTempFilters({
                      ...tempFilters,
                      fromDate: month.toISOString().split("T")[0],
                      toDate: today.toISOString().split("T")[0],
                    });
                  }}
                >
                  Last 30 days
                </button>
                <button
                  className="qrt-drawer-quick-btn"
                  type="button"
                  onClick={() => {
                    setTempFilters({
                      ...tempFilters,
                      fromDate: "",
                      toDate: "",
                    });
                  }}
                >
                  All time
                </button>
              </div>
            </div>

            <div className="qrt-drawer-info">
              <span className="qrt-drawer-info-icon">💡</span>
              <span className="qrt-drawer-info-text">
                Filters combine with AND logic — a QR must match all active
                filters.
              </span>
            </div>
          </div>

          <div className="qrt-drawer-footer">
            <button
              className="qrt-drawer-btn secondary"
              onClick={clearTempFilters}
              type="button"
            >
              ✕ Clear
            </button>
            <button
              className="qrt-drawer-btn primary"
              onClick={applyFilters}
              type="button"
            >
              ✓ Apply
            </button>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}