import { getDb } from './db.js'

export async function trackEvent(userId, eventType, eventData = {}) {
  try {
    const db = getDb()
    await db.query(
      'INSERT INTO user_events (user_id, event_type, event_data) VALUES ($1, $2, $3)',
      [userId || null, eventType, JSON.stringify(eventData)]
    )
  } catch (e) {
    console.error('Track event failed:', e)
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace('/api/events', '')

  if (req.method === 'POST' && path === '/track') {
    await handleTrack(req, res)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

async function handleTrack(req, res) {
  const { eventType, eventData = {} } = req.body

  if (!eventType) {
    return res.status(400).json({ error: '缺少事件类型' })
  }

  let userId = null
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const jwt = await import('jsonwebtoken')
      const decoded = jwt.default.verify(auth.slice(7), process.env.JWT_SECRET || 'ai-interview-secret-key-2024')
      userId = decoded.userId
    } catch {}
  }

  await trackEvent(userId, eventType, eventData)

  res.json({ success: true })
}