# RedactFlow

PII / secret masking demo by **Saeed Rumaneh**. Detect and redact emails, phone numbers, JWT-like tokens, and AWS-like access keys in synthetic text with configurable rules. The UI posts to `POST /api/redact`; the last job is optionally saved to `data/redact.json`.

## Features

- Rule engine in `lib/redact.ts` (pure — no Node crypto)
- Overlap-aware replacement
- Toggle rules in the UI, then redact via API
- Vitest coverage

## API

| Method | Path | Body |
|--------|------|------|
| GET | `/api/redact` | — → `{ job }` last job on disk, or `{ job: null }` |
| POST | `/api/redact` | `{ text, rules?: { id, enabled }[] }` |

## Complete product flows

1. Click **Support ticket** to load the sample into the source pane.
2. Click **Redact via API** — masked output and a findings list (ruleId + truncated match) appear.
3. Toggle a rule off and re-run — that class of match stays in the output and drops from findings.

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
```

Runtime data under `data/` is gitignored.

## License

MIT © 2026 Saeed Rumaneh
