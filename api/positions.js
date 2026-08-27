import { getActivePositions } from './db.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const positions = await getActivePositions()
    res.json(positions)
  } else {
    res.status(405).json({ error: 'Method Not Allowed' })
  }
}