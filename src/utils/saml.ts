export interface SamlInfo {
  issuer: string | null
  nameId: string | null
  nameIdFormat: string | null
  destination: string | null
  inResponseTo: string | null
  issueInstant: string | null
  notBefore: string | null
  notOnOrAfter: string | null
  audience: string | null
  authnContextClassRef: string | null
  sessionIndex: string | null
  statusCode: string | null
  signatureMethod: string | null
  digestMethod: string | null
  attributes: Array<{ name: string; friendlyName: string | null; values: string[] }>
  conditions: string | null
  rawXml: string
}

const SAML_STATUS_CODES: Record<string, string> = {
  'urn:oasis:names:tc:SAML:2.0:status:Success': 'Success - the request succeeded',
  'urn:oasis:names:tc:SAML:2.0:status:Requester': 'Requester error - the request could not be performed due to an error on the part of the requester',
  'urn:oasis:names:tc:SAML:2.0:status:Responder': 'Responder error - the request could not be performed due to an error on the part of the SAML responder',
  'urn:oasis:names:tc:SAML:2.0:status:VersionMismatch': 'Version Mismatch - the SAML version of the request was incorrect',
}

const SAML_NAME_ID_FORMATS: Record<string, string> = {
  'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress': 'Email Address',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified': 'Unspecified',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent': 'Persistent Identifier',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:transient': 'Transient Identifier',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName': 'X.509 Subject Name',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:WindowsDomainQualifiedName': 'Windows Domain Qualified Name',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:kerberos': 'Kerberos Principal Name',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:entity': 'Entity Identifier',
}

const AUTHN_CONTEXT_CLASSES: Record<string, string> = {
  'urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified': 'Unspecified',
  'urn:oasis:names:tc:SAML:2.0:ac:classes:Password': 'Password',
  'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport': 'Password over Protected Transport (HTTPS)',
  'urn:oasis:names:tc:SAML:2.0:ac:classes:X509': 'X.509 Certificate',
  'urn:oasis:names:tc:SAML:2.0:ac:classes:Kerberos': 'Kerberos',
  'urn:oasis:names:tc:SAML:2.0:ac:classes:TLSClient': 'TLS Client Certificate',
  'urn:federation:authentication:windows': 'Windows Integrated Authentication',
}

function getTextContent(element: Element | null): string | null {
  return element?.textContent?.trim() || null
}

function getAttr(element: Element | null, attr: string): string | null {
  return element?.getAttribute(attr) || null
}

function findElement(doc: Document, localName: string): Element | null {
  // Try common SAML namespaces
  const namespaces = [
    'urn:oasis:names:tc:SAML:2.0:assertion',
    'urn:oasis:names:tc:SAML:2.0:protocol',
  ]
  for (const ns of namespaces) {
    const el = doc.getElementsByTagNameNS(ns, localName)[0]
    if (el) return el
  }
  // Fallback: find by local name
  const all = doc.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) return all[i]
  }
  return null
}

function findAllElements(doc: Document, localName: string): Element[] {
  const results: Element[] = []
  const namespaces = [
    'urn:oasis:names:tc:SAML:2.0:assertion',
    'urn:oasis:names:tc:SAML:2.0:protocol',
  ]
  for (const ns of namespaces) {
    const els = doc.getElementsByTagNameNS(ns, localName)
    for (let i = 0; i < els.length; i++) results.push(els[i])
  }
  if (results.length === 0) {
    const all = doc.getElementsByTagName('*')
    for (let i = 0; i < all.length; i++) {
      if (all[i].localName === localName) results.push(all[i])
    }
  }
  return results
}

function looksLikeXml(s: string): boolean {
  // Must *start* with a tag. Checking for stray '<'/'>' anywhere is unsafe:
  // raw DEFLATE-compressed bytes decoded as text often contain those bytes,
  // which would make us treat compressed binary as XML and skip inflation.
  return s.trimStart().startsWith('<')
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesToText(bytes: Uint8Array<ArrayBuffer>): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

// Inflate raw DEFLATE bytes (HTTP-Redirect binding) using the browser's
// native DecompressionStream. SAML uses raw DEFLATE (no zlib/gzip header).
async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new TextDecoder('utf-8').decode(buf)
}

// Resolve the SAML payload to XML, handling three encodings:
//  1. raw XML
//  2. base64 (HTTP-POST binding)
//  3. base64 + raw DEFLATE (HTTP-Redirect binding, e.g. ?SAMLRequest=)
// Input may also be URL-encoded around any of the above.
async function decodeToXml(input: string): Promise<string> {
  const trimmed = input.trim()

  if (trimmed.startsWith('<')) {
    return trimmed
  }

  // The payload may still be percent-encoded (e.g. copied straight from a URL).
  let b64 = trimmed
  if (/%[0-9a-fA-F]{2}/.test(b64)) {
    try {
      b64 = decodeURIComponent(b64).trim()
    } catch {
      // fall back to the raw string
    }
  }
  if (b64.startsWith('<')) {
    return b64
  }

  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = base64ToBytes(b64)
  } catch {
    throw new Error(
      'Could not decode input. Paste raw XML, a base64-encoded SAML response (POST binding), or a base64 + DEFLATE SAMLRequest (Redirect binding).',
    )
  }

  // POST binding: base64 decodes straight to XML.
  const asText = bytesToText(bytes)
  if (looksLikeXml(asText)) {
    return asText
  }

  // Redirect binding: the bytes are raw DEFLATE-compressed XML.
  try {
    const inflated = await inflateRaw(bytes)
    if (looksLikeXml(inflated)) {
      return inflated
    }
  } catch {
    // fall through to the error below
  }

  throw new Error(
    'Decoded content is neither XML nor DEFLATE-compressed SAML. Check that you pasted the full SAMLRequest/SAMLResponse value.',
  )
}

