
// Client-side API helpers that talk to Netlify Functions
const base = '/.netlify/functions'

export async function getCurrentMatchday({ season }) {
  const url = `${base}/scores?season=${encodeURIComponent(season)}&current=1`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error('current matchday failed')
  const data = await r.json()
  return data.currentMatchday
}

export async function getFixtures({ season, matchday }) {
  const url = `${base}/scores?season=${encodeURIComponent(season)}&matchday=${encodeURIComponent(matchday)}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error('fixtures failed')
  const data = await r.json()
  return data.matches
}

// Web Push scaffolding (browser permission + subscribe)
// Requires environment vars on Netlify: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
export async function subscribeForPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const res = await fetch(`${base}/public-key`)
  if (!res.ok) return false
  const { publicKey } = await res.json()
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  })
  const storeRes = await fetch(`${base}/store-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  })
  return storeRes.ok
}

export async function testPush() {
  await fetch(`${base}/send-test`, { method: 'POST' })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
