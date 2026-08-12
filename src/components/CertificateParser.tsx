import { useRef, useState } from 'react'
import {
  chainLinks,
  daysUntil,
  formatDate,
  formatDuration,
  matchesHostname,
  parseCertificates,
  validityState,
  type CertificateInfo,
} from '../utils/certificate'

function ValidityBadge({ cert }: { cert: CertificateInfo }) {
  const state = validityState(cert)
  if (state === 'expired') {
    const days = cert.notAfter ? Math.abs(daysUntil(cert.notAfter)) : 0
    return <span className="badge badge-red">EXPIRED {days}D AGO</span>
  }
  if (state === 'not-yet-valid') return <span className="badge badge-amber">NOT YET VALID</span>
  if (state === 'unknown') return <span className="badge badge-amber">DATES UNREADABLE</span>
  const days = cert.notAfter ? daysUntil(cert.notAfter) : 0
  if (days <= 30) return <span className="badge badge-amber">EXPIRES IN {days}D</span>
  return <span className="badge badge-green">VALID · {days}D LEFT</span>
}

function NameTable({ name }: { name: CertificateInfo['subject'] }) {
  if (name.components.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--text)' }}>Empty name</p>
  }
  return (
    <table className="claim-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {name.components.map((c, i) => (
          <tr key={`${c.oid}-${i}`}>
            <td className="claim-name" title={c.oid}>
              {c.type}
              {c.multiValued && (
                <span
                  className="badge badge-cyan"
                  style={{ marginLeft: 6 }}
                  title="Shares one RDN with another attribute (joined by + in the DN)"
                >
                  +
                </span>
              )}
            </td>
            <td className="claim-value">{c.value}</td>
            <td className="claim-description">{c.description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CertificateCards({
  cert,
  index,
  total,
  hostname,
}: {
  cert: CertificateInfo
  index: number
  total: number
  hostname: string
}) {
  const [copied, setCopied] = useState(false)
  const cn = cert.subject.components.find((c) => c.type === 'CN')?.value
  const issuerCn = cert.issuer.components.find((c) => c.type === 'CN')?.value
  const hostMatch = hostname.trim() ? matchesHostname(cert, hostname) : null

  async function copyPem() {
    try {
      await navigator.clipboard.writeText(cert.pem)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      {/* Summary */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--accent)' }}>
            {total > 1 ? `Certificate ${index + 1} of ${total}` : 'Certificate'}
          </h3>
          <ValidityBadge cert={cert} />
          {cert.isCa ? (
            <span className="badge badge-cyan">
              CA{cert.pathLength !== null ? ` · PATHLEN ${cert.pathLength}` : ''}
            </span>
          ) : (
            <span className="badge badge-blue">END ENTITY</span>
          )}
          {cert.selfIssued && (
            <span
              className="badge badge-amber"
              title="Issuer and subject names match. Whether it is also self-signed depends on the signature, which is not verified here."
            >
              SELF-ISSUED
            </span>
          )}
          {cert.signatureWeak && <span className="badge badge-red">WEAK SIGNATURE</span>}
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Subject (CN)</span>
              <span className="info-value">{cn || cert.subject.text || '—'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Issuer (CN)</span>
              <span className="info-value">{issuerCn || cert.issuer.text || '—'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Valid From</span>
              <span className="info-value">{formatDate(cert.notBefore)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Valid Until</span>
              <span className="info-value">{formatDate(cert.notAfter)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Public Key</span>
              <span className="info-value">
                {cert.publicKey.curve
                  ? `${cert.publicKey.algorithm} · ${cert.publicKey.curve}`
                  : `${cert.publicKey.algorithm}${cert.publicKey.bits ? ` ${cert.publicKey.bits} bits` : ''}`}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Signature Algorithm</span>
              <span className="info-value" style={cert.signatureWeak ? { color: 'var(--red)' } : undefined}>
                {cert.signatureAlgorithm}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Serial Number</span>
              <span
                className="info-value"
                style={cert.serialNegative ? { color: 'var(--red)' } : undefined}
              >
                {cert.serialNumberHex} ({cert.serialNumberDecimal})
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Version</span>
              <span className="info-value">v{cert.version}</span>
            </div>
          </div>
          {cert.notBefore && cert.notAfter && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text)' }}>
              Lifetime: {formatDuration(cert.notBefore, cert.notAfter)} · {cert.derBytes} bytes DER
            </p>
          )}
          {cert.signatureWeak && (
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red)' }}>
              This certificate is signed with an algorithm that is no longer considered secure.
            </p>
          )}
          {cert.serialNegative && (
            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red)' }}>
              The serial number is negative. RFC 5280 requires a positive serial, so this was almost
              certainly issued by a misconfigured CA.
            </p>
          )}
          {hostMatch !== null && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: hostMatch ? 'var(--green)' : 'var(--red)',
              }}
            >
              {hostMatch
                ? `✓ ${hostname.trim()} matches this certificate`
                : `✗ ${hostname.trim()} does not match any name in this certificate`}
            </p>
          )}
        </div>
      </div>

      {/* Subject Alternative Names */}
      {cert.subjectAltNames.length > 0 && (
        <div className="section-card">
          <div className="card-header">
            <h3 style={{ color: 'var(--green)' }}>Subject Alternative Names</h3>
            <span className="badge badge-green">{cert.subjectAltNames.length} NAMES</span>
          </div>
          <div className="card-body">
            <div className="saml-attributes">
              {cert.subjectAltNames.map((n, i) => (
                <div className="saml-attr-row" key={`${n.type}-${n.value}-${i}`}>
                  <span className="saml-attr-name" style={{ minWidth: 90 }}>{n.type}</span>
                  <span className="saml-attr-value">{n.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subject */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--cyan)' }}>Subject</h3>
          <span className="badge badge-cyan">DN</span>
        </div>
        <div className="card-body">
          <div className="json-display" style={{ marginBottom: 12, color: 'var(--text)' }}>
            {cert.subject.text || '(empty)'}
          </div>
          <NameTable name={cert.subject} />
        </div>
      </div>

      {/* Issuer */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--amber)' }}>Issuer</h3>
          <span className="badge badge-amber">DN</span>
          {cert.selfIssued && (
            <span className="badge badge-amber" title="Identical to the subject name">
              SELF-ISSUED
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="json-display" style={{ marginBottom: 12, color: 'var(--text)' }}>
            {cert.issuer.text || '(empty)'}
          </div>
          <NameTable name={cert.issuer} />
        </div>
      </div>

      {/* Public key */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--accent)' }}>Public Key</h3>
          <span className="badge badge-blue">{cert.publicKey.algorithm}</span>
          {cert.publicKey.bits && <span className="badge badge-cyan">{cert.publicKey.bits} BITS</span>}
        </div>
        <div className="card-body">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Algorithm</span>
              <span className="info-value" title={cert.publicKey.algorithmOid}>
                {cert.publicKey.algorithm} ({cert.publicKey.algorithmOid})
              </span>
            </div>
            {cert.publicKey.curve && (
              <div className="info-item">
                <span className="info-label">Curve</span>
                <span className="info-value">{cert.publicKey.curve}</span>
              </div>
            )}
            {cert.publicKey.exponent && (
              <div className="info-item">
                <span className="info-label">Exponent</span>
                <span className="info-value">{cert.publicKey.exponent}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="info-label">{cert.publicKey.modulus ? 'Modulus' : 'Key'}</span>
            <div className="json-display" style={{ color: 'var(--text-bright)', maxHeight: 160, overflow: 'auto' }}>
              {cert.publicKey.modulus || cert.publicKey.keyHex}
            </div>
          </div>
        </div>
      </div>

      {/* Extensions */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--green)' }}>Extensions</h3>
          <span className="badge badge-green">{cert.extensions.length}</span>
        </div>
        <div className="card-body">
          {cert.extensions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text)' }}>No extensions (v1 certificate)</p>
          ) : (
            <table className="claim-table">
              <thead>
                <tr>
                  <th>Extension</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {cert.extensions.map((ext, i) => (
                  <tr key={`${ext.oid}-${i}`}>
                    <td className="claim-name" style={{ whiteSpace: 'normal' }}>
                      {ext.name}
                      {ext.critical && (
                        <span className="badge badge-red" style={{ marginLeft: 6 }}>
                          CRITICAL
                        </span>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{ext.oid}</div>
                    </td>
                    <td className="claim-value" style={{ whiteSpace: 'pre-wrap' }}>
                      {ext.lines.join('\n')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Fingerprints */}
      <div className="section-card">
        <div className="card-header">
          <h3 style={{ color: 'var(--cyan)' }}>Fingerprints</h3>
          <span className="badge badge-cyan">DIGESTS</span>
          <button
            className="json-expand-toggle"
            onClick={copyPem}
            title="Copy this certificate as PEM, with the BEGIN/END lines"
          >
            {copied ? 'Copied' : 'Copy PEM'}
          </button>
        </div>
        <div className="card-body">
          <div className="info-item" style={{ marginBottom: 12 }}>
            <span className="info-label">SHA-256</span>
            <span className="info-value">{cert.fingerprintSha256}</span>
          </div>
          <div className="info-item" style={{ marginBottom: 12 }}>
            <span className="info-label">SHA-1</span>
            <span className="info-value">{cert.fingerprintSha1}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Public Key Pin (pin-sha256)</span>
            <span className="info-value">{cert.spkiPinSha256}</span>
          </div>
        </div>
      </div>
    </>
  )
}

export function CertificateParser() {
  const [input, setInput] = useState('')
  const [hostname, setHostname] = useState('')
  const [certs, setCerts] = useState<CertificateInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Parsing is async (fingerprint digests); ignore results from stale keystrokes.
  const requestId = useRef(0)

  async function handleChange(value: string) {
    setInput(value)
    const id = ++requestId.current
    if (!value.trim()) {
      setCerts(null)
      setError(null)
      return
    }
    try {
      const result = await parseCertificates(value)
      if (id !== requestId.current) return
      setCerts(result)
      setError(null)
    } catch (e) {
      if (id !== requestId.current) return
      setCerts(null)
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const links = certs ? chainLinks(certs) : []
  const chainOk = links.length > 0 && links.every(Boolean)

  return (
    <>
      <div className="input-section">
        <label htmlFor="cert-input">Paste Certificate (PEM, base64 DER, or hex)</label>
        <textarea
          id="cert-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="-----BEGIN CERTIFICATE-----&#10;MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ...&#10;-----END CERTIFICATE-----&#10;&#10;Header/footer optional. Paste a full chain to inspect every certificate."
          spellCheck={false}
          style={{ minHeight: 170 }}
        />
      </div>

      {certs && certs.length > 0 && (
        <div className="input-section">
          <label htmlFor="cert-hostname">Check Hostname (optional)</label>
          <input
            id="cert-hostname"
            className="text-input"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="www.example.com"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}

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

      {!certs && !error && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <circle cx="12" cy="10" r="2.5" />
            <path d="M9 17.5 8 22l4-2 4 2-1-4.5" />
          </svg>
          <p>Paste a certificate above to inspect it</p>
        </div>
      )}

      {certs && (
        <div className="output-grid">
          {certs.length > 1 && (
            <div className="section-card">
              <div className="card-header">
                <h3 style={{ color: 'var(--accent)' }}>Chain</h3>
                <span className="badge badge-blue">{certs.length} CERTIFICATES</span>
                {chainOk ? (
                  <span className="badge badge-green">ORDER OK</span>
                ) : (
                  <span className="badge badge-amber">ORDER UNVERIFIED</span>
                )}
              </div>
              <div className="card-body">
                <div className="saml-attributes">
                  {certs.map((c, i) => {
                    const cn = c.subject.components.find((x) => x.type === 'CN')?.value
                    return (
                      <div className="saml-attr-row" key={i}>
                        <span className="saml-attr-name" style={{ minWidth: 40 }}>#{i + 1}</span>
                        <span className="saml-attr-value">
                          {cn || c.subject.text || '(no subject)'}
                          {i < certs.length - 1 && !links[i] && (
                            <span style={{ color: 'var(--amber)' }}>
                              {' '}
                              — issuer does not match the next certificate&apos;s subject
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text)' }}>
                  Chain order is checked by name only. Signatures are not verified — that requires the
                  issuer&apos;s key and a trust store.
                </p>
              </div>
            </div>
          )}

          {certs.map((cert, i) => (
            <CertificateCards
              key={`${cert.fingerprintSha256}-${i}`}
              cert={cert}
              index={i}
              total={certs.length}
              hostname={hostname}
            />
          ))}
        </div>
      )}
    </>
  )
}
