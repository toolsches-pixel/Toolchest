import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './LongMethodCalculator.css';

/* ============================================================
   CONFIG
   ============================================================ */
const OPERATIONS = [
  { id: 'add', label: 'Addition', icon: '➕', symbol: '+' },
  { id: 'subtract', label: 'Subtraction', icon: '➖', symbol: '−' },
  { id: 'multiply', label: 'Multiplication', icon: '✖️', symbol: '×' },
  { id: 'divide', label: 'Division', icon: '➗', symbol: '÷' },
  { id: 'modulo', label: 'Modulo', icon: '%', symbol: 'mod' },
  { id: 'lcm', label: 'LCM', icon: '🔗', symbol: 'LCM' },
  { id: 'hcf', label: 'HCF / GCD', icon: '🧩', symbol: 'HCF' },
];

const METHODS = [
  { id: 'long', label: 'Long Method', desc: 'Step-by-step solution' },
  { id: 'normal', label: 'Normal', desc: 'Direct answer' },
];

const MAX_NUMBERS = 6;

const DEFAULTS = {
  operation: 'add',
  method: 'long',
  numbers: ['124', '245'],
};

/* ============================================================
   MATH HELPERS
   ============================================================ */
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
};

const lcm = (a, b) => {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
};

const gcdMultiple = (nums) => nums.reduce((acc, n) => gcd(acc, Math.abs(n)), 0);
const lcmMultiple = (nums) => nums.reduce((acc, n) => lcm(acc, Math.abs(n)), 1);

/* ============================================================
   LONG METHOD SOLVERS
   ============================================================ */
function longAddition(nums) {
  const maxLen = Math.max(...nums.map((n) => n.toString().length));
  const padded = nums.map((n) => n.toString().padStart(maxLen, ' '));
  const reversedStrs = nums.map((n) =>
    n.toString().split('').reverse().map(Number)
  );

  const columnSums = [];
  const carries = [];
  let carry = 0;
  for (let i = 0; i < maxLen; i++) {
    const sum = reversedStrs.reduce((acc, digits) => acc + (digits[i] || 0), 0) + carry;
    columnSums.push(sum % 10);
    const newCarry = Math.floor(sum / 10);
    carries.push(newCarry);
    carry = newCarry;
  }
  if (carry > 0) columnSums.push(carry);

  const result = columnSums.reverse().join('');
  return { padded, columnSums, carries, result };
}

function longSubtraction(a, b) {
  // Handle a < b (result negative)
  const negative = a < b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);

  const maxLen = big.toString().length;
  const bigStr = big.toString();
  const smallStr = small.toString().padStart(maxLen, ' ');

  const bigDigits = bigStr.split('').map(Number);
  const smallDigits = smallStr.split('').map((c) => (c === ' ' ? 0 : Number(c)));

  const borrows = [];
  const resultDigits = [];
  let borrow = 0;

  for (let i = maxLen - 1; i >= 0; i--) {
    let top = bigDigits[i] - borrow;
    const bottom = smallDigits[i];
    if (top < bottom) {
      top += 10;
      borrows[i] = 1;
      borrow = 1;
    } else {
      borrows[i] = 0;
      borrow = 0;
    }
    resultDigits[i] = top - bottom;
  }

  const result = (negative ? '-' : '') + resultDigits.join('').replace(/^0+/, '') || '0';
  return { bigStr, smallStr, big, small, borrows, result };
}

