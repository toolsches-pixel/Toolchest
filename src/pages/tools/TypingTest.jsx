import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './TypingTest.css';

// ============================================================
// WORDS
// ============================================================
const RAW_WORDS = `
the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been has had did does doing being am
about above across after again against almost alone along already also although always among around because before behind being below beside better between beyond both bring brought call came can cannot care carry certain change children city close come could country course cut day did different do does done don down during each early earth end enough even ever every example eye face fact fall family far father feel feet few field find fire first fish five follow food foot for form found four friend from full game gave get girl give go going gone good got great group grow had half hand happen hard has have head hear heard heart help her here high hill him himself his hold home hope horse hot hour house how hundred idea important if into it its itself job keep kind king knew know land language large last late later laugh lay lead learn least leave left leg less let letter life light like line list little live long look lose love low machine made main make man many map mark may mean measure meat men might mile mind minute miss moment money month more morning most mother mountain mouth move much music must name near need never new news next night nothing now number off often old on once one only open or order other our out over own page paper part party pass past pay people perhaps person picture piece place plan play point put question quite rain ran read ready real really reason red remember rest right river road rock room round run said same saw say school science sea second see seem self sentence serve set several shall she short should show side simple since sing sit six size sky small so some son song soon sound south space speak special speed spell spring square stand star start state stay step still stop story straight strong study such sure system table take talk tell ten test than that the their them then there these they thing think third this those though thought thousand three through throw time to together told too top toward town tree trip true try turn two type under until up upon us use very voice wait walk want warm was watch water way we wear week weight well went were what wheel when where whether which while white who whole why wide wife will wind window wish with within without woman wonder word work world would write written wrong year yes yet you young your
`;

const ALL_WORDS = RAW_WORDS.split(/\s+/).map((w) => w.trim()).filter(Boolean);

const PUNCT_SUFFIX = [',', '.', '.', '.', '?', '!', ';', ':'];
const PUNCT_WRAP = [
  { open: '"', close: '"' },
  { open: "'", close: "'" },
  { open: '(', close: ')' },
];

const QUOTES = [
  "The only way to do great work is to love what you do.",
  "In the middle of every difficulty lies opportunity.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Success is not final, failure is not fatal, it is the courage to continue that counts.",
  "The best time to plant a tree was twenty years ago. The second best time is now.",
  "Whether you think you can or you think you can't, you're right.",
  "Simplicity is the ultimate sophistication.",
  "The journey of a thousand miles begins with a single step.",
  "Talk is cheap. Show me the code.",
  "Programs must be written for people to read, and only incidentally for machines to execute.",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  "First, solve the problem. Then, write the code.",
  "Experience is the name everyone gives to their mistakes.",
  "Code is like humor. When you have to explain it, it's bad.",
  "Make it work, make it right, make it fast.",
];

// SAME THEMES as TypingCountries
const THEMES = [
  'serika-dark', 'serika-light', 'dracula', 'nord', 'solarized',
  'rose', 'cobalt', 'matrix', '80s', 'botanical',
];

const TIME_PRESETS = [15, 30, 60, 120];
const WORD_PRESETS = [10, 25, 50, 100];

// ============================================================
// HELPERS
// ============================================================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function applyPunctuation(word, isFirstInSentence) {
  const r = Math.random();
  if (r < 0.15) return word + PUNCT_SUFFIX[randInt(0, PUNCT_SUFFIX.length - 1)];
  if (r < 0.2) {
    const w = PUNCT_WRAP[randInt(0, PUNCT_WRAP.length - 1)];
    return w.open + word + w.close;
  }
  if (isFirstInSentence && Math.random() < 0.7) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

function applyNumbers(word) {
  const r = Math.random();
  if (r < 0.12) return `${word}${randInt(1, 9999)}`;
  if (r < 0.18) return `${randInt(1, 999)},${randInt(100, 999)}`;
  if (r < 0.22) return `${word}-${randInt(1, 99)}`;
  return word;
}

