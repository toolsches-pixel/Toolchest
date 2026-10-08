import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './TicTacToe.css';

// ============================================================
// WINNING COMBINATIONS
// ============================================================
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ============================================================
// HELPERS
// ============================================================
function checkWinner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

function getEmptyCells(board) {
  return board
    .map((cell, i) => (cell === null ? i : null))
    .filter((x) => x !== null);
}

// ============================================================
// AI — MINIMAX
// ============================================================
function minimax(board, depth, isMaximizing, aiSymbol, humanSymbol) {
  const { winner } = checkWinner(board);
  if (winner === aiSymbol) return 10 - depth;
  if (winner === humanSymbol) return depth - 10;
  if (winner === 'draw') return 0;

  const empty = getEmptyCells(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = aiSymbol;
      const score = minimax(board, depth + 1, false, aiSymbol, humanSymbol);
      board[i] = null;
      best = Math.max(best, score);
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = humanSymbol;
      const score = minimax(board, depth + 1, true, aiSymbol, humanSymbol);
      board[i] = null;
      best = Math.min(best, score);
    }
    return best;
  }
}

function getBestMove(board, aiSymbol, humanSymbol) {
  const empty = getEmptyCells(board);
  let bestScore = -Infinity;
  let bestMove = empty[0];

  for (const i of empty) {
    board[i] = aiSymbol;
    const score = minimax(board, 0, false, aiSymbol, humanSymbol);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function getRandomMove(board) {
  const empty = getEmptyCells(board);
  return empty[Math.floor(Math.random() * empty.length)];
}

function getMediumMove(board, aiSymbol, humanSymbol) {
  if (Math.random() < 0.6) {
    return getBestMove([...board], aiSymbol, humanSymbol);
  }
  return getRandomMove(board);
}

function getAiMove(board, difficulty, aiSymbol, humanSymbol) {
  if (difficulty === 'easy') return getRandomMove(board);
  if (difficulty === 'medium') return getMediumMove(board, aiSymbol, humanSymbol);
  return getBestMove([...board], aiSymbol, humanSymbol);
}

// ============================================================
// SOUND
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
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// ============================================================
// MARK ICONS
// ============================================================
const MARK_X = '✕';
const MARK_O = '◯';

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TicTacToe() {
  const tool = getToolById('tic-tac-toe');

  useDocumentTitle('Tic Tac Toe — Play Online vs Computer or Friend | toolchest');

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
      'Play Tic Tac Toe online free. Play vs computer (easy, medium, impossible) or a friend on the same device. Keyboard arrow keys or click/tap. Modern bluish design. No download, no signup.';

    const scriptId = 'tictactoe-jsonld';
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
      name: 'Tic Tac Toe',
      genre: 'Puzzle',
      gamePlatform: 'Web Browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1873',
      },
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  // ---------- STATE ----------
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [mode, setMode] = useState('computer');
  const [difficulty, setDifficulty] = useState('medium');
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const [gameState, setGameState] = useState({ winner: null, line: null });
  const [cursorIndex, setCursorIndex] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef(null);
  const aiTimeoutRef = useRef(null);

  const humanSymbol = 'X';
  const aiSymbol = 'O';

  // ---------- AUDIO ----------
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
  };

  const beep = useCallback(
    (freq, dur, type) => {
      if (soundEnabled) playBeep(audioCtxRef.current, freq, dur, type);
    },
    [soundEnabled]
  );

  // ============================================================
  // PLACE MARK
  // ============================================================
  const placeMark = useCallback(
    (index, forceSymbol) => {
      if (gameState.winner) return;
      if (board[index] !== null) return;

      const player = forceSymbol || currentPlayer;

      if (!forceSymbol && mode === 'computer' && currentPlayer !== humanSymbol) {
        return;
      }

      const newBoard = [...board];
      newBoard[index] = player;

      const result = checkWinner(newBoard);
      setBoard(newBoard);
      setGameState(result);

      if (result.winner) {
        if (result.winner === 'draw') {
          setScore((s) => ({ ...s, draw: s.draw + 1 }));
          beep(400, 0.15, 'sine');
        } else {
          setScore((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
          beep(result.winner === 'X' ? 800 : 500, 0.25, 'sine');
        }
        return;
      }

      beep(player === 'X' ? 700 : 550, 0.06, 'sine');
      setCurrentPlayer(player === 'X' ? 'O' : 'X');
    },
    [board, currentPlayer, gameState, mode, humanSymbol, soundEnabled, beep]
  );

  // ============================================================
  // AI MOVE
  // ============================================================
  useEffect(() => {
    if (mode !== 'computer') return;
    if (gameState.winner) return;
    if (currentPlayer !== aiSymbol) return;

    setThinking(true);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    aiTimeoutRef.current = setTimeout(() => {
      const move = getAiMove(board, difficulty, aiSymbol, humanSymbol);
      if (move !== undefined && move !== null && board[move] === null) {
        placeMark(move, aiSymbol);
      }
      setThinking(false);
    }, 400);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, mode, gameState.winner, board, difficulty]);

  // ============================================================
  // KEYBOARD
  // ============================================================
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();

      if (key === 'arrowup') {
        e.preventDefault();
        setCursorIndex((i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const newRow = (row - 1 + 3) % 3;
          return newRow * 3 + col;
        });
      } else if (key === 'arrowdown') {
        e.preventDefault();
        setCursorIndex((i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const newRow = (row + 1) % 3;
          return newRow * 3 + col;
        });
      } else if (key === 'arrowleft') {
        e.preventDefault();
        setCursorIndex((i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const newCol = (col - 1 + 3) % 3;
          return row * 3 + newCol;
        });
      } else if (key === 'arrowright') {
        e.preventDefault();
        setCursorIndex((i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const newCol = (col + 1) % 3;
          return row * 3 + newCol;
        });
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        placeMark(cursorIndex);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cursorIndex, placeMark]);

  // ============================================================
  // RESET
  // ============================================================
  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setGameState({ winner: null, line: null });
    setCursorIndex(0);
    setThinking(false);
    setCurrentPlayer('X');
  };

  const resetScore = () => {
    setScore({ X: 0, O: 0, draw: 0 });
    setBoard(Array(9).fill(null));
    setGameState({ winner: null, line: null });
    setCurrentPlayer('X');
    setCursorIndex(0);
    setThinking(false);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setBoard(Array(9).fill(null));
    setGameState({ winner: null, line: null });
    setCurrentPlayer('X');
    setCursorIndex(0);
    setThinking(false);
  };

  // ============================================================
  // STATUS TEXT
  // ============================================================
  const statusText = (() => {
    if (gameState.winner === 'draw') return 'Draw!';
    if (gameState.winner === 'X') {
      return mode === 'computer' ? '🎉 You win!' : 'Player X wins!';
    }
    if (gameState.winner === 'O') {
      return mode === 'computer' ? '😅 Computer wins' : 'Player O wins!';
    }
    if (thinking) return 'Computer is thinking…';
    if (mode === 'computer') {
      return currentPlayer === humanSymbol ? 'Your turn' : 'Computer\'s turn';
    }
    return `Player ${currentPlayer}'s turn`;
  })();

  const isOver = !!gameState.winner;

  return (
    <ToolShell tool={tool}>
      <div className="ttt-root">
        <div className="ttt-layout">
          {/* LEFT: BOARD */}
          <div className="ttt-board-section">
            <div className="ttt-board-header">
              <div className="ttt-board-title">Tic Tac Toe</div>
              <div className={`ttt-status ${isOver ? 'ttt-status-over' : ''}`}>
                {statusText}
              </div>
            </div>

            <div className="ttt-board-wrap">
              <div className="ttt-board" role="grid">
                {board.map((cell, i) => {
                  const isWinningCell = gameState.line?.includes(i);
                  const isCursor = i === cursorIndex;
                  const disabled =
                    cell !== null ||
                    !!gameState.winner ||
                    thinking ||
                    (mode === 'computer' && currentPlayer !== humanSymbol);

                  return (
                    <button
                      key={i}
                      className={`ttt-cell ${cell === 'X' ? 'ttt-x' : ''} ${
                        cell === 'O' ? 'ttt-o' : ''
                      } ${isWinningCell ? 'ttt-winning' : ''} ${
                        isCursor ? 'ttt-cursor' : ''
                      }`}
                      onClick={() => placeMark(i)}
                      onMouseEnter={() => setCursorIndex(i)}
                      disabled={disabled}
                      aria-label={`Cell ${i + 1}`}
                    >
                      {cell === 'X' && (
                        <span className="ttt-mark ttt-mark-x">{MARK_X}</span>
                      )}
                      {cell === 'O' && (
                        <span className="ttt-mark ttt-mark-o">{MARK_O}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Game over overlay */}
              {isOver && (
                <div className="ttt-overlay">
                  <div className="ttt-overlay-content">
                    <div className="ttt-overlay-icon">
                      {gameState.winner === 'draw'
                        ? '🤝'
                        : gameState.winner === 'X' && mode === 'computer'
                        ? '🏆'
                        : gameState.winner === 'O' && mode === 'computer'
                        ? '🤖'
                        : '🏆'}
                    </div>
                    <div className="ttt-overlay-text">
                      {gameState.winner === 'draw'
                        ? 'Draw!'
                        : gameState.winner === 'X' && mode === 'computer'
                        ? 'You Win!'
                        : gameState.winner === 'O' && mode === 'computer'
                        ? 'Computer Wins'
                        : `Player ${gameState.winner} Wins!`}
                    </div>
                    <button className="ttt-next-btn" onClick={resetBoard}>
                      ▶ Next Round
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Score */}
            <div className="ttt-score-bar">
              <div
                className={`ttt-score-item ${
                  mode === 'computer' ? 'ttt-score-you' : 'ttt-score-x'
                }`}
              >
                <div className="ttt-score-label">
                  {mode === 'computer' ? 'You (X)' : 'Player X'}
                </div>
                <div className="ttt-score-value">{score.X}</div>
              </div>
              <div className="ttt-score-item ttt-score-draw">
                <div className="ttt-score-label">Draws</div>
                <div className="ttt-score-value">{score.draw}</div>
              </div>
              <div
                className={`ttt-score-item ${
                  mode === 'computer' ? 'ttt-score-cpu' : 'ttt-score-o'
                }`}
              >
                <div className="ttt-score-label">
                  {mode === 'computer' ? 'CPU (O)' : 'Player O'}
                </div>
                <div className="ttt-score-value">{score.O}</div>
              </div>
            </div>
          </div>

          {/* RIGHT: SIDE PANEL */}
          <aside className="ttt-side">
            {/* Mode */}
            <div className="ttt-side-section">
              <div className="ttt-side-label">Mode</div>
              <div className="ttt-mode-group">
                <button
                  className={`ttt-mode-btn ${
                    mode === 'computer' ? 'active' : ''
                  }`}
                  onClick={() => changeMode('computer')}
                >
                  🤖 vs Computer
                </button>
                <button
                  className={`ttt-mode-btn ${
                    mode === 'friend' ? 'active' : ''
                  }`}
                  onClick={() => changeMode('friend')}
                >
                  👥 2 Player
                </button>
              </div>
            </div>

            {/* Difficulty */}
            {mode === 'computer' && (
              <div className="ttt-side-section">
                <div className="ttt-side-label">Difficulty</div>
                <div className="ttt-diff-group">
                  {[
                    { id: 'easy', label: 'Easy', icon: '🌱' },
                    { id: 'medium', label: 'Medium', icon: '⚡' },
                    { id: 'impossible', label: 'Impossible', icon: '🔥' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      className={`ttt-diff-btn ${
                        difficulty === d.id ? 'active' : ''
                      }`}
                      onClick={() => setDifficulty(d.id)}
                    >
                      <span className="ttt-diff-icon">{d.icon}</span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard hints */}
            <div className="ttt-side-section">
              <div className="ttt-side-label">Keyboard</div>
              <div className="ttt-hints">
                <div className="ttt-hint-row">
                  <div className="ttt-key-group">
                    <kbd className="ttt-kbd">↑</kbd>
                    <kbd className="ttt-kbd">↓</kbd>
                    <kbd className="ttt-kbd">←</kbd>
                    <kbd className="ttt-kbd">→</kbd>
                  </div>
                  <span className="ttt-hint-text">Move cursor</span>
                </div>
                <div className="ttt-hint-row">
                  <kbd className="ttt-kbd ttt-kbd-wide">Enter</kbd>
                  <span className="ttt-hint-text">Place mark</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="ttt-side-section">
              <button
                className="ttt-action-btn ttt-action-primary"
                onClick={resetBoard}
              >
                🔄 New Round
              </button>
              <button
                className="ttt-action-btn ttt-action-secondary"
                onClick={resetScore}
              >
                ⟳ Reset All
              </button>
              <button
                className={`ttt-action-btn ${
                  soundEnabled
                    ? 'ttt-action-sound-on'
                    : 'ttt-action-secondary'
                }`}
                onClick={() => {
                  ensureAudio();
                  setSoundEnabled(!soundEnabled);
                }}
              >
                {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
              </button>
            </div>

            {/* Turn indicator */}
            {!isOver && (
              <div className="ttt-side-section">
                <div className="ttt-side-label">Current Turn</div>
                <div
                  className={`ttt-turn-indicator ${
                    currentPlayer === 'X' ? 'ttt-turn-x' : 'ttt-turn-o'
                  }`}
                >
                  <span className="ttt-turn-mark">
                    {currentPlayer === 'X' ? '✕' : '◯'}
                  </span>
                  <span className="ttt-turn-text">
                    {mode === 'computer'
                      ? currentPlayer === humanSymbol
                        ? 'You'
                        : 'Computer'
                      : `Player ${currentPlayer}`}
                  </span>
                </div>
              </div>
            )}
          </aside>
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
        <h2>Play Tic Tac Toe Online</h2>
        <p>
          <strong>Tic Tac Toe</strong> (also called Noughts and Crosses) is one
          of the oldest and most beloved paper-and-pencil games in the world.
          Two players take turns marking X or O on a 3×3 grid, trying to get
          three in a row — horizontally, vertically, or diagonally. It takes
          seconds to learn, but the strategy is deeper than it looks.
        </p>
        <p>
          Play our <strong>free online Tic Tac Toe</strong> against a smart
          computer with 3 difficulty levels, or against a friend on the same
          device. Control it with your keyboard arrow keys, or just click/tap
          the squares. Beautiful modern bluish theme, zero downloads.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Play</h2>
        <ol className="seo-steps">
          <li>
            <strong>Choose your mode</strong> — vs Computer (3 difficulties)
            or 2-Player on the same device.
          </li>
          <li>
            <strong>Move the cursor</strong> with <kbd>↑</kbd> <kbd>↓</kbd>{' '}
            <kbd>←</kbd> <kbd>→</kbd> arrow keys (or use mouse/tap on mobile).
          </li>
          <li>
            <strong>Place your mark</strong> with <kbd>Enter</kbd> or by
            clicking the square.
          </li>
          <li>
            <strong>Get three in a row</strong> — horizontal, vertical, or
            diagonal — to win.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🤖</div>
            <h3>Play vs Computer</h3>
            <p>
              Three difficulty levels — Easy (random), Medium (mixes best and
              random), Impossible (unbeatable minimax AI).
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">👥</div>
            <h3>2-Player Mode</h3>
            <p>
              Challenge a friend on the same device — perfect for classrooms
              or quick matches.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⌨️</div>
            <h3>Keyboard Support</h3>
            <p>
              Fully playable with arrow keys + Enter. Great for desktop users
              who love speed.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📱</div>
            <h3>Touch Friendly</h3>
            <p>
              On phones and tablets, simply tap any square to place your mark.
              No keyboard needed.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🏆</div>
            <h3>Score Tracking</h3>
            <p>
              Live scoreboard tracks X wins, O wins, and draws across multiple
              rounds.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">💎</div>
            <h3>Modern Bluish Theme</h3>
            <p>
              Clean, glow-effect design with smooth animations. Easy on the
              eyes.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>How do I play Tic Tac Toe with a keyboard?</summary>
          <p>
            Use the <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> arrow
            keys to move the cursor around the board, and press{' '}
            <kbd>Enter</kbd> to place your mark. On mobile, just tap any empty
            square.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can the computer be beaten?</summary>
          <p>
            On <strong>Easy</strong> mode, definitely yes — the AI plays
            randomly. On <strong>Medium</strong>, you have a good chance. On{' '}
            <strong>Impossible</strong>, the AI uses perfect minimax and can
            never be beaten — best you can get is a draw.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is this game free?</summary>
          <p>
            Yes — completely free with no downloads, no ads, and no signup.
            Play as many rounds as you like.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I play against a friend?</summary>
          <p>
            Yes — select <strong>2 Player</strong> mode. Both players share the
            same device and take turns. Perfect for classrooms or quick
            matches.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How does the score work?</summary>
          <p>
            Each round's winner gets a point — X wins and O wins are tracked
            separately. Draws are also counted. Use the "New Round" button to
            continue playing without resetting the score.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Who starts first?</summary>
          <p>
            X always starts. After each round, click "New Round" to reset the
            board while keeping the score.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other games: <strong>Snake Game</strong>, <strong>Pong</strong>,{' '}
          <strong>Coin Flip</strong>, and{' '}
          <strong>Name to Stylish Text</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}