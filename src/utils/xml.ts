// Pull a readable message out of the browser's <parsererror> block. Chrome and
// Firefox both bury the useful "error on line N" line inside boilerplate.
function parseErrorMessage(el: Element): string {
  const text = (el.textContent || '')
    .replace(/\s+/g, ' ')
    // Firefox includes the page's own URL, which tells the user nothing.
    .replace(/\s*Location:\s*\S+/i, '')
    .trim()
  const detail = text.match(/error on line \d+ at column \d+:.*?(?=\s*Below is|$)/i)
  return detail ? detail[0].trim() : text || 'Invalid XML'
}

export function parseXml(xml: string): { root: Element | null; error: string | null } {
  if (!xml.trim()) return { root: null, error: null }
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const failure = doc.getElementsByTagName('parsererror')[0]
  if (failure) return { root: null, error: parseErrorMessage(failure) }
  return { root: doc.documentElement, error: null }
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;')
}

// Literal tabs and newlines in an attribute are normalized to spaces when
// parsed, so they have to be written as character references to survive.
function escapeAttr(s: string): string {
  return escapeText(s)
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;')
}

function attrsOf(el: Element): string {
  let attrs = ''
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i]
    attrs += ` ${a.name}="${escapeAttr(a.value)}"`
  }
  return attrs
}

function preservesSpace(el: Element): boolean {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const v = e.getAttribute('xml:space')
    if (v) return v === 'preserve'
  }
  return false
}

// Serialize a node exactly as-is, with no added or removed whitespace.
function serializeInline(node: Node): string {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const el = node as Element
      const inner = Array.from(el.childNodes).map(serializeInline).join('')
      return inner
        ? `<${el.nodeName}${attrsOf(el)}>${inner}</${el.nodeName}>`
        : `<${el.nodeName}${attrsOf(el)}/>`
    }
    case Node.TEXT_NODE:
      return escapeText(node.nodeValue || '')
    case Node.CDATA_SECTION_NODE:
      return `<![CDATA[${node.nodeValue || ''}]]>`
    case Node.COMMENT_NODE:
      return `<!--${node.nodeValue || ''}-->`
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const pi = node as ProcessingInstruction
      return `<?${pi.target} ${pi.data}?>`
    }
    default:
      return ''
  }
}

function formatNode(node: Node, depth: number, out: string[]): void {
  const pad = '  '.repeat(depth)
  if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
    out.push(new XMLSerializer().serializeToString(node))
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    const s = serializeInline(node)
    if (s.trim()) out.push(pad + s)
    return
  }
  const el = node as Element
  const kids = Array.from(el.childNodes)
  // Whitespace with a line break is the source's indentation. Anything else
  // (words, or a space between inline elements) is data.
  const hasText = kids.some(
    (n) =>
      n.nodeType === Node.CDATA_SECTION_NODE ||
      (n.nodeType === Node.TEXT_NODE &&
        ((n.nodeValue || '').trim() || !/[\r\n]/.test(n.nodeValue || ''))),
  )
  // Text content (including mixed content) is kept verbatim on one line, since
  // re-indenting it would change the data. Only element-only content is laid out.
  if (hasText || preservesSpace(el)) {
    out.push(pad + serializeInline(el))
    return
  }
  const elementKids = kids.filter((n) => n.nodeType !== Node.TEXT_NODE)
  if (elementKids.length === 0) {
    out.push(`${pad}<${el.nodeName}${attrsOf(el)}/>`)
    return
  }
  out.push(`${pad}<${el.nodeName}${attrsOf(el)}>`)
  for (const k of elementKids) formatNode(k, depth + 1, out)
  out.push(`${pad}</${el.nodeName}>`)
}

// Pretty-print a parsed XML document with 2-space indentation. The XML
// declaration isn't part of the DOM, so it's carried over from the source text.
export function formatXml(doc: Document, source: string): string {
  const out: string[] = []
  const decl = source.trimStart().match(/^<\?xml\s[^?]*\?>/)
  if (decl) out.push(decl[0])
  for (const n of Array.from(doc.childNodes)) formatNode(n, 0, out)
  return out.join('\n')
}
