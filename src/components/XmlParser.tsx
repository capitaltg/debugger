import { useState } from 'react'
import { XmlTree } from './XmlTree'
import { parseXml } from '../utils/xml'

export function XmlParser() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [rootName, setRootName] = useState<string | null>(null)
  const [expandAll, setExpandAll] = useState(true)
  const [treeKey, setTreeKey] = useState(0)

  function toggleExpandAll() {
    setExpandAll((prev) => !prev)
    setTreeKey((k) => k + 1)
  }

  function handleChange(value: string) {
    setInput(value)
    if (!value.trim()) {
      setError(null)
      setRootName(null)
      return
    }
    const { root, error: parseError } = parseXml(value)
    setError(parseError)
    setRootName(root ? root.nodeName : null)
  }

  return (
    <>
      <div className="input-section">
        <label htmlFor="xml-input">Paste XML</label>
        <textarea
          id="xml-input"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={'<config env="prod">\n  <timeout>30</timeout>\n</config>'}
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

      {!rootName && !error && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="m9 8-5 4 5 4" />
            <path d="m15 8 5 4-5 4" />
          </svg>
          <p>Paste XML above to explore it</p>
        </div>
      )}

      {rootName && (
        <div className="section-card">
          <div className="card-header">
            <h3 style={{ color: 'var(--accent)' }}>XML</h3>
            <span className="badge badge-blue">{rootName.toUpperCase()}</span>
            <button className="json-expand-toggle" onClick={toggleExpandAll}>
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="card-body">
            <XmlTree key={treeKey} xml={input} expandAll={expandAll} />
          </div>
        </div>
      )}
    </>
  )
}
