import {
  CLASS_CONTEXT,
  CLASS_UNIVERSAL,
  TAG,
  bitStringBits,
  bitStringBytes,
  integerBitLength,
  isContext,
  isSequence,
  parseDer,
  parseInner,
  readIntegerBig,
  readIntegerSigned,
  readOid,
  readSmallInteger,
  readString,
  readTime,
  toHex,
  type Asn1Node,
} from './asn1'
import {
  ACCESS_METHODS,
  DN_ATTRIBUTES,
  DN_DESCRIPTIONS,
  EC_CURVES,
  EXTENSIONS,
  EXT_KEY_USAGES,
  KEY_ALGORITHMS,
  KEY_USAGE_BITS,
  POLICIES,
  SIGNATURE_ALGORITHMS,
  WEAK_SIGNATURE_ALGORITHMS,
  describeOid,
} from './oids'

export interface NameComponent {
  /** Short attribute name (CN, O, OU, ...) or the raw OID when unknown. */
  type: string
  oid: string
  value: string
  description: string | null
  /** True when this attribute shares an RDN with others (joined by '+'). */
  multiValued: boolean
}

export interface DistinguishedName {
  components: NameComponent[]
  /** Single-line form, in encoding order: "C=US, O=Example, CN=example.com". */
  text: string
}

export interface GeneralName {
  type: string
  value: string
}

export interface PublicKeyInfo {
  algorithm: string
  algorithmOid: string
  /** Key size in bits, when it can be determined. */
  bits: number | null
  curve: string | null
  /** RSA public exponent, decimal. */
  exponent: string | null
  /** RSA modulus, hex. */
  modulus: string | null
  /** Raw subjectPublicKey bits, hex. */
  keyHex: string
}

export interface CertExtension {
  oid: string
  name: string
  critical: boolean
  /** Human-readable value; one entry per logical line. */
  lines: string[]
}

export interface CertificateInfo {
  version: number
  serialNumberHex: string
  /** Two's-complement value, so a malformed negative serial shows as negative. */
  serialNumberDecimal: string
  /** RFC 5280 requires a positive serial; true means this one violates that. */
  serialNegative: boolean
  subject: DistinguishedName
  issuer: DistinguishedName
  notBefore: Date | null
  notAfter: Date | null
  signatureAlgorithm: string
  signatureAlgorithmOid: string
  signatureWeak: boolean
  signatureHex: string
  publicKey: PublicKeyInfo
  extensions: CertExtension[]
  subjectAltNames: GeneralName[]
  isCa: boolean
  pathLength: number | null
  keyUsage: string[]
  extKeyUsage: string[]
  /**
   * Issuer and subject names are identical. That makes the certificate
   * self-*issued*; proving it is self-*signed* needs a signature check against
   * its own key, which this tool does not do (a key-rollover certificate is
   * self-issued but signed by the previous key).
   */
  selfIssued: boolean
  fingerprintSha256: string
  fingerprintSha1: string
  /** SHA-256 of the SubjectPublicKeyInfo, base64 — the HPKP / pin-sha256 value. */
  spkiPinSha256: string
  /** Normalized PEM for this certificate. */
  pem: string
  derBytes: number
}

export type ValidityState = 'valid' | 'expired' | 'not-yet-valid' | 'unknown'

