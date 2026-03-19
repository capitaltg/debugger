import { useState } from 'react'
import {
  decodeJwt,
  getClaimDescription,
  getAlgorithmDescription,
  formatTimestamp,
  isExpired,
  type DecodedJwt,
} from '../utils/jwt'

export function JwtDecoder() {
  const [input, setInput] = useState('')
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(value: string) {
    setInput(value)
    if (!value.trim()) {
      setDecoded(null)
      setError(null)
      return
    }
    try {
      const result = decodeJwt(value)
      setDecoded(result)
      setError(null)
    } catch (e) {
      setDecoded(null)
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const expired = decoded ? isExpired(decoded.payload) : null
  const alg = decoded ? (decoded.header.alg as string) : null
  const algDesc = alg ? getAlgorithmDescription(alg) : null

  return (
    <>
      <div className="input-section">
        <label htmlFor="jwt-input">Paste JWT Token</label>
        <textarea
          id="jwt-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature"
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

      {!decoded && !error && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 7h2a5 5 0 0 1 0 10h-2m-6 0H7A5 5 0 0 1 7 7h2" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <p>Paste a JWT above to decode it</p>
        </div>
      )}

      {decoded && (
        <div className="output-grid">
          {/* Header */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent)' }}>Header</h3>
              <span className="badge badge-blue">JOSE</span>
              {alg && algDesc && (
                <span className="badge badge-cyan" title={algDesc}>{alg}</span>
              )}
            </div>
            <div className="card-body">
              <div className="json-display" style={{ color: 'var(--accent)' }}>
                {JSON.stringify(decoded.header, null, 2)}
              </div>
              {alg && algDesc && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text)' }}>
                  Algorithm: {algDesc}
                </p>
              )}
              {alg === 'none' && (
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red)' }}>
                  Warning: This token has no signature and should not be trusted.
                </p>
              )}
            </div>
          </div>

          {/* Payload / Claims */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--green)' }}>Payload</h3>
              <span className="badge badge-green">CLAIMS</span>
              {expired === true && <span className="badge badge-red">EXPIRED</span>}
              {expired === false && <span className="badge badge-green">VALID</span>}
            </div>
            <div className="card-body">
              <table className="claim-table">
                <thead>
                  <tr>
                    <th>Claim</th>
                    <th>Value</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(decoded.payload).map(([key, value]) => {
                    const desc = getClaimDescription(key)
                    const ts = formatTimestamp(value)
                    return (
                      <tr key={key}>
                        <td className="claim-name">{key}</td>
                        <td className="claim-value">
                          {ts ? (
                            <span className="timestamp">{ts}</span>
                          ) : (
                            typeof value === 'object'
                              ? JSON.stringify(value, null, 2)
                              : String(value)
                          )}
                        </td>
                        <td className="claim-description">{desc || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--amber)' }}>Signature</h3>
              <span className="badge badge-amber">BASE64URL</span>
            </div>
            <div className="card-body">
              <div className="json-display" style={{ color: 'var(--amber)', wordBreak: 'break-all' }}>
                {decoded.signature}
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text)' }}>
                Note: Signature verification requires the signing key and is not performed client-side.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
