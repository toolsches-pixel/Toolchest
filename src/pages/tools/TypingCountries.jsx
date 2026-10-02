import React, { useState, useEffect, useRef, useCallback } from 'react'
import './TypingCountries.css'

const RAW_WORDS = `
afghanistan
albania
algeria
andorra
angola
antigua and barbuda
argentine
armenia
australia
austria
azerbaijan
bahamas
bahrain
bangladesh
barbados
belarus
belgium
belize
benin
bhutan
bolivia
bosnia herzegovina
botswana
brazil
brunei
bulgaria
burkina faso
burundi
cambodia
cameroon
canada
cape verde
central and african republic
chad
chile
china
colombia
comoros
republic of congo
democratic republic of congo
costa rica
cote d ivoire
croatia
cuba
cyprus
czechia
denmark
djibouti
dominica
dominican republic
ecuador
egypt
el salvador
equatorial guinea
eritrea
estonia
eswatini
ethiopia
fiji
finland
france
gabon
gambia
georgia
germany
ghana
greece
grenada
guatemala
guinea
guinea-bissau
guyana
haiti
honduras
hungary
iceland
india
indonesia
iran
iraq
ireland
israel
italy
jamaica
jordan
kazakhstan
kenya
kiribati
republic of korea
kosovo
kuwait
kyrgyzstan
laos
latvia
lebanon
lesotho
liberia
libya
liechtenstein
lithuania
luxembourg
madagascar
malawi
malaysia
maldives
mali
malta
marshall
mauritania
mauritius
mexico
micronesia
moldova
monaco
mongolia
montenegro
morocco
mozambique
myanmar
namibia
nauru
nepal
netherlands
new zealand
nicaragua
niger
nigeria
macedonia
norway
oman
pakistan
palau
panama
papua new guinea
paraguay
peru
philippines
poland
portugal
qatar
romania
russia
rwanda
saint kitts and nevis
saint lucia
saint vincent
samoa
san marino
sao tome principe
saudi arabia
senegal
serbia
seychelles
sierra leone
singapore
slovakia
slovenia
solomon islands
somalia
south africa
south sudan
spain
sri lanka
sudan
suriname
sweden
switzerland
syria
tajikistan
tanzania
thailand
east timor
togo
tonga
trinidad and tobago
tunisia
turkey
turkmenistan
tuvalu
uganda
ukraine
uae
uk
usa
uruguay
uzbekistan
vanuatu
vatican
venezuela
vietnam
yemen
zambia
zimbabwe
`

const WORD_LIST = RAW_WORDS
  .split(/[\n\r,]+/)
  .map(w => w.trim())
  .filter(w => w.length > 0)

