import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './InterestCalculator.css';

/* ============================================================
   CONFIG
   ============================================================ */
const MODES = [
  { id: 'compound', label: 'Compound Interest', short: 'Compound' },
  { id: 'simple', label: 'Simple Interest', short: 'Simple' },
];

const FREQUENCIES = [
  { id: 'yearly', label: 'Yearly', n: 1 },
  { id: 'half', label: 'Half-yearly', n: 2 },
  { id: 'quarterly', label: 'Quarterly', n: 4 },
  { id: 'monthly', label: 'Monthly', n: 12 },
  { id: 'daily', label: 'Daily', n: 365 },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
];

const DEFAULTS = {
  mode: 'compound',
  principal: '100000',
  rate: '8',
  years: '5',
  months: '0',
  freq: 'yearly',
  currency: 'INR',
};

const MAX_YEARS = 100;

/* ============================================================
   MATH
   ============================================================ */
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const valueAt = (mode, P, rate, n, x) =>
  mode === 'simple'
    ? P * (1 + (rate / 100) * x)
    : P * Math.pow(1 + rate / 100 / n, n * x);

function buildResult({ mode, P, rate, t, n }) {
  const total = valueAt(mode, P, rate, n, t);
  const simpleTotal = valueAt('simple', P, rate, n, t);
  const compoundTotal = valueAt('compound', P, rate, n, t);

  // Year-by-year table
  const rows = [];
  const wholeYears = Math.ceil(t);
  let prev = P;
  for (let y = 1; y <= wholeYears; y++) {
    const x = Math.min(y, t);
    const v = valueAt(mode, P, rate, n, x);
    rows.push({
      label: x < y ? `Year ${y} (partial)` : `Year ${y}`,
      interestYear: v - prev,
      interestTotal: v - P,
      balance: v,
    });
    prev = v;
  }

  // Chart points
  const steps = clamp(Math.ceil(t * 2), 12, 60);
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const x = (t * i) / steps;
    return {
      x,
      compound: valueAt('compound', P, rate, n, x),
      simple: valueAt('simple', P, rate, n, x),
    };
  });

  // Extras
  const effectiveRate = (Math.pow(1 + rate / 100 / n, n) - 1) * 100;
  let doubling = null;
  if (rate > 0) {
    doubling =
      mode === 'simple'
        ? 100 / rate
        : Math.log(2) / (n * Math.log(1 + rate / 100 / n));
  }

  return {
    total,
    interest: total - P,
    simpleTotal,
    compoundTotal,
    rows,
    points,
    effectiveRate,
    doubling,
  };
}

/* ============================================================
   FORMATTING
   ============================================================ */
