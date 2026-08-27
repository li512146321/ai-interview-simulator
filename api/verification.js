import nodemailer from 'nodemailer'
import { getDb } from './db.js'

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.qq.com',
    port: Number(process.env.EMAIL_PORT || 465),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  return transporter
}

async function sendVerificationCode(email, purpose = 'register') {
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const db = getDb()
  await db.query(
    'INSERT INTO email_verifications (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [email, code, purpose, expiresAt]
  )

  const mailer = getTransporter()
  await mailer.sendMail({
    from: process.env.EMAIL_FROM || '"AI面试官" <noreply@example.com>',
    to: email,
    subject: '【AI面试官】验证码',
    html: `
      <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1E3A5F; font-size: 22px; margin: 0;">AI面试官</h1>
        <p style="color: #333; font-size: 15px;">你的验证码是：</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1E3A5F; padding: 20px; background: #F0F4F8; border-radius: 10px; text-align: center; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #666; font-size: 13px;">验证码10分钟内有效。如果不是你的操作，请忽略此邮件。</p>
      </div>
    `,
  })

  return code
}

const ipRateLimit = new Map()

function checkIpRateLimit(ip) {
  const now = Date.now()
  const record = ipRateLimit.get(ip)
  if (record && now - record.time < 60000) {
    record.count++
    if (record.count > 3) return false
  } else {
    ipRateLimit.set(ip, { time: now, count: 1 })
  }
  return true
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace('/api/verification', '')

  if (req.method === 'POST' && path === '/send') {
    await handleSend(req, res)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

async function handleSend(req, res) {
  const { email, purpose = 'register' } = req.body
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'

  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' })
  }

  if (!checkIpRateLimit(ip)) {
    return res.status(429).json({ error: '发送过于频繁，请稍后再试' })
  }

  const db = getDb()

  if (purpose === 'register') {
    const existing = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]
    if (existing) {
      return res.status(400).json({ error: '该邮箱已注册' })
    }
  }

  const recent = (await db.query(
    "SELECT id FROM email_verifications WHERE email = $1 AND created_at > (NOW() - INTERVAL '1 minute')::text",
    [email]
  )).rows[0]

  if (recent) {
    return res.status(429).json({ error: '发送过于频繁，请稍后再试' })
  }

  try {
    await sendVerificationCode(email, purpose)
    res.json({ success: true, message: '验证码已发送' })
  } catch (e) {
    console.error('Send verification email failed:', e)
    res.status(500).json({ error: '邮件发送失败，请稍后重试' })
  }
}