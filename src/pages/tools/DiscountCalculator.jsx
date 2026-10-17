import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './DiscountCalculator.css';

/* ============================================================
   CONFIG
   ============================================================ */
const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
];

const QUICK_DISCOUNTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

const GST_RATES = [0, 5, 12, 18, 28];

const DEFAULTS = {
  price: '1999',
  discount: '30',
  discount2: '',
  gst: '0',
  currency: 'INR',
};

/* ============================================================
   MATH
   ============================================================ */
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function computeResult({ price, discount1, discount2, gst }) {
  const p = Math.max(0, price);
  const d1 = clamp(discount1, 0, 100);
  const d2 = clamp(discount2, 0, 100);
  const g = clamp(gst, 0, 100);

  // Step 1: first discount
  const afterD1 = p * (1 - d1 / 100);
  const saving1 = p - afterD1;

  // Step 2: second discount (stacked) — applied on afterD1
  const afterD2 = d2 > 0 ? afterD1 * (1 - d2 / 100) : afterD1;
  const saving2 = afterD1 - afterD2;

  const subtotal = afterD2;

  // GST — added on top of discounted subtotal
  const gstAmount = subtotal * (g / 100);
  const final = subtotal + gstAmount;

  const totalSaved = p - subtotal;
  const effectiveDiscount = p > 0 ? (totalSaved / p) * 100 : 0;

  return {
    originalPrice: p,
    afterD1,
    afterD2,
    subtotal,
    gstAmount,
    final,
    saving1,
    saving2,
    totalSaved,
    effectiveDiscount,
    isStacked: d2 > 0,
    hasGst: g > 0,
  };
}

/* ============================================================
   FORMATTERS
   ============================================================ */
