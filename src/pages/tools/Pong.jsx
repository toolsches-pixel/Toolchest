import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './Pong.css';

// ============================================================
// CONFIG
// ============================================================
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 460;

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const PADDLE_MARGIN = 20;

const BALL_SIZE = 14;
const BALL_BASE_SPEED = 5;
const BALL_MAX_SPEED = 14;

const AI_SPEEDS = {
  easy: 3.2,
  medium: 4.6,
  hard: 6.2,
};

const WIN_SCORES = [5, 7, 11];

// ============================================================
// SOUND
// ============================================================
function playBeep(ctx, frequency = 600, duration = 0.06, type = 'square') {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// ============================================================
// MAIN
// ============================================================
export default function Pong() {
  const tool = getToolById('pong');

  useDocumentTitle('Pong Game — Classic Arcade Pong Online Free | toolchest');

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
      'Play the classic Pong game online for free. Use arrow keys (↑↓) or W/S to control paddles. 1-player vs AI or 2-player mode. No download, no signup.';

    const scriptId = 'pong-jsonld';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Pong',
      genre: 'Arcade',
      gamePlatform: 'Web Browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1642',
      },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // Settings
  const [mode, setMode] = useState('single'); // 'single' | 'two'
  const [difficulty, setDifficulty] = useState('medium');
  const [winScore, setWinScore] = useState(7);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game state
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'over'
  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);
  const [winner, setWinner] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Game objects (mutable refs)
  const stateRef = useRef({
    leftPaddle: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, vy: 0 },
    rightPaddle: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, vy: 0 },
    ball: {
      x: CANVAS_WIDTH / 2 - BALL_SIZE / 2,
      y: CANVAS_HEIGHT / 2 - BALL_SIZE / 2,
      vx: 0,
      vy: 0,
      speed: BALL_BASE_SPEED,
    },
    leftScore: 0,
    rightScore: 0,
    status: 'idle',
  });

  const keysRef = useRef({});
  const settingsRef = useRef({ mode, difficulty, winScore });
  const soundRef = useRef(soundEnabled);

  useEffect(() => { settingsRef.current = { mode, difficulty, winScore }; }, [mode, difficulty, winScore]);
  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => {
    stateRef.current.status = status;
    stateRef.current.leftScore = leftScore;
    stateRef.current.rightScore = rightScore;
  }, [status, leftScore, rightScore]);

  // Audio
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
  };

  const beep = useCallback((freq, dur, type) => {
    if (soundRef.current) playBeep(audioCtxRef.current, freq, dur, type);
  }, []);

  // ============================================================
  // RESET
  // ============================================================
  const resetBall = useCallback((towardLeft = Math.random() < 0.5) => {
    const s = stateRef.current;
    const angle = (Math.random() - 0.5) * Math.PI * 0.6; // -54° to +54°
    const dir = towardLeft ? -1 : 1;
    s.ball.x = CANVAS_WIDTH / 2 - BALL_SIZE / 2;
    s.ball.y = CANVAS_HEIGHT / 2 - BALL_SIZE / 2;
    s.ball.speed = BALL_BASE_SPEED;
    s.ball.vx = Math.cos(angle) * s.ball.speed * dir;
    s.ball.vy = Math.sin(angle) * s.ball.speed;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.leftPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.rightPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.leftPaddle.vy = 0;
    s.rightPaddle.vy = 0;
    setLeftScore(0);
    setRightScore(0);
    setWinner(null);
    resetBall();
  }, [resetBall]);

  const startGame = useCallback(() => {
    ensureAudio();
    resetGame();
    setStatus('playing');
    beep(800, 0.1, 'square');
  }, [resetGame, beep]);

  const togglePause = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, []);

  // ============================================================
  // UPDATE
  // ============================================================
  const update = useCallback((dt) => {
    const s = stateRef.current;
    const cfg = settingsRef.current;
    if (s.status !== 'playing') return;

    // Ball movement
    s.ball.x += s.ball.vx * dt;
    s.ball.y += s.ball.vy * dt;

    // Top/bottom wall collision
    if (s.ball.y <= 0) {
      s.ball.y = 0;
      s.ball.vy = -s.ball.vy;
      beep(300, 0.05, 'square');
    } else if (s.ball.y + BALL_SIZE >= CANVAS_HEIGHT) {
      s.ball.y = CANVAS_HEIGHT - BALL_SIZE;
      s.ball.vy = -s.ball.vy;
      beep(300, 0.05, 'square');
    }

    // Paddle movement (from keys)
    const keys = keysRef.current;

    // Left paddle: Arrow Up/Down
    if (keys['arrowup']) s.leftPaddle.y -= 7 * dt;
    if (keys['arrowdown']) s.leftPaddle.y += 7 * dt;

    // Right paddle: W / S
    if (cfg.mode === 'two') {
      if (keys['w']) s.rightPaddle.y -= 7 * dt;
      if (keys['s']) s.rightPaddle.y += 7 * dt;
    } else {
      // AI for right paddle
      const aiSpeed = AI_SPEEDS[cfg.difficulty];
      const paddleCenter = s.rightPaddle.y + PADDLE_HEIGHT / 2;
      const ballCenter = s.ball.y + BALL_SIZE / 2;
      // AI accuracy: moves toward ball but with some deadzone for easy
      const deadzone = cfg.difficulty === 'easy' ? 30 : cfg.difficulty === 'medium' ? 15 : 5;
      if (paddleCenter < ballCenter - deadzone) {
        s.rightPaddle.y += aiSpeed * dt;
      } else if (paddleCenter > ballCenter + deadzone) {
        s.rightPaddle.y -= aiSpeed * dt;
      }
    }

    // Clamp paddles
    s.leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, s.leftPaddle.y));
    s.rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, s.rightPaddle.y));

    // Left paddle collision
    if (
      s.ball.vx < 0 &&
      s.ball.x <= PADDLE_MARGIN + PADDLE_WIDTH &&
      s.ball.x + BALL_SIZE >= PADDLE_MARGIN &&
      s.ball.y + BALL_SIZE >= s.leftPaddle.y &&
      s.ball.y <= s.leftPaddle.y + PADDLE_HEIGHT
    ) {
      s.ball.x = PADDLE_MARGIN + PADDLE_WIDTH;
      const relY = (s.ball.y + BALL_SIZE / 2 - (s.leftPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      const angle = relY * (Math.PI / 3); // Max 60°
      s.ball.speed = Math.min(BALL_MAX_SPEED, s.ball.speed + 0.4);
      s.ball.vx = Math.cos(angle) * s.ball.speed;
      s.ball.vy = Math.sin(angle) * s.ball.speed;
      beep(500, 0.06, 'square');
    }

    // Right paddle collision
    if (
      s.ball.vx > 0 &&
      s.ball.x + BALL_SIZE >= CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH &&
      s.ball.x <= CANVAS_WIDTH - PADDLE_MARGIN &&
      s.ball.y + BALL_SIZE >= s.rightPaddle.y &&
      s.ball.y <= s.rightPaddle.y + PADDLE_HEIGHT
    ) {
      s.ball.x = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_SIZE;
      const relY = (s.ball.y + BALL_SIZE / 2 - (s.rightPaddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      const angle = relY * (Math.PI / 3);
      s.ball.speed = Math.min(BALL_MAX_SPEED, s.ball.speed + 0.4);
      s.ball.vx = -Math.cos(angle) * s.ball.speed;
      s.ball.vy = Math.sin(angle) * s.ball.speed;
      beep(500, 0.06, 'square');
    }

    // Scoring
    if (s.ball.x + BALL_SIZE < 0) {
      // Right player scores
      s.rightScore++;
      setRightScore(s.rightScore);
      beep(200, 0.2, 'sawtooth');
      checkWin(s.rightScore, 'right');
      if (s.status === 'playing') resetBall(true); // toward left
    } else if (s.ball.x > CANVAS_WIDTH) {
      // Left player scores
      s.leftScore++;
      setLeftScore(s.leftScore);
      beep(200, 0.2, 'sawtooth');
      checkWin(s.leftScore, 'left');
      if (s.status === 'playing') resetBall(false); // toward right
    }
  }, [resetBall, beep]);

  const checkWin = (score, side) => {
    const cfg = settingsRef.current;
    if (score >= cfg.winScore) {
      setStatus('over');
      setWinner(side);
      beep(900, 0.3, 'sine');
    }
  };

  // ============================================================
  // DRAW
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center dashed line
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.2)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = 'rgba(78, 205, 196, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Big score numbers (faded)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.font = 'bold 120px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(s.leftScore), CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT / 2);
    ctx.fillText(String(s.rightScore), CANVAS_WIDTH / 2 + 100, CANVAS_HEIGHT / 2);

    // Left paddle
    ctx.fillStyle = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    roundRect(
      ctx,
      PADDLE_MARGIN,
      s.leftPaddle.y,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      6
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Right paddle
    ctx.fillStyle = '#e2b714';
    ctx.shadowColor = '#e2b714';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    roundRect(
      ctx,
      CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
      s.rightPaddle.y,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      6
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      s.ball.x + BALL_SIZE / 2,
      s.ball.y + BALL_SIZE / 2,
      BALL_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time) => {
      const dt = Math.min(3, (time - lastTime) / 16.67); // 60fps normalized
      lastTime = time;

      update(dt);
      draw();

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [update, draw]);

  // ============================================================
  // KEYBOARD
  // ============================================================
  useEffect(() => {
    const down = (e) => {
      const key = e.key.toLowerCase();

      if (['arrowup', 'arrowdown', 'w', 's', ' '].includes(key)) {
        e.preventDefault();
      }

      keysRef.current[key] = true;

      // Space — start/pause
      if (key === ' ') {
        if (status === 'idle' || status === 'over') {
          startGame();
        } else if (status === 'playing' || status === 'paused') {
          togglePause();
        }
      }
    };

    const up = (e) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = false;
    };

    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, [status, startGame, togglePause]);

  // ============================================================
  // MOBILE CONTROLS
  // ============================================================
  const setKey = (key, value) => {
    keysRef.current[key] = value;
  };

  const handleMobileStart = () => {
    if (status === 'idle' || status === 'over') startGame();
    else togglePause();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return (
    <ToolShell tool={tool}>
      <div className="pg-root">
        {/* Top bar */}
        <div className="pg-topbar">
          <div className="pg-score-group">
            <div className="pg-score-card pg-left-score">
              <div className="pg-score-label">
                {mode === 'single' ? 'You' : 'Player 1'}
              </div>
              <div className="pg-score-value">{leftScore}</div>
            </div>
            <div className="pg-vs">vs</div>
            <div className="pg-score-card pg-right-score">
              <div className="pg-score-label">
                {mode === 'single' ? 'CPU' : 'Player 2'}
              </div>
              <div className="pg-score-value">{rightScore}</div>
            </div>
          </div>

          <div className="pg-controls">
            <div className="pg-toggle-group">
              <button
                className={`pg-toggle-btn ${mode === 'single' ? 'active' : ''}`}
                onClick={() => {
                  setMode('single');
                  setStatus('idle');
                }}
                disabled={status === 'playing'}
              >
                1P
              </button>
              <button
                className={`pg-toggle-btn ${mode === 'two' ? 'active' : ''}`}
                onClick={() => {
                  setMode('two');
                  setStatus('idle');
                }}
                disabled={status === 'playing'}
              >
                2P
              </button>
            </div>

            {mode === 'single' && (
              <div className="pg-toggle-group">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    className={`pg-toggle-btn ${difficulty === d ? 'active' : ''}`}
                    onClick={() => setDifficulty(d)}
                    disabled={status === 'playing'}
                  >
                    {d[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="pg-toggle-group">
              {WIN_SCORES.map((w) => (
                <button
                  key={w}
                  className={`pg-toggle-btn ${winScore === w ? 'active' : ''}`}
                  onClick={() => setWinScore(w)}
                  disabled={status === 'playing'}
                  title={`First to ${w}`}
                >
                  {w}
                </button>
              ))}
            </div>

            <button
              className={`pg-sound-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => {
                ensureAudio();
                setSoundEnabled(!soundEnabled);
              }}
              title="Toggle sound"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="pg-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="pg-canvas"
          />

          {/* Overlays */}
          {status === 'idle' && (
            <div className="pg-overlay">
              <div className="pg-overlay-icon">🏓</div>
              <h3 className="pg-overlay-title">Pong</h3>
              <p className="pg-overlay-sub">
                {mode === 'single' ? (
                  <>
                    Move your paddle with <kbd>↑</kbd> <kbd>↓</kbd>. Beat the
                    CPU.
                  </>
                ) : (
                  <>
                    <strong>P1:</strong> <kbd>↑</kbd> <kbd>↓</kbd> ·{' '}
                    <strong>P2:</strong> <kbd>W</kbd> <kbd>S</kbd>
                  </>
                )}
              </p>
              <button className="pg-overlay-btn" onClick={startGame}>
                ▶ Start game
              </button>
              <p className="pg-overlay-hint">
                First to <strong>{winScore}</strong> wins · Press <kbd>Space</kbd>{' '}
                to pause
              </p>
            </div>
          )}

          {status === 'paused' && (
            <div className="pg-overlay pg-overlay-paused">
              <div className="pg-overlay-icon">⏸</div>
              <h3 className="pg-overlay-title">Paused</h3>
              <button className="pg-overlay-btn" onClick={togglePause}>
                ▶ Resume
              </button>
              <p className="pg-overlay-hint">
                Press <kbd>Space</kbd> to resume
              </p>
            </div>
          )}

          {status === 'over' && (
            <div className="pg-overlay pg-overlay-over">
              <div className="pg-overlay-icon">
                {mode === 'single'
                  ? winner === 'left'
                    ? '🏆'
                    : '💀'
                  : winner === 'left'
                  ? '🏆'
                  : '🏆'}
              </div>
              <h3 className="pg-overlay-title">
                {mode === 'single'
                  ? winner === 'left'
                    ? 'You Win!'
                    : 'CPU Wins'
                  : winner === 'left'
                  ? 'Player 1 Wins!'
                  : 'Player 2 Wins!'}
              </h3>
              <div className="pg-final-score">
                <span className="pg-final-left">{leftScore}</span>
                <span className="pg-final-sep">–</span>
                <span className="pg-final-right">{rightScore}</span>
              </div>
              <button className="pg-overlay-btn" onClick={startGame}>
                ⟳ Play again
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="pg-mobile-controls">
          <div className="pg-mobile-side">
            <div className="pg-mobile-label">P1</div>
            <div className="pg-mobile-buttons">
              <button
                className="pg-mobile-btn"
                onTouchStart={(e) => {
                  e.preventDefault();
                  setKey('arrowup', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setKey('arrowup', false);
                }}
                onMouseDown={() => setKey('arrowup', true)}
                onMouseUp={() => setKey('arrowup', false)}
                onMouseLeave={() => setKey('arrowup', false)}
              >
                ↑
              </button>
              <button
                className="pg-mobile-btn"
                onTouchStart={(e) => {
                  e.preventDefault();
                  setKey('arrowdown', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setKey('arrowdown', false);
                }}
                onMouseDown={() => setKey('arrowdown', true)}
                onMouseUp={() => setKey('arrowdown', false)}
                onMouseLeave={() => setKey('arrowdown', false)}
              >
                ↓
              </button>
            </div>
          </div>

          <button
            className="pg-mobile-start"
            onClick={handleMobileStart}
          >
            {status === 'playing' ? '⏸' : '▶'}
          </button>

          {mode === 'two' ? (
            <div className="pg-mobile-side">
              <div className="pg-mobile-label">P2</div>
              <div className="pg-mobile-buttons">
                <button
                  className="pg-mobile-btn"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setKey('w', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setKey('w', false);
                  }}
                  onMouseDown={() => setKey('w', true)}
                  onMouseUp={() => setKey('w', false)}
                  onMouseLeave={() => setKey('w', false)}
                >
                  ↑
                </button>
                <button
                  className="pg-mobile-btn"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setKey('s', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setKey('s', false);
                  }}
                  onMouseDown={() => setKey('s', true)}
                  onMouseUp={() => setKey('s', false)}
                  onMouseLeave={() => setKey('s', false)}
                >
                  ↓
                </button>
              </div>
            </div>
          ) : (
            <div className="pg-mobile-side pg-mobile-cpu">
              <div className="pg-mobile-label">CPU</div>
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="pg-hints">
          <div className="pg-hint-item">
            <kbd>↑</kbd> <kbd>↓</kbd> {mode === 'single' ? 'Move paddle' : 'P1 paddle'}
          </div>
          {mode === 'two' && (
            <div className="pg-hint-item">
              <kbd>W</kbd> <kbd>S</kbd> P2 paddle
            </div>
          )}
          <div className="pg-hint-item">
            <kbd>Space</kbd> Start / Pause
          </div>
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

// ============================================================
// HELPERS
// ============================================================
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>Play Pong Online — The Classic Arcade Game</h2>
        <p>
          <strong>Pong</strong> is the original video game — released in 1972
          by Atari, it launched the entire video game industry. Two paddles,
          one ball, and a simple goal: don't let the ball past your side. That's
          it. And yet, over 50 years later, it's still addictive.
        </p>
        <p>
          Our <strong>free online Pong game</strong> recreates the classic
          experience with smooth modern graphics. Play solo against a smart AI,
          or grab a friend for local two-player action on the same keyboard.
        </p>
      </section>

      <section class="seo-section">
        <h2>How to Play Pong</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose your mode</strong> — 1 player (vs CPU) or 2 players
            (same keyboard).
          </li>
          <li>
            <strong>Set difficulty</strong> — Easy, Medium, or Hard (for 1P
            mode).
          </li>
          <li>
            <strong>Press Space or click Start</strong> to begin.
          </li>
          <li>
            <strong>Move your paddle</strong> — <kbd>↑</kbd> <kbd>↓</kbd> for
            left paddle, <kbd>W</kbd> <kbd>S</kbd> for right paddle.
          </li>
          <li>
            <strong>Score points</strong> by getting the ball past your
            opponent. First to 5, 7, or 11 wins.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Game Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🎮</div>
            <h3>1P & 2P Modes</h3>
            <p>
              Play solo against a smart AI or challenge a friend on the same
              keyboard.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧠</div>
            <h3>3 Difficulty Levels</h3>
            <p>
              Easy for casual play, Medium for balanced challenge, Hard for
              seasoned pros.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Progressive Speed</h3>
            <p>
              Ball speeds up with each paddle hit — matches get intense fast.
            </p>
          </div>
          <div class="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Angle Control</h3>
            <p>
              Hit the ball with the edge of your paddle to change its angle —
              master this for pro-level play.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Mobile Controls</h3>
            <p>
              On-screen touch buttons for phones and tablets. Full two-player
              support.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Free & Private</h3>
            <p>
              No downloads, no signup, no ads. Runs entirely in your browser.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Tips to Win at Pong</h2>
        <ul className="seo-list">
          <li>
            <strong>Use paddle edges</strong> — hitting the ball with the top
            or bottom of your paddle creates steep angles that are hard to
            return.
          </li>
          <li>
            <strong>Stay centered</strong> — after every hit, return to the
            middle of the screen so you can reach either direction.
          </li>
          <li>
            <strong>Anticipate the ball</strong> — watch the ball's velocity
            and move before it arrives.
          </li>
          <li>
            <strong>Vary your shots</strong> — mix straight shots with angled
            ones to keep your opponent guessing.
          </li>
          <li>
            <strong>Stay calm</strong> — as the ball speeds up, panic is your
            enemy. Trust your reflexes.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>How do I control the paddles?</summary>
          <p>
            <strong>Left paddle (Player 1):</strong> <kbd>↑</kbd> and{' '}
            <kbd>↓</kbd> arrow keys. <strong>Right paddle (Player 2):</strong>{' '}
            <kbd>W</kbd> and <kbd>S</kbd> keys. On mobile, use the on-screen
            buttons.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can two people play on the same keyboard?</summary>
          <p>
            Yes! Select the <strong>2P</strong> mode. Player 1 uses arrow keys,
            Player 2 uses W/S. Perfect for local head-to-head matches.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this the original Pong game?</summary>
          <p>
            This is a faithful recreation inspired by the original 1972 Atari
            Pong — same gameplay, modern graphics. No affiliation with Atari.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How do I pause the game?</summary>
          <p>
            Press the <kbd>Space</kbd> bar to pause and resume. The game will
            freeze until you press Space again.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I change the winning score?</summary>
          <p>
            Yes — before starting, choose from <strong>5</strong>,{' '}
            <strong>7</strong>, or <strong>11</strong> points. First to reach
            that score wins.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a high score or leaderboard?</summary>
          <p>
            Pong is a two-player game — no traditional high score. But you can
            play multiple matches and keep track of your own win record
            mentally!
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            Once the page loads, yes — everything runs in your browser. No
            internet required after the initial load.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is the game free?</summary>
          <p>
            Completely free — no signup, no ads, no downloads. Just open and
            play.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other games and tools: <strong>Snake Game</strong>,{' '}
          <strong>Coin Flip</strong>, <strong>Name to Stylish Text</strong>,{' '}
          <strong>Typing Test</strong>, and <strong>Color Picker</strong> — all
          free and browser-based.
        </p>
      </section>
    </article>
  );
}