const THEMES = ['serika-dark', 'serika-light', 'dracula', 'nord', 'solarized', 'rose', 'cobalt', 'matrix', '80s', 'botanical']

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatTime(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const tenths = Math.floor((ms % 1000) / 100)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function formatTimeShort(ms) {
  if (ms < 0) ms = 0
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function TypingCountries() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('toolchest-theme')
      return saved && THEMES.includes(saved) ? saved : 'serika-dark'
    } catch { return 'serika-dark' }
  })
  const [themePanelOpen, setThemePanelOpen] = useState(false)

  const [allWords, setAllWords] = useState([])
  const [wordStatus, setWordStatus] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [sessionTotalTyped, setSessionTotalTyped] = useState(0)
  const [sessionErrorCount, setSessionErrorCount] = useState(0)
  const [sessionSkippedCount, setSessionSkippedCount] = useState(0)
  const [currentAttemptTotalTyped, setCurrentAttemptTotalTyped] = useState(0)
  const [currentAttemptErrors, setCurrentAttemptErrors] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [testStartTime, setTestStartTime] = useState(null)
  const [testEndTime, setTestEndTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [message, setMessage] = useState({ text: '', color: 'var(--tc-text-dim)' })
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const typingInputRef = useRef(null)
  const wordStreamPanelRef = useRef(null)
  const wordStreamRef = useRef(null)
  const selectedVoiceRef = useRef(null)
  const messageTimeoutRef = useRef(null)
  const isTransitioningRef = useRef(false)
  const currentIndexRef = useRef(0)
  const allWordsRef = useRef([])
  const typedRef = useRef('')

  // ----- sync refs -----
  useEffect(() => { isTransitioningRef.current = isTransitioning }, [isTransitioning])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { allWordsRef.current = allWords }, [allWords])
  useEffect(() => { typedRef.current = typed }, [typed])

  // ----- speech setup -----
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setVoiceEnabled(false)
      return
    }
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return
      selectedVoiceRef.current =
        voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en-us')) ||
        voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en-gb')) ||
        voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) ||
        voices[0]
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  const speakWord = useCallback((word) => {
    if (!voiceEnabled) return
    if (!('speechSynthesis' in window)) return
    if (!word) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(word)
      u.rate = 0.9
      u.pitch = 1.0
      u.volume = 1.0
      if (selectedVoiceRef.current) u.voice = selectedVoiceRef.current
      window.speechSynthesis.speak(u)
    } catch (e) {
      console.error('speech error:', e)
    }
  }, [voiceEnabled])

  // ----- theme apply -----
  useEffect(() => {
    try { localStorage.setItem('toolchest-theme', theme) } catch {}
  }, [theme])

  // ----- message -----
  const showMessage = useCallback((text, color = 'var(--tc-text-dim)') => {
    setMessage({ text, color })
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
    messageTimeoutRef.current = setTimeout(() => {
      setMessage({ text: '', color: 'var(--tc-text-dim)' })
    }, 1200)
  }, [])

  // ----- init -----
  const initTest = useCallback(() => {
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel() } catch {}
    }

    const shuffled = shuffleArray(WORD_LIST)
    setAllWords(shuffled)
    setWordStatus(new Array(shuffled.length).fill('pending'))
    setCurrentIndex(0)
    setTyped('')
    setSessionTotalTyped(0)
    setSessionErrorCount(0)
    setSessionSkippedCount(0)
    setCurrentAttemptTotalTyped(0)
    setCurrentAttemptErrors(0)
    setIsTransitioning(false)
    setTestStartTime(null)
    setTestEndTime(null)
    setElapsed(0)
    setFinished(false)

    if (wordStreamPanelRef.current) {
      wordStreamPanelRef.current.scrollTop = 0
    }

    // focus + speak
    setTimeout(() => {
      if (typingInputRef.current) {
        typingInputRef.current.focus()
        typingInputRef.current.value = ''
      }
    }, 100)

    if (shuffled[0]) {
      setTimeout(() => speakWord(shuffled[0]), 500)
    }
  }, [speakWord])

  useEffect(() => { initTest() }, []) // eslint-disable-line

  // ----- timer -----
  useEffect(() => {
    if (!testStartTime || testEndTime) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - testStartTime)
    }, 100)
    return () => clearInterval(interval)
  }, [testStartTime, testEndTime])

  // ----- scroll -----
  useEffect(() => {
    const panel = wordStreamPanelRef.current
    const stream = wordStreamRef.current
    if (!panel || !stream) return

    const activeEl = stream.querySelector('.tc-word.active')
    if (!activeEl) return

    const containerRect = panel.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    const activeTop = activeRect.top - containerRect.top
    const activeBottom = activeRect.bottom - containerRect.top
    const containerHeight = panel.clientHeight
    const scrollTop = panel.scrollTop
    const margin = 40

    const isAbove = activeTop < margin
    const isBelow = activeBottom > containerHeight - margin

    if (isAbove || isBelow) {
      const activeCenter = (activeTop + activeBottom) / 2
      const targetScroll = scrollTop + activeCenter - (containerHeight / 2)
      panel.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    }
  }, [currentIndex, wordStatus, typed])

  // ----- move next -----
  const moveToNextWord = useCallback(() => {
    setIsTransitioning(false)
    isTransitioningRef.current = false

    const curIdx = currentIndexRef.current
    const words = allWordsRef.current
    const statuses = wordStatus

    let nextIdx = -1
    for (let i = curIdx + 1; i < words.length; i++) {
      if (statuses[i] === 'pending') { nextIdx = i; break }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < words.length; i++) {
        if (statuses[i] === 'pending') { nextIdx = i; break }
      }
    }

    if (nextIdx === -1) {
      setTestEndTime(Date.now())
      setFinished(true)
      setTyped('')
      showMessage('all done!', 'var(--tc-main)')
      return
    }

    setCurrentIndex(nextIdx)
    setTyped('')
    currentIndexRef.current = nextIdx
    typedRef.current = ''
    setCurrentAttemptTotalTyped(0)
    setCurrentAttemptErrors(0)

    setTimeout(() => speakWord(words[nextIdx]), 60)

    if (typingInputRef.current) {
      typingInputRef.current.focus()
    }
  }, [wordStatus, showMessage, speakWord])

  // ----- skip -----
  const skipWord = useCallback(() => {
    if (isTransitioningRef.current) return
    if (finished) return
    const curIdx = currentIndexRef.current
    if (curIdx < 0) return

    setIsTransitioning(true)
    isTransitioningRef.current = true

    setWordStatus(prev => {
      const n = [...prev]
      n[curIdx] = 'skipped'
      return n
    })
    setSessionSkippedCount(prev => prev + 1)
    showMessage(`skipped: ${allWordsRef.current[curIdx]}`, 'var(--tc-main)')

    setTimeout(() => {
      moveToNextWord()
    }, 120)
  }, [finished, showMessage, moveToNextWord])

  // ============================================================
  // 🔥 INPUT HANDLER — SIMPLE & RELIABLE
  // ============================================================
  const handleChange = (e) => {
    const value = e.target.value

    if (isTransitioningRef.current) return
    if (finished) return
    const curIdx = currentIndexRef.current
    if (curIdx < 0) return

    // start timer on first keystroke
    if (!testStartTime) {
      setTestStartTime(Date.now())
    }

    setTyped(value)
    typedRef.current = value

    const trimmed = value.trim()
    const target = allWordsRef.current[curIdx]

    // compute errors
    let attemptErrors = 0
    const minLen = Math.min(trimmed.length, target.length)
    for (let i = 0; i < minLen; i++) {
      if (trimmed[i] !== target[i]) attemptErrors++
    }
    if (trimmed.length > target.length) {
      attemptErrors += trimmed.length - target.length
    }

    const newTotalTyped = sessionTotalTyped - currentAttemptTotalTyped + trimmed.length
    const newErrorCount = sessionErrorCount - currentAttemptErrors + attemptErrors

    setSessionTotalTyped(newTotalTyped)
    setSessionErrorCount(newErrorCount)
    setCurrentAttemptTotalTyped(trimmed.length)
    setCurrentAttemptErrors(attemptErrors)

    // ✅ word complete → next
    if (trimmed === target && trimmed.length > 0) {
      setWordStatus(prev => {
        const n = [...prev]
        n[curIdx] = 'done'
        return n
      })

      setIsTransitioning(true)
      isTransitioningRef.current = true

      setTimeout(() => {
        moveToNextWord()
      }, 100)
    }
  }

  // ============================================================
  // 🔥 KEY HANDLER
  // ============================================================
  const handleKeyDown = (e) => {
    // Alt+S → skip
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      skipWord()
      return
    }

    // Space → next (only if word complete)
    if (e.key === ' ' || e.code === 'Space') {
      if (isTransitioningRef.current) return
      if (finished) return
      const curIdx = currentIndexRef.current
      if (curIdx < 0) return

      const trimmed = typingInputRef.current.value.trim()
      const target = allWordsRef.current[curIdx]

      if (trimmed === target && trimmed.length > 0) {
        e.preventDefault()
        setWordStatus(prev => {
          const n = [...prev]
          n[curIdx] = 'done'
          return n
        })
        setIsTransitioning(true)
        isTransitioningRef.current = true
        setTimeout(() => moveToNextWord(), 100)
      }
      return
    }

    // Enter → skip
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isTransitioningRef.current) return
      if (finished) return
      const curIdx = currentIndexRef.current
      if (curIdx < 0) return

      const trimmed = typingInputRef.current.value.trim()
      const target = allWordsRef.current[curIdx]

      if (trimmed === target && trimmed.length > 0) {
        setWordStatus(prev => {
          const n = [...prev]
          n[curIdx] = 'done'
          return n
        })
      } else {
        setWordStatus(prev => {
          const n = [...prev]
          n[curIdx] = 'skipped'
          return n
        })
        setSessionSkippedCount(prev => prev + 1)
        showMessage(`skipped: ${target}`, 'var(--tc-main)')
      }

      setIsTransitioning(true)
      isTransitioningRef.current = true
      setTimeout(() => moveToNextWord(), 120)
    }
  }

  // ----- voice toggle -----
  const toggleVoice = () => {
    if (!('speechSynthesis' in window)) return
    const next = !voiceEnabled
    setVoiceEnabled(next)
    if (next) {
      speakWord(allWordsRef.current[currentIndexRef.current])
    } else {
      try { window.speechSynthesis.cancel() } catch {}
    }
  }

  // ----- WPM -----
  const calculateWPM = () => {
    if (!testStartTime) return 0
    const endTime = testEndTime || Date.now()
    const minutes = (endTime - testStartTime) / 1000 / 60
    if (minutes <= 0) return 0
    return Math.max(0, Math.round((sessionTotalTyped / 5) / minutes))
  }

  const getAccuracy = () => {
    if (sessionTotalTyped === 0) return 100
    const correct = sessionTotalTyped - sessionErrorCount
    return Math.max(0, Math.round((correct / sessionTotalTyped) * 100))
  }

  // ----- render word -----
  const renderWord = (word, idx) => {
    const status = wordStatus[idx]

    if (status === 'active') {
      const target = word
      const chars = []

      for (let i = 0; i < target.length; i++) {
        const ch = target[i]
        let charClass = 'tc-char'
        if (i < typed.length) {
          if (typed[i] === target[i]) charClass += ' correct'
          else charClass += ' incorrect'
        } else {
          charClass += ' pending'
        }
        if (i === typed.length) charClass += ' current'

        chars.push(
          <span key={i} className={charClass}>
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        )
      }

      if (typed.length > target.length) {
        for (let i = target.length; i < typed.length; i++) {
          chars.push(
            <span key={`extra-${i}`} className="tc-char extra">
              {typed[i] === ' ' ? '\u00A0' : typed[i]}
            </span>
          )
        }
      }

      return (
        <span key={idx} className="tc-word active">
          {chars}
        </span>
      )
    }

    let cls = 'tc-word'
    if (status === 'done') cls += ' done'
    else if (status === 'skipped') cls += ' skipped'
    else if (status === 'error') cls += ' error'

    return <span key={idx} className={cls}>{word}</span>
  }

  return (
    <div className={`tc-wrapper tc-theme-${theme}`}>
      <button
        className={`tc-theme-toggle ${themePanelOpen ? 'hidden' : ''}`}
        onClick={() => setThemePanelOpen(true)}
      >
        theme
      </button>

      <div className={`tc-theme-panel ${themePanelOpen ? 'open' : ''}`}>
        <div className="tc-theme-panel-label">theme</div>
        {THEMES.map(t => (
          <div
            key={t}
            className={`tc-theme-swatch ${theme === t ? 'active' : ''}`}
            data-theme={t}
            title={t}
            onClick={() => { setTheme(t); setThemePanelOpen(false) }}
          />
        ))}
      </div>

      <div className="tc-top-bar">
        <div className="tc-logo">
          ⌨️ typing countries
          <span className="tc-logo-sub">{WORD_LIST.length} countries</span>
        </div>
        <div className="tc-top-controls">
          <span className="tc-progress-info">
            {finished
              ? `${allWords.length} / ${allWords.length}`
              : `${wordStatus.filter(s => s === 'done' || s === 'skipped').length + 1} / ${allWords.length}`}
          </span>
          <span className="tc-timer-display">{formatTime(elapsed)}</span>
          <button
            className={`tc-icon-btn ${voiceEnabled ? '' : 'off'}`}
            onClick={toggleVoice}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <div className="tc-typing-area">
        <div className="tc-word-stream-wrapper" ref={wordStreamPanelRef}>
          <div className="tc-word-stream" ref={wordStreamRef}>
            {allWords.map((word, idx) => renderWord(word, idx))}
          </div>
        </div>

        {/* 🔥 VISIBLE INPUT — always focused */}
        <input
          ref={typingInputRef}
          type="text"
          className="tc-typing-input"
          value={typed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          disabled={finished}
          placeholder="type here..."
        />

        <div className="tc-hint-text">
          <kbd>Space</kbd> next (jab sahi type ho) · <kbd>Enter</kbd> skip · <kbd>Alt</kbd>+<kbd>S</kbd> skip
        </div>
      </div>

      <div className="tc-bottom-bar">
        <button className="tc-bottom-btn" onClick={skipWord} title="Skip (Alt+S)">
          <span>⏭</span><span className="tc-btn-label">skip</span>
        </button>
        <button
          className="tc-bottom-btn"
          onClick={() => speakWord(allWords[currentIndex])}
          title="Speak word"
        >
          <span>🔊</span><span className="tc-btn-label">speak</span>
        </button>
        <button className="tc-bottom-btn" onClick={initTest} title="Restart">
          <span>⟳</span><span className="tc-btn-label">restart</span>
        </button>
      </div>

      <div className={`tc-message-box ${message.text ? 'show' : ''}`} style={{ color: message.color }}>
        {message.text}
      </div>

      {finished && (
        <div className="tc-result-overlay show">
          <div className="tc-result-card">
            <h2>test complete</h2>

            <div className="tc-result-main-stats">
              <div className="tc-result-main-stat">
                <div className="tc-rms-value">{calculateWPM()}</div>
                <div className="tc-rms-label">wpm</div>
              </div>
              <div className="tc-result-main-stat">
                <div className="tc-rms-value tc-time-value">{formatTimeShort(elapsed)}</div>
                <div className="tc-rms-label">time</div>
              </div>
            </div>

            <div className="tc-result-secondary-stats">
              <div className="tc-result-secondary-stat">
                <div className="tc-rss-label">accuracy</div>
                <div className="tc-rss-value green">{getAccuracy()}%</div>
              </div>
              <div className="tc-result-secondary-stat">
                <div className="tc-rss-label">errors</div>
                <div className="tc-rss-value red">{sessionErrorCount}</div>
              </div>
              <div className="tc-result-secondary-stat">
                <div className="tc-rss-label">skipped</div>
                <div className="tc-rss-value yellow">{sessionSkippedCount}</div>
              </div>
            </div>

            <div className="tc-result-actions">
              <button className="tc-btn-primary" onClick={initTest}>
                <span>⟳</span> next test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TypingCountries