
import React from 'react'

const statusLabel = (m) => {
  if (!m) return ''
  if (m.matchIsFinished) return 'FT'
  if (m.matchIsLive) return m.matchMinute ? `LIVE ${m.matchMinute}’` : 'LIVE'
  return m.matchDateTime ? new Date(m.matchDateTime).toLocaleString() : ''
}

const Logo = ({ teamName, logoUrl }) => {
  return (
    <div className="logo">
      {logoUrl ? <img src={logoUrl} alt={`${teamName} Logo`} width="26" height="26" /> : (
        <span aria-hidden>{teamName?.slice(0,2).toUpperCase()}</span>
      )}
    </div>
  )
}

export default function MatchList({ fixtures }) {
  if (!fixtures?.length) return <div className="notice">Keine Spiele vorhanden.</div>
  return (
    <>
      {fixtures.map(match => (
        <div key={match.matchID} className="card">
          <div className="team">
            <Logo teamName={match.team1?.teamName} logoUrl={match.team1?.logo} />
            <div className="team-name">{match.team1?.teamName}</div>
          </div>
          <div className="score">
            {typeof match.goalsTeam1 === 'number' ? match.goalsTeam1 : '-'}
            {' : '}
            {typeof match.goalsTeam2 === 'number' ? match.goalsTeam2 : '-'}
          </div>
          <div className="team" style={{justifyContent:'flex-end'}}>
            <div className="team-name" style={{textAlign:'right'}}>{match.team2?.teamName}</div>
            <Logo teamName={match.team2?.teamName} logoUrl={match.team2?.logo} />
          </div>
          <div className="status">{statusLabel(match)}</div>
        </div>
      ))}
    </>
  )
}