function makeFormatters(cur) {
  const full = (v, d = 0) =>
    cur.symbol +
    new Intl.NumberFormat(cur.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(Number.isFinite(v) ? v : 0);

  return { full };
}

/* ============================================================
   COMPONENT
   ============================================================ */
export default function DiscountCalculator() {
  const tool = getToolById('discount-calculator');

  useDocumentTitle(
    'Discount Calculator — Sale Price & Savings | toolchest'
  );

  /* SEO */
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
      'Free discount calculator. Instantly see the final sale price, the amount you save and the effective discount after stacked discounts and GST. Runs in your browser, no signup.';

    const scriptId = 'discount-calculator-jsonld';
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
      name: 'Discount Calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Calculate sale price and savings',
        'Stacked discounts',
        'Optional GST / tax',
        'Effective discount %',
        'INR, USD, EUR, GBP',
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

  const [price, setPrice] = useState(DEFAULTS.price);
  const [discount, setDiscount] = useState(DEFAULTS.discount);
  const [discount2, setDiscount2] = useState(DEFAULTS.discount2);
  const [gst, setGst] = useState(DEFAULTS.gst);
  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [copied, setCopied] = useState(false);

  const cur = CURRENCIES.find((c) => c.code === currency);
  const { full } = useMemo(() => makeFormatters(cur), [cur]);

  const P = Math.max(0, num(price));
  const D1 = clamp(num(discount), 0, 100);
  const D2 = clamp(num(discount2), 0, 100);
  const G = clamp(num(gst), 0, 100);

  const result = useMemo(
    () => computeResult({ price: P, discount1: D1, discount2: D2, gst: G }),
    [P, D1, D2, G]
  );

  const hasInput = P > 0 && (D1 > 0 || D2 > 0);

  const reset = () => {
    setPrice(DEFAULTS.price);
    setDiscount(DEFAULTS.discount);
    setDiscount2(DEFAULTS.discount2);
    setGst(DEFAULTS.gst);
  };

  const copySummary = async () => {
    const lines = [
      `Original price: ${full(P, 2)}`,
      `Discount${D2 > 0 ? 's' : ''}: ${D1}%${D2 > 0 ? ` + ${D2}%` : ''}`,
      `You save: ${full(result.totalSaved, 2)} (${result.effectiveDiscount.toFixed(1)}%)`,
      result.hasGst ? `GST (${G}%): ${full(result.gstAmount, 2)}` : null,
      `Final price: ${full(result.final, 2)}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ToolShell tool={tool}>
      <div className="dc">
        <div className="dc-grid">
          {/* ---------------- Inputs ---------------- */}
          <section className="dc-card dc-inputs" aria-label="Inputs">
            {/* Price */}
            <div className="dc-field">
              <div className="dc-field-head">
                <label htmlFor="dc-price">Original price</label>
                <select
                  className="dc-currency"
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
              <div className="dc-input">
                <span className="dc-input-prefix">{cur.symbol}</span>
                <input
                  id="dc-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Discount 1 */}
            <div className="dc-field">
              <div className="dc-field-head">
                <label htmlFor="dc-discount">Discount</label>
              </div>
              <div className="dc-input">
                <input
                  id="dc-discount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <span className="dc-input-suffix">%</span>
              </div>
              <div className="dc-chips">
                {QUICK_DISCOUNTS.map((d) => (
                  <button
                    key={d}
                    className={`dc-chip ${D1 === d ? 'active' : ''}`}
                    onClick={() => setDiscount(String(d))}
                  >
                    {d}%
                  </button>
                ))}
              </div>
            </div>

            {/* Discount 2 (optional) */}
            <div className="dc-field">
              <div className="dc-field-head">
                <label htmlFor="dc-discount2">
                  Additional discount{' '}
                  <span className="dc-field-hint">(stacked)</span>
                </label>
              </div>
              <div className="dc-input">
                <input
                  id="dc-discount2"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discount2}
                  onChange={(e) => setDiscount2(e.target.value)}
                  placeholder="Optional"
                />
                <span className="dc-input-suffix">%</span>
              </div>
              <p className="dc-hint">
                Buy 1 Get 1 style offers or coupons often stack on top of the
                main sale price.
              </p>
            </div>

            {/* GST */}
            <div className="dc-field">
              <div className="dc-field-head">
                <label htmlFor="dc-gst">GST / Tax</label>
              </div>
              <div className="dc-input">
                <input
                  id="dc-gst"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                />
                <span className="dc-input-suffix">%</span>
              </div>
              <div className="dc-chips">
                {GST_RATES.map((r) => (
                  <button
                    key={r}
                    className={`dc-chip ${G === r ? 'active' : ''}`}
                    onClick={() => setGst(String(r))}
                  >
                    {r === 0 ? 'None' : `${r}%`}
                  </button>
                ))}
              </div>
            </div>

            <button className="dc-reset" onClick={reset}>
              Reset to defaults
            </button>
          </section>

          {/* ---------------- Results ---------------- */}
          <section
            className="dc-card dc-results"
            aria-label="Results"
            aria-live="polite"
          >
            <div className="dc-hero">
              <span className="dc-hero-label">You pay</span>
              <span className="dc-hero-value">
                {hasInput ? full(result.final) : full(P)}
              </span>
              <span className="dc-hero-sub">
                {hasInput ? (
                  <>
                    You save{' '}
                    <strong>{full(result.totalSaved)}</strong> on{' '}
                    {full(P)} ({result.effectiveDiscount.toFixed(1)}% off)
                  </>
                ) : (
                  'Enter a price and a discount to begin'
                )}
              </span>
            </div>

            <div className="dc-stats">
              <div className="dc-stat">
                <span>Original price</span>
                <strong>{full(P)}</strong>
              </div>
              <div className="dc-stat">
                <span>Total discount</span>
                <strong>{hasInput ? `${result.effectiveDiscount.toFixed(1)}%` : '—'}</strong>
              </div>
              <div className="dc-stat">
                <span>You save</span>
                <strong className="dc-stat-accent">
                  {hasInput ? full(result.totalSaved) : full(0)}
                </strong>
              </div>
            </div>

            {result.isStacked && (
              <div className="dc-breakdown">
                <div className="dc-breakdown-title">Price breakdown</div>
                <div className="dc-breakdown-row">
                  <span>Original price</span>
                  <strong>{full(P, 2)}</strong>
                </div>
                <div className="dc-breakdown-row">
                  <span>After {D1}% off</span>
                  <strong>{full(result.afterD1, 2)}</strong>
                </div>
                <div className="dc-breakdown-row">
                  <span>After additional {D2}% off</span>
                  <strong>{full(result.afterD2, 2)}</strong>
                </div>
                {result.hasGst && (
                  <div className="dc-breakdown-row">
                    <span>GST ({G}%)</span>
                    <strong>+ {full(result.gstAmount, 2)}</strong>
                  </div>
                )}
                <div className="dc-breakdown-row dc-breakdown-total">
                  <span>Final price</span>
                  <strong>{full(result.final, 2)}</strong>
                </div>
              </div>
            )}

            {!result.isStacked && result.hasGst && (
              <div className="dc-breakdown">
                <div className="dc-breakdown-title">Price breakdown</div>
                <div className="dc-breakdown-row">
                  <span>Original price</span>
                  <strong>{full(P, 2)}</strong>
                </div>
                <div className="dc-breakdown-row">
                  <span>Discount ({D1}%)</span>
                  <strong>− {full(result.saving1, 2)}</strong>
                </div>
                <div className="dc-breakdown-row">
                  <span>GST ({G}%)</span>
                  <strong>+ {full(result.gstAmount, 2)}</strong>
                </div>
                <div className="dc-breakdown-row dc-breakdown-total">
                  <span>Final price</span>
                  <strong>{full(result.final, 2)}</strong>
                </div>
              </div>
            )}

            <button
              className="dc-copy"
              onClick={copySummary}
              disabled={!hasInput}
            >
              {copied ? '✓ Copied' : 'Copy summary'}
            </button>
          </section>
        </div>

        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ============================================================
   SEO CONTENT
   ============================================================ */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Discount Calculator?</h2>
        <p>
          A <strong>discount calculator</strong> shows exactly how much you
          pay after a sale discount, and how much you save compared to the
          original price. Enter any price and a percentage off — the result
          updates instantly, including the effective discount.
        </p>
        <p>
          Our <strong>free discount calculator</strong> also handles{' '}
          <strong>stacked discounts</strong> (like 30% + 10% off) and optional
          GST. Everything runs in your browser — no signup, no upload.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use</h2>
        <ol className="seo-steps">
          <li>
            <strong>Enter the original price</strong> — type the amount or pick
            your currency (₹, $, €, £).
          </li>
          <li>
            <strong>Choose a discount</strong> — type any % or use quick chips
            (5%, 10%, 25% ...).
          </li>
          <li>
            <strong>Add extra discount (optional)</strong> — for stacked offers
            like "extra 10% off at checkout".
          </li>
          <li>
            <strong>Add GST (optional)</strong> — if the price is listed
            pre-tax.
          </li>
          <li>
            <strong>Read the result</strong> — final price, amount saved and
            effective discount. Copy the summary in one click.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Formulas Used</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🏷️</div>
            <h3>Single Discount</h3>
            <p>
              Final = <code>Price × (1 − Discount ÷ 100)</code>
              <br />
              Savings = <code>Price − Final</code>
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎁</div>
            <h3>Stacked Discounts</h3>
            <p>
              Second discount applies on the <em>already discounted</em>{' '}
              price, not on the original. So 30% + 10% is <strong>37%</strong>{' '}
              effective, not 40%.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Uses</h2>
        <ul className="seo-list">
          <li>
            <strong>Sale shopping</strong> — quickly see if that 40% off deal
            is really worth it.
          </li>
          <li>
            <strong>Stacked offers</strong> — calculate the real discount when
            two offers apply.
          </li>
          <li>
            <strong>GST-aware pricing</strong> — see the final bill with tax
            included.
          </li>
          <li>
            <strong>Budgeting</strong> — plan how much you can really spend on
            a sale.
          </li>
          <li>
            <strong>Business / retail</strong> — verify discount math for
            pricing sheets.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this discount calculator free?</summary>
          <p>
            Yes — completely free, no signup, no limits. Runs in your browser.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do stacked discounts work?</summary>
          <p>
            The second discount is applied to the <em>already-discounted</em>{' '}
            price. For example, on a ₹1000 item with 20% + 10% off: first 20%
            gives ₹800, then 10% on ₹800 gives ₹720. You save ₹280 total —
            that's 28%, not 30%.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the GST come before or after the discount?</summary>
          <p>
            In retail, GST is normally applied on the discounted price — that's
            how this calculator works. If your store charges GST on the
            original price, adjust accordingly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is "effective discount"?</summary>
          <p>
            It's the total percentage you saved compared to the original price,
            after all discounts. For 30% + 10% stacked, the effective discount
            is around 37% — not 40%.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for business pricing?</summary>
          <p>
            Yes — it's a great tool to check that discount math and
            margin/GST calculations add up before you publish a sale.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does my data leave my device?</summary>
          <p>
            No. Everything is calculated locally in your browser. Nothing is
            uploaded or stored anywhere.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Interest Calculator</strong>,{' '}
          <strong>Percentage Calculator</strong>,{' '}
          <strong>Unit Converter</strong>, and <strong>EMI Calculator</strong>{' '}
          — all free and browser-based.
        </p>
      </section>
    </article>
  );
}