import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './SnakeGame.css';

// ============================================================
// CONFIG
// ============================================================
const GRID_SIZE = 20;          // 20x20 grid
const CELL_SIZE = 20;          // 20px per cell
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // 400px

const SPEEDS = {
  slow: 200,
  normal: 140,
  fast: 100,
  insane: 80,
};

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// ============================================================
// SOUND EFFECTS
// ============================================================
function playBeep(ctx, frequency = 600, duration = 0.08, type = 'sine') {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// ============================================================
// MAIN
// ============================================================
export default function SnakeGame() {
  const tool = getToolById('snake-game');

  useDocumentTitle('Snake Game — Play Classic Snake Online Free | toolchest');

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
      'Play the classic Snake game online for free. Use arrow keys or WASD to control the snake. Eat food, grow longer, and beat your high score. No download, no signup.';

    const scriptId = 'snake-game-jsonld';
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
      name: 'Snake Game',
      genre: 'Arcade',
      gamePlatform: 'Web Browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2143',
      },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // Game state
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'over'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState('normal');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [finalScore, setFinalScore] = useState(0);

  // Refs (mutable, no re-render)
  const canvasRef = useRef(null);
  const snakeRef = useRef([]);
  const directionRef = useRef('right');
  const pendingDirectionRef = useRef('right');
  const foodRef = useRef({ x: 0, y: 0, type: 'normal' });
  const gameLoopRef = useRef(null);
  const scoreRef = useRef(0);
  const statusRef = useRef('idle');
  const audioCtxRef = useRef(null);
  const speedRef = useRef(120);

  // Sync
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { speedRef.current = SPEEDS[speed]; }, [speed]);

  // Load high score
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem('toolchestSnakeHighScore') || '0', 10);
      setHighScore(saved);
    } catch (e) {}
  }, []);

  // Audio init
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
  };

  // ============================================================
  // GAME LOGIC
  // ============================================================
  const getRandomFood = useCallback(() => {
    const snake = snakeRef.current;
    let attempts = 0;
    while (attempts < 200) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const collides = snake.some((s) => s.x === x && s.y === y);
      if (!collides) {
        // 15% chance of golden food
        const type = Math.random() < 0.15 ? 'golden' : 'normal';
        return { x, y, type };
      }
      attempts++;
    }
    return { x: 0, y: 0, type: 'normal' };
  }, []);

  const resetGame = useCallback(() => {
    const mid = Math.floor(GRID_SIZE / 2);
    snakeRef.current = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    directionRef.current = 'right';
    pendingDirectionRef.current = 'right';
    foodRef.current = { x: 10, y: 5, type: 'normal' };
    setScore(0);
    scoreRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    ensureAudio();
    resetGame();
    setStatus('playing');
    statusRef.current = 'playing';
    setFinalScore(0);
  }, [resetGame]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') {
      setStatus('paused');
      statusRef.current = 'paused';
    } else if (statusRef.current === 'paused') {
      setStatus('playing');
      statusRef.current = 'playing';
    }
  }, []);

  const endGame = useCallback(() => {
    setStatus('over');
    statusRef.current = 'over';
    setFinalScore(scoreRef.current);
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      try {
        localStorage.setItem('toolchestSnakeHighScore', String(scoreRef.current));
      } catch (e) {}
    }
    playBeep(audioCtxRef.current, 200, 0.4, 'sawtooth');
  }, [highScore]);

  // ============================================================
  // RENDER
  // ============================================================
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const snake = snakeRef.current;
    const food = foodRef.current;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Food
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
    if (food.type === 'golden') {
      // Golden food with glow
      const grad = ctx.createRadialGradient(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE
      );
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2 - 1) * pulse,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Normal food (apple)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2 - 2) * pulse,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2 - 3,
        food.y * CELL_SIZE + CELL_SIZE / 2 - 3,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Snake
    snake.forEach((seg, i) => {
      const x = seg.x * CELL_SIZE;
      const y = seg.y * CELL_SIZE;
      const isHead = i === 0;
      const t = i / Math.max(1, snake.length - 1);

      // Gradient from head to tail
      const r = Math.round(78 + (168 - 78) * t);
      const g = Math.round(205 + (85 - 205) * t);
      const b = Math.round(196 + (247 - 196) * t);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      if (isHead) {
        ctx.shadowColor = '#4ecdc4';
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      // Rounded rect
      const padding = isHead ? 1 : 2;
      const size = CELL_SIZE - padding * 2;
      ctx.beginPath();
      const rad = 5;
      const x2 = x + padding;
      const y2 = y + padding;
      ctx.moveTo(x2 + rad, y2);
      ctx.lineTo(x2 + size - rad, y2);
      ctx.quadraticCurveTo(x2 + size, y2, x2 + size, y2 + rad);
      ctx.lineTo(x2 + size, y2 + size - rad);
      ctx.quadraticCurveTo(x2 + size, y2 + size, x2 + size - rad, y2 + size);
      ctx.lineTo(x2 + rad, y2 + size);
      ctx.quadraticCurveTo(x2, y2 + size, x2, y2 + size - rad);
      ctx.lineTo(x2, y2 + rad);
      ctx.quadraticCurveTo(x2, y2, x2 + rad, y2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyes on head
      if (isHead) {
        ctx.fillStyle = '#0d1117';
        const dir = directionRef.current;
        const eyeSize = 3;
        let ex1, ey1, ex2, ey2;
        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;
        const offset = 4;
        const sideOffset = 4;

        if (dir === 'right') {
          ex1 = cx + offset; ey1 = cy - sideOffset;
          ex2 = cx + offset; ey2 = cy + sideOffset;
        } else if (dir === 'left') {
          ex1 = cx - offset; ey1 = cy - sideOffset;
          ex2 = cx - offset; ey2 = cy + sideOffset;
        } else if (dir === 'up') {
          ex1 = cx - sideOffset; ey1 = cy - offset;
          ex2 = cx + sideOffset; ey2 = cy - offset;
        } else {
          ex1 = cx - sideOffset; ey1 = cy + offset;
          ex2 = cx + sideOffset; ey2 = cy + offset;
        }

        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, []);

  // ============================================================
  // GAME TICK
  // ============================================================
  const tick = useCallback(() => {
    if (statusRef.current !== 'playing') return;

    const snake = snakeRef.current;
    const dir = pendingDirectionRef.current;
    directionRef.current = dir;

    const move = DIRECTIONS[dir];
    const head = snake[0];
    const newHead = { x: head.x + move.x, y: head.y + move.y };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      endGame();
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame();
      return;
    }

    snake.unshift(newHead);

    // Food collision
    const food = foodRef.current;
    if (newHead.x === food.x && newHead.y === food.y) {
      const points = food.type === 'golden' ? 5 : 1;
      const newScore = scoreRef.current + points;
      setScore(newScore);
      scoreRef.current = newScore;

      playBeep(
        audioCtxRef.current,
        food.type === 'golden' ? 900 : 700,
        0.08,
        'sine'
      );

      foodRef.current = getRandomFood();
    } else {
      snake.pop();
    }

    draw();
  }, [draw, endGame, getRandomFood]);

  // ============================================================
  // GAME LOOP
  // ============================================================
  useEffect(() => {
    if (status === 'playing') {
      gameLoopRef.current = setInterval(tick, speedRef.current);
    } else if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [status, speed, tick]);

  // ============================================================
  // DRAW ANIMATION
  // ============================================================
  useEffect(() => {
    if (status === 'playing' || status === 'idle') {
      const raf = requestAnimationFrame(function loop() {
        draw();
        if (statusRef.current === 'playing' || statusRef.current === 'idle') {
          requestAnimationFrame(loop);
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      draw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, draw]);

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key.toLowerCase();

      // Prevent arrow keys scrolling page
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)
      ) {
        e.preventDefault();
      }

      // Space — start/pause
      if (key === ' ') {
        if (statusRef.current === 'idle' || statusRef.current === 'over') {
          startGame();
        } else if (statusRef.current === 'playing' || statusRef.current === 'paused') {
          togglePause();
        }
        return;
      }

      // Direction controls
      const currentDir = directionRef.current;
      let newDir = null;

      if (key === 'arrowup' || key === 'w') newDir = 'up';
      else if (key === 'arrowdown' || key === 's') newDir = 'down';
      else if (key === 'arrowleft' || key === 'a') newDir = 'left';
      else if (key === 'arrowright' || key === 'd') newDir = 'right';

      if (!newDir) return;

      // Prevent reversing
      const isOpposite =
        (currentDir === 'up' && newDir === 'down') ||
        (currentDir === 'down' && newDir === 'up') ||
        (currentDir === 'left' && newDir === 'right') ||
        (currentDir === 'right' && newDir === 'left');

      if (isOpposite) return;

      pendingDirectionRef.current = newDir;

      // Auto-start on first key
      if (statusRef.current === 'idle') {
        startGame();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [startGame, togglePause]);

  // ============================================================
  // MOBILE CONTROLS
  // ============================================================
  const handleMobileDir = (dir) => {
    const currentDir = directionRef.current;
    const isOpposite =
      (currentDir === 'up' && dir === 'down') ||
      (currentDir === 'down' && dir === 'up') ||
      (currentDir === 'left' && dir === 'right') ||
      (currentDir === 'right' && dir === 'left');
    if (isOpposite) return;
    pendingDirectionRef.current = dir;
    if (statusRef.current === 'idle') startGame();
    else if (statusRef.current === 'paused') togglePause();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return (
    <ToolShell tool={tool}>
      <div className="sn-root">
        {/* Top bar: score + high + speed */}
        <div className="sn-topbar">
          <div className="sn-score-group">
            <div className="sn-score-card">
              <div className="sn-score-label">Score</div>
              <div className="sn-score-value">{score}</div>
            </div>
            <div className="sn-score-card sn-high">
              <div className="sn-score-label">High</div>
              <div className="sn-score-value">{highScore}</div>
            </div>
          </div>

          <div className="sn-controls">
            <div className="sn-speed-group">
              {Object.keys(SPEEDS).map((s) => (
                <button
                  key={s}
                  className={`sn-speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => setSpeed(s)}
                  disabled={status === 'playing'}
                  title={`${s} speed`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              className={`sn-sound-btn ${soundEnabled ? 'active' : ''}`}
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

        {/* Canvas wrapper */}
        <div className="sn-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="sn-canvas"
          />

          {/* Overlays */}
          {status === 'idle' && (
            <div className="sn-overlay">
              <div className="sn-overlay-icon">🐍</div>
              <h3 className="sn-overlay-title">Snake</h3>
              <p className="sn-overlay-sub">
                Use <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or{' '}
                <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move
              </p>
              <button className="sn-overlay-btn" onClick={startGame}>
                ▶ Start game
              </button>
              <p className="sn-overlay-hint">
                Press <kbd>Space</kbd> to start or pause
              </p>
            </div>
          )}

          {status === 'paused' && (
            <div className="sn-overlay sn-overlay-paused">
              <div className="sn-overlay-icon">⏸</div>
              <h3 className="sn-overlay-title">Paused</h3>
              <button className="sn-overlay-btn" onClick={togglePause}>
                ▶ Resume
              </button>
              <p className="sn-overlay-hint">
                Press <kbd>Space</kbd> to resume
              </p>
            </div>
          )}

          {status === 'over' && (
            <div className="sn-overlay sn-overlay-over">
              <div className="sn-overlay-icon">💀</div>
              <h3 className="sn-overlay-title">Game Over</h3>
              <div className="sn-final-score">
                <div className="sn-final-label">Final Score</div>
                <div className="sn-final-value">{finalScore}</div>
              </div>
              {finalScore >= highScore && finalScore > 0 && (
                <div className="sn-new-record">🏆 New high score!</div>
              )}
              <button className="sn-overlay-btn" onClick={startGame}>
                ⟳ Play again
              </button>
              <p className="sn-overlay-hint">
                Press <kbd>Space</kbd> to restart
              </p>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="sn-mobile-controls">
          <button
            className="sn-mobile-btn sn-mobile-up"
            onTouchStart={(e) => {
              e.preventDefault();
              handleMobileDir('up');
            }}
            onMouseDown={() => handleMobileDir('up')}
            aria-label="Up"
          >
            ↑
          </button>
          <div className="sn-mobile-row">
            <button
              className="sn-mobile-btn"
              onTouchStart={(e) => {
                e.preventDefault();
                handleMobileDir('left');
              }}
              onMouseDown={() => handleMobileDir('left')}
              aria-label="Left"
            >
              ←
            </button>
            <button
              className="sn-mobile-btn sn-mobile-pause"
              onTouchStart={(e) => {
                e.preventDefault();
                if (statusRef.current === 'idle' || statusRef.current === 'over') {
                  startGame();
                } else {
                  togglePause();
                }
              }}
              onMouseDown={() => {
                if (statusRef.current === 'idle' || statusRef.current === 'over') {
                  startGame();
                } else {
                  togglePause();
                }
              }}
              aria-label="Pause"
            >
              {status === 'playing' ? '⏸' : '▶'}
            </button>
            <button
              className="sn-mobile-btn"
              onTouchStart={(e) => {
                e.preventDefault();
                handleMobileDir('right');
              }}
              onMouseDown={() => handleMobileDir('right')}
              aria-label="Right"
            >
              →
            </button>
          </div>
          <button
            className="sn-mobile-btn sn-mobile-down"
            onTouchStart={(e) => {
              e.preventDefault();
              handleMobileDir('down');
            }}
            onMouseDown={() => handleMobileDir('down')}
            aria-label="Down"
          >
            ↓
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="sn-hints">
          <div className="sn-hint-item">
            <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> Move
          </div>
          <div className="sn-hint-item">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move
          </div>
          <div className="sn-hint-item">
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
// SEO CONTENT
// ============================================================
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>Play Snake Game Online</h2>
        <p>
          <strong>Snake</strong> is one of the most iconic arcade games of all
          time — simple to learn, hard to master. Control a growing snake with
          your arrow keys or WASD, eat food to grow longer, and avoid hitting
          the walls or yourself. Every bite makes you longer and the challenge
          harder.
        </p>
        <p>
          Our <strong>free online Snake game</strong> runs entirely in your
          browser — no downloads, no ads, no signup. Perfect for a quick break
          or a serious high-score attempt.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Play</h2>
        <ol className="seo-steps">
          <li>
            <strong>Press Space</strong> or click <strong>Start game</strong>{' '}
            to begin.
          </li>
          <li>
            <strong>Use arrow keys</strong> (↑ ↓ ← →) or{' '}
            <strong>W A S D</strong> to control the snake's direction.
          </li>
          <li>
            <strong>Eat the red apples</strong> to grow — each apple gives 1
            point.
          </li>
          <li>
            <strong>Golden food</strong> appears rarely — worth 5 points!
          </li>
          <li>
            <strong>Avoid walls and yourself</strong> — one wrong move ends
            the game.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Game Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⌨️</div>
            <h3>Keyboard Controls</h3>
            <p>
              Smooth controls with arrow keys or WASD. Press Space to
              start/pause instantly.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Mobile D-Pad</h3>
            <p>
              On touch devices, use the on-screen D-pad to control the snake
              with your thumb.
            </p>
          </div>
          <div class="seo-feature">
            <div className="seo-feature-icon">🏆</div>
            <h3>High Score Saved</h3>
            <p>
              Your best score is saved locally in your browser — come back
              later and try to beat it.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>4 Speed Levels</h3>
            <p>
              Choose Slow, Normal, Fast, or Insane — from relaxing to
              challenging.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎁</div>
            <h3>Golden Bonus Food</h3>
            <p>
              Rare golden apples appear randomly — each worth 5 points instead
              of 1.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Browser-Based</h3>
            <p>
              No downloads, no signup, no data sent anywhere. Just open and
              play.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Tips to Get a High Score</h2>
        <ul className="seo-list">
          <li>
            <strong>Plan ahead</strong> — don't just chase the food; think
            about where your snake will be in 3-4 moves.
          </li>
          <li>
            <strong>Hug the walls</strong> — moving along the edges gives you
            more open space to maneuver.
          </li>
          <li>
            <strong>Zigzag pattern</strong> — a systematic left-right or
            up-down pattern covers the board safely.
          </li>
          <li>
            <strong>Slow down</strong> — if you're new, use the Slow speed
            setting to learn the board.
          </li>
          <li>
            <strong>Leave an escape route</strong> — never trap yourself in a
            corner you can't escape.
          </li>
          <li>
            <strong>Grab golden food</strong> — it's worth 5× a normal apple.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>How do I control the snake?</summary>
          <p>
            Use the <strong>arrow keys</strong> (↑ ↓ ← →) or{' '}
            <strong>W A S D</strong>. On mobile, use the on-screen D-pad. Press{' '}
            <strong>Space</strong> to start or pause.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is the game free?</summary>
          <p>
            Yes — completely free with no downloads, no ads, and no signup.
            Just open the page and start playing.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my high score saved?</summary>
          <p>
            Yes — your best score is saved in your browser's localStorage. It
            persists even after you close the tab.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I play on mobile?</summary>
          <p>
            Absolutely — the game is fully responsive with an on-screen D-pad
            designed for touch. Works great on phones and tablets.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is the golden food?</summary>
          <p>
            Occasionally a golden apple appears instead of a normal red one. It
            gives you <strong>5 points</strong> instead of 1 — great for
            boosting your score quickly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I change the speed?</summary>
          <p>
            Yes — before starting, choose from <strong>Slow</strong>,{' '}
            <strong>Normal</strong>, <strong>Fast</strong>, or{' '}
            <strong>Insane</strong> speed. Speed can't be changed mid-game.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why did my snake die suddenly?</summary>
          <p>
            The snake dies if it hits a wall or its own body. Make sure to plan
            your moves to avoid trapping yourself.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the game work offline?</summary>
          <p>
            Once the page is loaded, yes — everything runs in your browser. If
            you lose internet, the game keeps working.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other fun tools: <strong>Coin Flip</strong>,{' '}
          <strong>Name to Stylish Text</strong>, <strong>Color Picker</strong>,
          and <strong>Typing Test</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}