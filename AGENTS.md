# Overview

## This project is a TypeScript EML (RFC 5322) parser designed to run in:

- Modern browsers (ES2022+)
- Node.js 22+

It parses raw .eml files into structured objects including headers, body (text/html), attachments, and metadata. The library is environment-agnostic, dependency-light, and fully typed.
All functions are unit tested.
Attachments are handled as defined in RFC 2045/2046 (MIME)
