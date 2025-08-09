
import React, { useEffect, useState, useRef } from 'react'

export default function App() {
  const [matches, setMatches] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const previousScores = useRef({})
  const goalTimers = useRef({})
  const audioRef = useRef(null)

  const season = 2025
  const [matchday, setMatchday] = useState(1)

  const enableSound = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setSoundEnabled(true)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const fetchData = () => {
      setLoading(true)
      fetch(`/.netlify/functions/scores?season=${season}&matchday=${matchday}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data.message) setMessage(data.message); else setMessage('')
          const updated = (data.matches || []).map((m) => {
            const prev = previousScores.current[m.matchID] || {}
            let isGoal = false
            if (m.matchIsLive && prev.goalsTeam1 !== undefined && (m.goalsTeam1 !== prev.goalsTeam1 || m.goalsTeam2 !== prev.goalsTeam2)) {
              isGoal = true
              clearTimeout(goalTimers.current[m.matchID])
              goalTimers.current[m.matchID] = setTimeout(() => {
                setMatches((old) => old.map((om) => om.matchID === m.matchID ? { ...om, goalScored: false } : om))
              }, 5000)
              if (soundEnabled && audioRef.current) {
                try { audioRef.current.currentTime = 0; audioRef.current.play() } catch {}
              }
            }
            previousScores.current[m.matchID] = { goalsTeam1: m.goalsTeam1, goalsTeam2: m.goalsTeam2 }
            return { ...m, goalScored: isGoal }
          })
          setMatches(updated)
        })
        .catch(() => {
          setMessage('Fehler beim Laden der Daten.')
          setMatches([])
        })
        .finally(() => setLoading(false))
    }

    fetchData()
    const iv = setInterval(fetchData, 30000)
    return () => clearInterval(iv)
  }, [season, matchday, soundEnabled])

  return (
    <div className="app-container">
      <audio ref={audioRef} src="/assets/goal.wav" preload="auto"></audio>

      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <h1>Bundesliga TickR <img src="/assets/bundesliga.png" alt="Bundesliga Logo" /></h1>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {!soundEnabled && <button className="sound-button" onClick={enableSound}>🔊 Ton aktivieren</button>}
          <select value={matchday} onChange={(e)=>setMatchday(Number(e.target.value))}>
            {Array.from({length:34}, (_,i)=>i+1).map(n => <option key={n} value={n}>Spieltag {n}</option>)}
          </select>
        </div>
      </header>

      {loading && <div className="spinner-container"><div className="spinner"></div></div>}

      {!loading && message && <div className="message-box message-warning">{message}</div>}
      {!loading && !message && matches.length===0 && <div className="message-box message-error">Keine Spiele gefunden.</div>}

      {!loading && matches.map(m => (
        <div key={m.matchID} className="match-card">
          <div className="team">
            {m.team1.logo ? <img src={m.team1.logo} alt={m.team1.teamName} height="26" /> : <div style={{width:26}} />}
            <span>{m.team1.shortName || m.team1.teamName}</span>
          </div>
          <div className="score">
            {m.goalsTeam1 ?? '-'} : {m.goalsTeam2 ?? '-'}
            {m.matchIsLive && <span className="live-badge">LIVE</span>}
            {m.goalScored && <span className="goal-alert">⚽</span>}
          </div>
          <div className="team" style={{justifyContent:'flex-end'}}>
            <span>{m.team2.shortName || m.team2.teamName}</span>
            {m.team2.logo ? <img src={m.team2.logo} alt={m.team2.teamName} height="26" /> : <div style={{width:26}} />}
          </div>
        </div>
      ))}
    </div>
  )
}
