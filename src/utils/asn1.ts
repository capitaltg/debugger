// Minimal DER (ASN.1) reader — enough to walk an X.509 certificate.
// DER only: indefinite lengths (BER) are rejected, which is correct for
// certificates, CSRs and keys.

export const TAG = {
  BOOLEAN: 0x01,
  INTEGER: 0x02,
  BIT_STRING: 0x03,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  UTF8_STRING: 0x0c,
  SEQUENCE: 0x10,
  SET: 0x11,
  NUMERIC_STRING: 0x12,
  PRINTABLE_STRING: 0x13,
  T61_STRING: 0x14,
  IA5_STRING: 0x16,
  UTC_TIME: 0x17,
  GENERALIZED_TIME: 0x18,
  UNIVERSAL_STRING: 0x1c,
  BMP_STRING: 0x1e,
} as const

export const CLASS_UNIVERSAL = 0
export const CLASS_CONTEXT = 2

export interface Asn1Node {
  /** 0 = universal, 1 = application, 2 = context-specific, 3 = private */
  tagClass: number
  constructed: boolean
  /** Tag number, without class/constructed bits (e.g. 0x10 for SEQUENCE). */
  tag: number
  /** Offset of the tag byte within the buffer. */
  start: number
  /** Offset just past the last content byte. */
  end: number
  /** Content bytes (a view into the original buffer, header stripped). */
  content: Uint8Array
  /** Parsed children — populated for constructed nodes only. */
  children: Asn1Node[]
}

function readLength(buf: Uint8Array, pos: number): { length: number; next: number } {
  if (pos >= buf.length) throw new Error('Truncated ASN.1: missing length byte')
  const first = buf[pos]
  if (first < 0x80) return { length: first, next: pos + 1 }
  const count = first & 0x7f
  if (count === 0) throw new Error('Indefinite-length encoding is not valid DER')
  if (count > 4) throw new Error('Unsupported ASN.1 length (more than 4 bytes)')
  if (pos + 1 + count > buf.length) throw new Error('Truncated ASN.1 length')
  let length = 0
  for (let i = 0; i < count; i++) length = length * 256 + buf[pos + 1 + i]
  return { length, next: pos + 1 + count }
}

// `buf` is always the whole buffer, so start/end offsets stay absolute and a
// node can be sliced back out of the original DER (needed for SPKI hashing).
function parseNode(buf: Uint8Array, pos: number): Asn1Node {
  if (pos >= buf.length) throw new Error('Truncated ASN.1: missing tag byte')
  const first = buf[pos]
  const tagClass = first >> 6
  const constructed = (first & 0x20) !== 0
  let tag = first & 0x1f
  let p = pos + 1
  if (tag === 0x1f) {
    // High tag number form: base-128, continuation bit on all but the last byte.
    tag = 0
    for (;;) {
      if (p >= buf.length) throw new Error('Truncated ASN.1 tag')
      const b = buf[p++]
      tag = tag * 128 + (b & 0x7f)
      if ((b & 0x80) === 0) break
    }
  }
  const { length, next } = readLength(buf, p)
  const end = next + length
  if (end > buf.length) throw new Error('Truncated ASN.1 value: declared length exceeds data')

  const content = buf.subarray(next, end)
  const node: Asn1Node = { tagClass, constructed, tag, start: pos, end, content, children: [] }
  if (constructed) node.children = parseRange(buf, next, end)
  return node
}

function parseRange(buf: Uint8Array, from: number, to: number): Asn1Node[] {
  const nodes: Asn1Node[] = []
  let pos = from
  while (pos < to) {
    const node = parseNode(buf, pos)
    // parseNode only bounds against the whole buffer, so a child with an
    // overlong length would otherwise swallow bytes belonging to the parent's
    // next sibling and parse into a plausible-looking but wrong structure.
    if (node.end > to) {
      throw new Error(
        `Malformed ASN.1: a nested value overruns its parent by ${node.end - to} byte(s)`,
      )
    }
    nodes.push(node)
    pos = node.end
  }
  return nodes
}

/** Parse the first DER value in `buf`. Trailing bytes are rejected. */
export function parseDer(buf: Uint8Array): Asn1Node {
  const node = parseNode(buf, 0)
  if (node.end !== buf.length) {
    throw new Error(`Trailing data after DER value (${buf.length - node.end} extra byte(s))`)
  }
  return node
}

/**
 * Parse the content of a node that wraps another DER value (e.g. the OCTET
 * STRING holding an extension). Offsets in the result are relative to
 * `content`, not to the enclosing certificate.
 */
export function parseInner(content: Uint8Array): Asn1Node[] {
  return parseRange(content, 0, content.length)
}

export function isSequence(node: Asn1Node): boolean {
  return node.tagClass === CLASS_UNIVERSAL && node.tag === TAG.SEQUENCE
}

export function isContext(node: Asn1Node, tag: number): boolean {
  return node.tagClass === CLASS_CONTEXT && node.tag === tag
}

/** Content of a BIT STRING, with the leading "unused bits" byte removed. */
export function bitStringBytes(node: Asn1Node): Uint8Array {
  if (node.content.length === 0) return node.content
  return node.content.subarray(1)
}

/** Bit values of a BIT STRING, most-significant bit first. */
export function bitStringBits(node: Asn1Node): boolean[] {
  if (node.content.length === 0) return []
  const unused = node.content[0]
  const bytes = node.content.subarray(1)
  const total = bytes.length * 8 - (unused <= 7 ? unused : 0)
  const bits: boolean[] = []
  for (let i = 0; i < total; i++) {
    bits.push((bytes[i >> 3] & (0x80 >> (i & 7))) !== 0)
  }
  return bits
}

