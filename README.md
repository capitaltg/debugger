# Token Debugger

A client-side web application for decoding and inspecting JWT and SAML authentication tokens. All decoding happens in the browser — no data is sent to any server.

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

### General
- Dark/light theme toggle (persisted in localStorage)
- Real-time decoding as you type
- No external decoding libraries — uses native browser APIs

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- React, TypeScript, Vite
- Native browser APIs for decoding (atob, DOMParser)
- CSS custom properties for theming
