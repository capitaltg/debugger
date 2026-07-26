import { useMemo, useState } from 'react'
import { parseXml } from '../utils/xml'

const INDENT_PX = 16

function elementChildren(el: Element): Element[] {
  const out: Element[] = []
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i]
    if (n.nodeType === Node.ELEMENT_NODE) out.push(n as Element)
  }
  return out
}

// Text directly under this element (ignores whitespace-only formatting text).
function ownText(el: Element): string {
  let text = ''
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i]
    if (n.nodeType === Node.TEXT_NODE) text += n.nodeValue || ''
  }
  return text.trim()
}

function Attrs({ el }: { el: Element }) {
  const attrs = []
  for (let i = 0; i < el.attributes.length; i++) attrs.push(el.attributes[i])
  return (
    <>
      {attrs.map((a, i) => (
        <span key={i}>
          {' '}
          <span className="xml-attr-name">{a.name}</span>
          <span className="xml-punct">=</span>
          <span className="xml-attr-value">"{a.value}"</span>
        </span>
      ))}
    </>
  )
}

function OpenTag({ el, selfClose }: { el: Element; selfClose?: boolean }) {
  return (
    <span>
      <span className="xml-punct">&lt;</span>
      <span className="xml-tag-name">{el.nodeName}</span>
      <Attrs el={el} />
      <span className="xml-punct">{selfClose ? '/>' : '>'}</span>
    </span>
  )
}

function CloseTag({ name }: { name: string }) {
  return (
    <span>
      <span className="xml-punct">&lt;/</span>
      <span className="xml-tag-name">{name}</span>
      <span className="xml-punct">&gt;</span>
    </span>
  )
}

function XmlNode({
  node,
  depth,
  expandAll,
}: {
  node: Element
  depth: number
  expandAll: boolean
}) {
  const [open, setOpen] = useState(expandAll)
  const children = elementChildren(node)
  const text = ownText(node)
  const indent = { paddingLeft: depth * INDENT_PX }

  // Leaf: no element children. Render on a single line.
  if (children.length === 0) {
    return (
      <div className="xml-line" style={indent}>
        <span className="xml-toggle-spacer" />
        {text ? (
          <>
            <OpenTag el={node} />
            <span className="xml-text">{text}</span>
            <CloseTag name={node.nodeName} />
          </>
        ) : (
          <OpenTag el={node} selfClose />
        )}
      </div>
    )
  }

  // Branch: collapsible.
  return (
    <div>
      <div
        className="xml-line xml-foldable"
        style={indent}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="xml-toggle">{open ? '▾' : '▸'}</span>
        <OpenTag el={node} />
        {!open && (
          <>
            <span className="xml-ellipsis">…</span>
            <CloseTag name={node.nodeName} />
          </>
        )}
      </div>
      {open && (
        <>
          {children.map((child, i) => (
            <XmlNode key={i} node={child} depth={depth + 1} expandAll={expandAll} />
          ))}
          <div className="xml-line" style={indent}>
            <span className="xml-toggle-spacer" />
            <CloseTag name={node.nodeName} />
          </div>
        </>
      )}
    </div>
  )
}

export function XmlTree({ xml, expandAll = true }: { xml: string; expandAll?: boolean }) {
  const { root } = useMemo(() => parseXml(xml), [xml])

  if (!root) {
    // Fall back to plain text if the pretty-printed XML won't re-parse.
    return <div className="json-display">{xml}</div>
  }

  return (
    <div className="xml-tree">
      <XmlNode node={root} depth={0} expandAll={expandAll} />
    </div>
  )
}
