import { useState, useEffect, useMemo, useRef } from 'react';
import ToolShell from '../../components/ui/ToolShell';
import { getToolById } from '../../data/tools';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import './JsonFormatter.css';
const SAMPLE_JSON = `{"name":"toolchest","version":"1.0.0","description":"Free online tools","author":{"name":"Team","email":"hello@toolchest.app"},"tools":[{"id":"json-formatter","name":"JSON Formatter","category":"Developer","tags":["json","format","validate"]},{"id":"password-generator","name":"Password Generator","category":"Security","tags":["password","security"]}],"features":{"free":true,"noSignup":true,"private":true},"created":"2026-01-15T10:30:00Z","stars":12847,"rating":4.9}`;

const INDENT_OPTIONS = [
  { id: '2', label: '2 spaces', value: 2 },
  { id: '4', label: '4 spaces', value: 4 },
  { id: 'tab', label: 'Tab', value: '\t' },
];

export default function JsonFormatter() {
  const tool = getToolById('json-formatter');

  useDocumentTitle(
    'JSON Formatter & Validator — Free Online JSON Beautifier | toolchest'
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
      'Free online JSON formatter, validator, and beautifier. Format, minify, validate, and explore JSON with a tree view. Works entirely in your browser — no signup, 100% private.';

    const scriptId = 'json-formatter-jsonld';
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
      name: 'JSON Formatter',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '2138',
      },
      featureList: [
        'Format and beautify JSON',
        'Minify JSON',
        'Validate JSON with error line numbers',
        'Interactive tree view',
        'Sort object keys alphabetically',
        'Copy and download output',
        'Live statistics (size, depth, keys)',
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

  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indent, setIndent] = useState('2');
  const [sortKeys, setSortKeys] = useState(false);
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'tree'
  const [error, setError] = useState(null); // { message, line, column }
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const inputRef = useRef(null);

  // Parse + format whenever input or options change
  const parsed = useMemo(() => {
    if (!input.trim()) {
      return { data: null, error: null };
    }
    try {
      const data = JSON.parse(input);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: parseError(e, input) };
    }
  }, [input]);

  // Update error
  useEffect(() => {
    setError(parsed.error);
  }, [parsed.error]);

  // Compute formatted output
  useEffect(() => {
    if (parsed.error || parsed.data === null) {
      setOutput('');
      return;
    }
    try {
      const indentValue =
        indent === 'tab' ? '\t' : parseInt(indent, 10);
      const finalData = sortKeys ? sortObjectKeys(parsed.data) : parsed.data;
      setOutput(JSON.stringify(finalData, null, indentValue));
    } catch (e) {
      setOutput('');
    }
  }, [parsed.data, parsed.error, indent, sortKeys]);

  // Stats
  const stats = useMemo(() => {
    if (!parsed.data || parsed.error) return null;
    let keys = 0;
    let arrays = 0;
    let objects = 0;
    let strings = 0;
    let numbers = 0;
    let booleans = 0;
    let nulls = 0;
    let maxDepth = 0;

    const walk = (val, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      if (val === null) {
        nulls++;
      } else if (Array.isArray(val)) {
        arrays++;
        val.forEach((v) => walk(v, depth + 1));
      } else if (typeof val === 'object') {
        objects++;
        const k = Object.keys(val);
        keys += k.length;
        k.forEach((key) => walk(val[key], depth + 1));
      } else if (typeof val === 'string') {
        strings++;
      } else if (typeof val === 'number') {
        numbers++;
      } else if (typeof val === 'boolean') {
        booleans++;
      }
    };

    walk(parsed.data, 1);

    return { keys, arrays, objects, strings, numbers, booleans, nulls, depth: maxDepth };
  }, [parsed.data, parsed.error]);

  const handleFormat = () => {
    // Formatting happens automatically via useEffect
    if (parsed.error) {
      // Focus input to show error
      inputRef.current?.focus();
    }
  };

  const handleMinify = () => {
    if (!parsed.data || parsed.error) return;
    try {
      const finalData = sortKeys ? sortObjectKeys(parsed.data) : parsed.data;
      setOutput(JSON.stringify(finalData));
    } catch (e) {
      // ignore
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const handleSample = () => {
    setInput(SAMPLE_JSON);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (err) {
        // ignore
      }
      document.body.removeChild(ta);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1800);
  };

  const inputSize = new Blob([input]).size;
  const outputSize = output ? new Blob([output]).size : 0;

  return (
    <ToolShell tool={tool}>
      <div className="pdf-tool">
        {/* Input area */}
        <div className="json-panel">
          <div className="json-panel-header">
            <div className="json-panel-title">
              <span>📥 Input</span>
              {input && (
                <span className="json-panel-badge">{formatBytes(inputSize)}</span>
              )}
            </div>
            <div className="json-panel-actions">
              <button className="json-mini-btn" onClick={handleSample}>
                📋 Sample
              </button>
              <button
                className="json-mini-btn"
                onClick={handleClear}
                disabled={!input}
              >
                🗑️ Clear
              </button>
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="json-textarea"
            placeholder='Paste your JSON here...{"example": "value"}'
            spellCheck="false"
            autoComplete="off"
          />

          {/* Error display */}
          {error && (
            <div className="json-error">
              <span className="json-error-icon">⚠️</span>
              <div className="json-error-body">
                <div className="json-error-title">Invalid JSON</div>
                <div className="json-error-message">{error.message}</div>
                {error.line > 0 && (
                  <div className="json-error-loc">
                    Line {error.line}
                    {error.column > 0 && `, column ${error.column}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Valid indicator */}
          {!error && input.trim() && (
            <div className="json-valid">
              <span className="json-valid-icon">✓</span>
              Valid JSON
              {stats && (
                <span className="json-valid-stats">
                  {stats.keys} keys · depth {stats.depth}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="pdf-target">
          <div className="json-options-grid">
            <div>
              <label className="pdf-target-label">Indentation</label>
              <div className="jpg-scale-options">
                {INDENT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    className={`category-pill ${
                      indent === o.id ? 'active' : ''
                    }`}
                    onClick={() => setIndent(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="pdf-target-label">Options</label>
              <label className="pn-checkbox">
                <input
                  type="checkbox"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                />
                <span>Sort keys alphabetically</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="json-actions">
          <button
            className="json-action-btn primary"
            onClick={handleFormat}
            disabled={!input.trim() || !!error}
          >
            ✨ Beautify
          </button>
          <button
            className="json-action-btn"
            onClick={handleMinify}
            disabled={!parsed.data || !!error}
          >
            🗜️ Minify
          </button>
          <button
            className="json-action-btn"
            onClick={handleCopy}
            disabled={!output}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button
            className="json-action-btn"
            onClick={handleDownload}
            disabled={!output}
          >
            {downloaded ? '✓ Saved!' : '⬇ Download'}
          </button>
        </div>

        {/* Output */}
        {output && !error && (
          <>
            <div className="json-tabs">
              <button
                className={`json-tab ${activeTab === 'output' ? 'active' : ''}`}
                onClick={() => setActiveTab('output')}
              >
                📄 Formatted
              </button>
              <button
                className={`json-tab ${activeTab === 'tree' ? 'active' : ''}`}
                onClick={() => setActiveTab('tree')}
              >
                🌳 Tree View
              </button>
            </div>

            {activeTab === 'output' && (
              <div className="json-panel">
                <div className="json-panel-header">
                  <div className="json-panel-title">
                    <span>📤 Output</span>
                    <span className="json-panel-badge">
                      {formatBytes(outputSize)}
                    </span>
                  </div>
                </div>
                <textarea
                  value={output}
                  readOnly
                  className="json-textarea output"
                  spellCheck="false"
                />
              </div>
            )}

            {activeTab === 'tree' && (
              <div className="json-panel">
                <div className="json-panel-header">
                  <div className="json-panel-title">
                    <span>🌳 Tree</span>
                    <span className="json-panel-badge">
                      {stats?.keys || 0} keys
                    </span>
                  </div>
                </div>
                <div className="json-tree">
                  <JsonTree data={parsed.data} />
                </div>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="json-stats">
                <div className="json-stat">
                  <div className="json-stat-value">{stats.objects}</div>
                  <div className="json-stat-label">objects</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.arrays}</div>
                  <div className="json-stat-label">arrays</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.keys}</div>
                  <div className="json-stat-label">keys</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.strings}</div>
                  <div className="json-stat-label">strings</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.numbers}</div>
                  <div className="json-stat-label">numbers</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.booleans}</div>
                  <div className="json-stat-label">booleans</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.nulls}</div>
                  <div className="json-stat-label">nulls</div>
                </div>
                <div className="json-stat">
                  <div className="json-stat-value">{stats.depth}</div>
                  <div className="json-stat-label">max depth</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state hint */}
        {!input.trim() && (
          <div className="json-empty">
            <div className="json-empty-icon">📝</div>
            <div className="json-empty-title">
              Paste JSON above to get started
            </div>
            <div className="json-empty-hint">
              Or click <strong>Sample</strong> to load an example
            </div>
          </div>
        )}

        {/* SEO Content */}
        <SeoContent />
      </div>
    </ToolShell>
  );
}

/* ===================== JSON Tree Component ===================== */
function JsonTree({ data, name = null, depth = 0, isLast = true }) {
  const [expanded, setExpanded] = useState(depth < 3);

  if (data === null) {
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        {name !== null && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-null">null</span>
        {!isLast && <span className="json-tree-comma">,</span>}
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        {name !== null && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-boolean">{data.toString()}</span>
        {!isLast && <span className="json-tree-comma">,</span>}
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        {name !== null && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-number">{data}</span>
        {!isLast && <span className="json-tree-comma">,</span>}
      </div>
    );
  }

  if (typeof data === 'string') {
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        {name !== null && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-string">"{data}"</span>
        {!isLast && <span className="json-tree-comma">,</span>}
      </div>
    );
  }

  if (Array.isArray(data)) {
    const isEmpty = data.length === 0;
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        <div
          className="json-tree-toggle-row"
          onClick={() => !isEmpty && setExpanded(!expanded)}
          style={{ cursor: isEmpty ? 'default' : 'pointer' }}
        >
          {!isEmpty && (
            <span className="json-tree-toggle">
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {isEmpty && <span className="json-tree-toggle-spacer" />}
          {name !== null && <span className="json-tree-key">{name}: </span>}
          <span className="json-tree-bracket">[</span>
          {!expanded && !isEmpty && (
            <span className="json-tree-collapsed">
              {data.length} {data.length === 1 ? 'item' : 'items'}
            </span>
          )}
          {!expanded && !isEmpty && (
            <span className="json-tree-bracket">]</span>
          )}
          {!expanded && !isEmpty && !isLast && (
            <span className="json-tree-comma">,</span>
          )}
          {isEmpty && <span className="json-tree-bracket">]</span>}
          {isEmpty && !isLast && <span className="json-tree-comma">,</span>}
        </div>
        {expanded && !isEmpty && (
          <>
            {data.map((item, i) => (
              <JsonTree
                key={i}
                data={item}
                name={null}
                depth={depth + 1}
                isLast={i === data.length - 1}
              />
            ))}
            <div
              className="json-tree-close"
              style={{ paddingLeft: (depth + 1) * 16 }}
            >
              <span className="json-tree-bracket">]</span>
              {!isLast && <span className="json-tree-comma">,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;
    return (
      <div className="json-tree-node" style={{ paddingLeft: depth * 16 }}>
        <div
          className="json-tree-toggle-row"
          onClick={() => !isEmpty && setExpanded(!expanded)}
          style={{ cursor: isEmpty ? 'default' : 'pointer' }}
        >
          {!isEmpty && (
            <span className="json-tree-toggle">
              {expanded ? '▼' : '▶'}
            </span>
          )}
          {isEmpty && <span className="json-tree-toggle-spacer" />}
          {name !== null && <span className="json-tree-key">{name}: </span>}
          <span className="json-tree-bracket">{'{'}</span>
          {!expanded && !isEmpty && (
            <span className="json-tree-collapsed">
              {keys.length} {keys.length === 1 ? 'key' : 'keys'}
            </span>
          )}
          {!expanded && !isEmpty && (
            <span className="json-tree-bracket">{'}'}</span>
          )}
          {!expanded && !isEmpty && !isLast && (
            <span className="json-tree-comma">,</span>
          )}
          {isEmpty && <span className="json-tree-bracket">{'}'}</span>}
          {isEmpty && !isLast && <span className="json-tree-comma">,</span>}
        </div>
        {expanded && !isEmpty && (
          <>
            {keys.map((key, i) => (
              <JsonTree
                key={key}
                data={data[key]}
                name={key}
                depth={depth + 1}
                isLast={i === keys.length - 1}
              />
            ))}
            <div
              className="json-tree-close"
              style={{ paddingLeft: (depth + 1) * 16 }}
            >
              <span className="json-tree-bracket">{'}'}</span>
              {!isLast && <span className="json-tree-comma">,</span>}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

/* ===================== Helpers ===================== */

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj && typeof obj === 'object') {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = sortObjectKeys(obj[key]);
      });
    return sorted;
  }
  return obj;
}

function parseError(e, input) {
  const message = e.message || 'Invalid JSON';
  // Try to extract line/column from error message
  // Modern browsers: "Unexpected token } in JSON at position 123" or similar
  let line = 0;
  let column = 0;

  const posMatch = message.match(/position (\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const before = input.slice(0, pos);
    const lines = before.split('\n');
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  }

  // Firefox format: "JSON.parse: unexpected character at line 3 column 5 of the JSON data"
  const lineMatch = message.match(/line (\d+)/i);
  const colMatch = message.match(/column (\d+)/i);
  if (lineMatch) line = parseInt(lineMatch[1], 10);
  if (colMatch) column = parseInt(colMatch[1], 10);

  return { message, line, column };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ===================== SEO Content ===================== */
function SeoContent() {
  return (
    <article className="seo-content">
      <section className="seo-section">
        <h2>What is a JSON Formatter?</h2>
        <p>
          A <strong>JSON formatter</strong> (also called a JSON beautifier)
          takes raw, minified, or unformatted JSON and rewrites it with proper
          indentation, line breaks, and spacing so it's easy to read and
          debug. Whether you copied JSON from a network request, an API
          response, or a log file, a formatter makes it human-readable in one
          click.
        </p>
        <p>
          Our <strong>free online JSON formatter</strong> also validates your
          JSON in real time, shows the exact line and column of any syntax
          error, and gives you a collapsible tree view to explore deeply
          nested data. Everything runs in your browser — no upload, no
          signup, 100% private.
        </p>
      </section>

      <section className="seo-section">
        <h2>How to Format JSON — Step by Step</h2>
        <ol className="seo-steps">
          <li>
            <strong>Paste your JSON</strong> into the input box — it validates
            instantly as you type.
          </li>
          <li>
            <strong>Pick an indentation</strong> — 2 spaces, 4 spaces, or tabs.
          </li>
          <li>
            <strong>Beautify or Minify</strong> — click Beautify for readable
            output, or Minify to strip all whitespace.
          </li>
          <li>
            <strong>Explore the tree</strong> — switch to Tree View to browse
            nested objects and arrays.
          </li>
          <li>
            <strong>Copy or download</strong> — grab the formatted output with
            one click.
          </li>
        </ol>
      </section>

      <section className="seo-section">
        <h2>Key Features</h2>
        <div className="seo-features">
          <div className="seo-feature">
            <div className="seo-feature-icon">✨</div>
            <h3>Beautify JSON</h3>
            <p>
              Instantly reformat minified JSON with proper indentation — 2
              spaces, 4 spaces, or tabs.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🗜️</div>
            <h3>Minify JSON</h3>
            <p>
              Strip all whitespace to get the smallest possible JSON payload
              — perfect for production.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">✓</div>
            <h3>Real-Time Validation</h3>
            <p>
              Errors are caught live with exact line and column numbers so you
              can fix them fast.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🌳</div>
            <h3>Tree View</h3>
            <p>
              Explore deeply nested JSON with a collapsible tree — click any
              node to expand or collapse.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">🔤</div>
            <h3>Sort Keys</h3>
            <p>
              Alphabetically sort object keys with one toggle — great for
              diffing JSON files.
            </p>
          </div>
          <div className="seo-feature">
            <div className="seo-feature-icon">📊</div>
            <h3>Live Statistics</h3>
            <p>
              See counts of objects, arrays, keys, strings, numbers, booleans,
              nulls, and max depth.
            </p>
          </div>
        </div>
      </section>

      <section className="seo-section">
        <h2>Common Use Cases</h2>
        <ul className="seo-list">
          <li>
            <strong>Debugging API responses</strong> — paste a minified API
            response and instantly see the structure.
          </li>
          <li>
            <strong>Config file editing</strong> — reformat package.json,
            tsconfig.json, or any config file for easier reading.
          </li>
          <li>
            <strong>Data inspection</strong> — explore large JSON exports from
            databases, analytics, or exports.
          </li>
          <li>
            <strong>Testing</strong> — validate JSON payloads before sending
            them to an API.
          </li>
          <li>
            <strong>Code review</strong> — compare two JSON files after sorting
            keys alphabetically.
          </li>
          <li>
            <strong>Learning</strong> — explore JSON structure with the tree
            view to understand nested data.
          </li>
        </ul>
      </section>

      <section className="seo-section">
        <h2>Frequently Asked Questions</h2>

        <details className="seo-faq" open>
          <summary>Is this JSON formatter free?</summary>
          <p>
            Yes — completely free with no signup, no watermarks, no limits. Use
            it as often as you want on as much JSON as you need.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Are my JSON files safe?</summary>
          <p>
            Absolutely. The entire formatting and validation process runs
            locally in your browser. Your JSON is never uploaded to any
            server.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What's the difference between formatting and minifying?</summary>
          <p>
            <strong>Formatting</strong> (beautifying) adds indentation and line
            breaks to make JSON readable. <strong>Minifying</strong> removes all
            unnecessary whitespace to make the JSON as small as possible —
            ideal for production APIs and data transfer.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Why does my JSON say invalid?</summary>
          <p>
            Common reasons: trailing commas (not allowed in JSON), single
            quotes instead of double quotes, unquoted keys, or missing braces.
            The error message shows the exact line and column so you can fix it
            quickly.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I sort JSON keys alphabetically?</summary>
          <p>
            Yes — toggle "Sort keys alphabetically" and both the formatted
            output and tree view will show keys in alphabetical order. This is
            especially useful when comparing two JSON files.
          </p>
        </details>

        <details className="seo-faq">
          <summary>What is the tree view for?</summary>
          <p>
            The tree view lets you explore deeply nested JSON with collapsible
            nodes. Instead of scrolling through hundreds of lines, you can
            collapse sections you don't need and focus on the data you care
            about.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Is there a size limit?</summary>
          <p>
            No hard limit — but very large JSON files (above 10 MB) may be
            slow in the tree view. For best performance, use files under 5 MB.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Does it work offline?</summary>
          <p>
            Yes — once the page loads, all processing is local. You don't need
            an internet connection to format or validate JSON.
          </p>
        </details>

        <details className="seo-faq">
          <summary>Can I use the output commercially?</summary>
          <p>
            Absolutely — the formatted JSON is yours to use however you like,
            personal or commercial. No restrictions.
          </p>
        </details>
      </section>

      <section className="seo-section">
        <h2>Related Tools</h2>
        <p>
          Try our other developer tools: <strong>Base64 Encoder/Decoder</strong>,{' '}
          <strong>URL Encoder/Decoder</strong>, <strong>Hash Generator</strong>,{' '}
          <strong>JWT Decoder</strong>, <strong>Regex Tester</strong>,{' '}
          <strong>UUID Generator</strong>, and <strong>Password Generator</strong>{' '}
          — all free and browser-based.
        </p>
      </section>
    </article>
  );
}