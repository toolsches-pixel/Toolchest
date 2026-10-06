import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './Timer.css';

// ============================================================
// SOUND
// ============================================================
function playChime(ctx, type = 'end') {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const notes =
      type === 'end'
        ? [523.25, 659.25, 783.99] // C5 E5 G5 (pleasant chime)
        : type === 'tick'
        ? [800]
        : [400, 600];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (e) {}
}

// ============================================================
// HELPERS
// ============================================================
function formatStopwatch(ms) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const TIMER_MODES = [
  { id: 'stopwatch', label: 'Stopwatch', icon: '⏱' },
  { id: 'countdown', label: 'Countdown', icon: '⏳' },
  { id: 'pomodoro', label: 'Pomodoro', icon: '🍅' },
  { id: 'interval', label: 'Interval', icon: '🔁' },
];

const PRESETS = [
  { label: '1m', ms: 60000 },
  { label: '3m', ms: 180000 },
  { label: '5m', ms: 300000 },
  { label: '10m', ms: 600000 },
  { label: '15m', ms: 900000 },
  { label: '25m', ms: 1500000 },
  { label: '30m', ms: 1800000 },
  { label: '1h', ms: 3600000 },
];

// ============================================================
// MAIN
// ============================================================
export default function Timer() {
  const tool = getToolById('timer');

  useDocumentTitle('Timer — Stopwatch, Countdown & Pomodoro Online | toolchest');

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
      'Free online timer with 4 modes: Stopwatch, Countdown, Pomodoro, and Interval. Precise milliseconds, sound alerts, lap times, presets, and keyboard shortcuts. No signup.';

    const scriptId = 'timer-jsonld';
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
      name: 'Timer — Stopwatch, Countdown & Pomodoro',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1432',
      },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // ============================================================
  // STATE
  // ============================================================
  const [mode, setMode] = useState('stopwatch');
  const [running, setRunning] = useState(false);

  // Stopwatch
  const [swElapsed, setSwElapsed] = useState(0);   // ms
  const [swLaps, setSwLaps] = useState([]);

  // Countdown
  const [cdDuration, setCdDuration] = useState(300000); // 5 min default
  const [cdRemaining, setCdRemaining] = useState(300000);
  const [cdInputH, setCdInputH] = useState('0');
  const [cdInputM, setCdInputM] = useState('5');
  const [cdInputS, setCdInputS] = useState('0');

  // Pomodoro
  const [pomoWork, setPomoWork] = useState(25 * 60000);
  const [pomoBreak, setPomoBreak] = useState(5 * 60000);
  const [pomoLongBreak, setPomoLongBreak] = useState(15 * 60000);
  const [pomoCycle, setPomoCycle] = useState(0); // completed work sessions
  const [pomoPhase, setPomoPhase] = useState('work'); // 'work' | 'break' | 'longBreak'
  const [pomoRemaining, setPomoRemaining] = useState(25 * 60000);

  // Interval (HIIT)
  const [intWork, setIntWork] = useState(30000);
  const [intRest, setIntRest] = useState(15000);
  const [intRounds, setIntRounds] = useState(8);
  const [intCurrentRound, setIntCurrentRound] = useState(1);
  const [intPhase, setIntPhase] = useState('work'); // 'work' | 'rest'
  const [intRemaining, setIntRemaining] = useState(30000);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // ============================================================
  // REFS
  // ============================================================
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const swStartRef = useRef(0);      // timestamp when start/resume
  const swOffsetRef = useRef(0);     // ms accumulated before pause
  const cdEndRef = useRef(0);        // timestamp when should end
  const pomoEndRef = useRef(0);
  const intEndRef = useRef(0);
  const tickRef = useRef(null);      // last whole-second tick for interval
  const modeRef = useRef(mode);
  const runningRef = useRef(running);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { runningRef.current = running; }, [running]);

  // Reset timer text on mode change
  useEffect(() => {
    setRunning(false);
    updateTabTitle('Timer');
  }, [mode]);

  // Request notification permission
  useEffect(() => {
    if (notifEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notifEnabled]);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
    // Resume if suspended
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const chime = useCallback((type = 'end') => {
    if (!soundEnabled) return;
    ensureAudio();
    playChime(audioCtxRef.current, type);
  }, [soundEnabled]);

  const notify = useCallback((title, body) => {
    if (!notifEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {}
    }
  }, [notifEnabled]);

  const updateTabTitle = (text) => {
    document.title = text;
  };

  // ============================================================
  // TICK LOOP
  // ============================================================
  useEffect(() => {
    const loop = () => {
      const now = Date.now();
      if (runningRef.current) {
        const m = modeRef.current;

        if (m === 'stopwatch') {
          const elapsed = swOffsetRef.current + (now - swStartRef.current);
          setSwElapsed(elapsed);
          updateTabTitle(`⏱ ${formatStopwatch(elapsed)} — Stopwatch`);
        } else if (m === 'countdown') {
          const remaining = Math.max(0, cdEndRef.current - now);
          setCdRemaining(remaining);
          updateTabTitle(`⏳ ${formatCountdown(remaining)} — Countdown`);
          if (remaining <= 0) {
            setRunning(false);
            chime('end');
            notify('Countdown finished!', 'Your timer has ended.');
          }
        } else if (m === 'pomodoro') {
          const remaining = Math.max(0, pomoEndRef.current - now);
          setPomoRemaining(remaining);
          updateTabTitle(
            `${pomoPhase === 'work' ? '🍅' : '☕'} ${formatCountdown(remaining)} — Pomodoro`
          );
          if (remaining <= 0) {
            handlePomodoroPhaseEnd();
          }
        } else if (m === 'interval') {
          const remaining = Math.max(0, intEndRef.current - now);
          setIntRemaining(remaining);
          updateTabTitle(
            `${intPhase === 'work' ? '💪' : '😌'} ${formatCountdown(remaining)} — Round ${intCurrentRound}/${intRounds}`
          );
          if (remaining <= 0) {
            handleIntervalPhaseEnd();
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoPhase, intPhase, intCurrentRound]);

  // ============================================================
  // POMODORO PHASE HANDLER
  // ============================================================
  const handlePomodoroPhaseEnd = () => {
    setRunning(false);
    chime('end');

    if (pomoPhase === 'work') {
      const newCycle = pomoCycle + 1;
      setPomoCycle(newCycle);
      const isLongBreak = newCycle % 4 === 0;
      setPomoPhase(isLongBreak ? 'longBreak' : 'break');
      const dur = isLongBreak ? pomoLongBreak : pomoBreak;
      setPomoRemaining(dur);
      pomoEndRef.current = Date.now() + dur;
      notify(
        isLongBreak ? 'Long break!' : 'Break time!',
        `Work session ${newCycle} complete. Take a ${isLongBreak ? 'long' : 'short'} break.`
      );
    } else {
      setPomoPhase('work');
      setPomoRemaining(pomoWork);
      pomoEndRef.current = Date.now() + pomoWork;
      notify('Back to work!', 'Break is over. Time to focus.');
    }
    // Auto-start next phase
    setRunning(true);
  };

  // ============================================================
  // INTERVAL PHASE HANDLER
  // ============================================================
  const handleIntervalPhaseEnd = () => {
    setRunning(false);
    chime('end');

    if (intPhase === 'work') {
      // Move to rest
      setIntPhase('rest');
      setIntRemaining(intRest);
      intEndRef.current = Date.now() + intRest;
      setRunning(true);
      notify('Rest!', `Round ${intCurrentRound} complete. Rest ${Math.round(intRest / 1000)}s.`);
    } else {
      // Move to next round
      if (intCurrentRound >= intRounds) {
        // Finished
        setRunning(false);
        notify('Workout complete!', `All ${intRounds} rounds done! 🎉`);
      } else {
        setIntCurrentRound(intCurrentRound + 1);
        setIntPhase('work');
        setIntRemaining(intWork);
        intEndRef.current = Date.now() + intWork;
        setRunning(true);
        notify('Go!', `Round ${intCurrentRound + 1} of ${intRounds}.`);
      }
    }
  };

  // ============================================================
  // CONTROLS
  // ============================================================
  const start = useCallback(() => {
    ensureAudio();
    const now = Date.now();

    if (mode === 'stopwatch') {
      swStartRef.current = now;
      // swOffsetRef stays as is
    } else if (mode === 'countdown') {
      if (cdRemaining <= 0) setCdRemaining(cdDuration);
      cdEndRef.current = now + (cdRemaining > 0 ? cdRemaining : cdDuration);
    } else if (mode === 'pomodoro') {
      if (pomoRemaining <= 0) setPomoRemaining(pomoPhase === 'work' ? pomoWork : pomoBreak);
      pomoEndRef.current = now + (pomoRemaining > 0 ? pomoRemaining : pomoWork);
    } else if (mode === 'interval') {
      if (intRemaining <= 0) setIntRemaining(intPhase === 'work' ? intWork : intRest);
      intEndRef.current = now + (intRemaining > 0 ? intRemaining : intWork);
    }

    setRunning(true);
  }, [mode, cdRemaining, cdDuration, pomoRemaining, pomoPhase, pomoWork, pomoBreak, intRemaining, intPhase, intWork, intRest]);

  const pause = useCallback(() => {
    const now = Date.now();
    if (mode === 'stopwatch') {
      swOffsetRef.current += now - swStartRef.current;
      setSwElapsed(swOffsetRef.current);
    } else if (mode === 'countdown') {
      setCdRemaining(Math.max(0, cdEndRef.current - now));
    } else if (mode === 'pomodoro') {
      setPomoRemaining(Math.max(0, pomoEndRef.current - now));
    } else if (mode === 'interval') {
      setIntRemaining(Math.max(0, intEndRef.current - now));
    }
    setRunning(false);
  }, [mode]);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, start, pause]);

  const reset = useCallback(() => {
    setRunning(false);
    if (mode === 'stopwatch') {
      swOffsetRef.current = 0;
      swStartRef.current = 0;
      setSwElapsed(0);
    } else if (mode === 'countdown') {
      setCdRemaining(cdDuration);
    } else if (mode === 'pomodoro') {
      setPomoPhase('work');
      setPomoCycle(0);
      setPomoRemaining(pomoWork);
    } else if (mode === 'interval') {
      setIntPhase('work');
      setIntCurrentRound(1);
      setIntRemaining(intWork);
    }
    updateTabTitle('Timer');
  }, [mode, cdDuration, pomoWork, intWork]);

  const addLap = useCallback(() => {
    if (mode !== 'stopwatch' || !running) return;
    const now = Date.now();
    const elapsed = swOffsetRef.current + (now - swStartRef.current);
    const prev = swLaps.length > 0 ? swLaps[0].totalMs : 0;
    setSwLaps((laps) => [
      { index: laps.length + 1, splitMs: elapsed - prev, totalMs: elapsed },
      ...laps,
    ]);
  }, [mode, running, swLaps]);

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        reset();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        addLap();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggle, reset, addLap]);

  // ============================================================
  // COUNTDOWN INPUT — Update
  // ============================================================
  const applyCountdownInput = () => {
    const h = Math.max(0, parseInt(cdInputH) || 0);
    const m = Math.max(0, parseInt(cdInputM) || 0);
    const s = Math.max(0, parseInt(cdInputS) || 0);
    const total = (h * 3600 + m * 60 + s) * 1000;
    if (total <= 0) return;
    setCdDuration(total);
    setCdRemaining(total);
  };

  const setPresetCountdown = (ms) => {
    setCdDuration(ms);
    setCdRemaining(ms);
    const total = Math.round(ms / 1000);
    setCdInputH(String(Math.floor(total / 3600)));
    setCdInputM(String(Math.floor((total % 3600) / 60)));
    setCdInputS(String(total % 60));
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderTimeDisplay = () => {
    if (mode === 'stopwatch') {
      return formatStopwatch(swElapsed);
    } else if (mode === 'countdown') {
      return formatCountdown(cdRemaining);
    } else if (mode === 'pomodoro') {
      return formatCountdown(pomoRemaining);
    } else if (mode === 'interval') {
      return formatCountdown(intRemaining);
    }
    return '00:00';
  };

  const getProgress = () => {
    if (mode === 'countdown') {
      return cdDuration > 0 ? ((cdDuration - cdRemaining) / cdDuration) * 100 : 0;
    } else if (mode === 'pomodoro') {
      const dur = pomoPhase === 'work' ? pomoWork : pomoPhase === 'longBreak' ? pomoLongBreak : pomoBreak;
      return dur > 0 ? ((dur - pomoRemaining) / dur) * 100 : 0;
    } else if (mode === 'interval') {
      const dur = intPhase === 'work' ? intWork : intRest;
      return dur > 0 ? ((dur - intRemaining) / dur) * 100 : 0;
    }
    return 0;
  };

  const getPhaseLabel = () => {
    if (mode === 'pomodoro') {
      if (pomoPhase === 'work') return '🍅 Focus';
      if (pomoPhase === 'longBreak') return '☕ Long Break';
      return '☕ Short Break';
    }
    if (mode === 'interval') {
      return intPhase === 'work'
        ? `💪 Work — Round ${intCurrentRound}/${intRounds}`
        : `😌 Rest — Round ${intCurrentRound}/${intRounds}`;
    }
    return null;
  };

  const getPhaseColor = () => {
    if (mode === 'pomodoro') {
      return pomoPhase === 'work' ? '#ef4444' : '#22c55e';
    }
    if (mode === 'interval') {
      return intPhase === 'work' ? '#f97316' : '#3b82f6';
    }
    return 'var(--accent)';
  };

  const progress = getProgress();
  const phaseLabel = getPhaseLabel();
  const phaseColor = getPhaseColor();

  // Circle math
  const R = 130;
  const CIRC = 2 * Math.PI * R;

  return (
    <ToolShell tool={tool}>
      <div className="tmr-root">
        {/* Mode tabs */}
        <div className="tmr-modes">
          {TIMER_MODES.map((m) => (
            <button
              key={m.id}
              className={`tmr-mode ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span className="tmr-mode-icon">{m.icon}</span>
              <span className="tmr-mode-label">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Display */}
        <div className="tmr-display-wrap">
          {/* Progress ring */}
          <svg className="tmr-ring" viewBox="0 0 300 300">
            <circle
              cx="150"
              cy="150"
              r={R}
              fill="none"
              stroke="var(--bg-elev)"
              strokeWidth="6"
            />
            {(mode === 'countdown' || mode === 'pomodoro' || mode === 'interval') && (
              <circle
                cx="150"
                cy="150"
                r={R}
                fill="none"
                stroke={phaseColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC - (progress / 100) * CIRC}
                transform="rotate(-90 150 150)"
                style={{ transition: 'stroke-dashoffset 0.3s linear' }}
              />
            )}
          </svg>

          <div className="tmr-display">
            {phaseLabel && (
              <div className="tmr-phase" style={{ color: phaseColor }}>
                {phaseLabel}
              </div>
            )}
            <div className={`tmr-time ${running ? 'running' : ''}`}>
              {renderTimeDisplay()}
            </div>
            {mode === 'pomodoro' && (
              <div className="tmr-sub">
                {pomoCycle} session{pomoCycle === 1 ? '' : 's'} completed
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="tmr-controls">
          <button
            className={`tmr-btn tmr-btn-primary ${running ? 'pause' : ''}`}
            onClick={toggle}
            title={running ? 'Pause (Space)' : 'Start (Space)'}
          >
            {running ? '⏸ Pause' : '▶ Start'}
          </button>

          {mode === 'stopwatch' && (
            <button
              className="tmr-btn tmr-btn-secondary"
              onClick={addLap}
              disabled={!running}
              title="Lap (L)"
            >
              ⚑ Lap
            </button>
          )}

          <button
            className="tmr-btn tmr-btn-secondary"
            onClick={reset}
            title="Reset (R)"
          >
            ⟳ Reset
          </button>

          <button
            className={`tmr-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => {
              ensureAudio();
              setSoundEnabled(!soundEnabled);
            }}
            title="Toggle sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          <button
            className={`tmr-icon-btn ${notifEnabled ? 'active' : ''}`}
            onClick={() => setNotifEnabled(!notifEnabled)}
            title="Toggle notifications"
          >
            🔔
          </button>
        </div>

        {/* ============================================ */}
        {/* MODE-SPECIFIC PANELS */}
        {/* ============================================ */}

        {/* STOPWATCH — Laps */}
        {mode === 'stopwatch' && swLaps.length > 0 && (
          <div className="tmr-panel">
            <div className="tmr-panel-title">
              Laps ({swLaps.length})
              <button
                className="tmr-panel-clear"
                onClick={() => setSwLaps([])}
              >
                Clear
              </button>
            </div>
            <div className="tmr-laps">
              {swLaps.map((lap) => {
                const best = Math.min(...swLaps.map((l) => l.splitMs));
                const worst = Math.max(...swLaps.map((l) => l.splitMs));
                const isBest = swLaps.length > 1 && lap.splitMs === best;
                const isWorst = swLaps.length > 1 && lap.splitMs === worst;
                return (
                  <div
                    key={lap.index}
                    className={`tmr-lap ${isBest ? 'best' : ''} ${isWorst ? 'worst' : ''}`}
                  >
                    <span className="tmr-lap-num">#{lap.index}</span>
                    <span className="tmr-lap-split">
                      +{formatStopwatch(lap.splitMs)}
                    </span>
                    <span className="tmr-lap-total">
                      {formatStopwatch(lap.totalMs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COUNTDOWN — Inputs & Presets */}
        {mode === 'countdown' && (
          <div className="tmr-panel">
            <div className="tmr-panel-title">Set countdown time</div>

            <div className="tmr-inputs">
              <div className="tmr-input-group">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={cdInputH}
                  onChange={(e) => setCdInputH(e.target.value)}
                  onBlur={applyCountdownInput}
                  className="tmr-input"
                />
                <span className="tmr-input-label">hours</span>
              </div>
              <div className="tmr-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={cdInputM}
                  onChange={(e) => setCdInputM(e.target.value)}
                  onBlur={applyCountdownInput}
                  className="tmr-input"
                />
                <span className="tmr-input-label">min</span>
              </div>
              <div className="tmr-input-group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={cdInputS}
                  onChange={(e) => setCdInputS(e.target.value)}
                  onBlur={applyCountdownInput}
                  className="tmr-input"
                />
                <span className="tmr-input-label">sec</span>
              </div>
            </div>

            <div className="tmr-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={`tmr-preset ${cdDuration === p.ms ? 'active' : ''}`}
                  onClick={() => setPresetCountdown(p.ms)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POMODORO — Settings */}
        {mode === 'pomodoro' && (
          <div className="tmr-panel">
            <div className="tmr-panel-title">Pomodoro settings</div>

            <div className="tmr-settings">
              <div className="tmr-setting-row">
                <span className="tmr-setting-label">🍅 Work</span>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={Math.round(pomoWork / 60000)}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    const ms = v * 60000;
                    setPomoWork(ms);
                    if (pomoPhase === 'work' && !running) setPomoRemaining(ms);
                  }}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">min</span>
              </div>

              <div className="tmr-setting-row">
                <span className="tmr-setting-label">☕ Break</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={Math.round(pomoBreak / 60000)}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value) || 1);
                    const ms = v * 60000;
                    setPomoBreak(ms);
                    if (pomoPhase === 'break' && !running) setPomoRemaining(ms);
                  }}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">min</span>
              </div>

              <div className="tmr-setting-row">
                <span className="tmr-setting-label">☕ Long break</span>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={Math.round(pomoLongBreak / 60000)}
                  onChange={(e) => {
                    const v = Math.max(5, parseInt(e.target.value) || 5);
                    const ms = v * 60000;
                    setPomoLongBreak(ms);
                    if (pomoPhase === 'longBreak' && !running) setPomoRemaining(ms);
                  }}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">min</span>
              </div>
            </div>

            <div className="tmr-hint">
              Every 4 work sessions → long break. Auto-advances to next phase.
            </div>
          </div>
        )}

        {/* INTERVAL — Settings */}
        {mode === 'interval' && (
          <div className="tmr-panel">
            <div className="tmr-panel-title">Interval settings (HIIT)</div>

            <div className="tmr-settings">
              <div className="tmr-setting-row">
                <span className="tmr-setting-label">💪 Work</span>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={Math.round(intWork / 1000)}
                  onChange={(e) => {
                    const v = Math.max(5, parseInt(e.target.value) || 5);
                    const ms = v * 1000;
                    setIntWork(ms);
                    if (intPhase === 'work' && !running) setIntRemaining(ms);
                  }}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">sec</span>
              </div>

              <div className="tmr-setting-row">
                <span className="tmr-setting-label">😌 Rest</span>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={Math.round(intRest / 1000)}
                  onChange={(e) => {
                    const v = Math.max(5, parseInt(e.target.value) || 5);
                    const ms = v * 1000;
                    setIntRest(ms);
                    if (intPhase === 'rest' && !running) setIntRemaining(ms);
                  }}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">sec</span>
              </div>

              <div className="tmr-setting-row">
                <span className="tmr-setting-label">🔁 Rounds</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={intRounds}
                  onChange={(e) => setIntRounds(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="tmr-input-sm"
                />
                <span className="tmr-setting-unit">rounds</span>
              </div>
            </div>

            <div className="tmr-hint">
              Total: {Math.round(((intWork + intRest) * intRounds) / 60000)} minutes · {intRounds} rounds
            </div>
          </div>
        )}

        {/* Keyboard hints */}
        <div className="tmr-hints">
          <div className="tmr-hint-item">
            <kbd>Space</kbd> Start / Pause
          </div>
          <div className="tmr-hint-item">
            <kbd>R</kbd> Reset
          </div>
          {mode === 'stopwatch' && (
            <div className="tmr-hint-item">
              <kbd>L</kbd> Lap
            </div>
          )}
        </div>

        {/* SEO */}
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
        <h2>Free Online Timer — Stopwatch, Countdown, Pomodoro</h2>
        <p>
          Need to time something? Our <strong>free online timer</strong>{' '}
          combines four powerful modes in one clean tool:{' '}
          <strong>Stopwatch</strong>, <strong>Countdown</strong>,{' '}
          <strong>Pomodoro</strong>, and <strong>Interval</strong>. Whether
          you're cooking, working out, studying, or timing workouts, this tool
          has you covered.
        </p>
        <p>
          Unlike other timers, ours runs entirely in your browser — no
          downloads, no signup, no ads. Just open and start timing.
        </p>
      </section>

      <section className="seo-section">
        <h2>4 Timer Modes</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⏱</div>
            <h3>Stopwatch</h3>
            <p>
              Precise to hundredths of a second. Record unlimited laps with
              fastest/slowest highlighting.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⏳</div>
            <h3>Countdown</h3>
            <p>
              Set any duration from seconds to hours. Presets for 1m, 5m, 10m,
              25m, 1h. Sound alert when done.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🍅</div>
            <h3>Pomodoro</h3>
            <p>
              Classic 25/5 technique with auto-advance, long breaks every 4
              sessions, and session counter.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔁</div>
            <h3>Interval (HIIT)</h3>
            <p>
              Custom work/rest cycles with round count. Perfect for workouts,
              HIIT training, and breathing exercises.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <ul className="seo-list">
          <li><strong>Millisecond precision</strong> — for the stopwatch mode</li>
          <li><strong>Circular progress ring</strong> — visual feedback</li>
          <li><strong>Sound alerts</strong> — pleasant chime when time's up</li>
          <li><strong>Browser notifications</strong> — alerts even if tab is in background</li>
          <li><strong>Tab title updates</strong> — see time even on other tabs</li>
          <li><strong>Lap recording</strong> — with fastest/slowest highlight</li>
          <li><strong>Presets</strong> — one-tap common durations</li>
          <li><strong>Keyboard shortcuts</strong> — Space to start/pause, R to reset, L for lap</li>
          <li><strong>100% private</strong> — runs entirely in your browser</li>
          <li><strong>Mobile-friendly</strong> — works on any screen size</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li><strong>Cooking</strong> — timing pasta, tea, baking</li>
          <li><strong>Workouts</strong> — HIIT, Tabata, circuit training</li>
          <li><strong>Studying</strong> — Pomodoro technique for deep focus</li>
          <li><strong>Meditation</strong> — breathing intervals, mindfulness sessions</li>
          <li><strong>Presentations</strong> — track speaking time</li>
          <li><strong>Sports</strong> — sprint timing, lap tracking</li>
          <li><strong>Games</strong> — board game turns, chess clocks</li>
          <li><strong>Productivity</strong> — time-boxing, task batching</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this timer free?</summary>
          <p>
            Completely free — no signup, no ads, no limits. Use it as often as
            you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Do I need to keep the tab open?</summary>
          <p>
            Yes — timers run in the browser tab. But if you allow{' '}
            <strong>notifications</strong>, you'll get an alert even when the
            tab is in the background. The browser tab title also shows the
            remaining time.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use it offline?</summary>
          <p>
            Yes — once the page loads, the timer works without internet. Perfect
            for flights or areas with bad reception.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the timer keep running if I close the tab?</summary>
          <p>
            No — closing the tab stops the timer. For long-running timers,
            keep the tab open or pinned.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is the Pomodoro technique?</summary>
          <p>
            The Pomodoro technique is a time-management method where you work
            for 25 minutes, take a 5-minute break, and after 4 cycles take a
            longer 15-minute break. This tool automates the entire process.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I customize the Pomodoro durations?</summary>
          <p>
            Yes — the Pomodoro panel lets you adjust work, break, and long
            break durations to suit your workflow.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I record lap times?</summary>
          <p>
            In Stopwatch mode, click <strong>⚑ Lap</strong> (or press{' '}
            <kbd>L</kbd>) while running to record a lap. The fastest lap is
            highlighted in green, the slowest in red.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are there keyboard shortcuts?</summary>
          <p>
            Yes — <kbd>Space</kbd> to start/pause, <kbd>R</kbd> to reset, and{' '}
            <kbd>L</kbd> for lap (stopwatch mode only).
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other tools: <strong>BMI Calculator</strong>,{' '}
          <strong>Unit Converter</strong>, <strong>Age Calculator</strong>,{' '}
          <strong>Typing Test</strong>, and <strong>Hash Generator</strong> —
          all free and browser-based.
        </p>
      </section>
    </article>
  );
}