const STRING_TAGS = new Set<number>([
  TAG.UTF8_STRING,
  TAG.PRINTABLE_STRING,
  TAG.IA5_STRING,
  TAG.BMP_STRING,
  TAG.T61_STRING,
])

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g
const X509_ELEMENT = /<(?:[\w.-]+:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?X509Certificate>/gi

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const normalized = b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(normalized)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * base64 decode with a readable failure. `atob` throws a bare DOMException,
 * which is the last thing someone wants to see after pasting a certificate
 * that picked up a smart quote on its way through a chat client.
 */
function decodeBase64Block(b64: string, what: string): Uint8Array<ArrayBuffer> {
  try {
    return base64ToBytes(b64)
  } catch {
    throw new Error(
      `${what} is not valid base64. Check for truncated or mangled content — smart quotes, stray characters, or a partial copy are the usual causes.`,
    )
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/[\s:]/g, '')
  const bytes = new Uint8Array(new ArrayBuffer(clean.length / 2))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  return bytes
}

function toPem(der: Uint8Array): string {
  const b64 = bytesToBase64(der)
  const lines = b64.match(/.{1,64}/g) || []
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`
}

/**
 * Pull DER blobs out of whatever the user pasted:
 *  - one or more PEM blocks (with header/footer)
 *  - `<ds:X509Certificate>` elements copied from SAML metadata
 *  - bare base64 or base64url, header/footer omitted
 *  - hex, with or without colon separators
 */
function extractDer(input: string): Uint8Array<ArrayBuffer>[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const blocks: Uint8Array<ArrayBuffer>[] = []
  const unsupported: string[] = []

  PEM_BLOCK.lastIndex = 0
  for (let m = PEM_BLOCK.exec(trimmed); m; m = PEM_BLOCK.exec(trimmed)) {
    const label = m[1].trim()
    if (label === 'CERTIFICATE' || label === 'X509 CERTIFICATE' || label === 'TRUSTED CERTIFICATE') {
      const which = blocks.length === 0 ? 'The PEM block' : `PEM block ${blocks.length + 1}`
      blocks.push(decodeBase64Block(m[2], which))
    } else {
      unsupported.push(label)
    }
  }
  if (blocks.length > 0) return blocks
  if (unsupported.length > 0) {
    const label = unsupported[0]
    if (label.includes('PRIVATE KEY')) {
      throw new Error(
        `That is a "${label}" block, not a certificate. Never paste private keys into a debugging tool — this tab reads X.509 certificates only.`,
      )
    }
    throw new Error(
      `Found a "${label}" PEM block. This tab reads X.509 certificates (-----BEGIN CERTIFICATE-----).`,
    )
  }

  // SAML metadata / assertions: grab the base64 inside <X509Certificate> elements.
  X509_ELEMENT.lastIndex = 0
  for (let m = X509_ELEMENT.exec(trimmed); m; m = X509_ELEMENT.exec(trimmed)) {
    const which =
      blocks.length === 0
        ? 'The <X509Certificate> element'
        : `<X509Certificate> element ${blocks.length + 1}`
    blocks.push(decodeBase64Block(m[1], which))
  }
  if (blocks.length > 0) return blocks

  // Bare hex DER.
  const compact = trimmed.replace(/[\s:]/g, '')
  if (/^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 0 && compact.startsWith('30')) {
    return [hexToBytes(compact)]
  }

  // Bare base64, no header/footer.
  if (!/^[A-Za-z0-9+/_=-]+$/.test(compact)) {
    throw new Error(
      'Could not read the input. Paste a PEM certificate (with or without the BEGIN/END lines), base64 DER, or hex DER.',
    )
  }
  try {
    return [base64ToBytes(compact)]
  } catch {
    throw new Error('Input is not valid base64. Check for truncated or mangled content.')
  }
}

/**
 * Escape a DN value for the single-line form (RFC 4514). Without this,
 * `O=Example, Inc.` is indistinguishable from two separate attributes.
 */
function escapeDnValue(value: string): string {
  let escaped = value.replace(/([\\,+"<>;=])/g, '\\$1')
  if (escaped.startsWith('#') || escaped.startsWith(' ')) escaped = `\\${escaped}`
  if (escaped.endsWith(' ') && !escaped.endsWith('\\ ')) escaped = `${escaped.slice(0, -1)}\\ `
  return escaped.replace(/\0/g, '\\00')
}

function parseName(node: Asn1Node): DistinguishedName {
  const components: NameComponent[] = []
  const rdnTexts: string[] = []
  // Name ::= RDNSequence ::= SEQUENCE OF RelativeDistinguishedName,
  // and one RDN is a SET that may hold several attributes at once.
  for (const rdn of node.children) {
    const parts: string[] = []
    for (const attr of rdn.children) {
      if (attr.children.length < 2) continue
      const oid = readOid(attr.children[0])
      const valueNode = attr.children[1]
      const type = DN_ATTRIBUTES[oid] || oid
      const value =
        valueNode.tagClass === CLASS_UNIVERSAL && valueNode.tag !== TAG.OID
          ? readString(valueNode)
          : toHex(valueNode.content)
      const multiValued = rdn.children.length > 1
      components.push({
        type,
        oid,
        value,
        description: DN_DESCRIPTIONS[type] || null,
        multiValued,
      })
      parts.push(`${type}=${escapeDnValue(value)}`)
    }
    // Attributes inside one RDN join with '+', matching RFC 4514 and openssl.
    // Flattening them into the ',' list would make two structurally different
    // names compare equal in selfIssued and chainLinks.
    if (parts.length > 0) rdnTexts.push(parts.join(' + '))
  }
  return { components, text: rdnTexts.join(', ') }
}

function formatIp(bytes: Uint8Array): string {
  if (bytes.length === 4) return Array.from(bytes).join('.')
  if (bytes.length === 8) {
    // address/mask pair used in name constraints
    return `${Array.from(bytes.subarray(0, 4)).join('.')}/${Array.from(bytes.subarray(4)).join('.')}`
  }
  if (bytes.length === 16) {
    const groups: string[] = []
    for (let i = 0; i < 16; i += 2) {
      groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16))
    }
    return groups.join(':')
  }
  return toHex(bytes, ':')
}

const GENERAL_NAME_TYPES: Record<number, string> = {
  0: 'otherName',
  1: 'email',
  2: 'DNS',
  3: 'x400Address',
  4: 'DirName',
  5: 'ediPartyName',
  6: 'URI',
  7: 'IP',
  8: 'RegisteredID',
}

function parseGeneralName(node: Asn1Node): GeneralName {
  const type = GENERAL_NAME_TYPES[node.tag] || `[${node.tag}]`
  switch (node.tag) {
    case 1:
    case 2:
    case 6:
      return { type, value: readString(node) }
    case 7:
      return { type, value: formatIp(node.content) }
    case 8:
      return { type, value: readOid(node) }
    case 4: {
      // Explicitly tagged: the Name sits inside.
      const inner = node.children[0]
      return { type, value: inner ? parseName(inner).text : '' }
    }
    case 0: {
      const [oidNode, valueNode] = node.children
      const oid = oidNode ? readOid(oidNode) : '?'
      let value = ''
      if (valueNode) {
        const inner = valueNode.children[0]
        value = inner && inner.tagClass === CLASS_UNIVERSAL ? readString(inner) : toHex(valueNode.content)
      }
      return { type, value: `${describeOid(oid) || oid}: ${value}` }
    }
    default:
      return { type, value: toHex(node.content, ':') }
  }
}

function parseGeneralNames(nodes: Asn1Node[]): GeneralName[] {
  return nodes.filter((n) => n.tagClass === CLASS_CONTEXT).map(parseGeneralName)
}

function parsePublicKey(spki: Asn1Node): PublicKeyInfo {
  const algNode = spki.children[0]
  const keyNode = spki.children[1]
  const algorithmOid = algNode?.children[0] ? readOid(algNode.children[0]) : ''
  const algorithm = KEY_ALGORITHMS[algorithmOid] || algorithmOid || 'unknown'
  const keyBits = keyNode ? bitStringBytes(keyNode) : new Uint8Array(0)

  const info: PublicKeyInfo = {
    algorithm,
    algorithmOid,
    bits: null,
    curve: null,
    exponent: null,
    modulus: null,
    keyHex: toHex(keyBits, ':'),
  }

  if (algorithm === 'RSA' || algorithm === 'RSASSA-PSS') {
    try {
      // RSAPublicKey ::= SEQUENCE { modulus INTEGER, publicExponent INTEGER }
      const rsa = parseInner(keyBits)[0]
      const modulus = rsa.children[0]
      const exponent = rsa.children[1]
      info.bits = integerBitLength(modulus)
      info.modulus = toHex(modulus.content, ':')
      info.exponent = readIntegerBig(exponent).toString()
    } catch {
      // Leave the raw key on display if the inner structure is unreadable.
    }
  } else if (algorithm === 'EC') {
    const params = algNode?.children[1]
    if (params && params.tag === TAG.OID) {
      const curveOid = readOid(params)
      const curve = EC_CURVES[curveOid]
      info.curve = curve?.name || curveOid
      info.bits = curve?.bits ?? null
    } else {
      info.curve = 'explicit parameters'
    }
  } else if (algorithm === 'Ed25519' || algorithm === 'X25519') {
    info.bits = 256
  } else if (algorithm === 'Ed448') {
    info.bits = 456
  } else if (algorithm === 'DSA') {
    const params = algNode?.children[1]
    if (params && params.children[0]) info.bits = integerBitLength(params.children[0])
  }

  return info
}

function formatExtension(oid: string, valueBytes: Uint8Array): string[] {
  const parsed = (): Asn1Node => parseInner(valueBytes)[0]

  switch (oid) {
    case '2.5.29.17': // subjectAltName
    case '2.5.29.18': // issuerAltName
      return parseGeneralNames(parsed().children).map((n) => `${n.type}: ${n.value}`)

    case '2.5.29.19': {
      // BasicConstraints ::= SEQUENCE { cA BOOLEAN DEFAULT FALSE, pathLenConstraint INTEGER OPTIONAL }
      const seq = parsed()
      let ca = false
      let pathLen: number | null = null
      for (const child of seq.children) {
        if (child.tag === TAG.BOOLEAN) ca = child.content[0] !== 0
        if (child.tag === TAG.INTEGER) pathLen = readSmallInteger(child)
      }
      const lines = [`CA: ${ca ? 'TRUE' : 'FALSE'}`]
      if (pathLen !== null) lines.push(`Path length constraint: ${pathLen}`)
      return lines
    }

    case '2.5.29.15': {
      const bits = bitStringBits(parsed())
      const usages = KEY_USAGE_BITS.filter((_, i) => bits[i])
      return usages.length ? usages : ['(none set)']
    }

    case '2.5.29.37':
      return parsed().children.map((n) => {
        const usageOid = readOid(n)
        return EXT_KEY_USAGES[usageOid] || usageOid
      })

    case '2.5.29.14': // subjectKeyIdentifier: OCTET STRING inside the extension value
      return [toHex(parsed().content, ':')]

    case '2.5.29.35': {
      // AuthorityKeyIdentifier ::= SEQUENCE { [0] keyIdentifier, [1] authorityCertIssuer, [2] serial }
      const lines: string[] = []
      for (const child of parsed().children) {
        if (isContext(child, 0)) lines.push(`Key ID: ${toHex(child.content, ':')}`)
        else if (isContext(child, 1)) {
          for (const gn of parseGeneralNames(child.children)) {
            lines.push(`Issuer ${gn.type}: ${gn.value}`)
          }
        } else if (isContext(child, 2)) lines.push(`Issuer serial: ${toHex(child.content, ':')}`)
      }
      return lines.length ? lines : ['(empty)']
    }

    case '2.5.29.31':
    case '2.5.29.46': {
      // CRLDistributionPoints ::= SEQUENCE OF DistributionPoint
      const lines: string[] = []
      for (const dp of parsed().children) {
        for (const field of dp.children) {
          if (isContext(field, 0)) {
            // distributionPoint [0] -> fullName [0] -> GeneralNames
            for (const name of field.children) {
              if (isContext(name, 0)) {
                for (const gn of parseGeneralNames(name.children)) lines.push(gn.value)
              } else if (isContext(name, 1)) {
                lines.push(`Relative name: ${parseName(name).text}`)
              }
            }
          }
        }
      }
      return lines.length ? lines : ['(no distribution point URIs)']
    }

    case '1.3.6.1.5.5.7.1.1':
    case '1.3.6.1.5.5.7.1.11': {
      // AccessDescription ::= SEQUENCE { accessMethod OID, accessLocation GeneralName }
      return parsed().children.map((desc) => {
        const method = desc.children[0] ? readOid(desc.children[0]) : ''
        const location = desc.children[1] ? parseGeneralName(desc.children[1]) : null
        const label = ACCESS_METHODS[method] || method
        return `${label}: ${location ? location.value : ''}`
      })
    }

    case '2.5.29.32': {
      // certificatePolicies ::= SEQUENCE OF PolicyInformation
      const lines: string[] = []
      for (const policy of parsed().children) {
        const policyOid = policy.children[0] ? readOid(policy.children[0]) : ''
        lines.push(POLICIES[policyOid] ? `${POLICIES[policyOid]} (${policyOid})` : policyOid)
        const qualifiers = policy.children[1]
        if (qualifiers) {
          for (const qualifier of qualifiers.children) {
            const qOid = qualifier.children[0] ? readOid(qualifier.children[0]) : ''
            const qValue = qualifier.children[1]
            if (qOid === '1.3.6.1.5.5.7.2.1' && qValue) {
              lines.push(`  CPS: ${readString(qValue)}`)
            } else if (qOid === '1.3.6.1.5.5.7.2.2' && qValue) {
              const texts: string[] = []
              const collect = (n: Asn1Node) => {
                if (n.tagClass === CLASS_UNIVERSAL && n.children.length === 0 && n.tag !== TAG.INTEGER) {
                  texts.push(readString(n))
                }
                n.children.forEach(collect)
              }
              collect(qValue)
              if (texts.length) lines.push(`  User notice: ${texts.join(' ')}`)
            }
          }
        }
      }
      return lines
    }

    case '2.5.29.30': {
      // NameConstraints ::= SEQUENCE { [0] permittedSubtrees, [1] excludedSubtrees }
      const lines: string[] = []
      for (const field of parsed().children) {
        const label = isContext(field, 0) ? 'Permitted' : 'Excluded'
        for (const subtree of field.children) {
          const base = subtree.children[0]
          if (base) {
            const gn = parseGeneralName(base)
            lines.push(`${label}: ${gn.type}: ${gn.value}`)
          }
        }
      }
      return lines.length ? lines : ['(empty)']
    }

    case '1.3.6.1.5.5.7.1.24': {
      const features = parsed().children.map((n) => readSmallInteger(n))
      return features.map((f) => (f === 5 ? 'status_request (OCSP Must-Staple)' : `feature ${f}`))
    }

    case '1.3.6.1.4.1.11129.2.4.2':
      return [`${valueBytes.length} bytes of embedded Certificate Transparency SCTs`]

    case '1.3.6.1.4.1.11129.2.4.3':
      return ['Precertificate poison — this is a CT precertificate, not a usable certificate']

    case '1.3.6.1.5.5.7.48.1.5':
      return ['Present — clients need not check revocation for this OCSP responder certificate']

    case '2.16.840.1.113730.1.13':
      return [readString(parsed())]

    case '2.5.29.16': {
      const lines: string[] = []
      for (const field of parsed().children) {
        const time = readTime({ ...field, tag: TAG.GENERALIZED_TIME })
        const label = isContext(field, 0) ? 'Not before' : 'Not after'
        lines.push(`${label}: ${time ? time.toISOString() : toHex(field.content)}`)
      }
      return lines
    }

    default: {
      // Unknown extension: show a readable value when the payload is a plain
      // string or OID, otherwise fall back to hex.
      try {
        const node = parsed()
        if (node.tagClass === CLASS_UNIVERSAL && STRING_TAGS.has(node.tag)) {
          return [readString(node)]
        }
        if (node.tag === TAG.OID && node.tagClass === CLASS_UNIVERSAL) {
          const value = readOid(node)
          return [describeOid(value) ? `${describeOid(value)} (${value})` : value]
        }
        if (node.tag === TAG.BOOLEAN && node.tagClass === CLASS_UNIVERSAL) {
          return [node.content[0] !== 0 ? 'TRUE' : 'FALSE']
        }
        if (node.tag === TAG.NULL && node.tagClass === CLASS_UNIVERSAL) {
          // An extension whose presence is the whole message.
          return ['Present (no value)']
        }
      } catch {
        // fall through to hex
      }
      const hex = toHex(valueBytes, ':')
      return [hex.length > 600 ? `${hex.slice(0, 600)}… (${valueBytes.length} bytes)` : hex]
    }
  }
}

function parseExtensions(extsNode: Asn1Node): CertExtension[] {
  const extensions: CertExtension[] = []
  for (const ext of extsNode.children) {
    const oidNode = ext.children[0]
    if (!oidNode) continue
    const oid = readOid(oidNode)
    let critical = false
    let valueNode: Asn1Node | undefined
    for (const child of ext.children.slice(1)) {
      if (child.tag === TAG.BOOLEAN && child.tagClass === CLASS_UNIVERSAL) {
        critical = child.content[0] !== 0
      } else if (child.tag === TAG.OCTET_STRING && child.tagClass === CLASS_UNIVERSAL) {
        valueNode = child
      }
    }
    let lines: string[]
    try {
      lines = valueNode ? formatExtension(oid, valueNode.content) : ['(no value)']
    } catch (e) {
      lines = [`Could not parse extension value: ${e instanceof Error ? e.message : 'error'}`]
    }
    extensions.push({ oid, name: EXTENSIONS[oid] || oid, critical, lines })
  }
  return extensions
}

async function digestHex(algorithm: 'SHA-1' | 'SHA-256', data: Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = await crypto.subtle.digest(algorithm, data)
  return toHex(new Uint8Array(hash), ':').toUpperCase()
}

async function parseOne(der: Uint8Array<ArrayBuffer>): Promise<CertificateInfo> {
  if (der.length === 0) throw new Error('Empty input — no certificate data to read.')
  if (der[0] !== 0x30) {
    throw new Error(
      'This is not DER-encoded certificate data: it should begin with an ASN.1 SEQUENCE (byte 0x30). Check that the whole certificate was copied.',
    )
  }
  const root = parseDer(der)
  if (!isSequence(root) || root.children.length < 3) {
    throw new Error('Not an X.509 certificate: expected a SEQUENCE of tbsCertificate, algorithm and signature')
  }
  const [tbs, sigAlgNode, sigValueNode] = root.children
  if (!isSequence(tbs)) throw new Error('Malformed certificate: tbsCertificate is not a SEQUENCE')

  const fields = tbs.children
  let i = 0
  let version = 1
  if (fields[0] && isContext(fields[0], 0)) {
    version = (fields[0].children[0] ? readSmallInteger(fields[0].children[0]) : 0) + 1
    i = 1
  }
  const serialNode = fields[i++]
  i++ // inner signature algorithm — duplicates the outer one
  const issuerNode = fields[i++]
  const validityNode = fields[i++]
  const subjectNode = fields[i++]
  const spkiNode = fields[i++]

  if (!serialNode || !issuerNode || !validityNode || !subjectNode || !spkiNode) {
    throw new Error('Malformed certificate: tbsCertificate is missing required fields')
  }

  const serial = readIntegerSigned(serialNode)
  const serialHex = toHex(serialNode.content, ':').toUpperCase()

  const issuer = parseName(issuerNode)
  const subject = parseName(subjectNode)
  const notBefore = validityNode.children[0] ? readTime(validityNode.children[0]) : null
  const notAfter = validityNode.children[1] ? readTime(validityNode.children[1]) : null

  const publicKey = parsePublicKey(spkiNode)

  let extensions: CertExtension[] = []
  for (const field of fields.slice(i)) {
    if (isContext(field, 3) && field.children[0]) {
      extensions = parseExtensions(field.children[0])
    }
  }

  const signatureAlgorithmOid = sigAlgNode.children[0] ? readOid(sigAlgNode.children[0]) : ''
  const basicConstraints = extensions.find((e) => e.oid === '2.5.29.19')
  const isCa = basicConstraints?.lines.some((l) => l === 'CA: TRUE') ?? false
  const pathLenLine = basicConstraints?.lines.find((l) => l.startsWith('Path length constraint:'))
  const pathLength = pathLenLine ? Number(pathLenLine.split(':')[1].trim()) : null

  const san = extensions.find((e) => e.oid === '2.5.29.17')
  const subjectAltNames: GeneralName[] = (san?.lines || []).map((line) => {
    const idx = line.indexOf(': ')
    return idx === -1
      ? { type: 'name', value: line }
      : { type: line.slice(0, idx), value: line.slice(idx + 2) }
  })

  const spkiDer = der.slice(spkiNode.start, spkiNode.end)
  const spkiHash = await crypto.subtle.digest('SHA-256', spkiDer)

  return {
    version,
    serialNumberHex: serialHex,
    serialNumberDecimal: serial.toString(),
    serialNegative: serial < 0n,
    subject,
    issuer,
    notBefore,
    notAfter,
    signatureAlgorithm: SIGNATURE_ALGORITHMS[signatureAlgorithmOid] || signatureAlgorithmOid || 'unknown',
    signatureAlgorithmOid,
    signatureWeak: WEAK_SIGNATURE_ALGORITHMS.has(signatureAlgorithmOid),
    signatureHex: toHex(bitStringBytes(sigValueNode), ':'),
    publicKey,
    extensions,
    subjectAltNames,
    isCa,
    pathLength,
    keyUsage: extensions.find((e) => e.oid === '2.5.29.15')?.lines ?? [],
    extKeyUsage: extensions.find((e) => e.oid === '2.5.29.37')?.lines ?? [],
    selfIssued: issuer.text === subject.text && issuer.text !== '',
    fingerprintSha256: await digestHex('SHA-256', der),
    fingerprintSha1: await digestHex('SHA-1', der),
    spkiPinSha256: bytesToBase64(new Uint8Array(spkiHash)),
    pem: toPem(der),
    derBytes: der.length,
  }
}

/**
 * Parse every certificate in the pasted text. Multiple PEM blocks (a chain)
 * are all returned, in the order they appear.
 */
export async function parseCertificates(input: string): Promise<CertificateInfo[]> {
  const blocks = extractDer(input)
  if (blocks.length === 0) throw new Error('No certificate found in the input.')

  const certs: CertificateInfo[] = []
  for (let index = 0; index < blocks.length; index++) {
    try {
      certs.push(await parseOne(blocks[index]))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      throw new Error(
        blocks.length > 1 ? `Certificate ${index + 1} of ${blocks.length}: ${message}` : message,
      )
    }
  }
  return certs
}

export function validityState(cert: CertificateInfo, now = new Date()): ValidityState {
  if (!cert.notBefore || !cert.notAfter) return 'unknown'
  if (now < cert.notBefore) return 'not-yet-valid'
  if (now > cert.notAfter) return 'expired'
  return 'valid'
}

/** Whole days between `now` and the expiry date; negative once expired. */
export function daysUntil(date: Date, now = new Date()): number {
  return Math.round((date.getTime() - now.getTime()) / 86_400_000)
}

export function formatDate(date: Date | null): string {
  if (!date) return 'unparseable'
  return `${date.toISOString().replace('.000Z', 'Z')} (${date.toUTCString()})`
}

/** Duration between two dates, in the largest sensible unit. */
export function formatDuration(from: Date, to: Date): string {
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  if (Math.abs(days) < 90) return `${days} days`
  const years = days / 365.25
  if (Math.abs(days) < 730) return `${days} days (~${(days / 30.44).toFixed(1)} months)`
  return `${days} days (~${years.toFixed(1)} years)`
}

/** True when `hostname` matches any SAN dNSName (wildcards included). */
export function matchesHostname(cert: CertificateInfo, hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '')
  if (!host) return false
  const names = cert.subjectAltNames.filter((n) => n.type === 'DNS').map((n) => n.value.toLowerCase())
  if (names.length === 0) {
    // Fall back to the subject CN when there is no SAN (legacy certificates).
    const cn = cert.subject.components.find((c) => c.type === 'CN')?.value.toLowerCase()
    if (cn) names.push(cn)
  }
  return names.some((name) => {
    if (name === host) return true
    if (!name.startsWith('*.')) return false
    // A wildcard matches exactly one label.
    const suffix = name.slice(1) // ".example.com"
    if (!host.endsWith(suffix)) return false
    const prefix = host.slice(0, host.length - suffix.length)
    return prefix.length > 0 && !prefix.includes('.')
  })
}

/** Chain sanity: does each certificate's issuer match the next one's subject? */
export function chainLinks(certs: CertificateInfo[]): boolean[] {
  const links: boolean[] = []
  for (let i = 0; i < certs.length - 1; i++) {
    links.push(certs[i].issuer.text === certs[i + 1].subject.text)
  }
  return links
}
