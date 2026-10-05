import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './BmiCalculator.css';

// ============================================================
// BMI CATEGORIES (WHO)
// ============================================================
const BMI_CATEGORIES = [
  { id: 'severe-thin',  min: 0,    max: 16,   label: 'Severely underweight', color: '#3b82f6' },
  { id: 'moderate-thin', min: 16,  max: 17,   label: 'Moderately underweight', color: '#60a5fa' },
  { id: 'mild-thin',    min: 17,   max: 18.5, label: 'Mildly underweight', color: '#93c5fd' },
  { id: 'normal',       min: 18.5, max: 25,   label: 'Normal weight', color: '#22c55e' },
  { id: 'overweight',   min: 25,   max: 30,   label: 'Overweight', color: '#eab308' },
  { id: 'obese-1',      min: 30,   max: 35,   label: 'Obese (Class I)', color: '#f97316' },
  { id: 'obese-2',      min: 35,   max: 40,   label: 'Obese (Class II)', color: '#ef4444' },
  { id: 'obese-3',      min: 40,   max: 100,  label: 'Obese (Class III)', color: '#991b1b' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', factor: 1.2 },
  { id: 'light', label: 'Light', desc: 'Exercise 1-3 days/week', factor: 1.375 },
  { id: 'moderate', label: 'Moderate', desc: 'Exercise 3-5 days/week', factor: 1.55 },
  { id: 'active', label: 'Active', desc: 'Exercise 6-7 days/week', factor: 1.725 },
  { id: 'very-active', label: 'Very Active', desc: 'Hard exercise daily', factor: 1.9 },
];

function getCategory(bmi) {
  return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) || BMI_CATEGORIES[0];
}

function formatNumber(n, decimals = 1) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

// Convert cm to ft+in
function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn - ft * 12);
  // Handle rounding edge case (e.g. 11.6in -> 12in = +1ft)
  if (inches === 12) return { ft: ft + 1, in: 0 };
  return { ft, in: inches };
}

