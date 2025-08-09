
# Bundesliga TickR (komplette Version)

PWA mit React + Vite und Netlify Functions.
- Live-Spielstände (OpenLigaDB) via `/.netlify/functions/scores`
- Cache + Fallback bei API-Aussetzern
- UI: LIVE-Badge, Tor-Alarm (⚽, auto-hide), Sound + „Ton aktivieren“-Button
- Assets: `public/assets/bundesliga.png`, `public/assets/goal.wav`

## Deploy (GitHub → Netlify)
1. Dieses ZIP entpacken und den Ordner-Inhalt in ein **neues GitHub-Repo** hochladen.
2. In Netlify: **Add new site → Import from Git** → Repo auswählen.
3. Build Settings prüfen:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Deploy starten. 
5. Test:
   - `/.netlify/functions/scores?season=2025&current=1`
   - `/.netlify/functions/scores?season=2025&matchday=1`

## Lokal starten
```bash
npm i
npm run dev
```

## Hinweise
- Für PWA-Name/Icons siehe `vite.config.js`. 
- Wenn du echte Vereins-SVGs willst, kannst du später ein lokales Mapping pflegen.
