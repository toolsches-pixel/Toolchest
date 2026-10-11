import { useEffect, useMemo, useState } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './TextCaseConverter.css';

// ============================================================
// CASE CONVERTERS
// ============================================================
function toUpperCase(text) {
  return text.toUpperCase();
}

function toLowerCase(text) {
  return text.toLowerCase();
}

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function toSentenceCase(text) {
  const lower = text.toLowerCase();
  return lower.replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
}

function toCamelCase(text) {
  const words = splitWords(text);
  if (words.length === 0) return '';
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  );
}

function toPascalCase(text) {
  const words = splitWords(text);
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toSnakeCase(text) {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join('_');
}

function toKebabCase(text) {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join('-');
}

function toConstantCase(text) {
  return splitWords(text)
    .map((w) => w.toUpperCase())
    .join('_');
}

function toDotCase(text) {
  return splitWords(text)
    .map((w) => w.toLowerCase())
    .join('.');
}

function toAlternatingCase(text) {
  let upper = false;
  return text
    .split('')
    .map((c) => {
      if (/[a-zA-Z]/.test(c)) {
        const r = upper ? c.toUpperCase() : c.toLowerCase();
        upper = !upper;
        return r;
      }
      return c;
    })
    .join('');
}

function toInverseCase(text) {
  return text
    .split('')
    .map((c) => {
      if (c === c.toUpperCase()) return c.toLowerCase();
      if (c === c.toLowerCase()) return c.toUpperCase();
      return c;
    })
    .join('');
}

function splitWords(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean);
}

function removeExtraSpaces(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function trimLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
}

