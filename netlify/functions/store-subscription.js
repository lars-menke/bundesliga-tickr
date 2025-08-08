
let subs = []

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  try {
    const sub = JSON.parse(event.body || '{}')
    if (!sub || !sub.endpoint) return { statusCode: 400, body: 'invalid sub' }
    if (!subs.find(s => s.endpoint === sub.endpoint)) subs.push(sub)
    return { statusCode: 200, body: 'ok' }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, body: 'server error' }
  }
}
