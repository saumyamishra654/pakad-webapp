# Deploy to Netlify from GitHub

This repository is set up to deploy the static frontend and serve the API via a Netlify Function.

## What’s included
- Static site: `chord app/` (served as the published site)
- Serverless API: `netlify/functions/api.js` (handles all `/api/*` routes)
- Data: `db/aarohavroh.csv` (bundled into the function)
- Config: `netlify.toml` (publish dir + redirect for `/api/*`)

## One-time setup
1. Push this repository to GitHub (public or private).
2. In Netlify, click “Add new site” → “Import an existing project” → pick your GitHub repo.
3. Configure:
   - Build command: leave empty
   - Publish directory: `chord app`
   - Functions directory: auto-detected (`netlify/functions`)
4. Click “Deploy site”.

Netlify will publish the static app and create an endpoint for the function at `/.netlify/functions/api`. The redirect maps `/api/*` to that function.

## Local testing (optional)
If you want to test locally:

1. Install Netlify CLI
   - `npm i -g netlify-cli`
2. Run the dev server at repo root
   - `netlify dev`
3. Open `http://localhost:8888/` for the app
   - API is available at `http://localhost:8888/api/...`

## Environment notes
- No build step required. If you add a build (e.g. bundling React), set `build.command` in `netlify.toml` and adjust `publish` accordingly.
- If you add more CSV or assets required by the function, add them to `functions.included_files` in `netlify.toml`.

## Paths summary
- App: `/`
- API: `/api/*` (redirects to `/.netlify/functions/api/:splat`)

## Troubleshooting
- 404 for API: Check that `netlify.toml` is at repo root and the redirect exists.
- CSV not found in function: Ensure `db/aarohavroh.csv` exists in the repo and `included_files` in `netlify.toml` includes it.
- CORS: Netlify functions share the same origin as the site; no CORS headers needed.
