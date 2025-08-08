
import fetch from 'node-fetch'

// cache in memory
const cache = new Map()
const TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

const searchWikipediaLogo = async (team) => {
  const q = encodeURIComponent(`${team} logo`)
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&srlimit=1`
  const r = await fetch(searchUrl)
  if (!r.ok) throw new Error('wiki search failed')
  const s = await r.json()
  const pageId = s?.query?.search?.[0]?.pageid
  if (!pageId) return null
  const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pageids=${pageId}&pithumbsize=96`
  const r2 = await fetch(imgUrl)
  if (!r2.ok) return null
  const j2 = await r2.json()
  const pages = j2?.query?.pages || {}
  const first = pages[Object.keys(pages)[0]]
  const thumb = first?.thumbnail?.source
  return thumb || null
}

export const handler = async (event) => {
  try {
    const team = event.queryStringParameters?.team
    if (!team) return { statusCode: 400, body: JSON.stringify({ error: 'team missing' }) }
    const key = team.toLowerCase()
    const now = Date.now()
    const c = cache.get(key)
    if (c && now - c.t < TTL) return { statusCode: 200, body: JSON.stringify({ logo: c.v }), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } }
    const logo = await searchWikipediaLogo(team)
    if (logo) {
      cache.set(key, { t: now, v: logo })
      return { statusCode: 200, body: JSON.stringify({ logo }), headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' } }
    }
    return { statusCode: 404, body: JSON.stringify({ error: 'logo not found' }) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: JSON.stringify({ error: 'server error' }) }
  }
}
