import { useState } from 'react'

interface ParsedUrl {
  origin: string
  pathname: string
  params: [string, string][]
  hash: string
}

function parseUrl(input: string): ParsedUrl {
  const url = new URL(input.trim())
  const params: [string, string][] = []
  url.searchParams.forEach((value, key) => {
    params.push([key, value])
  })
  return {
    origin: url.origin,
    pathname: url.pathname,
    params,
    hash: url.hash,
  }
}

export function UrlParser() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<ParsedUrl | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(value: string) {
    setInput(value)
    if (!value.trim()) {
      setParsed(null)
      setError(null)
      return
    }
    try {
      const result = parseUrl(value)
      setParsed(result)
      setError(null)
    } catch {
      setParsed(null)
      setError('Invalid URL')
    }
  }

  return (
    <>
      <div className="input-section">
        <label htmlFor="url-input">Paste URL</label>
        <textarea
          id="url-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="https://example.com/path?key=value&other=123"
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="section-card error-card">
          <div className="card-header">
            <h3>Error</h3>
            <span className="badge badge-red">INVALID</span>
          </div>
          <div className="card-body">
            <p className="error-message">{error}</p>
          </div>
        </div>
      )}

      {!parsed && !error && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <p>Paste a URL above to parse it</p>
        </div>
      )}

      {parsed && (
        <div className="output-grid">
          {/* Base URL */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent)' }}>URL</h3>
              <span className="badge badge-blue">BASE</span>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Origin</span>
                  <span className="info-value">{parsed.origin}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Path</span>
                  <span className="info-value">{parsed.pathname}</span>
                </div>
                {parsed.hash && (
                  <div className="info-item">
                    <span className="info-label">Fragment</span>
                    <span className="info-value">{parsed.hash}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Query Parameters */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--green)' }}>Query Parameters</h3>
              <span className="badge badge-green">{parsed.params.length} PARAMS</span>
            </div>
            <div className="card-body">
              {parsed.params.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text)' }}>No query parameters</p>
              ) : (
                <table className="claim-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.params.map(([key, value], i) => (
                      <tr key={`${key}-${i}`}>
                        <td className="claim-name">{key}</td>
                        <td className="claim-value">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