function longMultiplication(a, b) {
  const aStr = a.toString();
  const bStr = b.toString();
  const aDigits = aStr.split('').reverse().map(Number);
  const bDigits = bStr.split('').reverse().map(Number);

  const partials = [];
  for (let i = 0; i < bDigits.length; i++) {
    const digit = bDigits[i];
    const partial = aDigits.map((d) => d * digit);
    partials.push({ digit, digits: partial, shift: i });
  }

  // Add partials
  const maxLen = Math.max(...partials.map((p) => p.digits.length + p.shift)) + 2;
  const sums = new Array(maxLen).fill(0);
  partials.forEach((p) => {
    p.digits.forEach((d, idx) => {
      sums[idx + p.shift] += d;
    });
  });
  // Carry
  let carry = 0;
  for (let i = 0; i < sums.length; i++) {
    const total = sums[i] + carry;
    sums[i] = total % 10;
    carry = Math.floor(total / 10);
  }
  if (carry > 0) sums.push(carry);

  const result = sums.reverse().join('').replace(/^0+/, '') || '0';
  return { aStr, bStr, partials, result };
}

function longDivision(dividend, divisor) {
  if (divisor === 0) {
    return { error: 'Cannot divide by zero' };
  }

  const dividendStr = dividend.toString();
  const divisorStr = divisor.toString();
  const steps = [];
  let current = 0;
  let quotient = '';
  let remainder = 0;

  for (let i = 0; i < dividendStr.length; i++) {
    current = current * 10 + parseInt(dividendStr[i], 10);
    const digit = Math.floor(current / divisor);
    quotient += digit;
    const product = digit * divisor;
    const remainderNow = current - product;
    steps.push({
      position: i,
      current,
      digit,
      product,
      remainder: remainderNow,
      digitStr: dividendStr[i],
    });
    current = remainderNow;
  }

  remainder = current;
  return {
    dividendStr,
    divisorStr,
    steps,
    quotient: quotient.replace(/^0+/, '') || '0',
    remainder,
  };
}

/* ============================================================
   FORMATTING
   ============================================================ */
