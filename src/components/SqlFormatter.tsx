import { useState } from 'react'

type TokenType = 'comment' | 'string' | 'punct' | 'operator' | 'word'

interface Token {
  type: TokenType
  value: string
}

const TOP_LEVEL = [
  'select', 'from', 'where', 'group by', 'order by', 'having',
  'limit', 'offset', 'union all', 'union', 'except', 'intersect',
  'insert into', 'values', 'update', 'set', 'delete from',
  'create table', 'with', 'returning', 'into',
]

const JOINS = [
  'left outer join', 'right outer join', 'full outer join',
  'inner join', 'left join', 'right join', 'full join',
  'cross join', 'join',
]

const NEWLINE_AND_OR = ['and', 'or']

const KEYWORDS = new Set([
  'select', 'from', 'where', 'group', 'by', 'order', 'having', 'limit',
  'offset', 'union', 'all', 'except', 'intersect', 'insert', 'into',
  'values', 'update', 'set', 'delete', 'create', 'table', 'with',
  'returning', 'join', 'left', 'right', 'full', 'inner', 'outer', 'cross',
  'on', 'and', 'or', 'not', 'in', 'is', 'null', 'as', 'distinct', 'between',
  'like', 'ilike', 'exists', 'case', 'when', 'then', 'else', 'end', 'asc',
  'desc', 'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'cast', 'using',
  'primary', 'key', 'foreign', 'references', 'default', 'unique', 'index',
  'true', 'false', 'over', 'partition',
])

function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = sql.length
  while (i < n) {
    const c = sql[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    // line comment
    if (c === '-' && sql[i + 1] === '-') {
      let j = i
      while (j < n && sql[j] !== '\n') j++
      tokens.push({ type: 'comment', value: sql.slice(i, j) })
      i = j
      continue
    }
    // block comment
    if (c === '/' && sql[i + 1] === '*') {
      let j = i + 2
      while (j < n && !(sql[j] === '*' && sql[j + 1] === '/')) j++
      j = Math.min(j + 2, n)
      tokens.push({ type: 'comment', value: sql.slice(i, j) })
      i = j
      continue
    }
    // string literal (handles doubled-quote escapes)
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < n) {
        if (sql[j] === c && sql[j + 1] === c) {
          j += 2
          continue
        }
        if (sql[j] === c) {
          j++
          break
        }
        j++
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) })
      i = j
      continue
    }
    // punctuation
    if ('(),;'.includes(c)) {
      tokens.push({ type: 'punct', value: c })
      i++
      continue
    }
    // operators
    if ('=<>!+-*/%|&'.includes(c)) {
      let j = i
      while (j < n && '=<>!+-*/%|&'.includes(sql[j])) j++
      tokens.push({ type: 'operator', value: sql.slice(i, j) })
      i = j
      continue
    }
    // word: identifier / keyword / number
    let j = i
    while (j < n && /[A-Za-z0-9_.$@#]/.test(sql[j])) j++
    if (j === i) {
      tokens.push({ type: 'operator', value: c })
      i++
      continue
    }
    tokens.push({ type: 'word', value: sql.slice(i, j) })
    i = j
  }
  return tokens
}

function isWord(tok: Token | undefined): tok is Token {
  return !!tok && tok.type === 'word'
}

function matchPhrase(
  tokens: Token[],
  i: number,
  phraseList: string[],
): { phrase: string; length: number } | null {
  for (const phrase of phraseList) {
    const parts = phrase.split(' ')
    let ok = true
    for (let k = 0; k < parts.length; k++) {
      const tok = tokens[i + k]
      if (!isWord(tok) || tok.value.toLowerCase() !== parts[k]) {
        ok = false
        break
      }
    }
    if (ok) return { phrase, length: parts.length }
  }
  return null
}

function formatWord(value: string): string {
  return KEYWORDS.has(value.toLowerCase()) ? value.toUpperCase() : value
}

function formatSql(sql: string): string {
  // Normalize literal escape sequences (\n, \r, \t) that show up when SQL is
  // pasted from code or logs, so they collapse away like real whitespace.
  const tokens = tokenize(sql.replace(/\\[nrt]/g, ' '))
  let out = ''
  let indent = 1
  let parenDepth = 0
  let needSpace = false
  let atLineStart = true

  const pad = (lvl: number) => '  '.repeat(Math.max(0, lvl))

  function newline(lvl: number) {
    out = out.replace(/[ \t]+$/, '')
    out += '\n' + pad(lvl)
    needSpace = false
    atLineStart = true
  }

  function emit(text: string, space = true) {
    if (space && needSpace && !atLineStart) out += ' '
    out += text
    needSpace = true
    atLineStart = false
  }

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]

    if (tok.type === 'comment') {
      newline(indent)
      emit(tok.value, false)
      newline(indent)
      continue
    }

    if (tok.type === 'punct') {
      if (tok.value === '(') {
        emit('(', false)
        needSpace = false
        parenDepth++
        continue
      }
      if (tok.value === ')') {
        parenDepth = Math.max(0, parenDepth - 1)
        emit(')', false)
        continue
      }
      if (tok.value === ',') {
        emit(',', false)
        if (parenDepth === 0) newline(indent)
        continue
      }
      if (tok.value === ';') {
        emit(';', false)
        newline(1)
        indent = 1
        continue
      }
    }

    if (tok.type === 'word') {
      const top = parenDepth === 0 ? matchPhrase(tokens, i, TOP_LEVEL) : null
      if (top) {
        indent = 1
        newline(0)
        emit(top.phrase.split(' ').map((w) => w.toUpperCase()).join(' '), false)
        newline(indent)
        i += top.length - 1
        continue
      }
      const join = parenDepth === 0 ? matchPhrase(tokens, i, JOINS) : null
      if (join) {
        newline(0)
        emit(join.phrase.split(' ').map((w) => w.toUpperCase()).join(' '), false)
        i += join.length - 1
        indent = 1
        continue
      }
      if (parenDepth === 0 && NEWLINE_AND_OR.includes(tok.value.toLowerCase())) {
        newline(indent)
        emit(tok.value.toUpperCase())
        continue
      }
      emit(formatWord(tok.value))
      continue
    }

    emit(tok.value)
  }

  return out
    .replace(/^\n+/, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

export function SqlFormatter() {
  const [input, setInput] = useState('')
  const [formatted, setFormatted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleChange(value: string) {
    setInput(value)
    setCopied(false)
    if (!value.trim()) {
      setFormatted(null)
      return
    }
    setFormatted(formatSql(value))
  }

  async function handleCopy() {
    if (!formatted) return
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <div className="input-section">
        <label htmlFor="sql-input">Paste SQL</label>
        <textarea
          id="sql-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="select id, name from users where active = true order by name"
          spellCheck={false}
        />
      </div>

      {!formatted && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v6a9 3 0 0 0 18 0V5" />
            <path d="M3 11v6a9 3 0 0 0 18 0v-6" />
          </svg>
          <p>Paste SQL above to format it</p>
        </div>
      )}

      {formatted && (
        <div className="section-card">
          <div className="card-header">
            <h3 style={{ color: 'var(--accent)' }}>SQL</h3>
            <span className="badge badge-blue">FORMATTED</span>
            <button className="json-expand-toggle" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="card-body">
            <pre className="sql-output">{formatted}</pre>
          </div>
        </div>
      )}
    </>
  )
}