export function toHex(bytes: Uint8Array, separator = ''): string {
  const out: string[] = []
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i].toString(16).padStart(2, '0'))
  return out.join(separator)
}

/** Decode an OID's DER content to dotted-decimal form. */
export function oidToString(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  const parts: string[] = []
  let value = 0n
  let started = false
  let first = true
  for (let i = 0; i < bytes.length; i++) {
    value = value * 128n + BigInt(bytes[i] & 0x7f)
    started = true
    if ((bytes[i] & 0x80) === 0) {
      if (first) {
        // The first two arcs share one subidentifier, encoded as 40*arc1 + arc2.
        // It is a full base-128 value, so it can span several bytes: 0x88 0x37
        // is 1079, i.e. 2.999 — not 3.16.55.
        const arc1 = value < 40n ? 0n : value < 80n ? 1n : 2n
        parts.push(arc1.toString(), (value - arc1 * 40n).toString())
        first = false
      } else {
        parts.push(value.toString())
      }
      value = 0n
      started = false
    }
  }
  if (started) parts.push(`${value}(unterminated)`)
  return parts.join('.')
}

export function readOid(node: Asn1Node): string {
  return oidToString(node.content)
}

/**
 * INTEGER content read as an unsigned magnitude. Correct for values that are
 * positive by construction (an RSA modulus or exponent); use
 * `readIntegerSigned` for anything that could legitimately be negative.
 */
export function readIntegerBig(node: Asn1Node): bigint {
  let value = 0n
  for (const byte of node.content) value = (value << 8n) | BigInt(byte)
  return value
}

/**
 * INTEGER content read as two's-complement, which is what DER actually
 * encodes. RFC 5280 requires positive serial numbers, so a negative result is
 * a real anomaly worth showing rather than silently normalizing away.
 */
export function readIntegerSigned(node: Asn1Node): bigint {
  if (node.content.length === 0) return 0n
  let value = readIntegerBig(node)
  if (node.content[0] & 0x80) value -= 1n << BigInt(node.content.length * 8)
  return value
}

export function readSmallInteger(node: Asn1Node): number {
  let value = 0
  for (const byte of node.content) value = value * 256 + byte
  return value
}

/** Number of significant bits in an unsigned INTEGER (leading 0x00 pad ignored). */
export function integerBitLength(node: Asn1Node): number {
  let i = 0
  while (i < node.content.length && node.content[i] === 0) i++
  if (i >= node.content.length) return 0
  const top = node.content[i]
  let topBits = 8
  for (let mask = 0x80; mask > 0 && (top & mask) === 0; mask >>= 1) topBits--
  return (node.content.length - i - 1) * 8 + topBits
}

const UTF8 = new TextDecoder('utf-8', { fatal: false })
const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true })
const UTF16BE = new TextDecoder('utf-16be', { fatal: false })
const LATIN1 = new TextDecoder('iso-8859-1', { fatal: false })

/** Decode a DER string node according to its tag. */
export function readString(node: Asn1Node): string {
  switch (node.tag) {
    case TAG.BMP_STRING:
      return UTF16BE.decode(node.content)
    case TAG.UNIVERSAL_STRING: {
      // UCS-4, big endian
      let out = ''
      for (let i = 0; i + 3 < node.content.length; i += 4) {
        const cp =
          (node.content[i] << 24) |
          (node.content[i + 1] << 16) |
          (node.content[i + 2] << 8) |
          node.content[i + 3]
        out += String.fromCodePoint(cp >>> 0)
      }
      return out
    }
    case TAG.T61_STRING:
      // TeletexString is nominally T.61, but issuers in practice put Latin-1
      // (and sometimes UTF-8) in it. Prefer a valid UTF-8 read, then fall back
      // to Latin-1 so accented characters survive instead of becoming U+FFFD.
      try {
        return UTF8_STRICT.decode(node.content)
      } catch {
        return LATIN1.decode(node.content)
      }
    default:
      // UTF8String, PrintableString, IA5String, NumericString, ...
      return UTF8.decode(node.content)
  }
}

/**
 * Decode UTCTime / GeneralizedTime. Returns null when the value is malformed
 * rather than throwing, so one bad date doesn't sink the whole certificate.
 */
export function readTime(node: Asn1Node): Date | null {
  const raw = UTF8.decode(node.content).trim()
  const generalized = node.tag === TAG.GENERALIZED_TIME
  // GeneralizedTime may stop after the hour (YYYYMMDDHH); UTCTime always
  // carries at least minutes.
  const pattern = generalized
    ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})?(\d{2})?(?:[.,]\d+)?(Z|[+-]\d{2}\d{2})?$/
    : /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(Z|[+-]\d{2}\d{2})?$/
  const m = pattern.exec(raw)
  if (!m) return null

  let year = Number(m[1])
  if (!generalized) {
    // RFC 5280: two-digit years >= 50 are 19xx, otherwise 20xx.
    year = year >= 50 ? 1900 + year : 2000 + year
  }
  const ms = Date.UTC(
    year,
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    m[5] ? Number(m[5]) : 0,
    m[6] ? Number(m[6]) : 0,
  )
  const zone = m[7]
  if (zone && zone !== 'Z') {
    const sign = zone[0] === '-' ? -1 : 1
    const offsetMinutes = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3, 5))
    return new Date(ms - sign * offsetMinutes * 60_000)
  }
  return new Date(ms)
}
