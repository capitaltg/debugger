# Token Debugger

Source: [github.com/capitaltg/debugger](https://github.com/capitaltg/debugger)

A client-side web application for decoding and inspecting JWT and SAML authentication tokens, X.509 certificates, parsing URLs and email lists, exploring JSON and XML, and formatting SQL. All processing happens in the browser — no data is sent to any server.

## Features

### JWT Decoder
- Decodes and displays header (JOSE) and payload claims in a structured table
- Describes standard claims (iss, sub, aud, exp, nbf, iat, roles, email, etc.)
- Identifies the signature algorithm with detailed descriptions
- Converts Unix timestamps to human-readable dates with relative time
- Shows token expiration status

### SAML Decoder
- Accepts raw XML, base64-encoded, or URL-encoded SAML responses
- Displays response info, subject/identity, conditions, and security details
- Parses and lists SAML attributes with friendly names
- Provides human-readable descriptions for status codes, NameID formats, and auth contexts
- Toggle to view formatted raw XML

### Certificate Parser
- Accepts PEM with or without the `-----BEGIN CERTIFICATE-----` header/footer, bare base64/base64url DER, hex DER, and the `<X509Certificate>` elements copied out of SAML metadata
- Paste a full chain (multiple PEM blocks) to inspect every certificate, with a name-based chain order check
- Summarizes validity with days remaining, and flags expired, not-yet-valid, self-issued, CA, and weak-signature certificates
- Reports names and structure only — no signature is verified, so a self-issued certificate is labeled as such rather than claimed to be self-signed
- Breaks subject and issuer into named DN components (CN, O, OU, ...) with descriptions
- Lists Subject Alternative Names by type (DNS, IP, email, URI, DirName)
- Decodes extensions: key usage, extended key usage, basic constraints, name constraints, CRL distribution points, authority information access (OCSP/CA Issuers), certificate policies, subject/authority key identifiers, and more
- Reports the public key algorithm with RSA modulus size and exponent or the named EC curve
- Computes SHA-256 and SHA-1 fingerprints plus the `pin-sha256` public key pin, with one-click copy of any single certificate as PEM
- Optional hostname check against the certificate's SAN entries, including wildcard rules
- Names anomalies instead of normalizing them away: negative serial numbers, weak signature algorithms, and multi-valued RDNs are shown as encoded
- Refuses to parse a private key block, and names the PEM label it found when the input is a CSR or key rather than a certificate

### URL Parser
- Breaks a URL into origin, path, and fragment
- Lists query parameters in a table with a parameter count
- Validates input and flags malformed URLs

### Email Parser
- Extracts name/address pairs from messy recipient lists
- Handles `"Name" <email>` format, bare addresses, and Outlook-style semicolon-separated lists

### JSON Parser
- Parses pasted JSON and renders it as a navigable, collapsible tree
- Click any object or array node to expand or collapse it; collapsed nodes show an item count
- Auto-expands all nodes by default, with a one-click **Collapse all / Expand all** toggle
- Syntax-colored by type (keys, strings, numbers, booleans, null)
- Reports parse errors with the underlying message

### XML Parser
- Renders pasted XML as a navigable, collapsible element tree
- Click any element with children to expand or collapse it, with a **Collapse all / Expand all** toggle
- Syntax-colored tags, attribute names, attribute values, and text content
- Collapses childless elements to a single self-closing line
- Reports the browser's parse error, including line and column, for malformed input

### SQL Formatter
- Reformats pasted SQL with top-level keywords (SELECT, FROM, WHERE, JOIN, GROUP BY, ...) on their own lines
- Uppercases recognized keywords and indents select lists, conditions, and `AND`/`OR` chains
- Preserves string literals and line/block comments rather than reflowing them
- Collapses escaped `\n`, `\r`, and `\t` sequences, so SQL copied out of code or log files formats cleanly
- One-click copy of the formatted output

### General
- Dark/light theme toggle (persisted in localStorage)
- Tabbed interface (JWT, SAML, Cert, URL, Emails, JSON, XML, SQL) with deep-linkable URL hashes
- Real-time decoding as you type
- No external decoding libraries — uses native browser APIs, including a hand-rolled DER/ASN.1 reader for certificates

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- React, TypeScript, Vite
- Native browser APIs for decoding (atob, DOMParser, URL, JSON)
- CSS custom properties for theming
