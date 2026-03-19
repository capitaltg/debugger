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

export function decodeSaml(input: string): SamlInfo {
  let xml: string
  const trimmed = input.trim()

  if (trimmed.startsWith('<')) {
    xml = trimmed
  } else {
    // Try base64 decode
    try {
      xml = atob(trimmed)
    } catch {
      // Try URL-decode then base64
      try {
        xml = atob(decodeURIComponent(trimmed))
      } catch {
        throw new Error('Could not decode input. Paste raw XML or a base64-encoded SAML response.')
      }
    }
  }

  if (!xml.includes('<') || !xml.includes('>')) {
    throw new Error('Decoded content does not appear to be XML.')
  }

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
