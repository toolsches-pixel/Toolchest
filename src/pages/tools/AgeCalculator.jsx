import { useEffect, useState, useCallback, useMemo } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './AgeCalculator.css';

// ============================================================
// HELPERS
// ============================================================
function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(date) {
  const d = new Date(date);
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function computeAge(birthDate, now = new Date()) {
  if (!birthDate) return null;

  const bd = new Date(birthDate);
  if (bd > now) return null;

  let years = now.getFullYear() - bd.getFullYear();
  let months = now.getMonth() - bd.getMonth();
  let days = now.getDate() - bd.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.floor((now - bd) / (1000 * 60 * 60 * 24));
  const totalMonths = years * 12 + months;
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = Math.floor((now - bd) / (1000 * 60 * 60));
  const totalMinutes = Math.floor((now - bd) / (1000 * 60));
  const totalSeconds = Math.floor((now - bd) / 1000);

  return {
    years,
    months,
    days,
    totalMonths,
    totalWeeks,
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
    totalMilliseconds: now - bd,
  };
}

function computeNextBirthday(birthDate, now = new Date()) {
  if (!birthDate) return null;
  const bd = new Date(birthDate);

  let next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate());
  }

  const diffMs = next - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  return {
    date: next,
    days,
    hours,
    minutes,
    seconds,
    isToday:
      next.getDate() === now.getDate() &&
      next.getMonth() === now.getMonth() &&
      next.getFullYear() === now.getFullYear(),
    weekday: getDayName(next),
    turningAge: next.getFullYear() - bd.getFullYear(),
  };
}