const formatNumber = (n) => {
  if (typeof n !== 'number' || !isFinite(n)) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function LongMethodCalculator() {
  const tool = getToolById('long-method-calculator');

  useDocumentTitle('Long Method Calculator — Step by Step Math | toolchest');

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
      'Free long method calculator. Add, subtract, multiply, divide, modulo, LCM and HCF with step-by-step solutions — like you would on paper. Perfect for students and teachers.';

    const scriptId = 'long-method-calculator-jsonld';
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
      name: 'Long Method Calculator',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Long addition with columns',
        'Long subtraction with borrowing',
        'Long multiplication',
        'Long division with steps',
        'Modulo, LCM and HCF',
        'Step-by-step solution',
        'Normal (direct answer) mode',
        'Free, browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [operation, setOperation] = useState(DEFAULTS.operation);
  const [method, setMethod] = useState(DEFAULTS.method);
  const [numbers, setNumbers] = useState(DEFAULTS.numbers);

  const isBinary = ['subtract', 'divide', 'modulo'].includes(operation);

  // Auto-trim: binary ops only use first 2 numbers
  const activeNumbers = isBinary
    ? numbers.slice(0, 2)
    : numbers;

  const updateNumber = (idx, val) => {
    const next = [...numbers];
    next[idx] = val;
    setNumbers(next);
  };

  const addNumber = () => {
    if (numbers.length >= MAX_NUMBERS) return;
    setNumbers([...numbers, '']);
  };

  const removeNumber = (idx) => {
    if (numbers.length <= 2) return;
    setNumbers(numbers.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setOperation(DEFAULTS.operation);
    setMethod(DEFAULTS.method);
    setNumbers(DEFAULTS.numbers);
  };

  /* ============================================================
     SOLVE
     ============================================================ */
  const solution = useMemo(() => {
    const nums = activeNumbers.map((n) => parseFloat(n)).filter((n) => Number.isFinite(n));
    if (nums.length < 2) return null;

    try {
      if (operation === 'add') {
        const longData = method === 'long' ? longAddition(nums.map((n) => Math.floor(n))) : null;
        const total = nums.reduce((a, b) => a + b, 0);
        return { type: 'add', nums, longData, result: total };
      }

      if (operation === 'subtract') {
        const longData = method === 'long' ? longSubtraction(Math.floor(nums[0]), Math.floor(nums[1])) : null;
        return { type: 'subtract', nums, longData, result: nums[0] - nums[1] };
      }

      if (operation === 'multiply') {
        const longData = method === 'long'
          ? numbers.slice(0, 2).map((n) => longMultiplication(Math.floor(parseFloat(n)), Math.floor(parseFloat(activeNumbers[1]))))
          : null;
        const product = nums.reduce((a, b) => a * b, 1);
        const longMul = method === 'long'
          ? longMultiplication(Math.floor(nums[0]), Math.floor(nums[1]))
          : null;
        return { type: 'multiply', nums, longData: longMul, result: product };
      }

      if (operation === 'divide') {
        const longData = method === 'long' ? longDivision(Math.floor(nums[0]), Math.floor(nums[1])) : null;
        if (nums[1] === 0) return { type: 'divide', nums, error: 'Cannot divide by zero' };
        return { type: 'divide', nums, longData, result: nums[0] / nums[1] };
      }

      if (operation === 'modulo') {
        if (nums[1] === 0) return { type: 'modulo', nums, error: 'Cannot modulo by zero' };
        return { type: 'modulo', nums, result: nums[0] % nums[1] };
      }

      if (operation === 'lcm') {
        const result = lcmMultiple(nums.map((n) => Math.floor(n)));
        return { type: 'lcm', nums, result };
      }

      if (operation === 'hcf') {
        const result = gcdMultiple(nums.map((n) => Math.floor(n)));
        return { type: 'hcf', nums, result };
      }

      return null;
    } catch (err) {
      return { type: 'error', error: err.message };
    }
  }, [operation, method, numbers, activeNumbers]);

  const copyResult = async () => {
    if (!solution || !solution.result) return;
    const text = `${activeNumbers.join(' ' + (OPERATIONS.find((o) => o.id === operation)?.symbol || '') + ' ')} = ${solution.result}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {}
  };

  return (
    <ToolShell tool={tool}>
      <div className="lmc">
        <div className="lmc-grid">
          {/* ---------------- Inputs ---------------- */}
          <section className="lmc-card lmc-inputs" aria-label="Inputs">
            {/* Operation */}
            <div className="lmc-field">
              <label className="lmc-label">Operation</label>
              <div className="lmc-ops">
                {OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    className={`lmc-op ${operation === op.id ? 'active' : ''}`}
                    onClick={() => setOperation(op.id)}
                  >
                    <span className="lmc-op-icon">{op.icon}</span>
                    <span className="lmc-op-label">{op.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Method */}
            <div className="lmc-field">
              <label className="lmc-label">Method</label>
              <div className="lmc-methods">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`lmc-method ${method === m.id ? 'active' : ''}`}
                    onClick={() => setMethod(m.id)}
                  >
                    <span className="lmc-method-label">{m.label}</span>
                    <span className="lmc-method-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Numbers */}
            <div className="lmc-field">
              <label className="lmc-label">
                Numbers {isBinary ? '(2 required)' : `(up to ${MAX_NUMBERS})`}
              </label>
              <div className="lmc-numbers">
                {activeNumbers.map((n, idx) => (
                  <div key={idx} className="lmc-number-row">
                    <span className="lmc-number-index">{idx + 1}</span>
                    <div className="lmc-input">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={n}
                        onChange={(e) => updateNumber(idx, e.target.value)}
                        placeholder={idx === 0 ? 'Enter first number' : 'Enter number'}
                      />
                    </div>
                    {!isBinary && numbers.length > 2 && (
                      <button
                        className="lmc-remove-btn"
                        onClick={() => removeNumber(idx)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isBinary && numbers.length < MAX_NUMBERS && (
                <button className="lmc-add-btn" onClick={addNumber}>
                  + Add another number
                </button>
              )}
            </div>

            <button className="lmc-reset" onClick={reset}>
              Reset
            </button>
          </section>

          {/* ---------------- Results ---------------- */}
          <section className="lmc-card lmc-results" aria-label="Results" aria-live="polite">
            {!solution && (
              <div className="lmc-empty">
                <span className="lmc-empty-icon">🧮</span>
                <span className="lmc-empty-text">
                  Enter numbers to see the solution
                </span>
              </div>
            )}

            {solution?.error && (
              <div className="lmc-error">⚠️ {solution.error}</div>
            )}

            {solution && !solution.error && solution.result !== undefined && (
              <>
                <div className="lmc-hero">
                  <span className="lmc-hero-label">Result</span>
                  <span className="lmc-hero-value">
                    {typeof solution.result === 'number'
                      ? formatNumber(solution.result)
                      : solution.result}
                  </span>
                  <span className="lmc-hero-sub">
                    {activeNumbers.join(' ')}{' '}
                    {OPERATIONS.find((o) => o.id === operation)?.symbol}{' '}
                    {activeNumbers.slice(1).join(' ')}
                  </span>
                </div>

                {/* Long method views */}
                {method === 'long' && solution.type === 'add' && solution.longData && (
                  <LongAdditionView data={solution.longData} numbers={solution.nums} />
                )}

                {method === 'long' && solution.type === 'subtract' && solution.longData && (
                  <LongSubtractionView data={solution.longData} />
                )}

                {method === 'long' && solution.type === 'multiply' && solution.longData && (
                  <LongMultiplicationView data={solution.longData} />
                )}

                {method === 'long' && solution.type === 'divide' && solution.longData && !solution.longData.error && (
                  <LongDivisionView data={solution.longData} />
                )}

                {method === 'long' && (solution.type === 'lcm' || solution.type === 'hcf') && (
                  <PrimeFactorView
                    nums={solution.nums.map((n) => Math.floor(n))}
                    isLcm={solution.type === 'lcm'}
                    result={solution.result}
                  />
                )}

                {method === 'normal' && (
                  <div className="lmc-normal-note">
                    <span>✨ Direct answer — switch to "Long Method" for steps</span>
                  </div>
                )}

                <button className="lmc-copy" onClick={copyResult}>
                  📋 Copy result
                </button>
              </>
            )}
          </section>
        </div>

        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ============================================================
   LONG ADDITION VIEW
   ============================================================ */
function LongAdditionView({ data, numbers }) {
  return (
    <div className="lmc-visual">
      <div className="lmc-visual-title">Long Addition</div>
      <div className="lmc-long-math">
        {data.padded.map((line, i) => (
          <div key={i} className="lmc-long-line">
            {i === 0 ? '' : i === 1 ? '+' : ' '}
            {line}
          </div>
        ))}
        <div className="lmc-long-line lmc-long-sep">──────</div>
        <div className="lmc-long-line lmc-long-result">{data.result}</div>
      </div>
      <div className="lmc-visual-steps">
        <div className="lmc-visual-steps-title">Steps</div>
        {data.columnSums.slice().reverse().map((sum, idx, arr) => (
          <div key={idx} className="lmc-step">
            <span className="lmc-step-num">Step {idx + 1}</span>
            <span>
              Add column → <strong>{sum}</strong>
              {data.carries[arr.length - 1 - idx] > 0 && (
                <>
                  {' '}, carry <strong>{data.carries[arr.length - 1 - idx]}</strong>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   LONG SUBTRACTION VIEW
   ============================================================ */
function LongSubtractionView({ data }) {
  return (
    <div className="lmc-visual">
      <div className="lmc-visual-title">Long Subtraction</div>
      <div className="lmc-long-math">
        <div className="lmc-long-line">  {data.bigStr}</div>
        <div className="lmc-long-line">
          − {data.smallStr}
        </div>
        <div className="lmc-long-line lmc-long-sep">──────</div>
        <div className="lmc-long-line lmc-long-result">{data.result}</div>
      </div>
      <div className="lmc-visual-note">
        {data.borrows.some((b) => b === 1)
          ? '📌 Borrowing used in some columns'
          : '📌 No borrowing needed'}
      </div>
    </div>
  );
}

/* ============================================================
   LONG MULTIPLICATION VIEW
   ============================================================ */
function LongMultiplicationView({ data }) {
  return (
    <div className="lmc-visual">
      <div className="lmc-visual-title">Long Multiplication</div>
      <div className="lmc-long-math">
        <div className="lmc-long-line">  {data.aStr}</div>
        <div className="lmc-long-line">× {data.bStr}</div>
        <div className="lmc-long-line lmc-long-sep">──────</div>
        {data.partials.map((p, i) => (
          <div key={i} className="lmc-long-line lmc-long-partial">
            {i === 0 ? '  ' : '+ '}
            {p.digit > 0
              ? p.digits.slice().reverse().map((d) => d).join('') +
                '0'.repeat(p.shift)
              : '0'}
          </div>
        ))}
        {data.partials.length > 1 && (
          <div className="lmc-long-line lmc-long-sep">──────</div>
        )}
        <div className="lmc-long-line lmc-long-result">{data.result}</div>
      </div>
      <div className="lmc-visual-note">
        Each row above is <strong>a × b digit</strong>, shifted left by the
        digit's position. The final answer adds all rows.
      </div>
    </div>
  );
}

/* ============================================================
   LONG DIVISION VIEW
   ============================================================ */
function LongDivisionView({ data }) {
  return (
    <div className="lmc-visual">
      <div className="lmc-visual-title">Long Division</div>
      <div className="lmc-long-div">
        <span className="lmc-div-symbol">÷</span>
        <div className="lmc-div-quotient">
          <span className="lmc-div-label">Quotient</span>
          <strong>{data.quotient}</strong>
        </div>
        <div className="lmc-div-body">
          <div className="lmc-div-line">
            <span className="lmc-div-label">Dividend</span>
            <strong>{data.dividendStr}</strong>
          </div>
          <div className="lmc-div-line">
            <span className="lmc-div-label">Divisor</span>
            <strong>{data.divisorStr}</strong>
          </div>
          <div className="lmc-div-line">
            <span className="lmc-div-label">Remainder</span>
            <strong>{data.remainder}</strong>
          </div>
        </div>
      </div>
      <div className="lmc-visual-steps">
        <div className="lmc-visual-steps-title">Steps</div>
        {data.steps.map((s, i) => (
          <div key={i} className="lmc-step">
            <span className="lmc-step-num">Step {i + 1}</span>
            <span>
              Bring down <strong>{s.digitStr}</strong> → <strong>{s.current}</strong>
              {' ÷ '}<strong>{data.divisorStr}</strong> ={' '}
              <strong>{s.digit}</strong>
              {s.product > 0 && (
                <>
                  {' '}, subtract <strong>{s.product}</strong>, remainder{' '}
                  <strong>{s.remainder}</strong>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PRIME FACTOR VIEW (LCM/HCF)
   ============================================================ */
function PrimeFactorView({ nums, isLcm, result }) {
  return (
    <div className="lmc-visual">
      <div className="lmc-visual-title">
        {isLcm ? 'LCM' : 'HCF / GCD'} — Prime Factorization
      </div>
      <div className="lmc-prime-note">
        {isLcm
          ? 'LCM = product of the highest power of each prime factor'
          : 'HCF = product of the lowest power of common prime factors'}
      </div>
      <div className="lmc-visual-steps">
        {nums.map((n, i) => (
          <div key={i} className="lmc-step">
            <span className="lmc-step-num">{n}</span>
            <span>Prime factors → {primeFactors(n).join(' × ')}</span>
          </div>
        ))}
        <div className="lmc-step lmc-step-result">
          <span className="lmc-step-num">{isLcm ? 'LCM' : 'HCF'}</span>
          <strong>{result}</strong>
        </div>
      </div>
    </div>
  );
}

function primeFactors(n) {
  const factors = [];
  let x = n;
  for (let i = 2; i * i <= x; i++) {
    while (x % i === 0) {
      factors.push(i);
      x = x / i;
    }
  }
  if (x > 1) factors.push(x);
  return factors.length > 0 ? factors : [n];
}

/* ============================================================
   SEO CONTENT
   ============================================================ */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Long Method Calculator?</h2>
        <p>
          A <strong>long method calculator</strong> shows the step-by-step
          solution to basic math problems — the way you would solve them on
          paper. Instead of only showing the answer, it shows every step of
          <strong> long addition</strong>, <strong>long subtraction</strong>,{' '}
          <strong>long multiplication</strong>, and{' '}
          <strong>long division</strong>.
        </p>
        <p>
          Perfect for students learning math, teachers demonstrating methods,
          or parents helping kids with homework. You can also switch to{' '}
          <strong>Normal mode</strong> for a direct answer.
        </p>
      </section>

      <section className="seo-section">
        <h2>Operations Supported</h2>
        <ul className="seo-list">
          <li>
            <strong>Addition</strong> — add 2 to 6 numbers with carrying shown
          </li>
          <li>
            <strong>Subtraction</strong> — with borrowing explanation
          </li>
          <li>
            <strong>Multiplication</strong> — partial products shown row by row
          </li>
          <li>
            <strong>Division</strong> — quotient, remainder, and every step
          </li>
          <li>
            <strong>Modulo</strong> — remainder of division
          </li>
          <li>
            <strong>LCM</strong> — least common multiple via prime factorization
          </li>
          <li>
            <strong>HCF / GCD</strong> — greatest common divisor via prime
            factorization
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>How to Use</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose an operation</strong> — addition, subtraction,
            multiplication, division, etc.
          </li>
          <li>
            <strong>Choose the method</strong> — Long Method for steps, Normal
            for direct answer.
          </li>
          <li>
            <strong>Enter numbers</strong> — up to 6 for addition, 2 for the
            rest.
          </li>
          <li>
            <strong>See the solution</strong> — the answer plus every step, laid
            out like you would write it on paper.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Examples</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">➕</div>
            <h3>Long Addition</h3>
            <p>
              <code>124 + 245</code> = shown as columns, with carries between
              digits.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✖️</div>
            <h3>Long Multiplication</h3>
            <p>
              <code>123 × 45</code> = two partial products (123×5 and 123×40),
              then added.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">➗</div>
            <h3>Long Division</h3>
            <p>
              <code>345 ÷ 12</code> = quotient 28, remainder 9 — with each
              digit brought down step by step.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔗</div>
            <h3>LCM & HCF</h3>
            <p>
              <code>LCM(12, 18)</code> = 36, <code>HCF(12, 18)</code> = 6 —
              prime factorization shown.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this long method calculator free?</summary>
          <p>
            Yes — completely free, no signup, no limits. Runs in your browser.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work for decimals?</summary>
          <p>
            The long method layout works best with whole numbers. For decimals,
            use Normal mode for the direct answer.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between LCM and HCF?</summary>
          <p>
            <strong>LCM</strong> (Least Common Multiple) is the smallest number
            that both given numbers divide into. <strong>HCF</strong> (Highest
            Common Factor, also called GCD) is the largest number that divides
            both given numbers.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I add more than 2 numbers?</summary>
          <p>
            For addition and multiplication, yes — up to 6 numbers. Subtraction,
            division, and modulo work with 2 numbers.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How is long division calculated?</summary>
          <p>
            We divide one digit at a time, exactly as taught in school. Each
            step shows the current value, the quotient digit, the product
            subtracted, and the remainder.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the tool save my numbers?</summary>
          <p>
            No. Everything is calculated in your browser. Nothing is uploaded
            or stored anywhere.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Percentage Calculator</strong>,{' '}
          <strong>Unit Converter</strong>, <strong>Interest Calculator</strong>,
          and <strong>BMI Calculator</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}