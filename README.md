# Raga Chord Web App (server-backed)

This converts the static `chord app/index.html` into a web app with server-side logic and data. The backend serves raga data from `db/aarohavroh.csv` and computes chords. The frontend calls the backend via fetch and never exposes the chord-generation logic to users.

## Run locally

- Start the server:

```bash
cd server
npm install
node index.js
```

- Open the app at:

```
http://localhost:3000
```

## API

- GET `/api/health` → `{ ok: true }`
- GET `/api/chord-types` → list of chord types
- GET `/api/ragas` → `[ { name } ]`
- GET `/api/ragas/:name` → `{ name, notePattern, aarohPattern, avrohPattern }`
- GET `/api/ragas/:name/chords?part=all|aaroh|avroh&chordType=all|<id>&extend=true|false` → chords
- POST `/api/ragas/:name/custom-matches` body `{ intervalsAbs: number[] }` → `{ aaroh, avroh, all }`
- GET `/api/ragas/:name/aggregates?separate=true|false&extend=true|false` → `{ basic, extended }`

## Notes

- Static UI is served from `chord app/` by the same server.
- If you prefer Python, we can port the server to FastAPI; the frontend contract stays the same.
