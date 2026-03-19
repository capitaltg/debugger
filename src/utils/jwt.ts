export interface DecodedJwt {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

const KNOWN_CLAIMS: Record<string, string> = {
  iss: 'Issuer - identifies who issued the JWT',
  sub: 'Subject - identifies the principal (user) of the JWT',
  aud: 'Audience - identifies the intended recipients',
  exp: 'Expiration Time - time after which the JWT must not be accepted',
  nbf: 'Not Before - time before which the JWT must not be accepted',
  iat: 'Issued At - time at which the JWT was issued',
  jti: 'JWT ID - unique identifier for the JWT',
  name: 'Full name of the user',
  given_name: 'Given (first) name',
  family_name: 'Family (last) name',
  email: 'Email address',
  email_verified: 'Whether the email address has been verified',
  picture: 'URL of the user\'s profile picture',
  locale: 'User\'s locale (e.g., en-US)',
  nonce: 'Value used to associate a client session with an ID token',
  azp: 'Authorized Party - the party to which the ID token was issued',
  at_hash: 'Access Token hash value',
  c_hash: 'Authorization Code hash value',
  auth_time: 'Time when the end-user authentication occurred',
  acr: 'Authentication Context Class Reference',
  amr: 'Authentication Methods References',
  scope: 'OAuth 2.0 scopes granted',
  roles: 'Roles assigned to the user',
  groups: 'Groups the user belongs to',
  tid: 'Tenant ID (Azure AD)',
  oid: 'Object ID - unique identifier for the user (Azure AD)',
  upn: 'User Principal Name (Azure AD)',
  appid: 'Application ID (Azure AD)',
  scp: 'Scopes (Azure AD)',
  ver: 'Token version',
}

const KNOWN_ALGORITHMS: Record<string, string> = {
  HS256: 'HMAC using SHA-256',
  HS384: 'HMAC using SHA-384',
  HS512: 'HMAC using SHA-512',
  RS256: 'RSA PKCS#1 Signature with SHA-256',
  RS384: 'RSA PKCS#1 Signature with SHA-384',
  RS512: 'RSA PKCS#1 Signature with SHA-512',
  ES256: 'ECDSA using P-256 and SHA-256',
  ES384: 'ECDSA using P-384 and SHA-384',
  ES512: 'ECDSA using P-521 and SHA-512',
  PS256: 'RSA PSS using SHA-256 and MGF1 with SHA-256',
  PS384: 'RSA PSS using SHA-384 and MGF1 with SHA-384',
  PS512: 'RSA PSS using SHA-512 and MGF1 with SHA-512',
  EdDSA: 'Edwards-curve Digital Signature Algorithm',
  none: 'No digital signature or MAC (UNSECURE)',
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return atob(base64)
}

export function decodeJwt(token: string): DecodedJwt {
  let trimmed = token.trim()
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    trimmed = trimmed.slice(7).trim()
  }
  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    throw new Error(`Invalid JWT: expected 3 parts separated by dots, got ${parts.length}`)
  }

  let header: Record<string, unknown>
  try {
    header = JSON.parse(base64UrlDecode(parts[0]))
  } catch {
    throw new Error('Invalid JWT: could not decode header (first part is not valid base64url JSON)')
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    throw new Error('Invalid JWT: could not decode payload (second part is not valid base64url JSON)')
  }

  return { header, payload, signature: parts[2] }
}

export function getClaimDescription(claim: string): string | undefined {
  return KNOWN_CLAIMS[claim]
}

export function getAlgorithmDescription(alg: string): string | undefined {
  return KNOWN_ALGORITHMS[alg]
}

export function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null
  // JWT timestamps are in seconds
  if (value > 1e12) return null // probably milliseconds or not a timestamp
  if (value < 1e8) return null // too old, probably not a timestamp
  const date = new Date(value * 1000)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const absDiff = Math.abs(diff)

  let relative: string
  if (absDiff < 60_000) {
    relative = diff > 0 ? 'in a few seconds' : 'a few seconds ago'
  } else if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000)
    relative = diff > 0 ? `in ${mins}m` : `${mins}m ago`
  } else if (absDiff < 86_400_000) {
    const hrs = Math.round(absDiff / 3_600_000)
    relative = diff > 0 ? `in ${hrs}h` : `${hrs}h ago`
  } else {
    const days = Math.round(absDiff / 86_400_000)
    relative = diff > 0 ? `in ${days}d` : `${days}d ago`
  }

  return `${date.toISOString()} (${relative})`
}

export function isExpired(payload: Record<string, unknown>): boolean | null {
  const exp = payload.exp
  if (typeof exp !== 'number') return null
  return Date.now() / 1000 > exp
}
