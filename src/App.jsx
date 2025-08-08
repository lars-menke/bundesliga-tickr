
import React, { useEffect, useMemo, useState } from 'react'
import MatchList from './components/MatchList'
import { getCurrentMatchday, getFixtures, subscribeForPush, testPush } from './lib/api'

const POLL_MS = 30000 // 30s

export default function App() {
  const [season] = useState('2025') // OpenLigaDB season format uses the starting year e.g. 2025 for 2025/26
  const [matchday, setMatchday] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load current matchday on mount
  useEffect(() => {
    (async () => {
      try {
        const md = await getCurrentMatchday({ season })
        setMatchday(md)
      } catch (e) {
        console.error(e)
        setError('Konnte aktuellen Spieltag nicht laden.')
      }
    })()
  }, [season])

  // Fetch fixtures whenever matchday changes; poll every 30s for live updates
  useEffect(() => {
    if (!matchday) return
    let cancelled = false
    let timer
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await getFixtures({ season, matchday })
        if (!cancelled) setFixtures(data)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Fehler beim Laden der Spiele.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    timer = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [season, matchday])

  const status = isLoading ? 'Aktualisiere…' : `Spieltag ${matchday ?? '-'}`

  const onSubscribePush = async () => {
    try {
      const ok = await subscribeForPush()
      if (ok) alert('Benachrichtigungen aktiviert (sofern der Browser es zulässt).')
      else alert('Benachrichtigungen konnten nicht aktiviert werden.')
    } catch (e) {
      alert('Push-Setup fehlgeschlagen.')
    }
  }

  return (
    <div className="container">
      <header>
        <h1
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.8rem',
    fontWeight: 'bold',
  }}
>
  Bundesliga TickR
  <img
    src="/assets/bundesliga.png"
    alt="Bundesliga Logo"
    style={{
      height: '28px',
      width: 'auto',
      verticalAlign: 'middle',
    }}
  />
</h1>


        <div className="controls">
          <button onClick={onSubscribePush}>Push aktivieren</button>
          <button onClick={testPush}>Test-Push</button>
          <select
            value={matchday ?? ''}
            onChange={(e) => setMatchday(Number(e.target.value))}
            title="Spieltag wählen"
          >
            <option value="" disabled>Spieltag…</option>
            {Array.from({ length: 34 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Spieltag {n}</option>
            ))}
          </select>
        </div>
      </header>

      <p className="status"><span className="badge">{status}</span></p>

      {error && <div className="notice">{error}</div>}

      <div className="grid">
        <MatchList fixtures={fixtures} />
      </div>

      <footer>
        <p>Live-Update alle 30s • Saison 2025/26 • Daten: OpenLigaDB (Proxy) • Logos via Wikipedia-Suche (Cache)</p>
      </footer>
    </div>
  )
}
