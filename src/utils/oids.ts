// Object identifiers commonly found in X.509 certificates.

/** Distinguished-name attribute types: OID -> short name. */
export const DN_ATTRIBUTES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'street',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.13': 'description',
  '2.5.4.15': 'businessCategory',
  '2.5.4.17': 'postalCode',
  '2.5.4.20': 'telephoneNumber',
  '2.5.4.42': 'GN',
  '2.5.4.43': 'initials',
  '2.5.4.44': 'generationQualifier',
  '2.5.4.46': 'dnQualifier',
  '2.5.4.65': 'pseudonym',
  '2.5.4.97': 'organizationIdentifier',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '0.9.2342.19200300.100.1.1': 'UID',
  '0.9.2342.19200300.100.1.25': 'DC',
  '1.3.6.1.4.1.311.60.2.1.1': 'jurisdictionL',
  '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC',
}

/** Longer descriptions for DN attributes, shown alongside the short name. */
export const DN_DESCRIPTIONS: Record<string, string> = {
  CN: 'Common Name — the primary identity (hostname or person)',
  SN: 'Surname',
  serialNumber: 'Serial number of the entity (not the certificate serial)',
  C: 'Country (ISO 3166 two-letter code)',
  L: 'Locality — city or town',
  ST: 'State or province',
  street: 'Street address',
  O: 'Organization — the legal entity',
  OU: 'Organizational Unit — division within the organization',
  title: 'Job title',
  businessCategory: 'Business category (used by EV certificates)',
  postalCode: 'Postal code',
  GN: 'Given name',
  dnQualifier: 'Distinguished name qualifier, used to disambiguate entries',
  pseudonym: 'Pseudonym',
  organizationIdentifier: 'Legal registration identifier for the organization',
  emailAddress: 'Email address (deprecated in favor of a SAN rfc822Name)',
  UID: 'User identifier',
  DC: 'Domain Component — one label of a DNS domain',
  jurisdictionL: 'Jurisdiction of incorporation — locality (EV)',
  jurisdictionST: 'Jurisdiction of incorporation — state (EV)',
  jurisdictionC: 'Jurisdiction of incorporation — country (EV)',
}

/** Signature algorithms. */
export const SIGNATURE_ALGORITHMS: Record<string, string> = {
  '1.2.840.113549.1.1.2': 'MD2 with RSA',
  '1.2.840.113549.1.1.4': 'MD5 with RSA',
  '1.2.840.113549.1.1.5': 'SHA-1 with RSA',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
  '1.2.840.113549.1.1.12': 'SHA-384 with RSA',
  '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
  '1.2.840.113549.1.1.14': 'SHA-224 with RSA',
  '1.2.840.10040.4.3': 'SHA-1 with DSA',
  '2.16.840.1.101.3.4.3.2': 'SHA-256 with DSA',
  '1.2.840.10045.4.1': 'SHA-1 with ECDSA',
  '1.2.840.10045.4.3.1': 'SHA-224 with ECDSA',
  '1.2.840.10045.4.3.2': 'SHA-256 with ECDSA',
  '1.2.840.10045.4.3.3': 'SHA-384 with ECDSA',
  '1.2.840.10045.4.3.4': 'SHA-512 with ECDSA',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
  // NIST CSOR arc 2.16.840.1.101.3.4.3 — verified against OpenSSL's table.
  '2.16.840.1.101.3.4.3.5': 'SHA3-224 with DSA',
  '2.16.840.1.101.3.4.3.6': 'SHA3-256 with DSA',
  '2.16.840.1.101.3.4.3.7': 'SHA3-384 with DSA',
  '2.16.840.1.101.3.4.3.8': 'SHA3-512 with DSA',
  '2.16.840.1.101.3.4.3.9': 'SHA3-224 with ECDSA',
  '2.16.840.1.101.3.4.3.10': 'SHA3-256 with ECDSA',
  '2.16.840.1.101.3.4.3.11': 'SHA3-384 with ECDSA',
  '2.16.840.1.101.3.4.3.12': 'SHA3-512 with ECDSA',
  '2.16.840.1.101.3.4.3.13': 'SHA3-224 with RSA',
  '2.16.840.1.101.3.4.3.14': 'SHA3-256 with RSA',
  '2.16.840.1.101.3.4.3.15': 'SHA3-384 with RSA',
  '2.16.840.1.101.3.4.3.16': 'SHA3-512 with RSA',
}

