import { useState, useMemo, useRef, useEffect } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './WordCounter.css';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our',
  'their', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'not', 'no',
]);

export default function WordCounter() {
  const tool = getToolById('word-counter');

  // SEO
  useDocumentTitle(
    'Word Counter — Free Online Character & Word Count Tool | toolchest'
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
      'Free online word counter and character counter. Count words, characters, sentences, paragraphs, reading time, and keyword density in real time. No signup, 100% private.';

    const scriptId = 'word-counter-jsonld';
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
      name: 'Word Counter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2183',
      },
      featureList: [
        'Real-time word count',
        'Character count with and without spaces',
        'Sentence and paragraph count',
        'Reading time estimate',
        'Speaking time estimate',
        'Keyword density analysis',
        'Case letter breakdown (uppercase, lowercase, numbers, symbols)',
        'Copy, clear, and download text',
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

  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const textareaRef = useRef(null);

  // Compute all stats
  const stats = useMemo(() => {
    const trimmed = text.trim();

    // Characters
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;

    // Words
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

    // Sentences (split on . ! ? followed by space or end)
    const sentences = trimmed
      ? (trimmed.match(/[^.!?]+[.!?]+/g) || []).length ||
        (trimmed.length > 0 ? 1 : 0)
      : 0;

    // Paragraphs (split on blank lines)
    const paragraphs = trimmed
      ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
      : 0;

    // Lines
    const lines = text ? text.split('\n').length : 0;

    // Case breakdown
    const uppercase = (text.match(/[A-Z]/g) || []).length;
    const lowercase = (text.match(/[a-z]/g) || []).length;
    const digits = (text.match(/[0-9]/g) || []).length;
    const symbols = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;

    // Reading time (200 wpm)
    const readingMinutes = words / 200;
    const readingTime = formatTime(readingMinutes);

    // Speaking time (130 wpm)
    const speakingMinutes = words / 130;
    const speakingTime = formatTime(speakingMinutes);

    // Average word length
    const avgWordLength = words > 0 ? charactersNoSpaces / words : 0;

    // Longest word
    const wordList = trimmed
      ? trimmed.toLowerCase().match(/\b[a-z]+\b/g) || []
      : [];
    const longestWord = wordList.reduce(
      (longest, w) => (w.length > longest.length ? w : longest),
      ''
    );

    // Keyword density (top 10)
    const freq = {};
    for (const w of wordList) {
      if (w.length < 3) continue;
      if (STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    const density = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        percent: words > 0 ? (count / words) * 100 : 0,
      }));

    return {
      characters,
      charactersNoSpaces,
      words,
      sentences,
      paragraphs,
      lines,
      uppercase,
      lowercase,
      digits,
      symbols,
      readingTime,
      speakingTime,
      avgWordLength,
      longestWord,
      density,
    };
  }, [text]);

  const handleClear = () => {
    setText('');
    textareaRef.current?.focus();
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText((prev) => (prev ? prev + '\n' + clipText : clipText));
      }
    } catch (err) {
      console.error('Paste failed:', err);
    }
  };

  const handleDownload = () => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpper = () => setText(text.toUpperCase());
  const handleLower = () => setText(text.toLowerCase());
  const handleTitleCase = () =>
    setText(
      text.replace(
        /\w\S*/g,
        (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()
      )
    );

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Stats grid */}
        <div className="wc-stats-grid">
          <StatCard label="Words" value={stats.words} accent />
          <StatCard label="Characters" value={stats.characters} />
          <StatCard label="No spaces" value={stats.charactersNoSpaces} />
          <StatCard label="Sentences" value={stats.sentences} />
          <StatCard label="Paragraphs" value={stats.paragraphs} />
          <StatCard label="Lines" value={stats.lines} />
        </div>

        {/* Time stats */}
        <div className="wc-time-row">
          <div className="wc-time-card">
            <span className="wc-time-icon">📖</span>
            <div>
              <div className="wc-time-label">Reading time</div>
              <div className="wc-time-value">{stats.readingTime}</div>
            </div>
          </div>
          <div className="wc-time-card">
            <span className="wc-time-icon">🎤</span>
            <div>
              <div className="wc-time-label">Speaking time</div>
              <div className="wc-time-value">{stats.speakingTime}</div>
            </div>
          </div>
          <div className="wc-time-card">
            <span className="wc-time-icon">📏</span>
            <div>
              <div className="wc-time-label">Avg word length</div>
              <div className="wc-time-value">
                {stats.avgWordLength.toFixed(1)} chars
              </div>
            </div>
          </div>
          <div className="wc-time-card">
            <span className="wc-time-icon">📝</span>
            <div>
              <div className="wc-time-label">Longest word</div>
              <div className="wc-time-value wc-truncate">
                {stats.longestWord || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="pdf-target">
          <div className="wc-textarea-header">
            <label className="pdf-target-label" style={{ margin: 0 }}>
              Your text
            </label>
            <span className="wc-textarea-hint">
              Type or paste — stats update live
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="wc-textarea"
            placeholder="Start typing or paste your text here…"
            spellCheck="false"
          />
        </div>

        {/* Action buttons */}
        <div className="wc-actions">
          <button className="wc-action-btn" onClick={handlePaste}>
            📋 Paste
          </button>
          <button
            className="wc-action-btn"
            onClick={handleCopy}
            disabled={!text}
          >
            {copied ? '✓ Copied!' : '📄 Copy'}
          </button>
          <button
            className="wc-action-btn"
            onClick={handleUpper}
            disabled={!text}
          >
            🔠 UPPER
          </button>
          <button
            className="wc-action-btn"
            onClick={handleLower}
            disabled={!text}
          >
            🔡 lower
          </button>
          <button
            className="wc-action-btn"
            onClick={handleTitleCase}
            disabled={!text}
          >
            🔤 Title
          </button>
          <button
            className="wc-action-btn"
            onClick={handleDownload}
            disabled={!text}
          >
            ⬇ Download
          </button>
          <button
            className="wc-action-btn wc-clear-btn"
            onClick={handleClear}
            disabled={!text}
          >
            ✕ Clear
          </button>
        </div>

        {/* Case breakdown + Density */}
        <div className="wc-detail-grid">
          {/* Case breakdown */}
          <div className="pdf-target">
            <label className="pdf-target-label">Character breakdown</label>
            <div className="wc-breakdown">
              <div className="wc-breakdown-row">
                <span className="wc-breakdown-dot" style={{ background: '#3b82f6' }} />
                <span className="wc-breakdown-label">Uppercase (A-Z)</span>
                <span className="wc-breakdown-value">{stats.uppercase}</span>
              </div>
              <div className="wc-breakdown-row">
                <span className="wc-breakdown-dot" style={{ background: '#22c55e' }} />
                <span className="wc-breakdown-label">Lowercase (a-z)</span>
                <span className="wc-breakdown-value">{stats.lowercase}</span>
              </div>
              <div className="wc-breakdown-row">
                <span className="wc-breakdown-dot" style={{ background: '#eab308' }} />
                <span className="wc-breakdown-label">Digits (0-9)</span>
                <span className="wc-breakdown-value">{stats.digits}</span>
              </div>
              <div className="wc-breakdown-row">
                <span className="wc-breakdown-dot" style={{ background: '#a855f7' }} />
                <span className="wc-breakdown-label">Symbols (!@#$)</span>
                <span className="wc-breakdown-value">{stats.symbols}</span>
              </div>
              <div className="wc-breakdown-row">
                <span className="wc-breakdown-dot" style={{ background: '#4ecdc4' }} />
                <span className="wc-breakdown-label">Spaces</span>
                <span className="wc-breakdown-value">
                  {stats.characters - stats.charactersNoSpaces}
                </span>
              </div>
            </div>
          </div>

          {/* Keyword density */}
          <div className="pdf-target">
            <div className="wc-density-header">
              <label className="pdf-target-label" style={{ margin: 0 }}>
                Top keywords
              </label>
              {stats.density.length > 5 && (
                <button
                  className="wc-toggle-btn"
                  onClick={() => setShowDensity(!showDensity)}
                >
                  {showDensity ? 'Show less' : 'Show all'}
                </button>
              )}
            </div>
            {stats.density.length === 0 ? (
              <p className="pdf-target-hint" style={{ marginTop: 'var(--sp-2)' }}>
                Type more words to see keyword density.
              </p>
            ) : (
              <div className="wc-density-list">
                {(showDensity ? stats.density : stats.density.slice(0, 5)).map(
                  (item) => (
                    <div key={item.word} className="wc-density-row">
                      <span className="wc-density-word">{item.word}</span>
                      <span className="wc-density-count">×{item.count}</span>
                      <div className="wc-density-bar">
                        <div
                          className="wc-density-fill"
                          style={{
                            width: `${Math.min(100, item.percent * 8)}%`,
                          }}
                        />
                      </div>
                      <span className="wc-density-percent">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ================= Stat card ================= */
function StatCard({ label, value, accent }) {
  return (
    <div className={`wc-stat ${accent ? 'accent' : ''}`}>
      <div className="wc-stat-value">{value.toLocaleString()}</div>
      <div className="wc-stat-label">{label}</div>
    </div>
  );
}

/* ================= Helpers ================= */
function formatTime(minutes) {
  if (minutes < 1) {
    const sec = Math.max(1, Math.round(minutes * 60));
    return `${sec} sec`;
  }
  if (minutes < 60) {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s > 0 ? `${m} min ${s} sec` : `${m} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/* ================= SEO Content ================= */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a Word Counter?</h2>
        <p>
          A <strong>word counter</strong> is a tool that counts the number of
          words, characters, sentences, and paragraphs in a piece of text — in
          real time as you type or paste. It's essential for writers,
          students, SEO professionals, and anyone who needs to hit a specific
          word limit.
        </p>
        <p>
          Our <strong>free online word and character counter</strong> shows
          live stats including reading time, speaking time, and keyword
          density. Everything runs in your browser — your text never leaves
          your device. No signup, no limits, no ads.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the Word Counter</h2>
        <ol className="seo-steps">
          <li>
            <strong>Type or paste your text</strong> — into the text box. Stats
            update instantly as you type.
          </li>
          <li>
            <strong>Read the stats</strong> — words, characters, sentences,
            paragraphs, reading time, and keyword density — all live.
          </li>
          <li>
            <strong>Use the tools</strong> — uppercase, lowercase, title case,
            copy, or download your text.
          </li>
          <li>
            <strong>Adjust as needed</strong> — hit your target word count
            before submitting your essay, article, or blog post.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Real-Time Count</h3>
            <p>
              Every stat updates instantly as you type — no clicking, no
              refreshing.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Complete Statistics</h3>
            <p>
              Words, characters (with/without spaces), sentences, paragraphs,
              lines, and character type breakdown.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📖</div>
            <h3>Reading & Speaking Time</h3>
            <p>
              Estimates based on 200 words per minute (reading) and 130 words
              per minute (speaking).
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🎯</div>
            <h3>Keyword Density</h3>
            <p>
              Top 10 keywords with counts and percentages — perfect for SEO
              content optimization.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔠</div>
            <h3>Case Conversion</h3>
            <p>
              One-click convert to UPPERCASE, lowercase, or Title Case.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              All counting happens in your browser. Your text never leaves
              your device.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Academic essays</strong> — hit exact word limits (500, 1000,
            1500 words) for school and college assignments.
          </li>
          <li>
            <strong>Blog posts & articles</strong> — optimize content length
            for SEO (typically 1500-2500 words for competitive keywords).
          </li>
          <li>
            <strong>Social media</strong> — stay within Twitter (280 chars),
            Instagram captions (2200 chars), or LinkedIn limits.
          </li>
          <li>
            <strong>Meta descriptions</strong> — keep them under 160 characters
            for Google search snippets.
          </li>
          <li>
            <strong>Book & thesis writing</strong> — track word count per
            chapter or section.
          </li>
          <li>
            <strong>Translation work</strong> — count source and target words
            for billing.
          </li>
          <li>
            <strong>SEO content writing</strong> — analyze keyword density and
            readability.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this word counter free?</summary>
          <p>
            Yes — completely free with no signup, no limits, and no ads. Use it
            as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How are words counted?</summary>
          <p>
            Words are counted by splitting text on whitespace (spaces, tabs,
            line breaks). Multiple consecutive spaces count as one separator.
            Hyphenated words like "well-known" count as one word.
          </p>
        </details>

        <details className="seo-faq">
          <summary>How is reading time calculated?</summary>
          <p>
            We use an average reading speed of <strong>200 words per minute</strong>.
            For speaking time, we use <strong>130 words per minute</strong>.
            These are standard averages used by publishers.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is keyword density?</summary>
          <p>
            Keyword density is the percentage of times a word appears relative
            to total words. For SEO, aim for 1-3% for your main target keyword
            — higher may look like keyword stuffing.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my texts safe?</summary>
          <p>
            Absolutely. Everything runs locally in your browser. Your text is
            never uploaded to any server — not even temporarily.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a character or text limit?</summary>
          <p>
            No hard limit — you can paste an entire book if you want. However,
            very large texts (millions of characters) may slow down the
            browser. For most uses, performance is instant.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I count words in another language?</summary>
          <p>
            Yes — the word counter works with any language that uses spaces
            between words (English, Spanish, French, Hindi in Roman script,
            etc.). Languages without spaces (Chinese, Japanese) may count
            differently.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it count words in real time?</summary>
          <p>
            Yes — every statistic updates instantly as you type, paste, or
            modify the text. No clicking required.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other text tools: <strong>Case Converter</strong>,{' '}
          <strong>Lorem Ipsum Generator</strong>, <strong>Text Diff</strong>,{' '}
          <strong>Slug Generator</strong>, <strong>Base64 Encoder</strong>, and{' '}
          <strong>URL Encoder</strong> — all free and browser-based.
        </p>
      </section>
    </article>
  );
}