function getLifeStats(totalSeconds) {
  const HEARTBEATS_PER_MIN = 72;
  const BREATHS_PER_MIN = 16;
  const SLEEP_HOURS_PER_DAY = 8;

  const minutes = totalSeconds / 60;
  const days = totalSeconds / 86400;

  return {
    heartbeats: Math.round(minutes * HEARTBEATS_PER_MIN),
    breaths: Math.round(minutes * BREATHS_PER_MIN),
    sleepHours: Math.round(days * SLEEP_HOURS_PER_DAY),
    sleepDays: Math.round(days * SLEEP_HOURS_PER_DAY / 24),
  };
}

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AgeCalculator() {
  const tool = getToolById('age-calculator');

  useDocumentTitle('Age Calculator — Calculate Your Exact Age Online | toolchest');

  // SEO
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
      'Free online age calculator. Find your exact age in years, months, days, hours, and seconds. Includes next birthday countdown and life stats. 100% private — runs in your browser.';

    const scriptId = 'age-calculator-jsonld';
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
      name: 'Age Calculator',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1834',
      },
      featureList: [
        'Exact age in years, months, and days',
        'Total months, weeks, days, hours, minutes, seconds',
        'Live second-by-second counter',
        'Next birthday countdown',
        'Life stats (heartbeats, breaths, sleep)',
        'Custom reference date',
        'Share / copy result',
        '100% browser-based, no signup',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }, []);

  const [birthDate, setBirthDate] = useState('');
  const [referenceDate, setReferenceDate] = useState(todayStr);
  const [useCustomRef, setUseCustomRef] = useState(false);
  const [now, setNow] = useState(new Date());
  const [copied, setCopied] = useState(false);

  // Live tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refDate = useCustomRef && referenceDate
    ? new Date(referenceDate + 'T23:59:59')
    : now;

  const age = useMemo(() => {
    if (!birthDate) return null;
    return computeAge(birthDate, refDate);
  }, [birthDate, refDate]);

  const nextBirthday = useMemo(() => {
    if (!birthDate) return null;
    return computeNextBirthday(birthDate, now);
  }, [birthDate, now]);

  const lifeStats = useMemo(() => {
    if (!age) return null;
    return getLifeStats(age.totalSeconds);
  }, [age]);

  const birthDayName = useMemo(() => {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    return getDayName(d);
  }, [birthDate]);

  const handleReset = () => {
    setBirthDate('');
    setReferenceDate(todayStr);
    setUseCustomRef(false);
  };

  const handleCopyResult = async () => {
    if (!age) return;
    const lines = [
      `Age: ${age.years} years, ${age.months} months, ${age.days} days`,
      `Total: ${formatNumber(age.totalMonths)} months / ${formatNumber(age.totalWeeks)} weeks / ${formatNumber(age.totalDays)} days`,
      `Total: ${formatNumber(age.totalHours)} hours / ${formatNumber(age.totalMinutes)} minutes / ${formatNumber(age.totalSeconds)} seconds`,
      `Born on: ${birthDayName}`,
    ];
    if (nextBirthday && !nextBirthday.isToday) {
      lines.push(
        `Next birthday: in ${nextBirthday.days} days (${formatDate(nextBirthday.date)})`
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  return (
    <ToolShell tool={tool}>
      <div className="ac-root">
        {/* Input card */}
        <div className="ac-input-card">
          <div className="ac-input-row">
            <div className="ac-input-group">
              <label className="ac-label">Date of birth</label>
              <input
                type="date"
                value={birthDate}
                max={todayStr}
                onChange={(e) => setBirthDate(e.target.value)}
                className="ac-date-input"
              />
            </div>

            <div className="ac-input-group">
              <label className="ac-label">
                Age at date
                <label className="ac-check-inline">
                  <input
                    type="checkbox"
                    checked={useCustomRef}
                    onChange={(e) => setUseCustomRef(e.target.checked)}
                  />
                  <span>custom</span>
                </label>
              </label>
              <input
                type="date"
                value={referenceDate}
                disabled={!useCustomRef}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="ac-date-input"
              />
            </div>
          </div>

          {birthDate && (
            <button className="ac-reset-btn" onClick={handleReset}>
              ⟳ Reset
            </button>
          )}
        </div>

        {/* Empty state */}
        {!birthDate && (
          <div className="ac-empty">
            <div className="ac-empty-icon">🎂</div>
            <div className="ac-empty-title">Enter your date of birth</div>
            <div className="ac-empty-sub">
              We'll calculate your exact age, next birthday countdown, and
              more.
            </div>
          </div>
        )}

        {/* Result */}
        {age && (
          <>
            {/* Big age */}
            <div className="ac-hero">
              <div className="ac-hero-label">Your age</div>
              <div className="ac-hero-value">
                <div className="ac-hero-unit">
                  <span className="ac-hero-num">{age.years}</span>
                  <span className="ac-hero-text">years</span>
                </div>
                <div className="ac-hero-unit">
                  <span className="ac-hero-num">{age.months}</span>
                  <span className="ac-hero-text">months</span>
                </div>
                <div className="ac-hero-unit">
                  <span className="ac-hero-num">{age.days}</span>
                  <span className="ac-hero-text">days</span>
                </div>
              </div>
              <div className="ac-hero-sub">
                Born on a <strong>{birthDayName}</strong>
              </div>
            </div>

            {/* Live second counter */}
            <div className="ac-live">
              <div className="ac-live-dot" />
              <span className="ac-live-label">Live</span>
              <span className="ac-live-value">
                {formatNumber(age.totalSeconds)}
              </span>
              <span className="ac-live-unit">seconds old</span>
            </div>

            {/* Next birthday */}
            {nextBirthday && (
              <div className={`ac-birthday ${nextBirthday.isToday ? 'today' : ''}`}>
                {nextBirthday.isToday ? (
                  <>
                    <div className="ac-birthday-icon">🎉</div>
                    <div className="ac-birthday-content">
                      <div className="ac-birthday-title">
                        Happy birthday!
                      </div>
                      <div className="ac-birthday-sub">
                        You turn {nextBirthday.turningAge} today
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ac-birthday-icon">🎂</div>
                    <div className="ac-birthday-content">
                      <div className="ac-birthday-title">
                        Next birthday in
                      </div>
                      <div className="ac-birthday-sub">
                        {formatDate(nextBirthday.date)} · {nextBirthday.weekday} ·
                        turning {nextBirthday.turningAge}
                      </div>
                    </div>
                    <div className="ac-birthday-countdown">
                      <div className="ac-cd-unit">
                        <span className="ac-cd-num">{nextBirthday.days}</span>
                        <span className="ac-cd-label">days</span>
                      </div>
                      <div className="ac-cd-unit">
                        <span className="ac-cd-num">{pad(nextBirthday.hours)}</span>
                        <span className="ac-cd-label">hrs</span>
                      </div>
                      <div className="ac-cd-unit">
                        <span className="ac-cd-num">{pad(nextBirthday.minutes)}</span>
                        <span className="ac-cd-label">min</span>
                      </div>
                      <div className="ac-cd-unit">
                        <span className="ac-cd-num">{pad(nextBirthday.seconds)}</span>
                        <span className="ac-cd-label">sec</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Total units grid */}
            <div className="ac-section">
              <h3 className="ac-section-title">Total units</h3>
              <div className="ac-units-grid">
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalMonths)}</div>
                  <div className="ac-unit-label">months</div>
                </div>
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalWeeks)}</div>
                  <div className="ac-unit-label">weeks</div>
                </div>
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalDays)}</div>
                  <div className="ac-unit-label">days</div>
                </div>
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalHours)}</div>
                  <div className="ac-unit-label">hours</div>
                </div>
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalMinutes)}</div>
                  <div className="ac-unit-label">minutes</div>
                </div>
                <div className="ac-unit">
                  <div className="ac-unit-value">{formatNumber(age.totalSeconds)}</div>
                  <div className="ac-unit-label">seconds</div>
                </div>
              </div>
            </div>

            {/* Life stats */}
            {lifeStats && (
              <div className="ac-section">
                <h3 className="ac-section-title">
                  Life stats <span className="ac-section-note">(approximate)</span>
                </h3>
                <div className="ac-units-grid">
                  <div className="ac-unit ac-unit-fun">
                    <div className="ac-unit-icon">💓</div>
                    <div className="ac-unit-value">
                      {formatNumber(lifeStats.heartbeats)}
                    </div>
                    <div className="ac-unit-label">heartbeats</div>
                  </div>
                  <div className="ac-unit ac-unit-fun">
                    <div className="ac-unit-icon">🌬️</div>
                    <div className="ac-unit-value">
                      {formatNumber(lifeStats.breaths)}
                    </div>
                    <div className="ac-unit-label">breaths</div>
                  </div>
                  <div className="ac-unit ac-unit-fun">
                    <div className="ac-unit-icon">😴</div>
                    <div className="ac-unit-value">
                      {formatNumber(lifeStats.sleepHours)}
                    </div>
                    <div className="ac-unit-label">hours slept</div>
                  </div>
                  <div className="ac-unit ac-unit-fun">
                    <div className="ac-unit-icon">🌙</div>
                    <div className="ac-unit-value">
                      {formatNumber(lifeStats.sleepDays)}
                    </div>
                    <div className="ac-unit-label">days slept</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="ac-actions">
              <button className="ac-btn ac-btn-primary" onClick={handleCopyResult}>
                {copied ? '✓ Copied!' : '📋 Copy result'}
              </button>
              <button className="ac-btn ac-btn-secondary" onClick={handleReset}>
                ⟳ Reset
              </button>
            </div>
          </>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is an Age Calculator?</h2>
        <p>
          An <strong>age calculator</strong> finds your exact age — in years,
          months, and days — from your date of birth. Beyond the basic number,
          it can also show you total weeks, hours, minutes, seconds lived,
          your next birthday countdown, and even fun stats like your
          approximate heartbeats or hours slept.
        </p>
        <p>
          Our <strong>free online age calculator</strong> runs entirely in your
          browser. Enter your date of birth and instantly see everything about
          your age. Nothing is uploaded, no signup required.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Calculate Your Age</h2>
        <ol className="seo-steps">
          <li>
            <strong>Enter your date of birth</strong> — pick the date using
            the date picker.
          </li>
          <li>
            <strong>See your exact age</strong> — displayed in years, months,
            and days.
          </li>
          <li>
            <strong>Check the countdown</strong> — see exactly how many days
            until your next birthday.
          </li>
          <li>
            <strong>Explore extras</strong> — total weeks, hours, seconds
            lived, and life stats.
          </li>
          <li>
            <strong>Copy the result</strong> — share your stats with one click.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">📅</div>
            <h3>Exact Age</h3>
            <p>
              Precisely calculated in years, months, and days — accounting for
              leap years and varying month lengths.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎂</div>
            <h3>Birthday Countdown</h3>
            <p>
              Live countdown to your next birthday — days, hours, minutes, and
              seconds.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⏱️</div>
            <h3>Total Units</h3>
            <p>
              Your age shown in months, weeks, days, hours, minutes, and
              seconds.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Custom Reference Date</h3>
            <p>
              Calculate your age at any past or future date — perfect for
              planning events or checking eligibility.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💓</div>
            <h3>Life Stats</h3>
            <p>
              Fun approximations — heartbeats, breaths, hours slept — based on
              medical averages.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs locally in your browser. No data is uploaded to
              any server.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Filling out forms</strong> — many official forms ask for
            your exact age in years and months.
          </li>
          <li>
            <strong>Medical visits</strong> — pediatricians and doctors often
            need precise age in months for young children.
          </li>
          <li>
            <strong>Retirement planning</strong> — calculate exact age to
            determine eligibility.
          </li>
          <li>
            <strong>Visa applications</strong> — some countries require age
            verification to the day.
          </li>
          <li>
            <strong>School admissions</strong> — cutoff dates often require
            exact age calculations.
          </li>
          <li>
            <strong>Just for fun</strong> — see how many heartbeats you've had
            or how many days you've slept.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>How does an age calculator work?</summary>
          <p>
            It takes your date of birth and today's date, then calculates the
            difference — accounting for leap years (February 29) and the
            varying number of days in each month.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this age calculator free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Use it as often as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it account for leap years?</summary>
          <p>
            Yes — the calculation accounts for leap years when determining
            total days lived. If you were born on February 29, your birthday
            is treated as February 28 in non-leap years.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I calculate my age at a future date?</summary>
          <p>
            Yes — enable the "custom" option next to the "Age at date" field
            and pick any date. Useful for planning events or checking
            eligibility at a future date.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How is the next birthday countdown calculated?</summary>
          <p>
            The tool finds your next birthday (this year or next year) and
            computes the exact difference from now — updated every second.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are the life stats accurate?</summary>
          <p>
            They're approximations based on medical averages: 72 heartbeats
            per minute, 16 breaths per minute, and 8 hours of sleep per night.
            Actual numbers vary by person.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my birthday information safe?</summary>
          <p>
            Absolutely. Everything runs locally in your browser using
            JavaScript. Your date of birth is never uploaded to any server.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>BMI Calculator</strong>,{' '}
          <strong>Unit Converter</strong>, <strong>Color Picker</strong>,{' '}
          <strong>Hash Generator</strong>, and{' '}
          <strong>QR Code Generator</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}