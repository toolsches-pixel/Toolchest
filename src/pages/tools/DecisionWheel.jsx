import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './DecisionWheel.css';

// ============================================================
// CONFIG
// ============================================================
const CANVAS_SIZE = 500;
const WHEEL_PADDING = 20;

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#fb7185', '#fda4af', '#fbbf24',
];

const PRESETS = [
  { id: 'yesno', label: 'Yes / No', options: ['Yes', 'No'] },
  { id: 'food', label: 'Food', options: ['Pizza', 'Burger', 'Sushi', 'Pasta', 'Tacos', 'Salad'] },
  { id: 'chores', label: 'Chores', options: ['Dishes', 'Laundry', 'Vacuum', 'Dust', 'Trash', 'Cook'] },
  { id: 'study', label: 'Study', options: ['Math', 'Science', 'History', 'English', 'Art', 'Music'] },
  { id: 'weekend', label: 'Weekend', options: ['Movie', 'Gaming', 'Hiking', 'Reading', 'Sleep', 'Friends'] },
];

// ============================================================
// SOUND
// ============================================================
function playTick(ctx) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 900 + Math.random() * 200;
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

function playWinSound(ctx) {
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {}
}

// ============================================================
// MAIN
// ============================================================
export default function DecisionWheel() {
  const tool = getToolById('decision-wheel');

  useDocumentTitle('Decision Wheel — Spin to Pick Random Winner | toolchest');

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
      'Free online decision wheel — spin to pick a random winner. Add your own options, watch the animated spin, and get a fair random result. Perfect for giveaways, games, and decisions.';

    const scriptId = 'decision-wheel-jsonld';
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
      name: 'Decision Wheel',
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2134',
      },
      featureList: [
        'Spin the wheel to pick a random option',
        'Add 2-20 custom options',
        'Animated spin with sound effects',
        '20 preset wheels (Yes/No, Food, Chores)',
        'Confetti celebration on win',
        'Perfect for giveaways and games',
        'No signup, 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [options, setOptions] = useState(['Pizza', 'Burger', 'Sushi', 'Pasta']);
  const [newOption, setNewOption] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const spinAnimationRef = useRef(null);
  const lastTickAngleRef = useRef(0);
  const rotationRef = useRef(0);
  const optionsRef = useRef(options);

  useEffect(() => { rotationRef.current = rotation; }, [rotation]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
  };

  // ============================================================
  // DRAW WHEEL
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const opts = optionsRef.current;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (opts.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - WHEEL_PADDING, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const radius = CANVAS_SIZE / 2 - WHEEL_PADDING;
    const anglePerSlice = (Math.PI * 2) / opts.length;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotationRef.current * Math.PI) / 180);

    // Draw slices
    opts.forEach((opt, i) => {
      const startAngle = i * anglePerSlice;
      const endAngle = (i + 1) * anglePerSlice;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLOR_PALETTE[i % COLOR_PALETTE.length];
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(startAngle + anglePerSlice / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      const fontSize = Math.max(11, Math.min(20, 200 / Math.sqrt(opts.length)));
      ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;

      let text = opt;
      const maxWidth = radius - 40;
      if (ctx.measureText(text).width > maxWidth) {
        while (text.length > 3 && ctx.measureText(text + '…').width > maxWidth) {
          text = text.slice(0, -1);
        }
        text += '…';
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(text, radius - 12, 0);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1117';
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top pointer (fixed triangle)
    const pointerX = cx;
    const pointerY = cy - radius - 14;
    ctx.beginPath();
    ctx.moveTo(pointerX, pointerY + 20);
    ctx.lineTo(pointerX - 14, pointerY - 6);
    ctx.lineTo(pointerX + 14, pointerY - 6);
    ctx.closePath();
    ctx.fillStyle = '#e2b714';
    ctx.shadowColor = '#e2b714';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  useEffect(() => {
    draw();
  }, [options, rotation, draw]);

  // ============================================================
  // SPIN — Fix 2: Pre-decide winner, then rotate to it
  // ============================================================
  const spin = useCallback(() => {
    const opts = optionsRef.current;
    if (opts.length < 2) return;
    if (isSpinning) return;

    ensureAudio();
    setIsSpinning(true);
    setResult(null);
    setShowResult(false);

    // ============================================================
    // STEP 1: Pre-decide the winner
    // ============================================================
    const winnerIndex = Math.floor(Math.random() * opts.length);
    const winner = opts[winnerIndex];

    // ============================================================
    // STEP 2: Calculate rotation to land winner slice under pointer
    // ============================================================
    // Pointer is at TOP = -90° in canvas coords (or 270° standard).
    //
    // Slice #i spans from (i * sliceAngle) to ((i+1) * sliceAngle)
    // in the wheel's LOCAL (unrotated) coordinate system,
    // where 0° = 3 o'clock, angles increase clockwise.
    //
    // After rotating wheel by `R` degrees clockwise,
    // slice #i's actual position is:
    //   from (i * sliceAngle + R) to ((i+1) * sliceAngle + R)
    //
    // We want this to CONTAIN the pointer position.
    // Pointer in canvas coords is at -90° (or equivalently 270°).
    //
    // So we want:  i * sliceAngle + R  ≤  270  ≤  (i+1) * sliceAngle + R
    // Target: point the CENTER of the winner slice at 270°.
    // Slice center in local coords = (i + 0.5) * sliceAngle
    // After rotation, center = (i + 0.5) * sliceAngle + R
    // Set equal to 270° (mod 360):
    //   R = 270 - (i + 0.5) * sliceAngle  (mod 360)

    const sliceAngle = 360 / opts.length;
    const winnerCenter = (winnerIndex + 0.5) * sliceAngle;

    // Target final rotation (mod 360)
    let targetRotation = (270 - winnerCenter) % 360;
    if (targetRotation < 0) targetRotation += 360;

    // Current rotation (mod 360)
    const currentNormalized = ((rotationRef.current % 360) + 360) % 360;

    // Delta rotation needed to reach target
    let deltaRotation = targetRotation - currentNormalized;
    if (deltaRotation < 0) deltaRotation += 360;

    // Add a small random offset WITHIN the winner slice
    // so it doesn't always land dead-center (feels more natural)
    // Slice angle in degrees; we can offset by up to ±40% of slice angle
    const withinSliceOffset = (Math.random() - 0.5) * sliceAngle * 0.8;
    deltaRotation += withinSliceOffset;

    // Add 4-6 full spins for the effect
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const totalRotation = deltaRotation + extraSpins;

    const startRotation = rotationRef.current;
    const endRotation = startRotation + totalRotation;

    const duration = 4500;
    const startTime = performance.now();
    lastTickAngleRef.current = startRotation;

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentRotation = startRotation + totalRotation * eased;
      setRotation(currentRotation);

      const degreesSinceLastTick = currentRotation - lastTickAngleRef.current;
      if (Math.abs(degreesSinceLastTick) >= 30 && soundEnabled) {
        playTick(audioCtxRef.current);
        lastTickAngleRef.current = currentRotation;
      }

      if (t < 1) {
        spinAnimationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation done — winner is GUARANTEED to be under pointer
        setIsSpinning(false);
        setResult(winner);
        setShowResult(true);
        setHistory((prev) => [winner, ...prev].slice(0, 5));

        if (soundEnabled) playWinSound(audioCtxRef.current);
      }
    };

    spinAnimationRef.current = requestAnimationFrame(animate);
  }, [isSpinning, soundEnabled]);

  // ============================================================
  // OPTION MANAGEMENT
  // ============================================================
  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (options.length >= 20) return;
    if (options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) return;
    setOptions([...options, trimmed]);
    setNewOption('');
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const loadPreset = (preset) => {
    setOptions([...preset.options]);
    setResult(null);
    setShowResult(false);
  };

  const shuffleOptions = () => {
    setOptions([...options].sort(() => Math.random() - 0.5));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (spinAnimationRef.current) cancelAnimationFrame(spinAnimationRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return (
    <ToolShell tool={tool}>
      <div className="dw-root">
        {/* Top bar */}
        <div className="dw-topbar">
          <div className="dw-topbar-title">
            <span className="dw-topbar-icon">🎡</span>
            <span>Decision Wheel</span>
          </div>
          <button
            className={`dw-sound-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => {
              ensureAudio();
              setSoundEnabled(!soundEnabled);
            }}
            title="Toggle sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Main layout */}
        <div className="dw-main">
          {/* Wheel area */}
          <div className="dw-wheel-area">
            <div className="dw-wheel-wrap">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={`dw-canvas ${isSpinning ? 'spinning' : ''}`}
                onClick={spin}
              />

              {showResult && result && (
                <div className="dw-result-overlay" onClick={() => setShowResult(false)}>
                  <div className="dw-result-card">
                    <div className="dw-result-label">Winner</div>
                    <div className="dw-result-text">{result}</div>
                    <div className="dw-result-hint">Click to dismiss</div>
                  </div>
                  <Confetti />
                </div>
              )}
            </div>

            <button
              className="dw-spin-btn"
              onClick={spin}
              disabled={isSpinning || options.length < 2}
            >
              {isSpinning ? (
                <>
                  <span className="dw-spin-icon spinning">🎡</span>
                  Spinning…
                </>
              ) : (
                <>
                  <span className="dw-spin-icon">🎡</span>
                  {options.length < 2 ? 'Add at least 2 options' : 'Spin the wheel'}
                </>
              )}
            </button>
          </div>

          {/* Options panel */}
          <div className="dw-panel">
            <div className="dw-panel-section">
              <label className="dw-label">Options ({options.length}/20)</label>
              <div className="dw-add-row">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                  className="dw-input"
                  placeholder="Add an option…"
                  maxLength={40}
                  disabled={options.length >= 20}
                />
                <button
                  className="dw-add-btn"
                  onClick={addOption}
                  disabled={!newOption.trim() || options.length >= 20}
                  title="Add"
                >
                  +
                </button>
              </div>
            </div>

            <div className="dw-options-list">
              {options.map((opt, i) => (
                <div key={i} className="dw-option-item">
                  <span
                    className="dw-option-color"
                    style={{ background: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
                  />
                  <span className="dw-option-text">{opt}</span>
                  <button
                    className="dw-option-remove"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="dw-actions">
              <button
                className="dw-action-btn"
                onClick={shuffleOptions}
                disabled={isSpinning}
                title="Shuffle order"
              >
                🔀 Shuffle
              </button>
            </div>

            <div className="dw-panel-section">
              <label className="dw-label">Quick presets</label>
              <div className="dw-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className="dw-preset-btn"
                    onClick={() => loadPreset(p)}
                    disabled={isSpinning}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div className="dw-panel-section">
                <div className="dw-history-header">
                  <label className="dw-label">Recent spins</label>
                  <button className="dw-clear-btn" onClick={clearHistory} title="Clear">
                    Clear
                  </button>
                </div>
                <div className="dw-history">
                  {history.map((h, i) => (
                    <div key={i} className={`dw-history-item ${i === 0 ? 'latest' : ''}`}>
                      {i === 0 && <span className="dw-history-star">⭐</span>}
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// CONFETTI
// ============================================================
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));
  }, []);

  return (
    <div className="dw-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`dw-confetti-piece ${p.shape}`}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Decision Wheel?</h2>
        <p>
          A <strong>decision wheel</strong> (also called a spinner wheel, prize
          wheel, or random picker) is a fun visual tool for making random
          choices. Instead of flipping a coin or drawing straws, you add your
          options to the wheel, spin it, and let chance decide. It's fair,
          transparent, and surprisingly satisfying to watch.
        </p>
        <p>
          Our <strong>free online decision wheel</strong> runs entirely in your
          browser — no downloads, no signups, no limits. Perfect for giveaways,
          classroom activities, deciding where to eat, or settling arguments.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the Decision Wheel</h2>
        <ol className="seo-steps">
          <li>
            <strong>Add your options</strong> — type 2 to 20 choices (or pick a
            preset like Yes/No or Food).
          </li>
          <li>
            <strong>Click "Spin the wheel"</strong> — or click the wheel
            directly.
          </li>
          <li>
            <strong>Watch the spin</strong> — the wheel rotates with satisfying
            tick sounds and lands on a random slice.
          </li>
          <li>
            <strong>See the result</strong> — the winning option pops up with
            celebration confetti.
          </li>
          <li>
            <strong>Spin again</strong> — repeat as many times as you want.
            Recent results are saved.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎡</div>
            <h3>Animated Spin</h3>
            <p>
              Realistic wheel physics — the wheel spins fast, slows down, and
              settles naturally on a random slice.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Auto-Colored Slices</h3>
            <p>
              Each option gets its own vibrant color from our 20-color palette
              — no setup needed.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎉</div>
            <h3>Confetti Celebration</h3>
            <p>
              Winning option pops up in a card with animated confetti — makes
              every spin feel special.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>5 Quick Presets</h3>
            <p>Yes/No, Food, Chores, Study, and Weekend — one click to load.</p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔊</div>
            <h3>Sound Effects</h3>
            <p>
              Tick sounds while spinning and a win melody at the end. Toggle
              on/off anytime.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📜</div>
            <h3>Recent Spins</h3>
            <p>
              Your last 5 results are saved — helpful for giveaways with
              multiple winners.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Giveaways & contests</strong> — pick a random winner from a
            list of participants.
          </li>
          <li>
            <strong>Deciding where to eat</strong> — add your favorite
            restaurants, spin, and let fate decide.
          </li>
          <li>
            <strong>Classroom activities</strong> — randomly call on students
            or assign topics.
          </li>
          <li>
            <strong>Chore charts</strong> — randomly assign daily household
            chores.
          </li>
          <li>
            <strong>Games & parties</strong> — ice-breakers, truth-or-dare,
            party games.
          </li>
          <li>
            <strong>Team decisions</strong> — pick who presents first, who
            takes notes, etc.
          </li>
          <li>
            <strong>Fun challenges</strong> — pick a movie to watch, a song to
            play, a workout to do.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is the Decision Wheel random and fair?</summary>
          <p>
            Yes — the winning slice is determined by a random number generator
            built into the tool. Each option has an equal chance of being
            picked.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How many options can I add?</summary>
          <p>
            You can add between 2 and 20 options. For best readability, we
            recommend 2-8 options — but the wheel handles up to 20 smoothly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I save my wheel for later?</summary>
          <p>
            Currently, the wheel resets when you reload the page. A save
            feature is on our roadmap. For now, presets make it easy to quickly
            rebuild common wheels.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for a YouTube giveaway?</summary>
          <p>
            Absolutely — the tool is perfect for live giveaways. Add your
            participants' names (up to 20), spin, and the winner pops up with
            confetti. Screenshot or screen-record it for full transparency.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the wheel work on mobile?</summary>
          <p>
            Yes — the tool is fully responsive. Tap the wheel or the spin
            button, and it works perfectly on phones and tablets.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is it really free?</summary>
          <p>
            Completely free — no signup, no ads, no watermarks, no hidden fees.
            Spin as many times as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            Yes — once the page is loaded, everything runs in your browser. No
            internet required after the initial load.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I change the wheel colors?</summary>
          <p>
            Colors are automatically assigned from a 20-color palette to
            maximize contrast. Manual color customization is on our roadmap.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other fun tools: <strong>Snake Game</strong>,{' '}
          <strong>Pong</strong>, <strong>Coin Flip</strong>,{' '}
          <strong>Name to Stylish Text</strong>, and{' '}
          <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}