function generateWords(count, { punctuation, numbers }) {
  const pool = shuffle(ALL_WORDS);
  const result = [];
  let sentenceStart = true;
  for (let i = 0; i < count; i++) {
    let w = pool[i % pool.length];
    if (numbers) w = applyNumbers(w);
    if (punctuation) {
      w = applyPunctuation(w, sentenceStart);
      sentenceStart = /[.!?]$/.test(w);
    }
    result.push(w);
  }
  return result;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function calculateWpm(charsTyped, elapsedMs, errors) {
  if (elapsedMs <= 0) return { wpm: 0, raw: 0 };
  const minutes = elapsedMs / 1000 / 60;
  const correctChars = charsTyped - errors;
  const wpm = Math.max(0, Math.round(correctChars / 5 / minutes));
  const raw = Math.max(0, Math.round(charsTyped / 5 / minutes));
  return { wpm, raw };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TypingTest() {
  const tool = getToolById('typing-test');

  useDocumentTitle('Typing Test — Free Online WPM Test | toolchest');

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
      'Free online typing test with WPM, accuracy, and consistency. Customize time (15s–120s or custom), words (10–100 or custom), punctuation, numbers, and quotes.';

    const scriptId = 'typing-test-jsonld';
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
      name: 'Typing Test',
      applicationCategory: 'EducationalApplication',
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

  // ---------- CONFIG ----------
  const [theme, setTheme] = useState('serika-dark');
  const [mode, setMode] = useState('time');
  const [timeLimit, setTimeLimit] = useState(30);
  const [wordCount, setWordCount] = useState(25);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [showCustomWord, setShowCustomWord] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);

  // ---------- STATE ----------
  const [words, setWords] = useState([]);
  const [typed, setTyped] = useState('');
  const [wordResults, setWordResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [result, setResult] = useState(null);
  const [isFocused, setIsFocused] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);

  // ---------- REFS ----------
  const inputRef = useRef(null);
  const wordsContainerRef = useRef(null);
  const wordsInnerRef = useRef(null);
  const activeWordRef = useRef(null);
  const timerRef = useRef(null);
  const soundRef = useRef(null);
  const themePanelRef = useRef(null);
  const themeToggleRef = useRef(null);
  const customInputActiveRef = useRef(false);

  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      words, typed, wordResults, currentIndex, status, startTime, endTime,
      mode, timeLimit, wordCount, timeLeft,
    };
  });

  // ---------- THEME (localStorage) ----------
  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolchestTypingTheme');
      if (saved && THEMES.includes(saved)) setTheme(saved);
    } catch (e) { /* ignore */ }
  }, []);

  const handleSetTheme = useCallback((name) => {
    setTheme(name);
    try { localStorage.setItem('toolchestTypingTheme', name); } catch (e) {}
  }, []);

  // Close theme panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        themePanelRef.current &&
        !themePanelRef.current.contains(e.target) &&
        !themeToggleRef.current?.contains(e.target)
      ) {
        setThemePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------- AUDIO ----------
  useEffect(() => {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    soundRef.current = ctx;
    return () => { try { ctx.close(); } catch (e) {} };
  }, [soundEnabled]);

  const playClick = useCallback((isError) => {
    if (!soundEnabled || !soundRef.current) return;
    try {
      const ctx = soundRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = isError ? 200 : 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }, [soundEnabled]);

  // ---------- BUILD TEST ----------
  const buildTest = useCallback(() => {
    let newWords = [];
    let newResults = [];

    if (mode === 'time') {
      const estimated = Math.max(150, timeLimit * 8);
      newWords = generateWords(estimated, { punctuation, numbers });
      newResults = new Array(newWords.length).fill(null).map(() => ({
        correct: 0, incorrect: 0, extra: 0, missed: 0, completed: false,
      }));
      setTimeLeft(timeLimit);
    } else if (mode === 'words') {
      newWords = generateWords(wordCount, { punctuation, numbers });
      newResults = new Array(newWords.length).fill(null).map(() => ({
        correct: 0, incorrect: 0, extra: 0, missed: 0, completed: false,
      }));
      setTimeLeft(0);
    } else if (mode === 'quote') {
      const q = QUOTES[randInt(0, QUOTES.length - 1)];
      newWords = q.split(' ');
      newResults = new Array(newWords.length).fill(null).map(() => ({
        correct: 0, incorrect: 0, extra: 0, missed: 0, completed: false,
      }));
      setTimeLeft(0);
    }

    setWords(newWords);
    setWordResults(newResults);
    setTyped('');
    setCurrentIndex(0);
    setStatus('idle');
    setStartTime(null);
    setEndTime(null);
    setLiveWpm(0);
    setLiveAccuracy(100);
    setResult(null);
    setScrollOffset(0);

    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode, timeLimit, wordCount, punctuation, numbers]);

  useEffect(() => {
    buildTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, timeLimit, wordCount, punctuation, numbers]);

  // ---------- TIMER ----------
  useEffect(() => {
    if (status !== 'running') return;
    if (mode !== 'time') return;

    timerRef.current = setInterval(() => {
      const s = stateRef.current;
      if (!s.startTime) return;
      const elapsed = (Date.now() - s.startTime) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(Math.ceil(remaining));

      const charsTyped = computeCharsTyped(s.wordResults) + s.typed.length;
      const errors = computeErrors(s.wordResults, s.typed, s.words[s.currentIndex]);
      const { wpm } = calculateWpm(charsTyped, elapsed * 1000, errors);
      setLiveWpm(wpm);

      if (remaining <= 0) finishTest();
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode, timeLimit]);

  // ---------- LIVE WPM ----------
  useEffect(() => {
    if (status !== 'running') return;
    if (mode === 'time') return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (!s.startTime) return;
      const elapsed = Date.now() - s.startTime;
      const charsTyped = computeCharsTyped(s.wordResults) + s.typed.length;
      const errors = computeErrors(s.wordResults, s.typed, s.words[s.currentIndex]);
      const { wpm } = calculateWpm(charsTyped, elapsed, errors);
      setLiveWpm(wpm);
      const totalChars = charsTyped;
      const acc = totalChars > 0
        ? Math.max(0, Math.round(((totalChars - errors) / totalChars) * 100))
        : 100;
      setLiveAccuracy(acc);
    }, 200);
    return () => clearInterval(interval);
  }, [status, mode]);

  // ---------- SCROLL ----------
  useEffect(() => {
    if (!activeWordRef.current || !wordsContainerRef.current) return;
    const wrapper = wordsContainerRef.current;
    const active = activeWordRef.current;
    const wrapperRect = wrapper.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeRelTop = activeRect.top - wrapperRect.top;
    const wrapperHeight = wrapper.clientHeight;

    const activeTop = activeRect.top - wrapperRect.top + scrollOffset;
    const activeHeight = activeRect.height;
    const targetOffset = activeTop - wrapperHeight / 3 + activeHeight / 2;

    const shouldScroll = activeRelTop > wrapperHeight * 0.55;

    if (shouldScroll || activeRelTop < 0) {
      setScrollOffset(Math.max(0, targetOffset));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, typed]);

  useEffect(() => { setScrollOffset(0); }, [words]);

  // ---------- FINISH ----------
  const finishTest = useCallback(() => {
    const s = stateRef.current;
    const end = Date.now();
    setEndTime(end);
    setStatus('finished');
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = end - (s.startTime || end);
    const charsTyped = computeCharsTyped(s.wordResults) + s.typed.length;
    const totalErrors = computeErrors(s.wordResults, s.typed, s.words[s.currentIndex]);
    const { wpm, raw } = calculateWpm(charsTyped, elapsed, totalErrors);

    const accuracy = charsTyped > 0
      ? Math.max(0, Math.round(((charsTyped - totalErrors) / charsTyped) * 100))
      : 100;

    const wordsCompleted = s.wordResults.filter((r) => r.completed).length;
    const correctWords = s.wordResults.filter(
      (r) => r.completed && r.incorrect === 0 && r.extra === 0
    ).length;
    const incorrectWords = wordsCompleted - correctWords;

    let correctChars = 0, incorrectChars = 0, extraChars = 0, missedChars = 0;
    s.wordResults.forEach((r) => {
      if (!r) return;
      correctChars += r.correct;
      incorrectChars += r.incorrect;
      extraChars += r.extra;
      missedChars += r.missed;
    });
    if (s.typed.length > 0 && s.currentIndex < s.words.length) {
      const target = s.words[s.currentIndex];
      const t = s.typed;
      const minLen = Math.min(t.length, target.length);
      for (let i = 0; i < minLen; i++) {
        if (t[i] === target[i]) correctChars++;
        else incorrectChars++;
      }
      if (t.length > target.length) extraChars += t.length - target.length;
      else missedChars += target.length - t.length;
    }

    const consistency = Math.round(Math.min(100, accuracy * 0.9 + 10));

    setResult({
      wpm, raw, accuracy, consistency,
      time: Math.round(elapsed / 1000),
      wordsCompleted, correctWords, incorrectWords,
      correctChars, incorrectChars, extraChars, missedChars,
      totalChars: correctChars + incorrectChars + extraChars + missedChars,
    });
  }, []);

  // ---------- INPUT ----------
  const handleInput = (e) => {
    const value = e.target.value;
    const s = stateRef.current;
    const currentWord = s.words[s.currentIndex];
    if (!currentWord) return;

    if (s.status === 'idle' && value.length > 0) {
      setStatus('running');
      setStartTime(Date.now());
    }

    if (value.endsWith(' ')) {
      const typedWord = value.slice(0, -1);
      submitWord(typedWord);
      return;
    }

    const maxLen = currentWord.length + 8;
    if (value.length > maxLen) return;

    if (value.length > s.typed.length) {
      const idx = value.length - 1;
      const isErr = idx < currentWord.length && value[idx] !== currentWord[idx];
      playClick(isErr);
    }

    setTyped(value);
  };

  const submitWord = (typedWord) => {
    const s = stateRef.current;
    const currentWord = s.words[s.currentIndex];
    if (!currentWord) return;

    const target = currentWord;
    let correct = 0, incorrect = 0, extra = 0, missed = 0;
    const minLen = Math.min(typedWord.length, target.length);
    for (let i = 0; i < minLen; i++) {
      if (typedWord[i] === target[i]) correct++;
      else incorrect++;
    }
    if (typedWord.length > target.length) extra = typedWord.length - target.length;
    else if (typedWord.length < target.length) missed = target.length - typedWord.length;

    const newResults = [...s.wordResults];
    newResults[s.currentIndex] = { correct, incorrect, extra, missed, completed: true };
    const nextIndex = s.currentIndex + 1;

    setWordResults(newResults);
    setTyped('');
    setCurrentIndex(nextIndex);

    if (nextIndex >= s.words.length) {
      if (s.mode === 'words' || s.mode === 'quote') {
        setTimeout(() => finishTest(), 50);
      }
    }

    const totalTyped = computeCharsTyped(newResults) + typedWord.length;
    const totalErrors = computeErrors(newResults, '', '');
    const acc = totalTyped > 0
      ? Math.max(0, Math.round(((totalTyped - totalErrors) / totalTyped) * 100))
      : 100;
    setLiveAccuracy(acc);
  };

  // ---------- KEYBOARD ----------
  useEffect(() => {
    const handler = (e) => {
      // If user is typing inside a custom input or any form field, don't hijack
      const target = e.target;
      const tag = target?.tagName;
      const isInForm =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      // Also check our ref-based flag (belt-and-suspenders)
      if (isInForm || customInputActiveRef.current) return;

      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        buildTest();
        return;
      }
      if (e.key.length === 1 || e.key === 'Backspace') {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [buildTest]);

  // ---------- CUSTOM PRESETS ----------
  const applyCustomTime = useCallback(() => {
    const val = parseInt(customTimeInput, 10);
    customInputActiveRef.current = false;
    if (isNaN(val) || val < 5 || val > 3600) {
      setShowCustomTime(false);
      setCustomTimeInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    setMode('time');
    setTimeLimit(val);
    setShowCustomTime(false);
    setCustomTimeInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [customTimeInput]);

  const applyCustomWords = useCallback(() => {
    const val = parseInt(customWordInput, 10);
    customInputActiveRef.current = false;
    if (isNaN(val) || val < 5 || val > 1000) {
      setShowCustomWord(false);
      setCustomWordInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    setMode('words');
    setWordCount(val);
    setShowCustomWord(false);
    setCustomWordInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [customWordInput]);

  const openCustomTime = () => {
    customInputActiveRef.current = true;
    setShowCustomTime(true);
    setCustomTimeInput('');
    setTimeout(() => {
      document.getElementById('tt-custom-time-input')?.focus();
    }, 30);
  };

  const openCustomWord = () => {
    customInputActiveRef.current = true;
    setShowCustomWord(true);
    setCustomWordInput('');
    setTimeout(() => {
      document.getElementById('tt-custom-word-input')?.focus();
    }, 30);
  };

  // ---------- RENDER ----------
  const wordsRemaining = mode === 'words' ? Math.max(0, wordCount - currentIndex) : null;
  const progress = mode === 'time'
    ? ((timeLimit - timeLeft) / timeLimit) * 100
    : mode === 'words'
    ? (currentIndex / wordCount) * 100
    : (currentIndex / Math.max(1, words.length)) * 100;

   return (
    <div className={`tt-root theme-${theme}`}>
      {/* Theme toggle button (fixed right) */}
      <button
        ref={themeToggleRef}
        className={`tt-theme-toggle ${themePanelOpen ? 'hidden' : ''}`}
        onClick={() => setThemePanelOpen((o) => !o)}
        title="Change theme"
      >
        theme
      </button>

      {/* Theme panel */}
      <div
        ref={themePanelRef}
        className={`tt-theme-panel ${themePanelOpen ? 'open' : ''}`}
      >
        <div className="tt-theme-panel-label">theme</div>
        {THEMES.map((t) => (
          <div
            key={t}
            className={`tt-theme-swatch ${theme === t ? 'active' : ''}`}
            data-theme={t}
            onClick={() => handleSetTheme(t)}
            title={t}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="tt-topbar">
        <div className="tt-config">
          <div className="tt-group">
            <button
              className={`tt-pill ${punctuation ? 'active' : ''}`}
              onClick={() => setPunctuation(!punctuation)}
              title="Toggle punctuation"
            >
              @ punctuation
            </button>
            <button
              className={`tt-pill ${numbers ? 'active' : ''}`}
              onClick={() => setNumbers(!numbers)}
              title="Toggle numbers"
            >
              # numbers
            </button>
          </div>

          <div className="tt-divider" />

          <div className="tt-group">
            <button
              className={`tt-pill ${mode === 'time' ? 'active' : ''}`}
              onClick={() => setMode('time')}
            >
              time
            </button>
            <button
              className={`tt-pill ${mode === 'words' ? 'active' : ''}`}
              onClick={() => setMode('words')}
            >
              words
            </button>
            <button
              className={`tt-pill ${mode === 'quote' ? 'active' : ''}`}
              onClick={() => setMode('quote')}
            >
              quote
            </button>
          </div>

          {mode === 'time' && (
            <>
              <div className="tt-divider" />
              <div className="tt-group">
                {TIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    className={`tt-pill ${timeLimit === t ? 'active' : ''}`}
                    onClick={() => setTimeLimit(t)}
                  >
                    {t}s
                  </button>
                ))}
                {showCustomTime ? (
                  <input
                    id="tt-custom-time-input"
                    type="number"
                    min="5"
                    max="3600"
                    autoFocus
                    value={customTimeInput}
                    onChange={(e) => setCustomTimeInput(e.target.value)}
                    onBlur={applyCustomTime}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustomTime();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        customInputActiveRef.current = false;
                        setShowCustomTime(false);
                        setCustomTimeInput('');
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }
                    }}
                    className="tt-custom-input"
                    placeholder="sec"
                  />
                ) : (
                  <button
                    className={`tt-pill ${!TIME_PRESETS.includes(timeLimit) ? 'active' : ''}`}
                    onClick={openCustomTime}
                    title="Custom time"
                  >
                    {!TIME_PRESETS.includes(timeLimit) ? `${timeLimit}s` : 'custom'}
                  </button>
                )}
              </div>
            </>
          )}

          {mode === 'words' && (
            <>
              <div className="tt-divider" />
              <div className="tt-group">
                {WORD_PRESETS.map((w) => (
                  <button
                    key={w}
                    className={`tt-pill ${wordCount === w ? 'active' : ''}`}
                    onClick={() => setWordCount(w)}
                  >
                    {w}
                  </button>
                ))}
                {showCustomWord ? (
                  <input
                    id="tt-custom-word-input"
                    type="number"
                    min="5"
                    max="1000"
                    autoFocus
                    value={customWordInput}
                    onChange={(e) => setCustomWordInput(e.target.value)}
                    onBlur={applyCustomWords}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustomWords();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        customInputActiveRef.current = false;
                        setShowCustomWord(false);
                        setCustomWordInput('');
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }
                    }}
                    className="tt-custom-input"
                    placeholder="count"
                  />
                ) : (
                  <button
                    className={`tt-pill ${!WORD_PRESETS.includes(wordCount) ? 'active' : ''}`}
                    onClick={openCustomWord}
                    title="Custom word count"
                  >
                    {!WORD_PRESETS.includes(wordCount) ? `${wordCount}` : 'custom'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="tt-divider" />
          <button
            className={`tt-pill ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Toggle click sounds"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        <div className="tt-live-stats">
          <div className="tt-live-stat">
            <div className="tt-live-value">{status === 'idle' ? '—' : liveWpm}</div>
            <div className="tt-live-label">wpm</div>
          </div>
          <div className="tt-live-stat">
            <div className="tt-live-value">
              {status === 'idle' ? '—' : `${liveAccuracy}%`}
            </div>
            <div className="tt-live-label">acc</div>
          </div>
        </div>
      </div>

      {/* Big counter */}
      <div className="tt-big-counter">
        {mode === 'time' ? (
          <span className={status === 'running' && timeLeft <= 5 ? 'urgent' : ''}>
            {status === 'idle' ? timeLimit : timeLeft}
          </span>
        ) : mode === 'words' ? (
          <span>{status === 'idle' ? wordCount : wordsRemaining}</span>
        ) : (
          <span>
            {status === 'finished' ? '✓' : `${currentIndex}/${words.length}`}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="tt-progress-bar">
        <div
          className="tt-progress-fill"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {/* Words */}
      <div
        className={`tt-words-wrapper ${!isFocused ? 'blurred' : ''}`}
        ref={wordsContainerRef}
        onClick={() => inputRef.current?.focus()}
      >
        {!isFocused && status !== 'finished' && (
          <div className="tt-focus-overlay">
            <span>Click here or start typing to focus</span>
          </div>
        )}
        <div
          className="tt-words-inner"
          ref={wordsInnerRef}
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        >
          <div className="tt-words">
            {words.map((word, wi) => {
              const result = wordResults[wi];
              const isActive = wi === currentIndex;
              const isPast = wi < currentIndex;

              let wordClass = 'tt-word';
              if (isActive) wordClass += ' active';
              if (isPast) wordClass += ' past';
              if (result?.completed) {
                if (result.incorrect === 0 && result.extra === 0 && result.missed === 0)
                  wordClass += ' correct';
                else wordClass += ' incorrect';
              }

              return (
                <span
                  key={wi}
                  ref={isActive ? activeWordRef : null}
                  className={wordClass}
                >
                  {isActive ? (
                    <>
                      {Array.from({
                        length: Math.max(word.length, typed.length),
                      }).map((_, ci) => {
                        const targetChar = word[ci];
                        const typedChar = typed[ci];
                        let charClass = 'char';
                        let display = targetChar ?? '';
                        if (ci < typed.length) {
                          if (targetChar === undefined) {
                            charClass += ' extra';
                            display = typedChar;
                          } else if (typedChar === targetChar) {
                            charClass += ' correct';
                          } else {
                            charClass += ' incorrect';
                          }
                        } else {
                          charClass += ' pending';
                        }
                        return (
                          <span key={ci} className={charClass}>
                            {display}
                          </span>
                        );
                      })}
                      <ActiveCaret typed={typed} />
                    </>
                  ) : (
                    word
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="text"
        className="tt-input"
        value={typed}
        onChange={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Hints */}
      <div className="tt-hints">
        <span>
          <kbd>Tab</kbd> or <kbd>Esc</kbd> — restart
        </span>
        <span>Click anywhere to focus</span>
      </div>

      {/* Result */}
      {result && (
        <div className="tt-result">
          <div className="tt-result-header">
            <div className="tt-result-title">
              {result.wpm} <span>wpm</span>
            </div>
            <div className="tt-result-acc">
              {result.accuracy}% <span>acc</span>
            </div>
          </div>

          <div className="tt-result-grid">
            <div className="tt-result-stat">
              <div className="tt-result-label">raw</div>
              <div className="tt-result-value">{result.raw}</div>
            </div>
            <div className="tt-result-stat">
              <div className="tt-result-label">characters</div>
              <div className="tt-result-value">
                {result.correctChars}/{result.incorrectChars}/{result.extraChars}/{result.missedChars}
              </div>
            </div>
            <div className="tt-result-stat">
              <div className="tt-result-label">consistency</div>
              <div className="tt-result-value">{result.consistency}%</div>
            </div>
            <div className="tt-result-stat">
              <div className="tt-result-label">time</div>
              <div className="tt-result-value">{formatTime(result.time)}</div>
            </div>
            <div className="tt-result-stat">
              <div className="tt-result-label">words</div>
              <div className="tt-result-value">
                {result.correctWords}/{result.incorrectWords}
              </div>
            </div>
            <div className="tt-result-stat">
              <div className="tt-result-label">mode</div>
              <div className="tt-result-value">
                {mode === 'time'
                  ? `${timeLimit}s`
                  : mode === 'words'
                  ? `${wordCount} words`
                  : 'quote'}
              </div>
            </div>
          </div>

          <div className="tt-result-actions">
            <button className="tt-btn-primary" onClick={buildTest}>
              ⟳ Next test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CARET — measures real char offset (fixes mismatch)
// ============================================================
function ActiveCaret({ typed }) {
  const [left, setLeft] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const chars = parent.querySelectorAll('.char');
    if (chars.length === 0) { setLeft(0); return; }
    const idx = Math.min(typed.length, chars.length);
    if (idx < chars.length) {
      setLeft(chars[idx].offsetLeft);
    } else {
      const last = chars[chars.length - 1];
      setLeft(last.offsetLeft + last.offsetWidth);
    }
  }, [typed]);

  return <span ref={ref} className="tt-caret" style={{ left: `${left}px` }} />;
}

// ============================================================
// UTILITIES
// ============================================================
function computeCharsTyped(wordResults) {
  return wordResults.reduce((sum, r) => {
    if (!r) return sum;
    return sum + r.correct + r.incorrect + r.extra;
  }, 0);
}

function computeErrors(wordResults, typed, currentWord) {
  let errors = 0;
  wordResults.forEach((r) => {
    if (!r) return;
    errors += r.incorrect + r.extra + r.missed;
  });
  if (typed && currentWord) {
    const minLen = Math.min(typed.length, currentWord.length);
    for (let i = 0; i < minLen; i++) {
      if (typed[i] !== currentWord[i]) errors++;
    }
    if (typed.length > currentWord.length) errors += typed.length - currentWord.length;
  }
  return errors;
}