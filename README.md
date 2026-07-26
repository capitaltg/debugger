# Token Debugger

Source: [github.com/capitaltg/debugger](https://github.com/capitaltg/debugger)

A client-side web application for decoding and inspecting JWT and SAML authentication tokens, parsing URLs and email lists, exploring JSON and XML, and formatting SQL. All processing happens in the browser — no data is sent to any server.

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
- Tabbed interface (JWT, SAML, URL, Emails, JSON, XML, SQL) with deep-linkable URL hashes
- Real-time decoding as you type
- No external decoding libraries — uses native browser APIs

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- React, TypeScript, Vite
- Native browser APIs for decoding (atob, DOMParser, URL, JSON)
- CSS custom properties for theming