/** Weak signature algorithms worth flagging. */
export const WEAK_SIGNATURE_ALGORITHMS = new Set([
  '1.2.840.113549.1.1.2', // MD2
  '1.2.840.113549.1.1.4', // MD5
  '1.2.840.113549.1.1.5', // SHA-1 with RSA
  '1.2.840.10040.4.3', // SHA-1 with DSA
  '1.2.840.10045.4.1', // SHA-1 with ECDSA
])

/** Public key algorithms. */
export const KEY_ALGORITHMS: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'RSA',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.10040.4.1': 'DSA',
  '1.2.840.10046.2.1': 'Diffie-Hellman',
  '1.2.840.10045.2.1': 'EC',
  '1.3.101.110': 'X25519',
  '1.3.101.111': 'X448',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
}

/** Named elliptic curves, with their key size in bits. */
export const EC_CURVES: Record<string, { name: string; bits: number }> = {
  '1.2.840.10045.3.1.1': { name: 'secp192r1 (NIST P-192)', bits: 192 },
  '1.2.840.10045.3.1.7': { name: 'prime256v1 (NIST P-256)', bits: 256 },
  '1.3.132.0.33': { name: 'secp224r1 (NIST P-224)', bits: 224 },
  '1.3.132.0.34': { name: 'secp384r1 (NIST P-384)', bits: 384 },
  '1.3.132.0.35': { name: 'secp521r1 (NIST P-521)', bits: 521 },
  '1.3.132.0.10': { name: 'secp256k1', bits: 256 },
  '1.3.36.3.3.2.8.1.1.7': { name: 'brainpoolP256r1', bits: 256 },
  '1.3.36.3.3.2.8.1.1.11': { name: 'brainpoolP384r1', bits: 384 },
  '1.3.36.3.3.2.8.1.1.13': { name: 'brainpoolP512r1', bits: 512 },
}

/** Certificate extensions. */
export const EXTENSIONS: Record<string, string> = {
  '2.5.29.9': 'Subject Directory Attributes',
  '2.5.29.14': 'Subject Key Identifier',
  '2.5.29.15': 'Key Usage',
  '2.5.29.16': 'Private Key Usage Period',
  '2.5.29.17': 'Subject Alternative Name',
  '2.5.29.18': 'Issuer Alternative Name',
  '2.5.29.19': 'Basic Constraints',
  '2.5.29.20': 'CRL Number',
  '2.5.29.21': 'CRL Reason',
  '2.5.29.23': 'Hold Instruction Code',
  '2.5.29.24': 'Invalidity Date',
  '2.5.29.27': 'Delta CRL Indicator',
  '2.5.29.28': 'Issuing Distribution Point',
  '2.5.29.29': 'Certificate Issuer',
  '2.5.29.30': 'Name Constraints',
  '2.5.29.31': 'CRL Distribution Points',
  '2.5.29.32': 'Certificate Policies',
  '2.5.29.33': 'Policy Mappings',
  '2.5.29.35': 'Authority Key Identifier',
  '2.5.29.36': 'Policy Constraints',
  '2.5.29.37': 'Extended Key Usage',
  '2.5.29.46': 'Freshest CRL',
  '2.5.29.54': 'Inhibit anyPolicy',
  '1.3.6.1.5.5.7.1.1': 'Authority Information Access',
  '1.3.6.1.5.5.7.1.11': 'Subject Information Access',
  '1.3.6.1.5.5.7.1.24': 'TLS Feature (OCSP Must-Staple)',
  '1.3.6.1.4.1.11129.2.4.2': 'Signed Certificate Timestamps (CT)',
  '1.3.6.1.4.1.11129.2.4.3': 'CT Precertificate Poison',
  '1.3.6.1.5.5.7.48.1.5': 'OCSP No Check',
  '1.2.840.113549.1.9.15': 'S/MIME Capabilities',
  '2.16.840.1.113730.1.1': 'Netscape Certificate Type',
  '2.16.840.1.113730.1.13': 'Netscape Comment',
  '1.2.840.113533.7.65.0': 'Entrust Version Information',
  '1.3.6.1.4.1.311.21.1': 'Microsoft CA Version',
  '1.3.6.1.4.1.311.21.2': 'Microsoft Previous CA Certificate Hash',
  '1.3.6.1.4.1.311.21.7': 'Microsoft Certificate Template',
  '1.3.6.1.4.1.311.21.10': 'Microsoft Application Policies',
  '2.23.42.7.0': 'SET Hashed Root Key',
}

