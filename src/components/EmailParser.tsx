import { useState } from 'react'

interface ParsedEmail {
  name: string
  email: string
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
const EMAIL_RE_G = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const NAME_EMAIL_RE = /(?:"([^"]+)"|([^<,;"\n]+?))?\s*<\s*([^>\s]+@[^>\s]+)\s*>/g

function cleanName(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .trim()
}

function parseEmails(input: string): ParsedEmail[] {
  const results: ParsedEmail[] = []
  // Treat semicolons as line breaks (Outlook-style recipient lists)
  const normalized = input.replace(/;/g, '\n')
  const lines = normalized.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const bracketMatches = [...line.matchAll(NAME_EMAIL_RE)]
    if (bracketMatches.length > 0) {
      for (const m of bracketMatches) {
        const name = cleanName(m[1] ?? m[2] ?? '')
        const email = m[3].trim()
        if (EMAIL_RE.test(email)) results.push({ name, email })
      }
      continue
    }

    const bareEmails = [...line.matchAll(EMAIL_RE_G)]
    if (bareEmails.length === 1) {
      const m = bareEmails[0]
      const email = m[0]
      const before = line.slice(0, m.index ?? 0)
      const after = line.slice((m.index ?? 0) + email.length)
      const name = cleanName(before) || cleanName(after)
      results.push({ name, email })
    } else if (bareEmails.length > 1) {
      for (const m of bareEmails) {
        results.push({ name: '', email: m[0] })
      }
    }
  }

  return results
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1).toLowerCase()
}

function sortKey(p: ParsedEmail): string {
  return (p.name || p.email).toLowerCase()
}

function groupByDomain(items: ParsedEmail[]): { domain: string; items: ParsedEmail[] }[] {
  const groups = new Map<string, ParsedEmail[]>()
  for (const p of items) {
    const d = domainOf(p.email)
    const list = groups.get(d) ?? []
    list.push(p)
    groups.set(d, list)
  }
  return [...groups.entries()]
    .map(([domain, list]) => ({
      domain,
      items: [...list].sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.domain.localeCompare(b.domain))
}

export function EmailParser() {
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('')
  const parsed = input.trim() ? parseEmails(input) : []
  const needle = filter.trim().toLowerCase()
  const filtered = needle
    ? parsed.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle),
      )
    : parsed
  const groups = groupByDomain(filtered)

  return (
    <>
      <div className="input-section">
        <label htmlFor="email-input">Paste Emails</label>
        <textarea
          id="email-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'John Smith <john@example.com>\n"Doe, Jane" <jane@example.com>\nbob@example.com'}
          spellCheck={false}
        />
      </div>

      {!input.trim() && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <p>Paste messy email text above to parse names and addresses</p>
        </div>
      )}

      {input.trim() && parsed.length > 0 && (
        <div className="input-section" style={{ marginTop: 0 }}>
          <label htmlFor="email-filter">
            Filter ({filtered.length} of {parsed.length})
          </label>
          <input
            id="email-filter"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or email"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-input, var(--bg))',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-strong, var(--text))',
              fontFamily: 'var(--mono)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      )}

      {input.trim() && parsed.length === 0 && (
        <div className="output-grid">
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent)' }}>Parsed Emails</h3>
              <span className="badge badge-blue">0 EMAILS</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text)' }}>No emails found</p>
            </div>
          </div>
        </div>
      )}

      {input.trim() && parsed.length > 0 && filtered.length === 0 && (
        <div className="output-grid">
          <div className="section-card">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent)' }}>No Matches</h3>
              <span className="badge badge-blue">0 EMAILS</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text)' }}>
                No emails match "{filter}"
              </p>
            </div>
          </div>
        </div>
      )}

      {input.trim() && filtered.length > 0 && (
        <div className="output-grid">
          {groups.map(({ domain, items }) => (
            <div className="section-card" key={domain}>
              <div className="card-header">
                <h3 style={{ color: 'var(--accent)' }}>@{domain || '(no domain)'}</h3>
                <span className="badge badge-blue">
                  {items.length} {items.length === 1 ? 'EMAIL' : 'EMAILS'}
                </span>
              </div>
              <div className="card-body">
                <table className="claim-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={`${p.email}-${i}`}>
                        <td className="claim-name">{p.name || <span style={{ opacity: 0.5 }}>—</span>}</td>
                        <td className="claim-value">{p.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
