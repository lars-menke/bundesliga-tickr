
export const handler = async () => {
  // Provide VAPID public key to the client
  const publicKey = process.env.VAPID_PUBLIC_KEY || ''
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey })
  }
}