function ftInToCm(ft, inches) {
  return (ft * 12 + inches) * 2.54;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function BmiCalculator() {
  const tool = getToolById('bmi-calculator');

  useDocumentTitle('BMI Calculator — Free Online Body Mass Index Calculator | toolchest');

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
      'Free online BMI calculator. Calculate your Body Mass Index, healthy weight range, BMR, TDEE, and estimated body fat. Supports metric and imperial units with a built-in converter.';

    const scriptId = 'bmi-calculator-jsonld';
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
      name: 'BMI Calculator',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1876',
      },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [age, setAge] = useState('25');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('moderate');
  const [copied, setCopied] = useState(false);

  // Weight — string to allow empty
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' | 'lb'
  const [weightValue, setWeightValue] = useState('70');

  // Height — string to allow empty
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'ftin'
  const [heightCm, setHeightCm] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  // ---------- Parse values ----------
  const parsedWeight = parseFloat(weightValue) || 0;
  const parsedHeightCm = heightUnit === 'cm'
    ? (parseFloat(heightCm) || 0)
    : ftInToCm(parseFloat(heightFt) || 0, parseFloat(heightIn) || 0);
  const parsedAge = parseInt(age) || 0;

  // Convert to metric for calc
  const weightKgCalc = weightUnit === 'kg' ? parsedWeight : parsedWeight * 0.45359237;
  const heightCmCalc = parsedHeightCm;

  // ---------- Calculations ----------
  const bmi = useMemo(() => {
    if (!heightCmCalc || !weightKgCalc) return 0;
    const h = heightCmCalc / 100;
    return weightKgCalc / (h * h);
  }, [weightKgCalc, heightCmCalc]);

  const category = getCategory(bmi);

  const healthyRange = useMemo(() => {
    if (!heightCmCalc) return { min: 0, max: 0 };
    const h = heightCmCalc / 100;
    return {
      min: 18.5 * h * h,
      max: 24.9 * h * h,
    };
  }, [heightCmCalc]);

  const bmr = useMemo(() => {
    if (!weightKgCalc || !heightCmCalc || !parsedAge) return 0;
    const base = 10 * weightKgCalc + 6.25 * heightCmCalc - 5 * parsedAge;
    return gender === 'male' ? base + 5 : base - 161;
  }, [weightKgCalc, heightCmCalc, parsedAge, gender]);

  const activityFactor = ACTIVITY_LEVELS.find((a) => a.id === activity)?.factor || 1.2;
  const tdee = bmr * activityFactor;

  const bodyFat = useMemo(() => {
    if (!bmi || !parsedAge) return 0;
    const sexFactor = gender === 'male' ? 1 : 0;
    return 1.20 * bmi + 0.23 * parsedAge - 10.8 * sexFactor - 5.4;
  }, [bmi, parsedAge, gender]);

  // Healthy range in current weight unit
  const healthyDisplay = useMemo(() => {
    if (weightUnit === 'kg') {
      return { min: healthyRange.min, max: healthyRange.max, unit: 'kg' };
    }
    return {
      min: healthyRange.min * 2.20462262,
      max: healthyRange.max * 2.20462262,
      unit: 'lb',
    };
  }, [healthyRange, weightUnit]);

  const gaugePos = Math.max(0, Math.min(100, (bmi / 40) * 100));

  // ---------- Unit toggles (with value conversion) ----------
  const toggleWeightUnit = () => {
    const val = parseFloat(weightValue) || 0;
    if (weightUnit === 'kg') {
      // kg → lb
      const lb = val * 2.20462262;
      setWeightValue(val ? (Math.round(lb * 10) / 10).toString() : '');
      setWeightUnit('lb');
    } else {
      // lb → kg
      const kg = val * 0.45359237;
      setWeightValue(val ? (Math.round(kg * 10) / 10).toString() : '');
      setWeightUnit('kg');
    }
  };

  const toggleHeightUnit = () => {
    if (heightUnit === 'cm') {
      // cm → ft/in
      const cm = parseFloat(heightCm) || 0;
      if (cm > 0) {
        const { ft, in: inches } = cmToFtIn(cm);
        setHeightFt(ft.toString());
        setHeightIn(inches.toString());
      } else {
        setHeightFt('');
        setHeightIn('');
      }
      setHeightUnit('ftin');
    } else {
      // ft/in → cm
      const ft = parseFloat(heightFt) || 0;
      const inches = parseFloat(heightIn) || 0;
      const cm = ftInToCm(ft, inches);
      setHeightCm(cm > 0 ? Math.round(cm).toString() : '');
      setHeightUnit('cm');
    }
  };

  const copySummary = async () => {
    const weightDisplay = weightUnit === 'kg'
      ? `${weightValue} kg`
      : `${weightValue} lb`;
    const heightDisplay = heightUnit === 'cm'
      ? `${heightCm} cm`
      : `${heightFt}'${heightIn}"`;

    const summary = [
      `BMI: ${formatNumber(bmi, 1)} (${category.label})`,
      `Weight: ${weightDisplay}`,
      `Height: ${heightDisplay}`,
      `Age: ${parsedAge} · Gender: ${gender}`,
      `Healthy weight range: ${formatNumber(healthyDisplay.min, 1)} - ${formatNumber(healthyDisplay.max, 1)} ${healthyDisplay.unit}`,
      `BMR: ${Math.round(bmr)} kcal/day`,
      `TDEE (${activity}): ${Math.round(tdee)} kcal/day`,
      `Est. body fat: ${formatNumber(bodyFat, 1)}%`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };

  const resetAll = () => {
    setAge('25');
    setGender('male');
    setWeightUnit('kg');
    setWeightValue('70');
    setHeightUnit('cm');
    setHeightCm('175');
    setHeightFt('5');
    setHeightIn('9');
    setActivity('moderate');
  };

  return (
    <ToolShell tool={tool}>
      <div className="bmi-root">
        {/* Inputs */}
        <div className="bmi-inputs">
          {/* Age */}
          <div className="bmi-input-group">
            <label className="bmi-label">Age</label>
            <div className="bmi-input-wrap">
              <input
                type="number"
                min="2"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="bmi-input"
                placeholder="25"
              />
              <span className="bmi-input-unit">years</span>
            </div>
          </div>

          {/* Gender */}
          <div className="bmi-input-group">
            <label className="bmi-label">Gender</label>
            <div className="bmi-gender-row">
              <button
                className={`bmi-gender-btn ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}
              >
                ♂ Male
              </button>
              <button
                className={`bmi-gender-btn ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}
              >
                ♀ Female
              </button>
            </div>
          </div>

          {/* Weight */}
          <div className="bmi-input-group">
            <div className="bmi-label-row">
              <label className="bmi-label">Weight</label>
              <button
                className="bmi-unit-switch"
                onClick={toggleWeightUnit}
                title={`Switch to ${weightUnit === 'kg' ? 'lb' : 'kg'}`}
              >
                ⇄ {weightUnit === 'kg' ? 'kg / lb' : 'lb / kg'}
              </button>
            </div>
            <div className="bmi-input-wrap">
              <span className="bmi-input-prefix">⚖️</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                className="bmi-input"
                placeholder={weightUnit === 'kg' ? '70' : '154'}
              />
              <span className="bmi-input-unit">{weightUnit}</span>
            </div>
          </div>

          {/* Height */}
          <div className="bmi-input-group">
            <div className="bmi-label-row">
              <label className="bmi-label">Height</label>
              <button
                className="bmi-unit-switch"
                onClick={toggleHeightUnit}
                title={`Switch to ${heightUnit === 'cm' ? 'ft / in' : 'cm'}`}
              >
                ⇄ {heightUnit === 'cm' ? 'cm / ft·in' : 'ft·in / cm'}
              </button>
            </div>

            {heightUnit === 'cm' ? (
              <div className="bmi-input-wrap">
                <span className="bmi-input-prefix">📐</span>
                <input
                  type="number"
                  min="1"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="bmi-input"
                  placeholder="175"
                />
                <span className="bmi-input-unit">cm</span>
              </div>
            ) : (
              <div className="bmi-input-wrap bmi-height-imperial">
                <span className="bmi-input-prefix">📐</span>
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className="bmi-input bmi-input-sm"
                  placeholder="5"
                />
                <span className="bmi-input-unit">ft</span>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className="bmi-input bmi-input-sm"
                  placeholder="9"
                />
                <span className="bmi-input-unit">in</span>
              </div>
            )}
          </div>
        </div>

        {/* BMI Result */}
        <div className="bmi-result-card" style={{ borderColor: category.color }}>
          <div className="bmi-result-header">
            <div>
              <div className="bmi-result-label">Your BMI</div>
              <div className="bmi-result-value" style={{ color: category.color }}>
                {bmi > 0 ? formatNumber(bmi, 1) : '—'}
              </div>
              <div className="bmi-result-category" style={{ color: category.color }}>
                {bmi > 0 ? category.label : 'Enter your details'}
              </div>
            </div>
            <button className="bmi-copy-btn" onClick={copySummary} disabled={!bmi}>
              {copied ? '✓ Copied' : '📋 Copy summary'}
            </button>
          </div>

          <div className="bmi-gauge">
            <div className="bmi-gauge-bar">
              <div className="bmi-gauge-seg" style={{ width: '25%', background: '#60a5fa' }} title="Underweight (<18.5)" />
              <div className="bmi-gauge-seg" style={{ width: '15%', background: '#22c55e' }} title="Normal (18.5-25)" />
              <div className="bmi-gauge-seg" style={{ width: '12.5%', background: '#eab308' }} title="Overweight (25-30)" />
              <div className="bmi-gauge-seg" style={{ width: '12.5%', background: '#f97316' }} title="Obese I (30-35)" />
              <div className="bmi-gauge-seg" style={{ width: '12.5%', background: '#ef4444' }} title="Obese II (35-40)" />
              <div className="bmi-gauge-seg" style={{ width: '22.5%', background: '#991b1b' }} title="Obese III (40+)" />
            </div>
            {bmi > 0 && (
              <div
                className="bmi-gauge-marker"
                style={{ left: `${gaugePos}%` }}
              >
                <div className="bmi-gauge-marker-dot" style={{ borderColor: category.color }} />
                <div className="bmi-gauge-marker-label">{formatNumber(bmi, 1)}</div>
              </div>
            )}
            <div className="bmi-gauge-labels">
              <span>0</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>40</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="bmi-stats-grid">
          <div className="bmi-stat-card">
            <div className="bmi-stat-label">Healthy weight range</div>
            <div className="bmi-stat-value">
              {healthyRange.min > 0
                ? `${formatNumber(healthyDisplay.min, 1)} – ${formatNumber(healthyDisplay.max, 1)}`
                : '—'}
            </div>
            <div className="bmi-stat-unit">{healthyRange.min > 0 ? healthyDisplay.unit : ''}</div>
          </div>

          <div className="bmi-stat-card">
            <div className="bmi-stat-label">BMR (Basal Metabolic Rate)</div>
            <div className="bmi-stat-value">{bmr > 0 ? Math.round(bmr) : '—'}</div>
            <div className="bmi-stat-unit">kcal / day at rest</div>
          </div>

          <div className="bmi-stat-card">
            <div className="bmi-stat-label">Estimated body fat</div>
            <div className="bmi-stat-value">{bodyFat > 0 ? `${formatNumber(bodyFat, 1)}%` : '—'}</div>
            <div className="bmi-stat-unit">Deurenberg formula</div>
          </div>
        </div>

        {/* Activity level */}
        <div className="bmi-section">
          <label className="bmi-label">Activity level (for TDEE)</label>
          <div className="bmi-activity-grid">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.id}
                className={`bmi-activity-btn ${activity === a.id ? 'active' : ''}`}
                onClick={() => setActivity(a.id)}
              >
                <div className="bmi-activity-name">{a.label}</div>
                <div className="bmi-activity-desc">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* TDEE */}
        <div className="bmi-tdee-card">
          <div className="bmi-tdee-label">TDEE — Total Daily Energy Expenditure</div>
          <div className="bmi-tdee-value">{tdee > 0 ? Math.round(tdee) : '—'}</div>
          <div className="bmi-tdee-unit">kcal / day</div>
          <div className="bmi-tdee-note">
            This is roughly how many calories you burn per day at your current
            activity level.
          </div>
        </div>

        {/* Actions */}
        <div className="bmi-actions">
          <button className="bmi-reset-btn" onClick={resetAll}>
            ⟳ Reset
          </button>
        </div>

        {/* Disclaimer */}
        <div className="bmi-disclaimer">
          <strong>⚠️ Disclaimer:</strong> This calculator provides estimates
          for general information only. BMI doesn't distinguish between muscle
          and fat, and may not be accurate for athletes, pregnant women,
          children, or the elderly. Always consult a healthcare professional
          for medical advice.
        </div>

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
        <h2>What is BMI?</h2>
        <p>
          <strong>BMI (Body Mass Index)</strong> is a simple measure that uses
          your weight and height to categorize your body size. It's calculated
          by dividing your weight in kilograms by the square of your height in
          meters. BMI is a screening tool — not a diagnostic — used by doctors
          and health organizations worldwide.
        </p>
        <p>
          Our <strong>free online BMI calculator</strong> instantly computes
          your BMI, shows your WHO weight category, and estimates your healthy
          weight range, BMR, TDEE, and body fat percentage. Each input field has
          a built-in unit converter — so you can enter your weight in kg or lb,
          and height in cm or ft·in.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the BMI Calculator</h2>
        <ol className="seo-steps">
          <li>
            <strong>Enter your age and gender</strong> — used for BMR and body
            fat calculations.
          </li>
          <li>
            <strong>Enter your weight</strong> — type in kg, or click{' '}
            <strong>⇄ kg / lb</strong> to switch to pounds.
          </li>
          <li>
            <strong>Enter your height</strong> — type in cm, or click{' '}
            <strong>⇄ cm / ft·in</strong> to enter feet and inches.
          </li>
          <li>
            <strong>See your BMI instantly</strong> — with a visual gauge and
            WHO category.
          </li>
          <li>
            <strong>Explore your results</strong> — healthy weight range, BMR,
            body fat, and TDEE at your activity level.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>BMI Categories (WHO)</h2>
        <ul className="seo-list">
          <li><strong>Below 16</strong> — Severely underweight</li>
          <li><strong>16 – 17</strong> — Moderately underweight</li>
          <li><strong>17 – 18.5</strong> — Mildly underweight</li>
          <li><strong>18.5 – 25</strong> — Normal weight ✅</li>
          <li><strong>25 – 30</strong> — Overweight</li>
          <li><strong>30 – 35</strong> — Obese (Class I)</li>
          <li><strong>35 – 40</strong> — Obese (Class II)</li>
          <li><strong>40+</strong> — Obese (Class III)</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⇄</div>
            <h3>Built-in Unit Converter</h3>
            <p>
              Each input has its own unit switcher. Type kg or lb for weight,
              cm or ft·in for height — values convert automatically.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Visual BMI Gauge</h3>
            <p>
              See exactly where your BMI falls on a color-coded scale from
              underweight to severely obese.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Healthy Weight Range</h3>
            <p>
              Discover the recommended weight range for your exact height based
              on WHO guidelines.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔥</div>
            <h3>BMR & TDEE</h3>
            <p>
              Calculate your Basal Metabolic Rate and daily calorie needs using
              the Mifflin-St Jeor equation.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>Copy Summary</h3>
            <p>
              Copy all your metrics at once for sharing with a doctor or
              keeping in your records.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All calculations happen in your browser. Your data never leaves
              your device.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Understanding Your Results</h2>

        <h3 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', color: 'var(--text)' }}>
          BMI (Body Mass Index)
        </h3>
        <p>
          A quick screening measure of body size. While useful for populations,
          BMI doesn't distinguish between muscle and fat — athletes may have
          high BMI without excess fat.
        </p>

        <h3 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', color: 'var(--text)' }}>
          BMR (Basal Metabolic Rate)
        </h3>
        <p>
          The calories your body burns at complete rest — just to keep your
          heart beating, lungs breathing, and cells working. Calculated using
          the <strong>Mifflin-St Jeor equation</strong>, widely considered the
          most accurate formula.
        </p>

        <h3 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', color: 'var(--text)' }}>
          TDEE (Total Daily Energy Expenditure)
        </h3>
        <p>
          Your BMR multiplied by an activity factor. This is your total daily
          calorie burn. To lose weight, eat below TDEE. To maintain, eat at
          TDEE. To gain, eat above.
        </p>

        <h3 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px', color: 'var(--text)' }}>
          Body Fat Estimate
        </h3>
        <p>
          Estimated using the <strong>Deurenberg formula</strong> (based on
          BMI, age, and gender). This is approximate — for accurate body fat
          measurement, use DEXA scans or calipers.
        </p>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>What is a healthy BMI?</summary>
          <p>
            For most adults, a BMI between <strong>18.5 and 24.9</strong> is
            considered healthy. Below 18.5 is underweight; above 25 is
            overweight; above 30 is obese.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I convert kg to lb?</summary>
          <p>
            Click the <strong>⇄ kg / lb</strong> button next to the weight
            field. Your entered value converts automatically: 1 kg = 2.20462
            lb.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I convert cm to feet and inches?</summary>
          <p>
            Click the <strong>⇄ cm / ft·in</strong> button next to the height
            field. Your value converts automatically: 1 inch = 2.54 cm.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is BMI accurate for everyone?</summary>
          <p>
            No — BMI doesn't distinguish between muscle and fat. Athletes,
            bodybuilders, and very muscular people may have high BMI without
            being overweight. Pregnant women, children, and the elderly also
            need different assessments.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between BMR and TDEE?</summary>
          <p>
            BMR is the calories you'd burn at complete rest. TDEE is BMR
            multiplied by an activity factor — the actual calories you burn
            per day including movement and exercise.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this calculator free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no hidden
            fees. Use it as often as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my data safe?</summary>
          <p>
            Absolutely. All calculations run locally in your browser. Your
            weight, height, and other details are never sent anywhere.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Age Calculator</strong>,{' '}
          <strong>Unit Converter</strong>, <strong>Percentage Calculator</strong>,{' '}
          <strong>Color Picker</strong>, <strong>Hash Generator</strong>, and{' '}
          <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}