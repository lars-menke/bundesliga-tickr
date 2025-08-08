
# Bundesliga Ticker (PWA + Netlify Functions)

**Features**
- React + Vite PWA (Homescreen iOS/Android)
- 30s Live-Polling
- OpenLigaDB Proxy (`/.netlify/functions/scores`)
- Wikipedia Logo-Proxy (`/.netlify/functions/logo`) mit Cache
- Web Push (Scaffold) mit VAPID (Test-Push)

## Schnellstart

1. **Repo/ZIP entpacken & Dependencies:**
   ```bash
   npm i
   ```

2. **VAPID Keys generieren (für Web Push):**
   ```bash
   npm i -D web-push
   npx web-push generate-vapid-keys --json
   ```
   Ausgabe (JSON) enthält `publicKey` und `privateKey`.

3. **Netlify Projekt anlegen & Umgebungsvariablen setzen:**
   - `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` auf die obigen Werte setzen.
   - (optional) `URL` wird von Netlify automatisch gesetzt (für Logo-Proxy-Aufruf).

4. **Lokal testen:**
   ```bash
   npm run dev
   # In anderem Terminal:
   npx netlify-cli dev
   ```

5. **Deploy zu Netlify:**
   - Push zu GitHub und **Netlify: New site from Git**
   - oder **netlify deploy**

6. **iOS Homescreen:**
   - Seite im Safari öffnen → Share → *Zum Home-Bildschirm*.

## Endpunkte

- `/.netlify/functions/scores?season=2025&current=1` → `{ currentMatchday }`
- `/.netlify/functions/scores?season=2025&matchday=1` → `{ matches: [...] }`
- `/.netlify/functions/logo?team=FC%20Bayern%20München` → `{ logo: <url> }`

## Hinweise

- OpenLigaDB ist community-basiert. Falls mal nichts kommt: kurze Cache-Zeit hilft.
- Logos: Wikipedia-Suche ist **Best Effort**. Falls kein Ergebnis, wird ein Initialen-Platzhalter angezeigt.
- Web Push: Das Beispiel speichert Subscriptions **nur im Speicher** (funktioniert begrenzt).
  Für Produktion bitte z. B. Netlify KV / Fauna / Upstash verwenden und dort Subscriptions ablegen.
  iOS unterstützt PWA Push ab iOS 16.4 (Benutzer muss Benachrichtigungen erlauben).
