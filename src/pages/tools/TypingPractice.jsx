import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './TypingCountries.css';
import { Link } from 'react-router-dom';
import { WORD_LISTS, parseWords } from './wordLists';

const THEMES = [
  'serika-dark', 'serika-light', 'dracula', 'nord', 'solarized',
  'rose', 'cobalt', 'matrix', '80s', 'botanical',
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function formatTimeShort(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Generic typing practice component.
 * Props:
 *   - wordListKey: 'countries' | 'bihar' | any key in WORD_LISTS
 *   - title: display name (e.g. "apna word")
 *   - subtitle: e.g. "195 countries"
 *   - storageKey: unique localStorage key for theme (optional)
 */
export default function TypingPractice({
  wordListKey = 'countries',
  title = '⌨️ apna word',
  subtitle = '',
  storageKey = 'apnaWordTheme',
}) {
  // Build word list from the key
  const WORD_LIST = useMemo(() => {
    const raw = WORD_LISTS[wordListKey];
    if (!raw) {
      console.warn(`WORD_LISTS["${wordListKey}"] not found.`);
      return [];
    }
    return parseWords(raw);
  }, [wordListKey]);

  const [theme, setTheme] = useState('serika-dark');
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [typingValue, setTypingValue] = useState('');
  const [timerText, setTimerText] = useState('00:00.0');
  const [progressText, setProgressText] = useState('1 / 0');
  const [message, setMessage] = useState('');
  const [messageColor, setMessageColor] = useState('var(--text-dim)');
  const [messageVisible, setMessageVisible] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

  const [result, setResult] = useState({
    show: false,
    wpm: 0,
    time: '0:00',
    accuracy: 100,
    errors: 0,
    skipped: 0,
  });

  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  // Mutable refs
  const allWordsRef = useRef([]);
  const wordStatusRef = useRef([]);
  const currentIndexRef = useRef(0);
  const currentWordRef = useRef('');
  const sessionTotalTypedRef = useRef(0);
  const sessionErrorCountRef = useRef(0);
  const sessionSkippedCountRef = useRef(0);
  const currentAttemptTotalTypedRef = useRef(0);
  const currentAttemptErrorsRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const isInputDisabledRef = useRef(false);
  const testStartTimeRef = useRef(null);
  const testEndTimeRef = useRef(null);
  const wpmIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const typingValueRef = useRef('');
  const voiceEnabledRef = useRef(true);

  const wordStreamPanelRef = useRef(null);
  const wordStreamRef = useRef(null);
  const typingInputRef = useRef(null);
  const themePanelRef = useRef(null);

  useEffect(() => { typingValueRef.current = typingValue; }, [typingValue]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // ---------- SPEECH ----------
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setVoiceAvailable(false);
      setVoiceEnabled(false);
      return;
    }
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      selectedVoiceRef.current =
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en-us')) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en-gb')) ||
        voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) ||
        voices[0];
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const speakWord = useCallback((word) => {
    if (!voiceEnabledRef.current) return;
    if (!('speechSynthesis' in window)) return;
    if (!word) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.9; u.pitch = 1.0; u.volume = 1.0;
      if (selectedVoiceRef.current) u.voice = selectedVoiceRef.current;
      window.speechSynthesis.speak(u);
    } catch (e) { console.error('speech error:', e); }
  }, []);

  // ---------- HELPERS ----------
  const showMessage = useCallback((text, color = 'var(--text-dim)') => {
    setMessage(text);
    setMessageColor(color);
    setMessageVisible(true);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessageVisible(false), 1200);
  }, []);

  const calculateWPM = useCallback(() => {
    if (!testStartTimeRef.current) return 0;
    const endTime = testEndTimeRef.current || Date.now();
    const minutesElapsed = (endTime - testStartTimeRef.current) / 1000 / 60;
    if (minutesElapsed <= 0) return 0;
    return Math.max(0, Math.round((sessionTotalTypedRef.current / 5) / minutesElapsed));
  }, []);

  const updateTimerDisplay = useCallback(() => {
    if (!testStartTimeRef.current) { setTimerText('00:00.0'); return; }
    const now = testEndTimeRef.current || Date.now();
    setTimerText(formatTime(now - testStartTimeRef.current));
  }, []);

  const startWpmTracking = useCallback(() => {
    testStartTimeRef.current = Date.now();
    testEndTimeRef.current = null;
    if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    wpmIntervalRef.current = setInterval(() => {}, 500);
  }, []);

  const startTimerTracking = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      if (testStartTimeRef.current && !testEndTimeRef.current) updateTimerDisplay();
    }, 100);
  }, [updateTimerDisplay]);

  const stopWpmTracking = useCallback(() => {
    testEndTimeRef.current = Date.now();
    if (wpmIntervalRef.current) { clearInterval(wpmIntervalRef.current); wpmIntervalRef.current = null; }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    updateTimerDisplay();
  }, [updateTimerDisplay]);

  // ---------- SCROLL ----------
  const scrollToActiveWord = useCallback(() => {
    const panel = wordStreamPanelRef.current;
    const stream = wordStreamRef.current;
    if (!panel || !stream) return;
    const activeEl = stream.querySelector('.word.active');
    if (!activeEl) return;
    const containerRect = panel.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const activeTopInContainer = activeRect.top - containerRect.top;
    const activeBottomInContainer = activeRect.bottom - containerRect.top;
    const containerHeight = panel.clientHeight;
    const scrollTop = panel.scrollTop;
    const margin = 40;
    const isAbove = activeTopInContainer < margin;
    const isBelow = activeBottomInContainer > containerHeight - margin;
    if (isAbove || isBelow) {
      const activeCenterInContainer = (activeTopInContainer + activeBottomInContainer) / 2;
      const targetScroll = scrollTop + activeCenterInContainer - containerHeight / 2;
      panel.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, []);

  useEffect(() => { scrollToActiveWord(); }, [typingValue, scrollToActiveWord]);

  // ---------- PROGRESS ----------
  const updateProgressBadge = useCallback(() => {
    const total = allWordsRef.current.length;
    if (total === 0) { setProgressText('1 / 0'); return; }
    const doneCount = wordStatusRef.current.filter((s) => s === 'done' || s === 'skipped').length;
    if (doneCount >= total) setProgressText(`${total} / ${total}`);
    else setProgressText(`${doneCount + 1} / ${total}`);
  }, []);

  // ---------- RESULT ----------
  const showResult = useCallback(() => {
    stopWpmTracking();
    const wpm = calculateWPM();
    let accuracy = 100;
    if (sessionTotalTypedRef.current > 0) {
      const correct = sessionTotalTypedRef.current - sessionErrorCountRef.current;
      accuracy = Math.max(0, Math.round((correct / sessionTotalTypedRef.current) * 100));
    }
    let timeStr = '0:00';
    if (testStartTimeRef.current && testEndTimeRef.current) {
      timeStr = formatTimeShort(testEndTimeRef.current - testStartTimeRef.current);
    }
    setResult({
      show: true,
      wpm,
      time: timeStr,
      accuracy,
      errors: sessionErrorCountRef.current,
      skipped: sessionSkippedCountRef.current,
    });
  }, [calculateWPM, stopWpmTracking]);

  // ---------- MOVE NEXT ----------
  const moveToNextWord = useCallback(() => {
    isTransitioningRef.current = false;
    isInputDisabledRef.current = false;

    let nextIdx = -1;
    for (let i = currentIndexRef.current + 1; i < allWordsRef.current.length; i++) {
      if (wordStatusRef.current[i] === 'pending') { nextIdx = i; break; }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < allWordsRef.current.length; i++) {
        if (wordStatusRef.current[i] === 'pending') { nextIdx = i; break; }
      }
    }

    if (nextIdx === -1) {
      currentIndexRef.current = -1;
      currentWordRef.current = '';
      setTypingValue('');
      isInputDisabledRef.current = true;
      forceRender();
      updateProgressBadge();
      setTimeout(showResult, 300);
      return;
    }

    currentIndexRef.current = nextIdx;
    currentWordRef.current = allWordsRef.current[currentIndexRef.current];
    wordStatusRef.current[currentIndexRef.current] = 'active';
    setTypingValue('');
    currentAttemptTotalTypedRef.current = 0;
    currentAttemptErrorsRef.current = 0;
    forceRender();
    updateProgressBadge();
    speakWord(currentWordRef.current);
    setTimeout(() => typingInputRef.current?.focus(), 0);
  }, [forceRender, showResult, speakWord, updateProgressBadge]);

  // ---------- RESTART ----------
  const restartTest = useCallback(() => {
    setResult((r) => ({ ...r, show: false }));
    if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

    isTransitioningRef.current = false;
    isInputDisabledRef.current = false;
    sessionTotalTypedRef.current = 0;
    sessionErrorCountRef.current = 0;
    sessionSkippedCountRef.current = 0;
    currentAttemptTotalTypedRef.current = 0;
    currentAttemptErrorsRef.current = 0;
    testStartTimeRef.current = null;
    testEndTimeRef.current = null;

    setTimerText('00:00.0');

    allWordsRef.current = shuffleArray(WORD_LIST);
    wordStatusRef.current = new Array(allWordsRef.current.length).fill('pending');

    currentIndexRef.current = 0;
    currentWordRef.current = allWordsRef.current[0];
    wordStatusRef.current[0] = 'active';

    setTypingValue('');
    updateProgressBadge();
    forceRender();
    if (wordStreamPanelRef.current) wordStreamPanelRef.current.scrollTop = 0;
    speakWord(currentWordRef.current);
    setTimeout(() => typingInputRef.current?.focus(), 0);
  }, [forceRender, speakWord, updateProgressBadge, WORD_LIST]);

  // ---------- SKIP ----------
  const skipWord = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (isInputDisabledRef.current) return;
    if (currentIndexRef.current === -1) return;

    isTransitioningRef.current = true;
    isInputDisabledRef.current = true;
    wordStatusRef.current[currentIndexRef.current] = 'skipped';
    sessionSkippedCountRef.current++;
    showMessage(`skipped: ${currentWordRef.current}`, 'var(--main)');
    forceRender();
    updateProgressBadge();

    transitionTimeoutRef.current = setTimeout(() => {
      moveToNextWord();
    }, 150);
  }, [forceRender, moveToNextWord, showMessage, updateProgressBadge]);

  // ---------- TYPING INPUT ----------
  const handleInputChange = (e) => {
    const rawTyped = e.target.value;
    setTypingValue(rawTyped);

    if (isTransitioningRef.current) return;
    if (currentIndexRef.current === -1) return;
    if (isInputDisabledRef.current) return;

    if (!testStartTimeRef.current) { startWpmTracking(); startTimerTracking(); }

    const typed = rawTyped.trim();
    const target = currentWordRef.current;

    let attemptErrors = 0;
    const minLength = Math.min(typed.length, target.length);
    for (let i = 0; i < minLength; i++) {
      if (typed[i] !== target[i]) attemptErrors++;
    }
    if (typed.length > target.length) attemptErrors += typed.length - target.length;

    sessionTotalTypedRef.current =
      sessionTotalTypedRef.current - currentAttemptTotalTypedRef.current + typed.length;
    sessionErrorCountRef.current =
      sessionErrorCountRef.current - currentAttemptErrorsRef.current + attemptErrors;
    currentAttemptTotalTypedRef.current = typed.length;
    currentAttemptErrorsRef.current = attemptErrors;

    if (typed === target && typed.length > 0) {
      wordStatusRef.current[currentIndexRef.current] = 'done';
      forceRender();
      updateProgressBadge();

      isTransitioningRef.current = true;
      isInputDisabledRef.current = true;

      transitionTimeoutRef.current = setTimeout(() => {
        moveToNextWord();
      }, 80);
      return;
    }

    if (typed.length === 0 && rawTyped.length > 0) { forceRender(); return; }

    forceRender();
    updateProgressBadge();
  };

  // ---------- KEY HANDLER ----------
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        skipWord();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (isTransitioningRef.current) return;
        if (isInputDisabledRef.current) return;
        if (currentIndexRef.current === -1) return;

        const typed = typingValueRef.current.trim();
        const target = currentWordRef.current;

        if (typed === target && typed.length > 0) {
          e.preventDefault();
          wordStatusRef.current[currentIndexRef.current] = 'done';
          forceRender();
          updateProgressBadge();

          isTransitioningRef.current = true;
          isInputDisabledRef.current = true;

          transitionTimeoutRef.current = setTimeout(() => {
            moveToNextWord();
          }, 80);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isTransitioningRef.current) return;
        if (isInputDisabledRef.current) return;
        if (currentIndexRef.current === -1) return;

        const typed = typingValueRef.current.trim();
        const target = currentWordRef.current;

        if (typed === target && typed.length > 0) {
          wordStatusRef.current[currentIndexRef.current] = 'done';
        } else {
          wordStatusRef.current[currentIndexRef.current] = 'skipped';
          sessionSkippedCountRef.current++;
          showMessage(`skipped: ${currentWordRef.current}`, 'var(--main)');
        }

        forceRender();
        updateProgressBadge();
        isTransitioningRef.current = true;
        isInputDisabledRef.current = true;

        transitionTimeoutRef.current = setTimeout(() => {
          moveToNextWord();
        }, 120);
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [forceRender, moveToNextWord, showMessage, skipWord, updateProgressBadge]);

  // ---------- VOICE ----------
  const toggleVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (next) speakWord(currentWordRef.current);
      else { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
      return next;
    });
  }, [speakWord]);

  // ---------- THEME ----------
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && THEMES.includes(saved)) setTheme(saved);
    } catch (e) { /* ignore */ }
  }, [storageKey]);

  const handleSetTheme = useCallback((name) => {
    setTheme(name);
    try { localStorage.setItem(storageKey, name); } catch (e) { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    const handler = (e) => {
      if (themePanelRef.current && !themePanelRef.current.contains(e.target) && e.target.id !== 'themeToggleBtn') {
        setThemePanelOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ---------- INIT ----------
  useEffect(() => {
    if (!WORD_LIST || WORD_LIST.length === 0) {
      showMessage('no words found', 'var(--text-error)');
      return;
    }

    allWordsRef.current = shuffleArray(WORD_LIST);
    wordStatusRef.current = new Array(allWordsRef.current.length).fill('pending');
    currentIndexRef.current = 0;
    currentWordRef.current = allWordsRef.current[0];
    wordStatusRef.current[0] = 'active';

    setTypingValue('');
    isInputDisabledRef.current = false;

    updateProgressBadge();
    forceRender();
    setTimeout(() => speakWord(currentWordRef.current), 500);
    setTimeout(() => typingInputRef.current?.focus(), 0);

    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordListKey]);

  // click outside → focus input
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName !== 'BUTTON' && themePanelRef.current && !themePanelRef.current.contains(e.target)) {
        typingInputRef.current?.focus();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ---------- RENDER WORD STREAM ----------
  const renderWordStream = () => {
    const allWords = allWordsRef.current;
    const status = wordStatusRef.current;
    const activeIdx = currentIndexRef.current;
    const typed = typingValue;

    return allWords.map((word, idx) => {
      const st = status[idx];
      const classes = ['word'];

      if (st === 'active' && idx === activeIdx) {
        const chars = [];
        const target = word;
        for (let i = 0; i < target.length; i++) {
          const charClasses = ['char'];
          const display = target[i] === ' ' ? '\u00A0' : target[i];
          if (i < typed.length) {
            if (typed[i] === target[i]) charClasses.push('correct');
            else charClasses.push('incorrect');
          } else {
            charClasses.push('pending');
          }
          if (i === typed.length) charClasses.push('current');
          chars.push(
            <span key={i} className={charClasses.join(' ')} data-char={target[i]}>
              {display}
            </span>
          );
        }
        if (typed.length > target.length) {
          for (let i = target.length; i < typed.length; i++) {
            chars.push(
              <span key={`extra-${i}`} className="char extra">
                {typed[i] === ' ' ? '\u00A0' : typed[i]}
              </span>
            );
          }
        }
        classes.push('active');
        return (
          <span key={idx} className={classes.join(' ')} data-index={idx}>
            {chars}
          </span>
        );
      }

      if (st === 'done') classes.push('done');
      else if (st === 'error') classes.push('error');
      else if (st === 'skipped') classes.push('skipped');

      return (
        <span key={idx} className={classes.join(' ')} data-index={idx}>
          {word}
        </span>
      );
    });
  };

  return (
    <div className={`typing-test-root theme-${theme}`}>
      <button
        className={`theme-toggle-btn ${themePanelOpen ? 'hidden' : ''}`}
        id="themeToggleBtn"
        title="Change theme"
        onClick={() => setThemePanelOpen((o) => !o)}
      >
        theme
      </button>

      <div className={`theme-panel ${themePanelOpen ? 'open' : ''}`} ref={themePanelRef}>
        <div className="theme-panel-label">theme</div>
        {THEMES.map((t) => (
          <div
            key={t}
            className={`theme-swatch ${theme === t ? 'active' : ''}`}
            data-theme={t}
            onClick={() => handleSetTheme(t)}
          />
        ))}
      </div>

      <div className="top-bar">
        <div className="logo">
          <Link to="/" style={{ color: 'inherit', opacity: 0.6, marginRight: 4 }} title="Back to home">
            ←
          </Link>
          {title}
          <span className="logo-sub">{subtitle || `${WORD_LIST.length} words`}</span>
        </div>

        <div className="top-controls">
          <span className="progress-info">{progressText}</span>
          <span className="timer-display">{timerText}</span>
          <button
            className={`icon-btn ${!voiceAvailable || !voiceEnabled ? 'off' : ''}`}
            title="Toggle voice"
            onClick={toggleVoice}
            disabled={!voiceAvailable}
          >
            {voiceAvailable && voiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <div className="typing-area">
        <div className="word-stream-wrapper" ref={wordStreamPanelRef}>
          <div className="word-stream" ref={wordStreamRef}>
            {renderWordStream()}
          </div>
        </div>
        <input
          type="text"
          ref={typingInputRef}
          className="typing-input"
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
          autoFocus
          value={typingValue}
          onChange={handleInputChange}
        />

        <div className="hint-text">
          <kbd>Space</kbd> next (jab sahi type ho) · <kbd>Enter</kbd> skip · <kbd>Alt</kbd>+
          <kbd>S</kbd> skip
        </div>
      </div>

      <div className="bottom-bar">
        <button className="bottom-btn" title="Skip word (Alt+S)" onClick={skipWord}>
          <span>⏭</span>
          <span className="btn-label">skip</span>
        </button>
        <button
          className="bottom-btn"
          title="Speak current word"
          onClick={() => speakWord(currentWordRef.current)}
        >
          <span>🔊</span>
          <span className="btn-label">speak</span>
        </button>
        <button
          className="bottom-btn"
          title="Restart test"
          onClick={restartTest}
        >
          <span>⟳</span>
          <span className="btn-label">restart</span>
        </button>
      </div>

      <div className={`message-box ${messageVisible ? 'show' : ''}`} style={{ color: messageColor }}>
        {message}
      </div>

      <div className={`result-overlay ${result.show ? 'show' : ''}`}>
        <div className="result-card" onClick={(e) => e.stopPropagation()}>
          <h2>test complete</h2>

          <div className="result-main-stats">
            <div className="result-main-stat">
              <div className="rms-value">{result.wpm}</div>
              <div className="rms-label">wpm</div>
            </div>
            <div className="result-main-stat">
              <div className="rms-value time-value">{result.time}</div>
              <div className="rms-label">time</div>
            </div>
          </div>

          <div className="result-secondary-stats">
            <div className="result-secondary-stat">
              <div className="rss-label">accuracy</div>
              <div className="rss-value green">{result.accuracy}%</div>
            </div>
            <div className="result-secondary-stat">
              <div className="rss-label">errors</div>
              <div className="rss-value red">{result.errors}</div>
            </div>
            <div className="result-secondary-stat">
              <div className="rss-label">skipped</div>
              <div className="rss-value yellow">{result.skipped}</div>
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-primary" onClick={restartTest}>
              <span>⟳</span> next test
            </button>
            <button
              className="btn-secondary"
              onClick={() => setResult((r) => ({ ...r, show: false }))}
            >
              close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}