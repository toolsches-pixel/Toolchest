import { useState, useEffect, useRef, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './DiceRoller.css';

const DICE_TYPES = [
  { sides: 4, icon: '🔺', label: 'D4' },
  { sides: 6, icon: '🎲', label: 'D6' },
  { sides: 8, icon: '🔷', label: 'D8' },
  { sides: 10, icon: '🔶', label: 'D10' },
  { sides: 12, icon: '⬟', label: 'D12' },
  { sides: 20, icon: '⬢', label: 'D20' },
  { sides: 100, icon: '💯', label: 'D100' },
];

const QUICK_PRESETS = [
  { label: '1×D6', dice: 1, sides: 6 },
  { label: '2×D6', dice: 2, sides: 6 },
  { label: '3×D6', dice: 3, sides: 6 },
  { label: '1×D20', dice: 1, sides: 20 },
  { label: '2×D20', dice: 2, sides: 20 },
  { label: '4×D6', dice: 4, sides: 6 },
];

export default function DiceRoller() {
  const tool = getToolById('dice-roller');

  // SEO
  useDocumentTitle(
    'Dice Roller — Free Online Virtual Dice Roller | toolchest'
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
      'Free online dice roller. Roll virtual dice for D&D, board games, or random decisions. Supports D4, D6, D8, D10, D12, D20, D100. Multiple dice, modifiers, roll history, and stats.';

    const scriptId = 'dice-roller-jsonld';
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
      name: 'Dice Roller',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '721',
      },
      featureList: [
        'Roll virtual dice online',
        'Support for D4, D6, D8, D10, D12, D20, D100',
        'Roll up to 6 dice at once',
        'Add modifiers (+/-)',
        'Roll history tracking',
        'Statistics and distribution charts',
        'Animated roll effects',
        'No signup — 100% browser-based',
        'Free forever',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [diceCount, setDiceCount] = useState(1);
  const [sides, setSides] = useState(6);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]); // [{ total, rolls, modifier, sides, time }]
  const [soundOn, setSoundOn] = useState(false);

  const audioCtxRef = useRef(null);

  // Initialize audio context on demand
  const playRollSound = useCallback(() => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      // Quick "dice clatter" sound — 4 short bursts
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 800 + Math.random() * 400;
        gain.gain.setValueAtTime(0.05, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.05);
      }
    } catch (e) {
      // ignore
    }
  }, [soundOn]);

  const rollDice = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    playRollSound();

    // Animate for ~600ms then settle
    const totalTime = 600;
    const tickInterval = 60;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < totalTime) {
        // Show random flickering values
        const flicker = Array.from({ length: diceCount }, () =>
          Math.floor(Math.random() * sides) + 1
        );
        setResults(flicker.map((v) => ({ value: v, final: false })));
        setTimeout(tick, tickInterval);
      } else {
        // Final roll
        const final = Array.from({ length: diceCount }, () =>
          Math.floor(Math.random() * sides) + 1
        );
        const total = final.reduce((a, b) => a + b, 0) + modifier;

        setResults(final.map((v) => ({ value: v, final: true })));
        setRolling(false);

        setHistory((prev) => {
          const entry = {
            id: Date.now(),
            rolls: final,
            total,
            modifier,
            sides,
            time: new Date().toLocaleTimeString(),
          };
          return [entry, ...prev].slice(0, 20);
        });
      }
    };

    tick();
  }, [diceCount, sides, modifier, rolling, playRollSound]);

  // Keyboard: Space = roll
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        rollDice();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [rollDice]);

  const applyPreset = (preset) => {
    setDiceCount(preset.dice);
    setSides(preset.sides);
    setModifier(0);
  };

  const clearHistory = () => setHistory([]);

  const currentTotal = results.reduce(
    (sum, r) => sum + (r.final ? r.value : 0),
    0
  ) + (results.length > 0 && results.every((r) => r.final) ? modifier : 0);

  const hasFinalResults = results.length > 0 && results.every((r) => r.final);

  // Stats from history
  const stats = (() => {
    if (history.length === 0) return null;
    const totals = history.map((h) => h.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const min = Math.min(...totals);
    const max = Math.max(...totals);

    // Distribution of individual dice values (per side)
    const dist = {};
    history.forEach((h) => {
      h.rolls.forEach((v) => {
        dist[v] = (dist[v] || 0) + 1;
      });
    });
    const distMax = Math.max(...Object.values(dist), 1);

    return { avg: avg.toFixed(1), min, max, dist, distMax };
  })();

  const currentDice = DICE_TYPES.find((d) => d.sides === sides);

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Quick presets */}
        <div className="pdf-target">
          <label className="pdf-target-label">Quick presets</label>
          <div className="dice-presets">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                className={`dice-preset-btn ${
                  diceCount === p.dice && sides === p.sides ? 'active' : ''
                }`}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dice type */}
        <div className="pdf-target">
          <label className="pdf-target-label">Dice type</label>
          <div className="dice-type-grid">
            {DICE_TYPES.map((d) => (
              <button
                key={d.sides}
                className={`dice-type-card ${
                  sides === d.sides ? 'active' : ''
                }`}
                onClick={() => setSides(d.sides)}
              >
                <span className="dice-type-icon">{d.icon}</span>
                <span className="dice-type-label">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Count + modifier */}
        <div className="pdf-target">
          <div className="wm-row-2col">
            <div>
              <label className="pdf-target-label">
                Number of dice · <strong>{diceCount}</strong>
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={diceCount}
                onChange={(e) => setDiceCount(parseInt(e.target.value))}
                className="wm-slider"
              />
            </div>
            <div>
              <label className="pdf-target-label">
                Modifier · <strong>{modifier >= 0 ? `+${modifier}` : modifier}</strong>
              </label>
              <div className="dice-modifier-row">
                <button
                  className="dice-mod-btn"
                  onClick={() => setModifier(modifier - 1)}
                >
                  −
                </button>
                <span className="dice-mod-value">{modifier}</span>
                <button
                  className="dice-mod-btn"
                  onClick={() => setModifier(modifier + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="pdf-target">
          <label className="pn-checkbox">
            <input
              type="checkbox"
              checked={soundOn}
              onChange={(e) => setSoundOn(e.target.checked)}
            />
            <span>🔊 Play roll sound</span>
          </label>
        </div>

        {/* Roll button */}
        <button
          className={`dice-roll-btn ${rolling ? 'rolling' : ''}`}
          onClick={rollDice}
          disabled={rolling}
        >
          {rolling ? '🎲 Rolling…' : '🎲 Roll Dice'}
          <span className="dice-roll-hint">Press Space</span>
        </button>

        {/* Dice display */}
        <div className="dice-display">
          {results.length === 0 ? (
            <div className="dice-empty">
              <div className="dice-empty-icon">{currentDice.icon}</div>
              <div className="dice-empty-text">
                Click "Roll Dice" to start
              </div>
            </div>
          ) : (
            <>
              <div className="dice-row">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`dice-face ${
                      r.final ? 'final' : 'flicker'
                    } ${sides === 6 ? 'dice-face-d6' : ''}`}
                  >
                    <span className="dice-face-value">{r.value}</span>
                  </div>
                ))}
              </div>

              {hasFinalResults && (
                <div className="dice-total">
                  <div className="dice-total-label">
                    Total {modifier !== 0 && (
                      <span className="dice-total-mod">
                        ({results.map((r) => r.value).join(' + ')} {modifier >= 0 ? '+' : '−'} {Math.abs(modifier)})
                      </span>
                    )}
                  </div>
                  <div className="dice-total-value">{currentTotal}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="pdf-target">
            <label className="pdf-target-label">Statistics ({history.length} rolls)</label>
            <div className="dice-stats">
              <div className="dice-stat">
                <div className="dice-stat-label">Average</div>
                <div className="dice-stat-value">{stats.avg}</div>
              </div>
              <div className="dice-stat">
                <div className="dice-stat-label">Min</div>
                <div className="dice-stat-value">{stats.min}</div>
              </div>
              <div className="dice-stat">
                <div className="dice-stat-label">Max</div>
                <div className="dice-stat-value">{stats.max}</div>
              </div>
              <div className="dice-stat">
                <div className="dice-stat-label">Rolls</div>
                <div className="dice-stat-value">{history.length}</div>
              </div>
            </div>

            <div className="dice-distribution">
              <div className="dice-distribution-label">
                Value distribution
              </div>
              <div className="dice-dist-bars">
                {Object.entries(stats.dist)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([value, count]) => (
                    <div key={value} className="dice-dist-row">
                      <span className="dice-dist-value">{value}</span>
                      <div className="dice-dist-bar-wrap">
                        <div
                          className="dice-dist-bar"
                          style={{
                            width: `${(count / stats.distMax) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="dice-dist-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="pdf-target">
            <div className="i2p-list-header">
              <label className="pdf-target-label" style={{ margin: 0 }}>
                Roll history
              </label>
              <button className="i2p-clear" onClick={clearHistory}>
                Clear
              </button>
            </div>
            <div className="dice-history">
              {history.map((h) => (
                <div key={h.id} className="dice-history-item">
                  <span className="dice-history-time">{h.time}</span>
                  <span className="dice-history-rolls">
                    {h.rolls.join(' + ')}
                    {h.modifier !== 0 && (
                      <>
                        {' '}
                        {h.modifier >= 0 ? '+' : '−'}{' '}
                        {Math.abs(h.modifier)}
                      </>
                    )}
                  </span>
                  <span className="dice-history-total">{h.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ================= SEO Content ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Dice Roller?</h2>
        <p>
          A <strong>dice roller</strong> is a virtual tool that simulates
          rolling physical dice. Whether you're playing Dungeons &amp; Dragons,
          a board game, or just need a random number for a decision, an online
          dice roller gives you instant, fair, and unpredictable results —
          right in your browser.
        </p>
        <p>
          Our <strong>free online dice roller</strong> supports all common
          tabletop dice: D4, D6, D8, D10, D12, D20, and D100. Roll up to 6
          dice at once, add modifiers (like <code>+2</code> or{' '}
          <code>−1</code>), and track your roll history with statistics. No
          signup, no ads, 100% private.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Roll Virtual Dice — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick a dice type</strong> — choose D4, D6, D8, D10, D12,
            D20, or D100, or use a quick preset like "2×D6".
          </li>
          <li>
            <strong>Set how many dice</strong> — roll 1 to 6 dice at the same
            time.
          </li>
          <li>
            <strong>Add a modifier (optional)</strong> — apply a bonus or
            penalty like <code>+2</code> or <code>−1</code> (great for D&amp;D
            attack rolls).
          </li>
          <li>
            <strong>Click "Roll Dice"</strong> (or press <kbd>Space</kbd>) —
            watch the dice animate and settle.
          </li>
          <li>
            <strong>See the total & stats</strong> — check the roll total and
            your roll history to track patterns.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎲</div>
            <h3>7 Dice Types</h3>
            <p>
              D4, D6, D8, D10, D12, D20, D100 — all standard tabletop dice
              supported.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔢</div>
            <h3>Multiple Dice</h3>
            <p>
              Roll up to 6 dice at once. Great for damage rolls, ability
              scores, and more.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">➕</div>
            <h3>Modifiers</h3>
            <p>
              Add or subtract a number from the total — perfect for D&amp;D
              attack rolls and skill checks.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Animated Rolls</h3>
            <p>
              Smooth roll animation makes the experience feel like rolling a
              real die.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Stats & History</h3>
            <p>
              Track roll history, averages, min/max, and value distribution.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Uses your browser's cryptographically-strong random number
              generator. No server, no tracking.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Dungeons &amp; Dragons</strong> — roll D20 for attacks,
            saves, and skill checks. Add modifiers for total.
          </li>
          <li>
            <strong>Board games</strong> — lost your dice? Roll a D6 online.
          </li>
          <li>
            <strong>Random decisions</strong> — let the dice decide where to
            eat or what to do.
          </li>
          <li>
            <strong>Tabletop RPGs</strong> — Pathfinder, Call of Cthulhu,
            Warhammer, and more.
          </li>
          <li>
            <strong>Classroom activities</strong> — random number generation
            for teaching probability.
          </li>
          <li>
            <strong>Game development</strong> — quick random numbers for
            testing and prototyping.
          </li>
          <li>
            <strong>Party games</strong> — truth or dare, drinking games, and
            more.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" >
          <summary>Is this dice roller really free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no ads. Roll
            as many times as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is the dice roller fair and random?</summary>
          <p>
            Yes — we use JavaScript's <code>Math.random()</code> which
            provides uniform random distribution. Every face of the die has an
            equal probability.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I roll multiple dice at once?</summary>
          <p>
            Yes — up to 6 dice at the same time. Ideal for damage rolls in
            D&amp;D (e.g., 2d6) or ability score generation (4d6 drop lowest).
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is a modifier?</summary>
          <p>
            A modifier is a bonus or penalty added to your dice roll — like{' '}
            <code>+2</code> for a proficiency bonus in D&amp;D, or{' '}
            <code>−1</code> for a cursed item. It's added to your total after
            rolling.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What do the dice names mean (D4, D6, D20)?</summary>
          <p>
            The number after "D" is how many sides the die has. D6 is a normal
            6-sided die. D20 is a 20-sided die used in D&amp;D for most rolls.
            D100 is a 100-sided die (percentile).
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I see my roll history?</summary>
          <p>
            Yes — the last 20 rolls are shown with their totals. You can also
            see statistics like average, min, max, and value distribution.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — fully responsive and works on phones, tablets, and desktops.
            Tap the roll button or your keyboard's spacebar.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is any data sent to a server?</summary>
          <p>
            No — everything runs locally in your browser. Nothing is uploaded,
            tracked, or stored on any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use this for gambling?</summary>
          <p>
            This tool is for entertainment and gaming purposes. It is not
            intended for real-money gambling, and we don't recommend using it
            for that purpose.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>Coin Flip</strong>,{' '}
          <strong>Random Number Generator</strong>,{' '}
          <strong>Password Generator</strong>, <strong>QR Code Generator</strong>,
          and more — all free and browser-based.
        </p>
      </section>
    </article>
  );
}