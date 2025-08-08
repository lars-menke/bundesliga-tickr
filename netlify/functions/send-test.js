
import webpush from 'web-push'

let subs = []
// NOTE: This shares memory with store-subscription only if the same container handles it.
// For production, store subs in a DB (e.g. Fauna/Upstash Redis/Netlify KV).

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const PUBLIC = process.env.VAPID_PUBLIC_KEY
    const PRIVATE = process.env.VAPID_PRIVATE_KEY
    if (!PUBLIC || !PRIVATE) return { statusCode: 500, body: 'Missing VAPID keys' }
    webpush.setVapidDetails('mailto:example@example.com', PUBLIC, PRIVATE)

    const payload = JSON.stringify({ title: 'BL Ticker', body: 'Test-Benachrichtigung', url: '/' })
    const results = []
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload)
        results.push({ ok: true })
      } catch (e) {
        results.push({ ok: false })
      }
    }))
    return { statusCode: 200, body: JSON.stringify({ sent: results.length }) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: 'server error' }
  }
}
