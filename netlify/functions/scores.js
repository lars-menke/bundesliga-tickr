// netlify/functions/scores.js
// Liefert { currentMatchday } bzw. { matches: [...] } für BL1 (2025/26 = season "2025")
// Nutzt die korrekte OpenLiga-API (api.openligadb.de) und normalisiert immer auf { matches }
// Optional: ergänzt Logos – bevorzugt teamIconUrl aus OpenLiga, sonst Fallback über unsere /logo-Function

import fetch from 'node-fetch'

// 1. Bundesliga
const leagueShortcut = 'bl1'

// Mini-In-Memory-Cache (lebt pro Function-Container)
const cache = new Map()
const TTL_MS = 15 * 1000 // 15s

const json = async (res, onErrorMsg = 'fetch failed') => {
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${onErrorMsg}: ${res.status} ${txt}`)
  }
  return res.json()
}

const getCurrentMatchday = async () => {
  // Achtung: getcurrentgroup braucht KEINEN Saison-Parameter
  const url = `https://api.openligadb.de/getcurrentgroup/${leagueShortcut}`
  const res = await fetch(url)
  const data = await json(res, 'OpenLiga current failed')
  // Normalerweise: { groupOrderID, ... }
  const currentMatchday = Number(data?.groupOrderID ?? 0)
  return { currentMatchday: currentMatchday || 1 }
}

const fetchFixtures = async (season, matchday) => {
  const url = `https://api.openligadb.de/getmatchdata/${leagueShortcut}/${season}/${matchday}`
  const res = await fetch(url)
  const raw = await json(res, 'OpenLiga fixtures failed')
  // OpenLiga liefert ein Array
  const arr = Array.isArray(raw) ? raw : (raw?.matches || [])
  return arr
}

const latestScore = (match) => {
  // Bevorzugt Goals (Live), sonst letztes MatchResult
  if (Array.isArray(match.goals) && match.goals.length) {
    const last = match.goals[match.goals.length - 1]
    return {
      goalsTeam1: typeof last.scoreTeam1 === 'number' ? last.scoreTeam1 : null,
      goalsTeam2: typeof last.scoreTeam2 === 'number' ? last.scoreTeam2 : null
    }
  }
  if (Array.isArray(match.matchResults) && match.matchResults.length) {
    const last = match.matchResults[match.matchResults.length - 1]
    return {
      goalsTeam1: typeof last.pointsTeam1 === 'number' ? last.pointsTeam1 : null,
      goalsTeam2: typeof last.pointsTeam2 === 'number' ? last.pointsTeam2 : null
    }
  }
  return { goalsTeam1: null, goalsTeam2: null }
}

const resolveLogo = async (team) => {
  // 1) Falls OpenLiga bereits ein Icon liefert → nehmen
  if (team?.teamIconUrl) return team.teamIconUrl

  // 2) Fallback über unsere Logo-Function (Wikipedia-Suche)
  try {
    const baseUrl = process.env.URL || '' // von Netlify gesetzt
    if (!baseUrl) return null
    const r = await fetch(`${baseUrl}/.netlify/functions/logo?team=${encodeURIComponent(team?.teamName || '')}`)
    if (!r.ok) return null
    const j = await r.json()
    return j?.logo || null
  } catch {
    return null
  }
}

const normalizeMatches = async (list) => {
  // Logos nur auflösen, wenn kein teamIconUrl vorhanden ist
  return Promise.all(
    list.map(async (m) => {
      const score = latestScore(m)
      const team1Logo = m.team1?.teamIconUrl || await resolveLogo(m.team1)
      const team2Logo = m.team2?.teamIconUrl || await resolveLogo(m.team2)

      return {
        matchID: m.matchID,
        matchDateTime: m.matchDateTime,
        matchDateTimeUTC: m.matchDateTimeUTC,
        leagueShortcut: m.leagueShortcut,
        leagueSeason: m.leagueSeason,
        group: m.group,
        matchIsFinished: !!m.matchIsFinished,
        matchIsLive: !m.matchIsFinished && Array.isArray(m.goals) && m.goals.length > 0,
        matchMinute: m.location?.matchMinute ?? null,
        goalsTeam1: score.goalsTeam1,
        goalsTeam2: score.goalsTeam2,
        team1: {
          teamId: m.team1?.teamId,
          teamName: m.team1?.teamName,
          shortName: m.team1?.shortName,
          logo: team1Logo
        },
        team2: {
          teamId: m.team2?.teamId,
          teamName: m.team2?.teamName,
          shortName: m.team2?.shortName,
          logo: team2Logo
        }
      }
    })
  )
}

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {}
    const season = qs.season // z. B. "2025" für 2025/26
    const matchday = qs.matchday
    const wantCurrent = !!qs.current

    // CURRENT MATCHDAY
    if (wantCurrent) {
      const key = `current-${season || 'na'}`
      const now = Date.now()
      const c = cache.get(key)
      if (c && now - c.t < TTL_MS) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' },
          body: JSON.stringify(c.v)
        }
      }
      const payload = await getCurrentMatchday()
      cache.set(key, { t: now, v: payload })
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' },
        body: JSON.stringify(payload)
      }
    }

    // FIXTURES
    if (!season || !matchday) {
      return { statusCode: 400, body: JSON.stringify({ error: 'season and matchday required' }) }
    }

    const key = `fixtures-${season}-${matchday}`
    const now = Date.now()
    const c = cache.get(key)
    if (c && now - c.t < TTL_MS) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' },
        body: JSON.stringify(c.v)
      }
    }

    const raw = await fetchFixtures(season, matchday)
    const matches = await normalizeMatches(raw)
    const payload = { matches }

    cache.set(key, { t: now, v: payload })
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=10' },
      body: JSON.stringify(payload)
    }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: JSON.stringify({ error: 'server error' }) }
  }
}