/** Extended key usage purposes. */
export const EXT_KEY_USAGES: Record<string, string> = {
  '2.5.29.37.0': 'Any Extended Key Usage',
  '1.3.6.1.5.5.7.3.1': 'TLS Web Server Authentication',
  '1.3.6.1.5.5.7.3.2': 'TLS Web Client Authentication',
  '1.3.6.1.5.5.7.3.3': 'Code Signing',
  '1.3.6.1.5.5.7.3.4': 'Email Protection (S/MIME)',
  '1.3.6.1.5.5.7.3.5': 'IPsec End System',
  '1.3.6.1.5.5.7.3.6': 'IPsec Tunnel',
  '1.3.6.1.5.5.7.3.7': 'IPsec User',
  '1.3.6.1.5.5.7.3.8': 'Time Stamping',
  '1.3.6.1.5.5.7.3.9': 'OCSP Signing',
  '1.3.6.1.5.5.7.3.21': 'SSH Client',
  '1.3.6.1.5.5.7.3.22': 'SSH Server',
  '1.3.6.1.4.1.311.10.3.4': 'Microsoft Encrypting File System',
  '1.3.6.1.4.1.311.20.2.2': 'Microsoft Smart Card Logon',
  '1.3.6.1.4.1.311.10.3.12': 'Microsoft Document Signing',
}

/** Access methods used by Authority Information Access. */
export const ACCESS_METHODS: Record<string, string> = {
  '1.3.6.1.5.5.7.48.1': 'OCSP',
  '1.3.6.1.5.5.7.48.2': 'CA Issuers',
  '1.3.6.1.5.5.7.48.3': 'Time Stamping',
  '1.3.6.1.5.5.7.48.5': 'CA Repository',
}

/** Certificate policy identifiers worth naming. */
export const POLICIES: Record<string, string> = {
  '2.23.140.1.1': 'CA/Browser Forum — Extended Validation (EV)',
  '2.23.140.1.2.1': 'CA/Browser Forum — Domain Validated (DV)',
  '2.23.140.1.2.2': 'CA/Browser Forum — Organization Validated (OV)',
  '2.23.140.1.2.3': 'CA/Browser Forum — Individual Validated (IV)',
  '2.23.140.1.4.1': 'CA/Browser Forum — Code Signing',
  '2.5.29.32.0': 'anyPolicy',
  '1.3.6.1.5.5.7.2.1': 'CPS — Certification Practice Statement URI',
  '1.3.6.1.5.5.7.2.2': 'User Notice',
}

/** Key usage bit names, in bit order (RFC 5280 4.2.1.3). */
export const KEY_USAGE_BITS = [
  'Digital Signature',
  'Non-Repudiation (Content Commitment)',
  'Key Encipherment',
  'Data Encipherment',
  'Key Agreement',
  'Certificate Signing',
  'CRL Signing',
  'Encipher Only',
  'Decipher Only',
]

export function describeOid(oid: string): string | null {
  return (
    EXTENSIONS[oid] ||
    SIGNATURE_ALGORITHMS[oid] ||
    KEY_ALGORITHMS[oid] ||
    EXT_KEY_USAGES[oid] ||
    ACCESS_METHODS[oid] ||
    POLICIES[oid] ||
    EC_CURVES[oid]?.name ||
    null
  )
}
