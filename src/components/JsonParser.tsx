import { useState } from 'react'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

interface JsonNodeProps {
  name: string | null
  value: JsonValue
  depth: number
  isLast: boolean
  expandAll: boolean
}

function valueType(value: JsonValue): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function JsonNode({ name, value, depth, isLast, expandAll }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(expandAll ? false : depth >= 2)
  const type = valueType(value)
  const isContainer = type === 'object' || type === 'array'

  const key =
    name !== null ? <span className="json-key">"{name}"</span> : null
  const colon = name !== null ? <span className="json-punct">: </span> : null
  const comma = !isLast ? <span className="json-punct">,</span> : null

  if (!isContainer) {
    let valueEl
    if (type === 'string') {
      valueEl = <span className="json-string">"{String(value)}"</span>
    } else if (type === 'number') {
      valueEl = <span className="json-number">{String(value)}</span>
    } else if (type === 'boolean') {
      valueEl = <span className="json-boolean">{String(value)}</span>
    } else {
      valueEl = <span className="json-null">null</span>
    }
    return (
      <div className="json-line" style={{ paddingLeft: depth * 16 }}>
        {key}
        {colon}
        {valueEl}
        {comma}
      </div>
    )
  }

  const entries: [string | null, JsonValue][] = Array.isArray(value)
    ? value.map((v) => [null, v] as [null, JsonValue])
    : Object.entries(value as { [key: string]: JsonValue })

  const open = type === 'array' ? '[' : '{'
  const close = type === 'array' ? ']' : '}'
  const count = entries.length

  return (
    <div className="json-node">
      <div
        className="json-line json-toggle"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="json-caret">{collapsed ? '▶' : '▼'}</span>
        {key}
        {colon}
        <span className="json-punct">{open}</span>
        {collapsed && (
          <>
            <span className="json-collapsed">
              {count} {count === 1 ? 'item' : 'items'}
            </span>
            <span className="json-punct">{close}</span>
            {comma}
          </>
        )}
      </div>
      {!collapsed && (
        <>
          {entries.map(([childName, childValue], i) => (
            <JsonNode
              key={i}
              name={childName}
              value={childValue}
              depth={depth + 1}
              isLast={i === entries.length - 1}
              expandAll={expandAll}
            />
          ))}
          <div className="json-line" style={{ paddingLeft: depth * 16 }}>
            <span className="json-punct">{close}</span>
            {comma}
          </div>
        </>
      )}
    </div>
  )
}

export function JsonParser() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState<JsonValue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasValue, setHasValue] = useState(false)
  const [expandAll, setExpandAll] = useState(true)
  const [treeKey, setTreeKey] = useState(0)

  function toggleExpandAll() {
    setExpandAll((prev) => !prev)
    setTreeKey((k) => k + 1)
  }

  function handleChange(value: string) {
    setInput(value)
    if (!value.trim()) {
      setParsed(null)
      setError(null)
      setHasValue(false)
      return
    }
    try {
      const result = JSON.parse(value) as JsonValue
      setParsed(result)
      setHasValue(true)
      setError(null)
    } catch (e) {
      setParsed(null)
      setHasValue(false)
      setError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const rootType = parsed !== null ? valueType(parsed) : null

  return (
    <>
      <div className="input-section">
        <label htmlFor="json-input">Paste JSON</label>
        <textarea
          id="json-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder='{"name": "example", "nested": {"items": [1, 2, 3]}}'
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

      {!hasValue && !error && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
          </svg>
          <p>Paste JSON above to explore it</p>
        </div>
      )}

      {hasValue && parsed !== null && (
        <div className="section-card">
          <div className="card-header">
            <h3 style={{ color: 'var(--accent)' }}>JSON</h3>
            <span className="badge badge-blue">{rootType?.toUpperCase()}</span>
            <button className="json-expand-toggle" onClick={toggleExpandAll}>
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="card-body">
            <div className="json-tree">
              <JsonNode
                key={treeKey}
                name={null}
                value={parsed}
                depth={0}
                isLast={true}
                expandAll={expandAll}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