function makeFormatters(cur) {
  const full = (v, d = 0) =>
    cur.symbol +
    new Intl.NumberFormat(cur.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(Number.isFinite(v) ? v : 0);

  const compact = (v) => {
    if (cur.code === 'INR') {
      if (v >= 1e7) return `${cur.symbol}${+(v / 1e7).toFixed(2)} Cr`;
      if (v >= 1e5) return `${cur.symbol}${+(v / 1e5).toFixed(2)} L`;
      if (v >= 1e3) return `${cur.symbol}${+(v / 1e3).toFixed(1)}K`;
      return `${cur.symbol}${Math.round(v)}`;
    }
    return (
      cur.symbol +
      new Intl.NumberFormat(cur.locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(v)
    );
  };

  return { full, compact };
}

const formatDuration = (years) => {
  if (!Number.isFinite(years)) return '—';
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 12) return `${y + 1} yr`;
  if (y === 0) return `${m} mo`;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function InterestCalculator() {
  const tool = getToolById('interest-calculator');

  useDocumentTitle(
    'Simple & Compound Interest Calculator — Free Online | toolchest'
  );

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
      'Free simple and compound interest calculator. See total amount, interest earned, a growth chart and a year-by-year breakdown. Yearly, monthly, quarterly or daily compounding. No signup.';

    const scriptId = 'interest-calculator-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Simple & Compound Interest Calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Simple interest calculator',
        'Compound interest calculator',
        'Yearly, half-yearly, quarterly, monthly and daily compounding',
        'Growth chart',
        'Year-by-year breakdown',
        'INR, USD, EUR and GBP',
        'Free, runs in your browser',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [mode, setMode] = useState(DEFAULTS.mode);
  const [principal, setPrincipal] = useState(DEFAULTS.principal);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [years, setYears] = useState(DEFAULTS.years);
  const [months, setMonths] = useState(DEFAULTS.months);
  const [freq, setFreq] = useState(DEFAULTS.freq);
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [copied, setCopied] = useState(false);

  const cur = CURRENCIES.find((c) => c.code === currency);
  const { full, compact } = useMemo(() => makeFormatters(cur), [cur]);

  const P = Math.max(0, num(principal));
  const R = clamp(num(rate), 0, 100);
  const T = clamp(Math.max(0, num(years)) + clamp(num(months), 0, 11) / 12, 0, MAX_YEARS);
  const N = FREQUENCIES.find((f) => f.id === freq).n;

  const result = useMemo(
    () => buildResult({ mode, P, rate: R, t: T, n: N }),
    [mode, P, R, T, N]
  );

  const hasInput = P > 0 && T > 0;
  const interestShare = result.total > 0 ? (result.interest / result.total) * 100 : 0;

  // Comparison note
  const gap = result.compoundTotal - result.simpleTotal;

  const reset = () => {
    setMode(DEFAULTS.mode);
    setPrincipal(DEFAULTS.principal);
    setRate(DEFAULTS.rate);
    setYears(DEFAULTS.years);
    setMonths(DEFAULTS.months);
    setFreq(DEFAULTS.freq);
  };

  const copySummary = async () => {
    const text = [
      `${mode === 'simple' ? 'Simple' : 'Compound'} interest`,
      `Principal: ${full(P)}`,
      `Rate: ${R}% per year`,
      `Time: ${formatDuration(T)}`,
      mode === 'compound' ? `Compounding: ${FREQUENCIES.find((f) => f.id === freq).label}` : null,
      `Interest earned: ${full(result.interest, 2)}`,
      `Total amount: ${full(result.total, 2)}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="ic">
        <div className="ic-grid">
          {/* ---------------- Inputs ---------------- */}
          <section className="ic-card ic-inputs" aria-label="Inputs">
            <div className="ic-tabs" role="tablist">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={mode === m.id}
                  className={`ic-tab ${mode === m.id ? 'active' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Principal */}
            <div className="ic-field">
              <div className="ic-field-head">
                <label htmlFor="ic-principal">Principal amount</label>
                <select
                  className="ic-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Currency"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ic-input">
                <span className="ic-input-prefix">{cur.symbol}</span>
                <input
                  id="ic-principal"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <input
                type="range"
                className="ic-range"
                min="1000"
                max="1000000"
                step="1000"
                value={clamp(P, 1000, 1000000)}
                onChange={(e) => setPrincipal(e.target.value)}
                style={{ '--fill': `${((clamp(P, 1000, 1000000) - 1000) / 999000) * 100}%` }}
                aria-label="Principal slider"
              />
            </div>

            {/* Rate */}
            <div className="ic-field">
              <div className="ic-field-head">
                <label htmlFor="ic-rate">Interest rate (per year)</label>
              </div>
              <div className="ic-input">
                <input
                  id="ic-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
                <span className="ic-input-suffix">%</span>
              </div>
              <input
                type="range"
                className="ic-range"
                min="0"
                max="30"
                step="0.1"
                value={clamp(R, 0, 30)}
                onChange={(e) => setRate(e.target.value)}
                style={{ '--fill': `${(clamp(R, 0, 30) / 30) * 100}%` }}
                aria-label="Rate slider"
              />
            </div>

            {/* Time */}
            <div className="ic-field">
              <div className="ic-field-head">
                <label htmlFor="ic-years">Time period</label>
              </div>
              <div className="ic-row">
                <div className="ic-input">
                  <input
                    id="ic-years"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={MAX_YEARS}
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                  />
                  <span className="ic-input-suffix">years</span>
                </div>
                <div className="ic-input">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="11"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    aria-label="Months"
                  />
                  <span className="ic-input-suffix">months</span>
                </div>
              </div>
              <input
                type="range"
                className="ic-range"
                min="0"
                max="40"
                step="1"
                value={clamp(num(years), 0, 40)}
                onChange={(e) => setYears(e.target.value)}
                style={{ '--fill': `${(clamp(num(years), 0, 40) / 40) * 100}%` }}
                aria-label="Years slider"
              />
            </div>

            {/* Compounding */}
            {mode === 'compound' && (
              <div className="ic-field">
                <div className="ic-field-head">
                  <span className="ic-label">Compounding</span>
                </div>
                <div className="ic-chips">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.id}
                      className={`ic-chip ${freq === f.id ? 'active' : ''}`}
                      onClick={() => setFreq(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="ic-reset" onClick={reset}>
              Reset to defaults
            </button>
          </section>

          {/* ---------------- Results ---------------- */}
          <section className="ic-card ic-results" aria-label="Results" aria-live="polite">
            <div className="ic-hero">
              <span className="ic-hero-label">Total amount</span>
              <span className="ic-hero-value">{hasInput ? full(result.total) : full(P)}</span>
              <span className="ic-hero-sub">
                {hasInput ? (
                  <>
                    You earn <strong>{full(result.interest)}</strong> in interest
                  </>
                ) : (
                  'Enter an amount and a time period'
                )}
              </span>
            </div>

            <div className="ic-split">
              <Donut share={hasInput ? interestShare : 0} />
              <ul className="ic-legend">
                <li>
                  <span className="ic-dot is-principal" />
                  <div>
                    <span className="ic-legend-label">Principal</span>
                    <strong>{full(P)}</strong>
                  </div>
                </li>
                <li>
                  <span className="ic-dot is-interest" />
                  <div>
                    <span className="ic-legend-label">Interest</span>
                    <strong>{hasInput ? full(result.interest) : full(0)}</strong>
                  </div>
                </li>
              </ul>
            </div>

            <div className="ic-stats">
              <div className="ic-stat">
                <span>Interest share</span>
                <strong>{hasInput ? `${interestShare.toFixed(1)}%` : '—'}</strong>
              </div>
              <div className="ic-stat">
                <span>{mode === 'compound' ? 'Effective yearly rate' : 'Yearly interest'}</span>
                <strong>
                  {mode === 'compound'
                    ? `${result.effectiveRate.toFixed(2)}%`
                    : full((P * R) / 100)}
                </strong>
              </div>
              <div className="ic-stat">
                <span>Money doubles in</span>
                <strong>{result.doubling ? formatDuration(result.doubling) : '—'}</strong>
              </div>
            </div>

            <button className="ic-copy" onClick={copySummary} disabled={!hasInput}>
              {copied ? '✓ Copied' : 'Copy summary'}
            </button>
          </section>
        </div>

        {/* ---------------- Chart ---------------- */}
        {hasInput && (
          <section className="ic-card ic-chart" aria-label="Growth chart">
            <div className="ic-card-head">
              <h2>Growth over time</h2>
              {R > 0 && (
                <span className="ic-pill">
                  {mode === 'compound'
                    ? `Compound earns ${full(gap)} more than simple`
                    : `Compounding would add ${full(gap)} more`}
                </span>
              )}
            </div>
            <GrowthChart points={result.points} years={T} compact={compact} />
            <div className="ic-chart-legend">
              <span><i className="ic-line is-compound" /> Compound</span>
              <span><i className="ic-line is-simple" /> Simple</span>
              <span><i className="ic-line is-principal" /> Principal</span>
            </div>
          </section>
        )}

        {/* ---------------- Table ---------------- */}
        {hasInput && result.rows.length > 0 && (
          <section className="ic-card ic-table-card" aria-label="Year-by-year breakdown">
            <details open={result.rows.length <= 12}>
              <summary>
                <h2>Year-by-year breakdown</h2>
                <span className="ic-summary-hint">{result.rows.length} rows</span>
              </summary>
              <div className="ic-table-wrap">
                <table className="ic-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Interest this year</th>
                      <th>Total interest</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td>{full(r.interestYear)}</td>
                        <td>{full(r.interestTotal)}</td>
                        <td className="ic-strong">{full(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}

        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ============================================================
   DONUT
   ============================================================ */
function Donut({ share }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (clamp(share, 0, 100) / 100) * c;
  return (
    <div className="ic-donut" role="img" aria-label={`Interest is ${share.toFixed(0)} percent of the total`}>
      <svg viewBox="0 0 140 140">
        <circle className="ic-donut-track" cx="70" cy="70" r={r} />
        <circle
          className="ic-donut-fill"
          cx="70"
          cy="70"
          r={r}
          strokeDasharray={`${filled} ${c}`}
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="ic-donut-center">
        <strong>{share.toFixed(0)}%</strong>
        <span>interest</span>
      </div>
    </div>
  );
}

/* ============================================================
   GROWTH CHART (plain SVG, no library)
   ============================================================ */
function GrowthChart({ points, years, compact }) {
  const W = 640;
  const H = 260;
  const pad = { l: 8, r: 8, t: 14, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const maxY = Math.max(...points.map((p) => Math.max(p.compound, p.simple))) * 1.06 || 1;
  const minY = points[0].compound; // principal
  const sx = (x) => pad.l + (x / (years || 1)) * iw;
  const sy = (v) => pad.t + ih - ((v - 0) / maxY) * ih;

  const line = (key) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p[key]).toFixed(1)}`).join(' ');

  const area = `${line('compound')} L${sx(points[points.length - 1].x).toFixed(1)} ${sy(0)} L${sx(0)} ${sy(0)} Z`;

  const yTicks = [0, 0.5, 1].map((f) => f * (maxY / 1.06));
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * years);

  return (
    <div className="ic-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Growth of the investment over time">
        <defs>
          <linearGradient id="ic-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line className="ic-grid-line" x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} />
            <text className="ic-axis" x={pad.l + 2} y={sy(v) - 5}>
              {compact(v)}
            </text>
          </g>
        ))}

        {xTicks.map((v, i) => (
          <text
            key={i}
            className="ic-axis"
            x={sx(v)}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          >
            {i === 0 ? '0' : `${+v.toFixed(1)} yr`}
          </text>
        ))}

        <line className="ic-principal-line" x1={pad.l} x2={W - pad.r} y1={sy(minY)} y2={sy(minY)} />
        <path d={area} fill="url(#ic-area)" />
        <path className="ic-simple-line" d={line('simple')} />
        <path className="ic-compound-line" d={line('compound')} />
      </svg>
    </div>
  );
}

/* ============================================================
   SEO CONTENT
   ============================================================ */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Interest Calculator?</h2>
        <p>
          An <strong>interest calculator</strong> shows how much extra money you
          earn (or pay) on top of a principal amount over time. It works for
          fixed deposits, recurring savings, loans, school fees and any other
          money that grows at a fixed rate.
        </p>
        <p>
          This free <strong>simple and compound interest calculator</strong> runs
          in your browser. Enter the principal, the yearly rate and the time
          period, and you instantly see the total amount, the interest earned, a
          growth chart and a year-by-year table. Nothing is uploaded or saved.
        </p>
      </section>

      <section className="seo-section">
        <h2>Formulas Used</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">➕</div>
            <h3>Simple Interest</h3>
            <p>
              <code>SI = P × R × T / 100</code>
              <br />
              Total = <code>P + SI</code>. Interest is always calculated on the
              original principal only.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📈</div>
            <h3>Compound Interest</h3>
            <p>
              <code>A = P × (1 + R / (100 × n)) ^ (n × T)</code>
              <br />
              Interest is added to the principal every period, so you earn
              interest on interest.
            </p>
          </div>
        </div>
        <p style={{ marginTop: 'var(--sp-4)' }}>
          Here <code>P</code> is the principal, <code>R</code> the yearly rate in
          percent, <code>T</code> the time in years and <code>n</code> the number
          of times interest is compounded per year.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick the type</strong> — Compound or Simple interest.
          </li>
          <li>
            <strong>Enter the principal</strong> — type the amount or drag the
            slider. Choose ₹, $, € or £.
          </li>
          <li>
            <strong>Set the rate and time</strong> — yearly interest rate, then
            years and months.
          </li>
          <li>
            <strong>Choose compounding</strong> — yearly, half-yearly,
            quarterly, monthly or daily (compound only).
          </li>
          <li>
            <strong>Read the result</strong> — total amount, interest earned,
            growth chart and the yearly table. Use "Copy summary" to share it.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Simple vs Compound Interest</h2>
        <ul className="seo-list">
          <li>
            <strong>Simple interest</strong> grows in a straight line. It is
            common in short loans, some personal loans and basic deposits.
          </li>
          <li>
            <strong>Compound interest</strong> grows faster each period. Bank
            fixed deposits, mutual funds, PPF and credit cards use it.
          </li>
          <li>
            <strong>More frequent compounding</strong> means slightly more
            interest, because interest is added to the balance more often.
          </li>
          <li>
            <strong>Longer time</strong> widens the gap a lot. Over 20 years the
            difference between the two can be very large.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this calculator free?</summary>
          <p>
            Yes. It is free, needs no signup and has no limits. Everything is
            calculated in your browser.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is the difference between simple and compound interest?</summary>
          <p>
            Simple interest is calculated only on the original amount. Compound
            interest is calculated on the original amount plus the interest
            already earned, so the balance grows faster.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What does the compounding frequency change?</summary>
          <p>
            It decides how often interest is added to the balance. Daily
            compounding gives slightly more than yearly at the same rate. The
            "effective yearly rate" shows the real yearly return after
            compounding.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How is "money doubles in" calculated?</summary>
          <p>
            For simple interest it is <code>100 / R</code> years. For compound
            interest it is the exact time at which the balance reaches twice the
            principal with your chosen compounding.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Will this match my bank's figure exactly?</summary>
          <p>
            It can differ a little. Banks may use different day-count rules,
            round each period, or compound on specific dates. Use this tool for
            a close estimate and check the exact amount with your bank.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work for loans too?</summary>
          <p>
            It shows how interest builds on a single lump sum. For loans with
            monthly instalments, use an EMI calculator, because the balance
            reduces with every payment.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Percentage Calculator</strong>,{' '}
          <strong>Age Calculator</strong>, <strong>BMI Calculator</strong> and{' '}
          <strong>Unit Converter</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}