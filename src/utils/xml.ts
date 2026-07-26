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
