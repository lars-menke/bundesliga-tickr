
// netlify/functions/scores.js
// BL1 Ticker mit Fallback, wenn API nicht antwortet

const leagueShortcut = 'bl1'
const cache = new Map()
const TTL_MS = 60_000 // 60 Sekunden Cache

async function getJSON(url, label) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BLTicker/1.0 (+netlify)' },
    cache: 'no-store'
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`[${label}] HTTP ${res.status}: ${text?.slice(0,200)}`)
    throw new Error(`${label} failed ${res.status}`)
  }
  try { return JSON.parse(text) } catch (e) {
    console.error(`[${label}] JSON parse error`, e, text?.slice(0,200))
    throw e
  }
}

async function getCurrentMatchday() {
  const url = `https://api.openligadb.de/getcurrentgroup/${leagueShortcut}`
  const data = await getJSON(url, 'current')
  const currentMatchday = Number(data?.groupOrderID ?? 0) || 1
  return { currentMatchday }
}

async function getFixtures(season, matchday) {
  const url = `https://api.openligadb.de/getmatchdata/${leagueShortcut}/${season}/${matchday}`
  const raw = await getJSON(url, 'fixtures')
  return Array.isArray(raw) ? raw : (raw?.matches || [])
}

function latestScore(m) {
  if (Array.isArray(m.goals) && m.goals.length) {
    const last = m.goals[m.goals.length - 1]
    return {
      goalsTeam1: Number.isFinite(last?.scoreTeam1) ? last.scoreTeam1 : null,
      goalsTeam2: Number.isFinite(last?.scoreTeam2) ? last.scoreTeam2 : null
    }
  }
  if (Array.isArray(m.matchResults) && m.matchResults.length) {
    const last = m.matchResults[m.matchResults.length - 1]
    return {
      goalsTeam1: Number.isFinite(last?.pointsTeam1) ? last.pointsTeam1 : null,
      goalsTeam2: Number.isFinite(last?.pointsTeam2) ? last.pointsTeam2 : null
    }
  }
  return { goalsTeam1: null, goalsTeam2: null }
}

async function normalize(matches) {
  return Promise.all(matches.map(async m => {
    const s = latestScore(m)
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
      goalsTeam1: s.goalsTeam1,
      goalsTeam2: s.goalsTeam2,
      team1: {
        teamId: m.team1?.teamId,
        teamName: m.team1?.teamName,
        shortName: m.team1?.shortName,
        logo: m.team1?.teamIconUrl || null
      },
      team2: {
        teamId: m.team2?.teamId,
        teamName: m.team2?.teamName,
        shortName: m.team2?.shortName,
        logo: m.team2?.teamIconUrl || null
      }
    }
  }))
}

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {}
    const season = qs.season
    const matchday = qs.matchday
    const wantCurrent = !!qs.current

    if (wantCurrent) {
      const key = 'current'
      const now = Date.now()
      const c = cache.get(key)
      if (c && now - c.t < TTL_MS) {
        return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(c.v) }
      }
      const payload = await getCurrentMatchday()
      cache.set(key, { t: now, v: payload })
      return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }
    }

    if (!season || !matchday) {
      return { statusCode: 400, body: JSON.stringify({ error: 'season and matchday required' }) }
    }

    const key = `fixtures-${season}-${matchday}`
    const now = Date.now()

    const c = cache.get(key)
    if (c && now - c.t < TTL_MS) {
      return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(c.v) }
    }

    try {
      const raw = await getFixtures(season, matchday)
      const matches = await normalize(raw)
      const payload = { matches }
      cache.set(key, { t: now, v: payload })
      return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }
    } catch (apiError) {
      console.warn("API-Fehler, nutze Fallback:", apiError)
      if (c) {
        return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(c.v) }
      } else {
        return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ matches: [], message: "Daten momentan nicht verfügbar" }) }
      }
    }

  } catch (e) {
    console.error('scores handler error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: 'server error', detail: String(e?.message || e) }) }
  }
}