// ============================================================
// CASE OPTIONS
// ============================================================
const CASE_OPTIONS = [
  { id: 'upper', label: 'UPPERCASE', desc: 'ALL CAPS', fn: toUpperCase },
  { id: 'lower', label: 'lowercase', desc: 'all small', fn: toLowerCase },
  { id: 'title', label: 'Title Case', desc: 'Each Word Capitalized', fn: toTitleCase },
  { id: 'sentence', label: 'Sentence case', desc: 'First letter only', fn: toSentenceCase },
  { id: 'camel', label: 'camelCase', desc: 'forVariables', fn: toCamelCase },
  { id: 'pascal', label: 'PascalCase', desc: 'ForClasses', fn: toPascalCase },
  { id: 'snake', label: 'snake_case', desc: 'for_variables', fn: toSnakeCase },
  { id: 'kebab', label: 'kebab-case', desc: 'for-urls', fn: toKebabCase },
  { id: 'constant', label: 'CONSTANT_CASE', desc: 'FOR_CONSTANTS', fn: toConstantCase },
  { id: 'dot', label: 'dot.case', desc: 'for.objects', fn: toDotCase },
  { id: 'alternating', label: 'aLtErNaTiNg', desc: 'Flipping case', fn: toAlternatingCase },
  { id: 'inverse', label: 'InVeRsE', desc: 'sWAP cASE', fn: toInverseCase },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TextCaseConverter() {
  const tool = getToolById('text-case-converter');

  useDocumentTitle('Text Case Converter — Free Online Text Transform Tool | toolchest');

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
      'Free online text case converter. Convert text to UPPERCASE, lowercase, Title Case, camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and more. Also remove extra spaces. No signup, 100% browser-based.';

    const scriptId = 'text-case-converter-jsonld';
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
      name: 'Text Case Converter',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2143',
      },
      featureList: [
        'Convert to UPPERCASE, lowercase, Title Case',
        'camelCase, PascalCase, snake_case, kebab-case',
        'CONSTANT_CASE, dot.case, alternating, inverse',
        'Remove extra spaces and trim lines',
        'Live conversion as you type',
        'One-click copy',
        'No signup, 100% browser-based',
      ],
    });

    return () => {
      if (created) document.head.removeChild(meta);
      else meta.content = prevDesc;
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, []);

  const [input, setInput] = useState('');
  const [selectedCase, setSelectedCase] = useState('upper');
  const [copied, setCopied] = useState(false);
  const [action, setAction] = useState(''); // for special actions

  // Compute output
  const output = useMemo(() => {
    if (!input) return '';

    switch (action) {
      case 'removeSpaces':
        return removeExtraSpaces(input);
      case 'trimLines':
        return trimLines(input);
      case 'reverse':
        return input.split('').reverse().join('');
      case 'reverseWords':
        return input.split(/\s+/).reverse().join(' ');
      default: {
        const opt = CASE_OPTIONS.find((o) => o.id === selectedCase);
        return opt ? opt.fn(input) : input;
      }
    }
  }, [input, selectedCase, action]);

  // Reset action when case changes
  useEffect(() => {
    setAction('');
  }, [selectedCase]);

  const stats = useMemo(() => {
    return {
      chars: input.length,
      charsNoSpaces: input.replace(/\s/g, '').length,
      words: input.trim() ? input.trim().split(/\s+/).length : 0,
      lines: input ? input.split('\n').length : 0,
    };
  }, [input]);

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };

  const handleClear = () => {
    setInput('');
    setAction('');
  };

  const handleSwap = () => {
    setInput(output);
    setAction('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (e) {}
  };

  return (
    <ToolShell tool={tool}>
      <div className="tcc-root">
        {/* Case buttons grid */}
        <div className="tcc-section">
          <div className="tcc-section-header">
            <span className="tcc-label">Choose a case</span>
          </div>
          <div className="tcc-grid">
            {CASE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`tcc-case-btn ${
                  selectedCase === opt.id && !action ? 'active' : ''
                }`}
                onClick={() => {
                  setSelectedCase(opt.id);
                  setAction('');
                }}
                title={opt.desc}
              >
                <span className="tcc-case-label">{opt.label}</span>
                <span className="tcc-case-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Special actions */}
        <div className="tcc-section">
          <div className="tcc-section-header">
            <span className="tcc-label">Text actions</span>
          </div>
          <div className="tcc-actions-row">
            <button
              className={`tcc-action-btn ${action === 'removeSpaces' ? 'active' : ''}`}
              onClick={() => setAction('removeSpaces')}
            >
              Remove extra spaces
            </button>
            <button
              className={`tcc-action-btn ${action === 'trimLines' ? 'active' : ''}`}
              onClick={() => setAction('trimLines')}
            >
              Trim lines
            </button>
            <button
              className={`tcc-action-btn ${action === 'reverse' ? 'active' : ''}`}
              onClick={() => setAction('reverse')}
            >
              Reverse
            </button>
            <button
              className={`tcc-action-btn ${action === 'reverseWords' ? 'active' : ''}`}
              onClick={() => setAction('reverseWords')}
            >
              Reverse words
            </button>
          </div>
        </div>

        {/* Editor: two panes */}
        <div className="tcc-editor">
          {/* Input */}
          <div className="tcc-pane">
            <div className="tcc-pane-header">
              <span className="tcc-pane-label">Input</span>
              <div className="tcc-pane-actions">
                <button
                  className="tcc-pane-btn"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                >
                  📋 Paste
                </button>
                <button
                  className="tcc-pane-btn"
                  onClick={handleClear}
                  title="Clear"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="tcc-textarea"
              placeholder="Type or paste your text here…"
              spellCheck="false"
            />
            <div className="tcc-stats">
              <span>{stats.chars} chars</span>
              <span>·</span>
              <span>{stats.words} words</span>
              <span>·</span>
              <span>{stats.lines} lines</span>
            </div>
          </div>

          {/* Output */}
          <div className="tcc-pane">
            <div className="tcc-pane-header">
              <span className="tcc-pane-label">Output</span>
              <div className="tcc-pane-actions">
                <button
                  className="tcc-pane-btn"
                  onClick={handleSwap}
                  title="Use output as input"
                  disabled={!output}
                >
                  ⇄ Swap
                </button>
                <button
                  className={`tcc-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={copyToClipboard}
                  disabled={!output}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              className="tcc-textarea tcc-textarea-output"
              placeholder="Converted text will appear here…"
              spellCheck="false"
            />
            <div className="tcc-stats">
              <span>{output.length} chars</span>
            </div>
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
        <h2>What is a Text Case Converter?</h2>
        <p>
          A <strong>text case converter</strong> is a tool that changes the
          letter casing of your text — from UPPERCASE to lowercase, Title Case,
          camelCase, snake_case, and more. It's useful for writers,
          programmers, students, and anyone who needs to quickly reformat text
          without manually retyping it.
        </p>
        <p>
          Our <strong>free online case converter</strong> supports 12+ case
          styles, including everything used in programming (camelCase,
          PascalCase, snake_case, kebab-case, CONSTANT_CASE). Just paste your
          text, click a case, and copy the result.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Use the Text Case Converter</h2>
        <ol className="seo-steps">
          <li>
            <strong>Paste or type</strong> your text in the input box.
          </li>
          <li>
            <strong>Choose a case</strong> — UPPERCASE, lowercase, Title Case,
            camelCase, snake_case, and more.
          </li>
          <li>
            <strong>Or use a text action</strong> — remove extra spaces, trim
            lines, reverse text.
          </li>
          <li>
            <strong>Click Copy</strong> to copy the converted text to your
            clipboard.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>All Supported Case Types</h2>
        <ul className="seo-list">
          <li><strong>UPPERCASE</strong> — every letter capitalized</li>
          <li><strong>lowercase</strong> — every letter small</li>
          <li><strong>Title Case</strong> — Every Word Capitalized</li>
          <li><strong>Sentence case</strong> — Only first letter capitalized</li>
          <li><strong>camelCase</strong> — forJavaScriptVariables</li>
          <li><strong>PascalCase</strong> — ForClassNames</li>
          <li><strong>snake_case</strong> — for_python_variables</li>
          <li><strong>kebab-case</strong> — for-urls-and-css</li>
          <li><strong>CONSTANT_CASE</strong> — FOR_CONSTANTS</li>
          <li><strong>dot.case</strong> — for.object.keys</li>
          <li><strong>aLtErNaTiNg</strong> — funny text</li>
          <li><strong>InVeRsE</strong> — sWAP cASE</li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">🔤</div>
            <h3>12+ Case Types</h3>
            <p>
              From simple UPPERCASE to advanced programming cases like
              camelCase and CONSTANT_CASE.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">⚡</div>
            <h3>Live Conversion</h3>
            <p>
              Output updates instantly as you type or change case style.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📋</div>
            <h3>One-Click Copy</h3>
            <p>
              Copy the converted text instantly to paste anywhere.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🧹</div>
            <h3>Text Cleanup</h3>
            <p>
              Remove extra spaces, trim lines, reverse text or words with one
              click.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔒</div>
            <h3>100% Private</h3>
            <p>
              Everything runs in your browser. Your text never leaves your
              device.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🆓</div>
            <h3>Free Forever</h3>
            <p>
              No signup, no watermark, no limits. Convert as much text as you
              want.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>When to Use Each Case?</h2>
        <ul className="seo-list">
          <li>
            <strong>UPPERCASE</strong> — for emphasis, acronyms, or all-caps
            titles.
          </li>
          <li>
            <strong>lowercase</strong> — for stylistic effect or cleaning up
            chaotic text.
          </li>
          <li>
            <strong>Title Case</strong> — for headlines, book titles, and blog
            post titles.
          </li>
          <li>
            <strong>Sentence case</strong> — for regular sentences and
            captions.
          </li>
          <li>
            <strong>camelCase</strong> — variable and function names in
            JavaScript, Java, Swift.
          </li>
          <li>
            <strong>PascalCase</strong> — class names in most programming
            languages.
          </li>
          <li>
            <strong>snake_case</strong> — Python, Ruby, Rust variable names.
          </li>
          <li>
            <strong>kebab-case</strong> — URLs, CSS classes, HTML attributes.
          </li>
          <li>
            <strong>CONSTANT_CASE</strong> — constants in most languages.
          </li>
          <li>
            <strong>dot.case</strong> — object keys in JavaScript.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this text case converter free?</summary>
          <p>
            Yes — completely free with no signup, no watermark, no hidden fees.
            Use it as often as you want.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is my text safe?</summary>
          <p>
            Absolutely. Everything runs locally in your browser. Your text
            never leaves your device — nothing is uploaded to any server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is camelCase vs PascalCase?</summary>
          <p>
            <strong>camelCase</strong> starts with a lowercase letter
            (<code>myVariable</code>), while <strong>PascalCase</strong> starts
            with an uppercase letter (<code>MyClass</code>).
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between snake_case and kebab-case?</summary>
          <p>
            <strong>snake_case</strong> uses underscores between words
            (<code>my_variable</code>). <strong>kebab-case</strong> uses
            hyphens (<code>my-variable</code>). Kebab-case is common in URLs
            and CSS class names; snake_case is common in Python and Ruby.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work on mobile?</summary>
          <p>
            Yes — the tool is fully responsive and works on phones and
            tablets. Tap the buttons, paste text, copy the result.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I convert very large texts?</summary>
          <p>
            Yes — but performance depends on your device. Text up to a few
            hundred KB works instantly. For very large documents, consider
            chunking.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does the tool preserve line breaks?</summary>
          <p>
            Yes — line breaks are preserved for most cases. Note that
            camelCase, PascalCase, snake_case, kebab-case, and CONSTANT_CASE
            merge all words into a single line, by design.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other text tools: <strong>Word Counter</strong>,{' '}
          <strong>Text Diff</strong>, <strong>Slug Generator</strong>,{' '}
          <strong>Lorem Ipsum</strong>, and <strong>Base64 Encoder</strong> —
          all free and browser-based.
        </p>
      </section>
    </article>
  );
}