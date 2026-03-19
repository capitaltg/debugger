import { useState } from 'react'
import {
  decodeSaml,
  getStatusDescription,
  getNameIdFormatDescription,
  getAuthnContextDescription,
  type SamlInfo,
} from '../utils/saml'

export function SamlDecoder() {
  const [input, setInput] = useState('')
  const [decoded, setDecoded] = useState<SamlInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  function handleChange(value: string) {
    setInput(value)
    if (!value.trim()) {
      setDecoded(null)
      setError(null)
      return
    }
    try {
      const result = decodeSaml(value)
      setDecoded(result)
      setError(null)
    } catch (e) {
      setDecoded(null)
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const statusDesc = decoded ? getStatusDescription(decoded.statusCode) : null
  const nameIdFmtDesc = decoded ? getNameIdFormatDescription(decoded.nameIdFormat) : null
  const authnDesc = decoded ? getAuthnContextDescription(decoded.authnContextClassRef) : null

  return (
    <>
      <div className="input-section">
        <label htmlFor="saml-input">Paste SAML Response (XML or Base64)</label>
        <textarea
          id="saml-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Paste a SAML Response here — raw XML or base64-encoded"
          spellCheck={false}
          style={{ minHeight: 150 }}
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>Paste a SAML response above to decode it</p>
        </div>
      )}

      {decoded && (
        <div className="output-grid">
          {/* Overview */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent)' }}>Response Info</h3>
              {decoded.statusCode && (
                <span className={`badge ${decoded.statusCode.includes('Success') ? 'badge-green' : 'badge-red'}`}>
                  {decoded.statusCode.includes('Success') ? 'SUCCESS' : 'FAILED'}
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="info-grid">
                {decoded.issuer && (
                  <div className="info-item">
                    <span className="info-label">Issuer</span>
                    <span className="info-value">{decoded.issuer}</span>
                  </div>
                )}
                {decoded.destination && (
                  <div className="info-item">
                    <span className="info-label">Destination</span>
                    <span className="info-value">{decoded.destination}</span>
                  </div>
                )}
                {decoded.issueInstant && (
                  <div className="info-item">
                    <span className="info-label">Issue Instant</span>
                    <span className="info-value">{decoded.issueInstant}</span>
                  </div>
                )}
                {decoded.inResponseTo && (
                  <div className="info-item">
                    <span className="info-label">In Response To</span>
                    <span className="info-value">{decoded.inResponseTo}</span>
                  </div>
                )}
                {decoded.statusCode && (
                  <div className="info-item">
                    <span className="info-label">Status</span>
                    <span className="info-value">
                      {statusDesc || decoded.statusCode.split(':').pop()}
                    </span>
                  </div>
                )}
                {decoded.sessionIndex && (
                  <div className="info-item">
                    <span className="info-label">Session Index</span>
                    <span className="info-value">{decoded.sessionIndex}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--green)' }}>Subject</h3>
              <span className="badge badge-green">IDENTITY</span>
            </div>
            <div className="card-body">
              <div className="info-grid">
                {decoded.nameId && (
                  <div className="info-item">
                    <span className="info-label">Name ID</span>
                    <span className="info-value">{decoded.nameId}</span>
                  </div>
                )}
                {decoded.nameIdFormat && (
                  <div className="info-item">
                    <span className="info-label">Name ID Format</span>
                    <span className="info-value">
                      {nameIdFmtDesc || decoded.nameIdFormat.split(':').pop()}
                    </span>
                  </div>
                )}
                {decoded.authnContextClassRef && (
                  <div className="info-item">
                    <span className="info-label">Authentication Method</span>
                    <span className="info-value">
                      {authnDesc || decoded.authnContextClassRef.split(':').pop()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conditions */}
          {(decoded.notBefore || decoded.notOnOrAfter || decoded.audience) && (
            <div className="section-card">
              <div className="card-header">
                <h3 style={{ color: 'var(--amber)' }}>Conditions</h3>
                <span className="badge badge-amber">VALIDITY</span>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  {decoded.notBefore && (
                    <div className="info-item">
                      <span className="info-label">Not Before</span>
                      <span className="info-value">{decoded.notBefore}</span>
                    </div>
                  )}
                  {decoded.notOnOrAfter && (
                    <div className="info-item">
                      <span className="info-label">Not On Or After</span>
                      <span className="info-value">{decoded.notOnOrAfter}</span>
                    </div>
                  )}
                  {decoded.audience && (
                    <div className="info-item">
                      <span className="info-label">Audience</span>
                      <span className="info-value">{decoded.audience}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {(decoded.signatureMethod || decoded.digestMethod) && (
            <div className="section-card">
              <div className="card-header">
                <h3 style={{ color: 'var(--cyan)' }}>Security</h3>
                <span className="badge badge-cyan">SIGNATURE</span>
              </div>
              <div className="card-body">
                <div className="info-grid">
                  {decoded.signatureMethod && (
                    <div className="info-item">
                      <span className="info-label">Signature Method</span>
                      <span className="info-value">{decoded.signatureMethod.split('#').pop()}</span>
                    </div>
                  )}
                  {decoded.digestMethod && (
                    <div className="info-item">
                      <span className="info-label">Digest Method</span>
                      <span className="info-value">{decoded.digestMethod.split('#').pop()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attributes */}
          {decoded.attributes.length > 0 && (
            <div className="section-card">
              <div className="card-header">
                <h3 style={{ color: 'var(--accent)' }}>Attributes</h3>
                <span className="badge badge-blue">{decoded.attributes.length} CLAIMS</span>
              </div>
              <div className="card-body">
                <table className="claim-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Value(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decoded.attributes.map((attr, i) => (
                      <tr key={i}>
                        <td className="claim-name" title={attr.name}>
                          {attr.friendlyName || attr.name.split('/').pop() || attr.name}
                          {attr.friendlyName && (
                            <div style={{ fontSize: 10, color: 'var(--text)', marginTop: 2 }}>
                              {attr.name}
                            </div>
                          )}
                        </td>
                        <td className="claim-value">
                          {attr.values.length === 1
                            ? attr.values[0]
                            : attr.values.map((v, j) => <div key={j}>{v}</div>)
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw XML */}
          <div className="section-card">
            <div className="card-header">
              <h3>Raw XML</h3>
              <button
                onClick={() => setShowRaw(!showRaw)}
                style={{
                  marginLeft: 'auto',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '2px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {showRaw ? 'Hide' : 'Show'}
              </button>
            </div>
            {showRaw && (
              <div className="card-body">
                <div className="json-display" style={{ fontSize: 11, maxHeight: 400, overflow: 'auto' }}>
                  {decoded.rawXml}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
