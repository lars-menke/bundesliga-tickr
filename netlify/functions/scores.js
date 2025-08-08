
import fetch from 'node-fetch'

// Simple in-memory cache for the life of the function container
const cache = new Map()
const TTL = 15 * 1000 // 15s

const leagueShortcut = 'bl1' // 1. Bundesliga
// OpenLigaDB docs: https://www.openligadb.de/

const withLogos = async (matches) => {
  // call our own logo proxy for both teams
  const addLogo = async (team) => {
    if (!team?.teamName) return team
    try {
      const res = await fetch(`${process.env.URL}/.netlify/functions/logo?team=${encodeURIComponent(team.teamName)}`)
      if (res.ok) {
        const { logo } = await res.json()
        return { ...team, logo }
      }
    } catch (_) {}
    return team
  }
  return await Promise.all(matches.map(async m => ({
    ...m,
    team1: await addLogo(m.team1),
    team2: await addLogo(m.team2),
    goalsTeam1: m.goals?.length ? m.goals.filter(g => g.scoreTeam1 !== null).slice(-1)[0]?.scoreTeam1 : m.matchResults?.slice(-1)[0]?.pointsTeam1,
    goalsTeam2: m.goals?.length ? m.goals.filter(g => g.scoreTeam2 !== null).slice(-1)[0]?.scoreTeam2 : m.matchResults?.slice(-1)[0]?.pointsTeam2,
    matchIsLive: m.matchIsFinished ? false : !!m.goals?.length,
    matchMinute: m.location?.matchMinute ?? null
  })))
}

export const handler = async (event, context) => {
  try {
    const { season, matchday, current } = event.queryStringParameters || {}
    if (!season) return { statusCode: 400, body: JSON.stringify({ error: 'season missing' }) }

    if (current) {
      // current matchday endpoint
      const key = `current-${season}`
      const now = Date.now()
      const c = cache.get(key)
      if (c && now - c.t < TTL) return { statusCode: 200, body: JSON.stringify(c.v), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' } }

      const url = `https://www.openligadb.de/api/getcurrentgroup/${leagueShortcut}/${season}`
      const r = await fetch(url)
      if (!r.ok) throw new Error('OpenLiga current failed')
      const data = await r.json()
      const out = { currentMatchday: data.groupOrderID }
      cache.set(key, { t: now, v: out })
      return { statusCode: 200, body: JSON.stringify(out), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' } }
    }

    if (!matchday) return { statusCode: 400, body: JSON.stringify({ error: 'matchday missing' }) }

    const key = `fixtures-${season}-${matchday}`
    const now = Date.now()
    const c = cache.get(key)
    if (c && now - c.t < TTL) return { statusCode: 200, body: JSON.stringify(c.v), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' } }

    const url = `https://www.openligadb.de/api/getmatchdata/${leagueShortcut}/${season}/${matchday}`
    const r = await fetch(url)
    if (!r.ok) throw new Error('OpenLiga fixtures failed')
    const data = await r.json()
    const matches = await withLogos(data)
    const out = { matches }
    cache.set(key, { t: now, v: out })
    return { statusCode: 200, body: JSON.stringify(out), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' } }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: JSON.stringify({ error: 'server error' }) }
  }
}