export async function decodeSaml(input: string): Promise<SamlInfo> {
  const xml = await decodeToXml(input)

  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')

  const parseError = doc.getElementsByTagName('parsererror')[0]
  if (parseError) {
    throw new Error('Invalid XML: ' + (parseError.textContent || 'parse error'))
  }

  // Extract info
  const issuer = getTextContent(findElement(doc, 'Issuer'))
  const nameId = getTextContent(findElement(doc, 'NameID'))
  const nameIdEl = findElement(doc, 'NameID')
  const nameIdFormat = getAttr(nameIdEl, 'Format')

  const response = doc.documentElement
  const destination = getAttr(response, 'Destination')
  const inResponseTo = getAttr(response, 'InResponseTo')
  const issueInstant = getAttr(response, 'IssueInstant')

  const conditions = findElement(doc, 'Conditions')
  const notBefore = getAttr(conditions, 'NotBefore')
  const notOnOrAfter = getAttr(conditions, 'NotOnOrAfter')

  const audienceEl = findElement(doc, 'Audience')
  const audience = getTextContent(audienceEl)

  const authnContext = findElement(doc, 'AuthnContextClassRef')
  const authnContextClassRef = getTextContent(authnContext)

  const authnStatement = findElement(doc, 'AuthnStatement')
  const sessionIndex = getAttr(authnStatement, 'SessionIndex')

  const statusCode = findElement(doc, 'StatusCode')
  const statusCodeValue = getAttr(statusCode, 'Value')

  const signatureMethod = findElement(doc, 'SignatureMethod')
  const signatureMethodAlg = getAttr(signatureMethod, 'Algorithm')

  const digestMethod = findElement(doc, 'DigestMethod')
  const digestMethodAlg = getAttr(digestMethod, 'Algorithm')

  // Extract attributes
  const attributes: SamlInfo['attributes'] = []
  const attrStatements = findAllElements(doc, 'Attribute')
  for (const attr of attrStatements) {
    const name = attr.getAttribute('Name') || 'unknown'
    const friendlyName = attr.getAttribute('FriendlyName') || null
    const values: string[] = []
    const valueEls = attr.getElementsByTagName('*')
    for (let i = 0; i < valueEls.length; i++) {
      if (valueEls[i].localName === 'AttributeValue') {
        values.push(valueEls[i].textContent?.trim() || '')
      }
    }
    attributes.push({ name, friendlyName, values })
  }

  // Pretty-print the XML
  const rawXml = formatXml(xml)

  return {
    issuer,
    nameId,
    nameIdFormat,
    destination,
    inResponseTo,
    issueInstant,
    notBefore,
    notOnOrAfter,
    audience,
    authnContextClassRef,
    sessionIndex,
    statusCode: statusCodeValue,
    signatureMethod: signatureMethodAlg,
    digestMethod: digestMethodAlg,
    attributes,
    conditions: conditions ? `NotBefore: ${notBefore || 'N/A'}, NotOnOrAfter: ${notOnOrAfter || 'N/A'}` : null,
    rawXml,
  }
}

function formatXml(xml: string): string {
  let formatted = ''
  let indent = 0
  const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/g)
  for (const part of parts) {
    if (!part.trim()) continue
    if (part.startsWith('</')) {
      indent--
      formatted += '  '.repeat(Math.max(0, indent)) + part + '\n'
    } else if (part.startsWith('<') && part.endsWith('/>')) {
      formatted += '  '.repeat(indent) + part + '\n'
    } else if (part.startsWith('<?')) {
      formatted += part + '\n'
    } else if (part.startsWith('<')) {
      formatted += '  '.repeat(indent) + part + '\n'
      indent++
    } else {
      // text node
      formatted += '  '.repeat(indent) + part + '\n'
    }
  }
  return formatted.trim()
}

export function getStatusDescription(status: string | null): string | null {
  if (!status) return null
  return SAML_STATUS_CODES[status] || null
}

export function getNameIdFormatDescription(format: string | null): string | null {
  if (!format) return null
  return SAML_NAME_ID_FORMATS[format] || null
}

export function getAuthnContextDescription(ctx: string | null): string | null {
  if (!ctx) return null
  return AUTHN_CONTEXT_CLASSES[ctx] || null
}
