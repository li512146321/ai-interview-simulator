import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { getDb } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-interview-secret-key-2024'

const loginAttempts = new Map()
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_BLOCK_MS = 30 * 60 * 1000

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
}

function checkLoginRateLimit(ip) {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (record && record.blockUntil && now < record.blockUntil) {
    return { allowed: false, waitSeconds: Math.ceil((record.blockUntil - now) / 1000) }
  }

  if (!record || now - record.startTime > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, startTime: now })
    return { allowed: true }
  }

  record.count++
  if (record.count > LOGIN_MAX_ATTEMPTS) {
    loginAttempts.set(ip, { count: record.count, startTime: record.startTime, blockUntil: now + LOGIN_BLOCK_MS })
    return { allowed: false, waitSeconds: Math.ceil(LOGIN_BLOCK_MS / 1000) }
  }

  return { allowed: true }
}

export function generateUserToken(userId) {
  return jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace('/api/auth', '')

  if (req.method === 'POST' && path === '/register') {
    await handleRegister(req, res)
  } else if (req.method === 'POST' && path === '/login') {
    await handleLogin(req, res)
  } else if (req.method === 'GET' && path === '/me') {
    await handleMe(req, res)
  } else if (req.method === 'POST' && path === '/update-profile') {
    await handleUpdateProfile(req, res)
  } else if (req.method === 'POST' && path === '/delete-account') {
    await handleDeleteAccount(req, res)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

async function handleRegister(req, res) {
  const { email, password, code } = req.body

  if (!email || !password || !code) {
    return res.status(400).json({ error: '请填写所有字段' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }

  const db = getDb()

  const existing = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册' })
  }

  const verification = (await db.query(
    "SELECT * FROM email_verifications WHERE email = $1 AND purpose = 'register' AND used = 0 AND expires_at > NOW()::text ORDER BY id DESC LIMIT 1",
    [email]
  )).rows[0]

  if (!verification || verification.code !== code) {
    return res.status(400).json({ error: '验证码错误或已过期' })
  }

  await db.query('UPDATE email_verifications SET used = 1 WHERE id = $1', [verification.id])

  const passwordHash = bcrypt.hashSync(password, 10)
  const freeTrialTimes = Number(process.env.FREE_TRIAL_TIMES || 3)

  const defaultNickname = email.split('@')[0] || email

  const result = await db.query(`
    INSERT INTO users (nickname, email, password_hash, remaining_times)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [defaultNickname, email, passwordHash, freeTrialTimes])

  const userId = result.rows[0].id

  const token = generateUserToken(userId)

  res.json({
    token,
    user: {
      id: userId,
      email,
      nickname: defaultNickname,
      membership_tier: 'free',
      remaining_times: freeTrialTimes,
      interview_count: 0,
    },
  })
}

async function handleLogin(req, res) {
  const ip = getClientIp(req)
  const rateCheck = checkLoginRateLimit(ip)
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `登录尝试过于频繁，请${rateCheck.waitSeconds}秒后再试`,
      waitSeconds: rateCheck.waitSeconds
    })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: '请填写邮箱和密码' })
  }

  const db = getDb()
  const user = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0]

  if (!user) {
    return res.status(400).json({ error: '邮箱未注册' })
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(400).json({ error: '密码错误' })
  }

  const token = generateUserToken(user.id)

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      membership_tier: user.membership_tier,
      membership_expires_at: user.membership_expires_at,
      remaining_times: user.remaining_times,
      interview_count: user.interview_count,
    },
  })
}

async function handleMe(req, res) {
  const decoded = verifyToken(req)
  if (!decoded) {
    return res.status(401).json({ error: '未登录' })
  }

  const db = getDb()
  const user = (await db.query(`
    SELECT id, email, nickname, membership_tier, membership_expires_at,
           remaining_times, interview_count, created_at
    FROM users WHERE id = $1
  `, [decoded.userId])).rows[0]

  if (!user) {
    return res.status(401).json({ error: '用户不存在' })
  }

  const avgScore = await getAverageScore(decoded.userId)

  res.json({
    ...user,
    average_score: avgScore,
  })
}

async function handleUpdateProfile(req, res) {
  const decoded = verifyToken(req)
  if (!decoded) {
    return res.status(401).json({ error: '未登录' })
  }

  const { nickname } = req.body
  const db = getDb()
  await db.query("UPDATE users SET nickname = $1, updated_at = NOW()::text WHERE id = $2", [nickname || '', decoded.userId])

  res.json({ success: true })
}

async function handleDeleteAccount(req, res) {
  const decoded = verifyToken(req)
  if (!decoded) {
    return res.status(401).json({ error: '未登录' })
  }

  const db = getDb()

  const sessionIds = (await db.query('SELECT id FROM interview_sessions WHERE user_id = $1', [decoded.userId])).rows
  for (const s of sessionIds) {
    await db.query('DELETE FROM interview_messages WHERE session_id = $1', [s.id])
  }
  await db.query('DELETE FROM interview_sessions WHERE user_id = $1', [decoded.userId])
  await db.query('DELETE FROM payments WHERE user_id = $1', [decoded.userId])
  await db.query('DELETE FROM user_events WHERE user_id = $1', [decoded.userId])
  await db.query("DELETE FROM email_verifications WHERE email = (SELECT email FROM users WHERE id = $1)", [decoded.userId])
  await db.query('DELETE FROM users WHERE id = $1', [decoded.userId])

  res.json({ success: true })
}

async function getAverageScore(userId) {
  const db = getDb()
  const result = (await db.query(`
    SELECT AVG(overall_score) as avg_score FROM interview_sessions
    WHERE user_id = $1 AND is_completed = 1 AND overall_score IS NOT NULL
  `, [userId])).rows[0]
  return result && result.avg_score ? Math.round(Number(result.avg_score) * 10) / 10 : 0
}