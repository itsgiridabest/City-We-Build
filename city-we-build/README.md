# City We Build 🏙️

A tiny static web app: snap a photo of a problem in Boston, AI suggests a fix, and a pin drops on the map.

Plain **HTML + CSS + JavaScript**. No build step. No framework.

## Files

- `index.html` — the page
- `style.css` — the styling
- `script.js` — all the logic (commented top-to-bottom)

## 1. Add your OpenRouter API key

Open `script.js` and replace this line near the top:

```js
const OPENROUTER_API_KEY = "PASTE_YOUR_OPENROUTER_KEY_HERE";
```

Get a key at https://openrouter.ai/keys.

> ⚠️ This key is visible to anyone who opens the site (it's in the JS file).
> Set a small spending limit on the key in your OpenRouter dashboard.

## 2. Run it locally

Just open `index.html` in your browser. That's it.

(For geolocation to work in some browsers, use a tiny local server:
`npx serve city-we-build` or `python3 -m http.server`.)

## 3. Deploy to Cloudflare Pages

1. Push this `city-we-build/` folder to a GitHub repo (or just this folder's contents to the repo root).
2. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick your repo. In build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `city-we-build` (or `/` if you put files at the repo root)
4. Click **Save and Deploy**. Done!

No environment variables needed — the API key lives in `script.js`.

## How it works

1. You pick a photo + optional description.
2. JS converts the photo to base64.
3. It sends the photo + a prompt to OpenRouter's vision model (Gemini Flash by default).
4. AI returns `{ problem, solution }` as JSON.
5. JS asks the browser for your location (falls back to Boston center) and drops a Leaflet marker.
6. Click the marker to see the photo + AI analysis.
