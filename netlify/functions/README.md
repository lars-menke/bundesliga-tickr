
# Bundesliga TickR (PWA + Netlify Functions)

- React + Vite (PWA-ready)
- Live-Updates alle 30s
- Netlify Function `/.netlify/functions/scores` mit Fallback & Cache
- UI: LIVE-Badge, Tor-Alarm (⚽, auto-hide), optionaler Sound mit „Ton aktivieren“
- Assets: `public/assets/bundesliga.png`, `public/assets/goal.wav`

## Schnellstart
1. Repo hochladen (oder ZIP entpacken & per GitHub hochladen).
2. Netlify: **Import from Git** → Build command: `npm run build`, Publish: `dist`, Functions: `netlify/functions`.
3. Öffnen: `https://<deine-domain>/.netlify/functions/scores?season=2025&matchday=1` sollte JSON liefern.
4. App aufrufen, „Ton aktivieren“ drücken (für iOS), Spieltag wählen.

## Entwickeln
```bash
npm i
npm run dev
```

## Deploy
Push nach GitHub → Netlify baut automatisch.
