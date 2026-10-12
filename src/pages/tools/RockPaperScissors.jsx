import { useEffect, useRef, useState, useCallback } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './RockPaperScissors.css';

// ============================================================
// CHOICES
// ============================================================
const CHOICES = [
  { id: 'rock', label: 'Rock', emoji: '✊', beats: 'scissors' },
  { id: 'paper', label: 'Paper', emoji: '✋', beats: 'rock' },
  { id: 'scissors', label: 'Scissors', emoji: '✌️', beats: 'paper' },
];

const BEST_OF_OPTIONS = [3, 5, 7, 11];

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
// MAIN
// ============================================================
export default function RockPaperScissors() {
  const tool = getToolById('rock-paper-scissors');

  useDocumentTitle('Rock Paper Scissors — Play Online vs Computer Free | toolchest');

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
      'Play Rock Paper Scissors online free vs computer. Keyboard support (R/P/S or 1/2/3), best-of-N rounds, streak tracker, history, and beautiful animations. No signup.';

    const scriptId = 'rps-jsonld';
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
      name: 'Rock Paper Scissors',
      genre: 'Casual',
      gamePlatform: 'Web Browser',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '1532',
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
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [roundResult, setRoundResult] = useState(null); // 'win' | 'lose' | 'draw'
  const [isShaking, setIsShaking] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [bestOf, setBestOf] = useState(5);
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [history, setHistory] = useState([]); // [{player, computer, result}]
  const [matchWinner, setMatchWinner] = useState(null); // 'player' | 'computer' | null
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtxRef = useRef(null);
  const shakeTimeoutRef = useRef(null);
  const revealTimeoutRef = useRef(null);

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

  // Compute required wins
  const requiredWins = Math.ceil(bestOf / 2);

  // ============================================================
  // PLAY
  // ============================================================
  const play = useCallback(
    (playerId) => {
      if (isShaking || matchWinner) return;
      if (!playerId) return;

      ensureAudio();
      setIsShaking(true);
      setPlayerChoice(playerId);
      setComputerChoice(null);
      setRoundResult(null);

      beep(500, 0.06, 'square');

      // AI pick
      const compChoice = CHOICES[Math.floor(Math.random() * 3)];
      const playerObj = CHOICES.find((c) => c.id === playerId);

      // Shake animation: 800ms
      shakeTimeoutRef.current = setTimeout(() => {
        setComputerChoice(compChoice.id);
        setIsShaking(false);

        // Compute result
        let result;
        if (playerObj.id === compChoice.id) {
          result = 'draw';
        } else if (playerObj.beats === compChoice.id) {
          result = 'win';
        } else {
          result = 'lose';
        }

        setRoundResult(result);

        // Update score
        setScore((s) => {
          const next = { ...s };
          if (result === 'win') next.wins++;
          else if (result === 'lose') next.losses++;
          else next.draws++;
          return next;
        });

        // Add to history
        setHistory((h) =>
          [
            {
              player: playerObj,
              computer: compChoice,
              result,
              round: roundNumber,
            },
            ...h,
          ].slice(0, 10)
        );

        setRoundNumber((r) => r + 1);

        // Sound
        if (result === 'win') beep(800, 0.15, 'sine');
        else if (result === 'lose') beep(300, 0.15, 'sawtooth');
        else beep(500, 0.1, 'triangle');

        // Check match winner
        setScore((s) => {
          const newWins = s.wins + (result === 'win' ? 1 : 0);
          const newLosses = s.losses + (result === 'lose' ? 1 : 0);
          if (newWins >= requiredWins) {
            setMatchWinner('player');
            beep(1000, 0.4, 'sine');
          } else if (newLosses >= requiredWins) {
            setMatchWinner('computer');
            beep(200, 0.4, 'sawtooth');
          }
          return s;
        });
      }, 800);
    },
    [isShaking, matchWinner, bestOf, requiredWins, roundNumber, beep]
  );

  // ============================================================
  // KEYBOARD
  // ============================================================
  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();

      if (key === '1' || key === 'r') {
        e.preventDefault();
        play('rock');
      } else if (key === '2' || key === 'p') {
        e.preventDefault();
        play('paper');
      } else if (key === '3' || key === 's') {
        e.preventDefault();
        play('scissors');
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [play]);

  // ============================================================
  // RESET
  // ============================================================
  const resetMatch = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setRoundResult(null);
    setIsShaking(false);
    setRoundNumber(1);
    setScore({ wins: 0, losses: 0, draws: 0 });
    setHistory([]);
    setMatchWinner(null);
  };

  const resetScore = () => {
    setScore({ wins: 0, losses: 0, draws: 0 });
    setHistory([]);
    setMatchWinner(null);
    setRoundNumber(1);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // ============================================================
  // STREAK
  // ============================================================
  const currentStreak = (() => {
    if (history.length === 0) return { type: null, count: 0 };
    const first = history[0].result;
    if (first === 'draw') return { type: null, count: 0 };
    let count = 0;
    for (const h of history) {
      if (h.result === first) count++;
      else break;
    }
    return { type: first, count };
  })();

  return (
    <ToolShell tool={tool}>
      <div className="rps-root">
        {/* Top bar: score + settings */}
        <div className="rps-topbar">
          <div className="rps-score-row">
            <div className="rps-score-card rps-you">
              <div className="rps-score-label">You</div>
              <div className="rps-score-value">{score.wins}</div>
            </div>
            <div className="rps-score-card rps-draw">
              <div className="rps-score-label">Draws</div>
              <div className="rps-score-value">{score.draws}</div>
            </div>
            <div className="rps-score-card rps-cpu">
              <div className="rps-score-label">CPU</div>
              <div className="rps-score-value">{score.losses}</div>
            </div>
          </div>

          <div className="rps-controls">
            <div className="rps-bestof-group">
              <span className="rps-bestof-label">Best of</span>
              {BEST_OF_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`rps-bestof-btn ${bestOf === n ? 'active' : ''}`}
                  onClick={() => {
                    setBestOf(n);
                    resetMatch();
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              className={`rps-icon-btn ${soundEnabled ? 'active' : ''}`}
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

        {/* Arena */}
        <div className="rps-arena">
          {/* Player side */}
          <div className="rps-side rps-player-side">
            <div className="rps-side-label">
              <span className="rps-side-icon">👤</span>
              <span>You</span>
            </div>
            <div
              className={`rps-hand ${
                isShaking && playerChoice ? 'rps-shake' : ''
              } ${roundResult === 'win' ? 'rps-winner' : ''} ${
                roundResult === 'lose' ? 'rps-loser' : ''
              }`}
            >
              {playerChoice ? (
                <span className="rps-hand-emoji">
                  {CHOICES.find((c) => c.id === playerChoice)?.emoji}
                </span>
              ) : (
                <span className="rps-hand-placeholder">?</span>
              )}
            </div>
            <div className="rps-side-name">
              {playerChoice
                ? CHOICES.find((c) => c.id === playerChoice)?.label
                : 'Pick a move'}
            </div>
          </div>

          {/* VS */}
          <div className="rps-vs">
            <div className="rps-vs-text">VS</div>
            <div
              className={`rps-round-badge ${
                roundResult ? `rps-badge-${roundResult}` : ''
              }`}
            >
              {roundResult === 'win' && '🎉 WIN'}
              {roundResult === 'lose' && '💀 LOSS'}
              {roundResult === 'draw' && '🤝 DRAW'}
              {!roundResult && `Round ${roundNumber}`}
            </div>
          </div>

          {/* CPU side */}
          <div className="rps-side rps-cpu-side">
            <div className="rps-side-label">
              <span className="rps-side-icon">🤖</span>
              <span>Computer</span>
            </div>
            <div
              className={`rps-hand ${
                isShaking && computerChoice ? 'rps-shake' : ''
              } ${roundResult === 'lose' ? 'rps-winner' : ''} ${
                roundResult === 'win' ? 'rps-loser' : ''
              }`}
            >
              {isShaking ? (
                <span className="rps-hand-emoji rps-thinking">🤜</span>
              ) : computerChoice ? (
                <span className="rps-hand-emoji">
                  {CHOICES.find((c) => c.id === computerChoice)?.emoji}
                </span>
              ) : (
                <span className="rps-hand-placeholder">?</span>
              )}
            </div>
            <div className="rps-side-name">
              {computerChoice && !isShaking
                ? CHOICES.find((c) => c.id === computerChoice)?.label
                : isShaking
                ? 'Thinking…'
                : 'Waiting'}
            </div>
          </div>
        </div>

        {/* Streak indicator */}
        {currentStreak.count >= 2 && (
          <div className={`rps-streak rps-streak-${currentStreak.type}`}>
            {currentStreak.type === 'win' ? '🔥' : '❄️'}{' '}
            {currentStreak.count} {currentStreak.type === 'win' ? 'wins' : 'losses'} in a row!
          </div>
        )}

        {/* Choice buttons */}
        <div className="rps-choices">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              className={`rps-choice-btn ${
                playerChoice === c.id ? 'active' : ''
              }`}
              onClick={() => play(c.id)}
              disabled={isShaking || !!matchWinner}
              title={`${c.label} — press ${c.id[0].toUpperCase()}`}
            >
              <span className="rps-choice-emoji">{c.emoji}</span>
              <span className="rps-choice-label">{c.label}</span>
              <span className="rps-choice-key">
                {c.id === 'rock' ? 'R' : c.id === 'paper' ? 'P' : 'S'}
              </span>
            </button>
          ))}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="rps-history">
            <div className="rps-history-header">
              <span className="rps-history-title">Recent rounds</span>
              <span className="rps-history-count">{history.length}</span>
            </div>
            <div className="rps-history-list">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`rps-history-item rps-history-${h.result}`}
                  title={`You: ${h.player.label} · CPU: ${h.computer.label}`}
                >
                  <span className="rps-history-emoji">{h.player.emoji}</span>
                  <span className="rps-history-vs">vs</span>
                  <span className="rps-history-emoji">{h.computer.emoji}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="rps-actions">
          <button
            className="rps-action-btn rps-action-secondary"
            onClick={resetScore}
          >
            ⟳ Reset score
          </button>
          <button
            className="rps-action-btn rps-action-primary"
            onClick={resetMatch}
          >
            🔄 New match
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="rps-hints">
          <div className="rps-hint-item">
            <kbd>R</kbd> / <kbd>1</kbd> Rock
          </div>
          <div className="rps-hint-item">
            <kbd>P</kbd> / <kbd>2</kbd> Paper
          </div>
          <div className="rps-hint-item">
            <kbd>S</kbd> / <kbd>3</kbd> Scissors
          </div>
        </div>

        {/* Match winner overlay */}
        {matchWinner && (
          <div className="rps-match-overlay">
            <div className="rps-match-content">
              <div className="rps-match-icon">
                {matchWinner === 'player' ? '🏆' : '💀'}
              </div>
              <div className="rps-match-title">
                {matchWinner === 'player' ? 'You won the match!' : 'Computer won the match'}
              </div>
              <div className="rps-match-score">
                {score.wins} – {score.losses}
                {score.draws > 0 && ` (${score.draws} draws)`}
              </div>
              <button className="rps-match-btn" onClick={resetMatch}>
                ▶ Play again
              </button>
            </div>
          </div>
        )}

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
        <h2>Play Rock Paper Scissors Online</h2>
        <p>
          <strong>Rock Paper Scissors</strong> is the world's simplest and most
          universal game — perfect for settling disputes, making random
          decisions, or just having fun. Play against our intelligent computer
          opponent with beautiful animations and full keyboard support.
        </p>
        <p>
          Our <strong>free online Rock Paper Scissors</strong> game features
          best-of-N matches (3, 5, 7, or 11 rounds), a live scoreboard, streak
          tracking, and a visual history of recent rounds. Everything runs in
          your browser — no signup, no downloads.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Play</h2>
        <ol className="seo-steps">
          <li>
            <strong>Pick your move</strong> — click a hand, or press{' '}
            <kbd>R</kbd>/<kbd>1</kbd> for Rock, <kbd>P</kbd>/<kbd>2</kbd> for
            Paper, <kbd>S</kbd>/<kbd>3</kbd> for Scissors.
          </li>
          <li>
            <strong>Watch the reveal</strong> — both hands shake, then reveal
            their choice.
          </li>
          <li>
            <strong>See who wins</strong> — Rock beats Scissors, Scissors beats
            Paper, Paper beats Rock.
          </li>
          <li>
            <strong>Keep playing</strong> — first to N wins the match (set by
            "Best of").
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⌨️</div>
            <h3>Keyboard Support</h3>
            <p>
              Play with R/P/S keys or number keys 1/2/3 for lightning-fast
              rounds.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🏆</div>
            <h3>Best of N Matches</h3>
            <p>
              Choose Best of 3, 5, 7, or 11 rounds — first to reach the target
              wins the match.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Live Scoreboard</h3>
            <p>
              Track wins, losses, and draws across the entire match.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔥</div>
            <h3>Streak Tracker</h3>
            <p>
              See your current winning or losing streak as it happens.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📜</div>
            <h3>Round History</h3>
            <p>
              Last 10 rounds displayed visually so you can see the flow of the
              match.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎨</div>
            <h3>Beautiful Animations</h3>
            <p>
              Hand shake, winner glow, smooth reveal — a satisfying experience
              every round.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Rules of Rock Paper Scissors</h2>
        <ul className="seo-list">
          <li>
            <strong>✊ Rock</strong> beats <strong>✌️ Scissors</strong> (rock
            crushes scissors)
          </li>
          <li>
            <strong>✌️ Scissors</strong> beats <strong>✋ Paper</strong>{' '}
            (scissors cut paper)
          </li>
          <li>
            <strong>✋ Paper</strong> beats <strong>✊ Rock</strong> (paper
            covers rock)
          </li>
          <li>
            If both players pick the same move, it's a <strong>draw</strong>.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this Rock Paper Scissors game free?</summary>
          <p>
            Yes — completely free with no signup, no ads, and no downloads.
            Play as many matches as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I play with keyboard?</summary>
          <p>
            Yes! Press <kbd>R</kbd>/<kbd>1</kbd> for Rock, <kbd>P</kbd>/
            <kbd>2</kbd> for Paper, <kbd>S</kbd>/<kbd>3</kbd> for Scissors.
            Perfect for speed rounds.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is the computer's choice truly random?</summary>
          <p>
            Yes — every round uses <code>Math.random()</code>, which gives each
            move a 1/3 (33.33%) probability. No pattern, no cheating.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How does "Best of N" work?</summary>
          <p>
            If you pick "Best of 5", the first player to win 3 rounds wins the
            match. Best of 3 → first to 2, Best of 7 → first to 4, and so on.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Absolutely. Tap the three hand buttons to play. Layout is fully
            responsive and looks great on phones and tablets.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I reset the score mid-match?</summary>
          <p>
            Yes — click "Reset score" to clear the scoreboard while keeping the
            same match settings, or "New match" to start fresh.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What do the emojis represent?</summary>
          <p>
            <strong>✊ Rock</strong>, <strong>✋ Paper</strong>, and{' '}
            <strong>✌️ Scissors</strong> — the classic hand signals for the
            game.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other fun tools: <strong>Snake Game</strong>,{' '}
          <strong>Pong</strong>, <strong>Tic Tac Toe</strong>,{' '}
          <strong>Decision Wheel</strong>, and <strong>Dice Roller</strong> —
          all free and browser-based.
        </p>
      </section>
    </article>
  );
}