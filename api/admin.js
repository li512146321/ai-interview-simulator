import jwt from 'jsonwebtoken'
import { getDb, getAllFallbackQuestions, addFallbackQuestion, updateFallbackQuestion, deleteFallbackQuestion, getAllPositions, getPositionById, createPosition, updatePosition, deletePosition } from './db.js'
import { trackEvent } from './events.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'ai-interview-admin-secret-2024'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export function generateAdminToken() {
  return jwt.sign({ type: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '30m' })
}

export function verifyAdmin(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try {
    return jwt.verify(auth.slice(7), ADMIN_JWT_SECRET)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace('/api/admin', '')

  if (req.method === 'POST' && path === '/login') {
    await handleLogin(req, res)
    return
  }

  const admin = verifyAdmin(req)
  if (!admin) {
    return res.status(401).json({ error: '管理员未登录' })
  }

  if (req.method === 'GET' && path === '/overview') {
    await handleOverview(req, res)
  } else if (req.method === 'GET' && path === '/users') {
    await handleUsers(req, res)
  } else if (req.method === 'GET' && path === '/payments') {
    await handlePayments(req, res)
  } else if (req.method === 'POST' && path === '/grant-membership') {
    await handleGrantMembership(req, res)
  } else if (req.method === 'POST' && path === '/revoke-membership') {
    await handleRevokeMembership(req, res)
  } else if (req.method === 'GET' && path === '/funnel') {
    await handleFunnel(req, res)
  } else if (req.method === 'GET' && path === '/trend') {
    await handleTrend(req, res)
  } else if (req.method === 'GET' && path === '/whale-users') {
    await handleWhaleUsers(req, res)
  } else if (req.method === 'GET' && path === '/questions') {
    await handleGetQuestions(req, res)
  } else if (req.method === 'POST' && path === '/questions') {
    await handleAddQuestion(req, res)
  } else if (req.method === 'PUT' && path.startsWith('/questions/')) {
    await handleUpdateQuestion(req, res, path)
  } else if (req.method === 'DELETE' && path.startsWith('/questions/')) {
    await handleDeleteQuestion(req, res, path)
  } else if (req.method === 'GET' && path === '/positions') {
    await handleGetPositions(req, res)
  } else if (req.method === 'GET' && path.startsWith('/positions/')) {
    await handleGetPosition(req, res, path)
  } else if (req.method === 'POST' && path === '/positions') {
    await handleCreatePosition(req, res)
  } else if (req.method === 'PUT' && path.startsWith('/positions/')) {
    await handleUpdatePosition(req, res, path)
  } else if (req.method === 'DELETE' && path.startsWith('/positions/')) {
    await handleDeletePosition(req, res, path)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

async function handleLogin(req, res) {
  const { adminPassword } = req.body

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' })
  }

  const token = generateAdminToken()
  const expiresAt = Date.now() + 30 * 60 * 1000

  res.json({ adminToken: token, expiresAt })
}

async function handleOverview(req, res) {
  const db = getDb()

  const today = new Date().toISOString().slice(0, 10)

  const todayRegisters = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = $1",
    [today]
  )).rows[0].count

  const todayInterviews = (await db.query(
    "SELECT COUNT(*) as count FROM interview_sessions WHERE DATE(created_at) = $1",
    [today]
  )).rows[0].count

  const todayPayments = (await db.query(
    "SELECT COUNT(*) as count FROM payments WHERE DATE(created_at) = $1",
    [today]
  )).rows[0].count

  const todayRevenue = (await db.query(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = $1",
    [today]
  )).rows[0].total

  const totalUsers = (await db.query("SELECT COUNT(*) as count FROM users")).rows[0].count
  const totalPaidUsers = (await db.query("SELECT COUNT(*) as count FROM users WHERE membership_tier = 'paid'")).rows[0].count
  const totalInterviews = (await db.query("SELECT COUNT(*) as count FROM interview_sessions")).rows[0].count
  const totalRevenue = (await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments")).rows[0].total

  const paidUsers = (await db.query("SELECT COUNT(*) as count FROM users WHERE membership_tier = 'paid'")).rows[0].count
  const activeFreeUsers = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE membership_tier = 'free' AND remaining_times = 0 AND interview_count > 0"
  )).rows[0].count
  const lostFreeUsers = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE membership_tier = 'free' AND remaining_times = 0 AND interview_count > 0 AND last_active_at < (NOW() - INTERVAL '7 days')::text"
  )).rows[0].count
  const unusedUsers = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE membership_tier = 'free' AND remaining_times > 0 AND interview_count > 0"
  )).rows[0].count
  const neverStartedUsers = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE membership_tier = 'free' AND interview_count = 0"
  )).rows[0].count

  res.json({
    today: {
      registers: todayRegisters,
      interviews: todayInterviews,
      payments: todayPayments,
      revenue: todayRevenue,
    },
    total: {
      users: totalUsers,
      paidUsers: totalPaidUsers,
      interviews: totalInterviews,
      revenue: totalRevenue,
    },
    userTypes: {
      paid: paidUsers,
      active_free: activeFreeUsers,
      lost_free: lostFreeUsers,
      unused: unusedUsers,
      never_started: neverStartedUsers,
    },
  })
}

async function handleUsers(req, res) {
  const db = getDb()
  const url = new URL(req.url, 'http://localhost')
  const filter = url.searchParams.get('filter') || 'all'
  const search = url.searchParams.get('search') || ''
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('pageSize') || 20)

  let whereClause = ''
  const params = []

  if (search) {
    whereClause += 'WHERE email ILIKE $1'
    params.push(`%${search}%`)
  }

  if (filter === 'paid') {
    whereClause += (whereClause ? ' AND' : 'WHERE') + " membership_tier = 'paid'"
  } else if (filter === 'active') {
    whereClause += (whereClause ? ' AND' : 'WHERE') + " membership_tier = 'free' AND remaining_times = 0 AND interview_count > 0"
  } else if (filter === 'lost') {
    whereClause += (whereClause ? ' AND' : 'WHERE') + " membership_tier = 'free' AND remaining_times = 0 AND interview_count > 0 AND last_active_at < (NOW() - INTERVAL '7 days')::text"
  } else if (filter === 'unused') {
    whereClause += (whereClause ? ' AND' : 'WHERE') + " membership_tier = 'free' AND remaining_times > 0 AND interview_count > 0"
  }

  const totalCount = (await db.query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)).rows[0].count

  const offset = (page - 1) * pageSize
  const userParams = [...params, pageSize, offset]
  const users = (await db.query(`
    SELECT id, email, nickname, membership_tier, membership_expires_at,
           remaining_times, interview_count, last_interview_at, last_active_at, created_at
    FROM users ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, userParams)).rows

  res.json({ users, totalCount, page, pageSize })
}

async function handlePayments(req, res) {
  const db = getDb()
  const url = new URL(req.url, 'http://localhost')
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('pageSize') || 20)

  const totalCount = (await db.query('SELECT COUNT(*) as count FROM payments')).rows[0].count

  const offset = (page - 1) * pageSize
  const payments = (await db.query(`
    SELECT p.id, p.amount, p.plan_type, p.payment_method, p.payment_status, p.remark, p.created_at,
           u.email
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `, [pageSize, offset])).rows

  res.json({ payments, totalCount, page, pageSize })
}

async function handleGrantMembership(req, res) {
  const { email, plan = 'monthly', durationDays, amount, paymentMethod, remark } = req.body

  const planConfig = {
    monthly: {
      price: Number(process.env.PRICE_MONTHLY || 39),
      days: Number(process.env.MEMBERSHIP_MONTHLY_DAYS || 30),
    },
    yearly: {
      price: Number(process.env.PRICE_YEARLY || 199),
      days: Number(process.env.MEMBERSHIP_YEARLY_DAYS || 365),
    },
    custom: {
      price: Number(amount || 0),
      days: Number(durationDays || 30),
    },
  }

  const config = planConfig[plan]
  if (!config) {
    return res.status(400).json({ error: '无效的会员方案' })
  }

  const db = getDb()
  const user = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0]

  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const expiresAt = new Date(Date.now() + config.days * 24 * 3600 * 1000).toISOString()

  await db.query(`
    UPDATE users SET
      membership_tier = 'paid',
      membership_expires_at = $1,
      remaining_times = 999,
      updated_at = NOW()::text
    WHERE id = $2
  `, [expiresAt, user.id])

  await db.query(`
    INSERT INTO payments (user_id, amount, plan_type, payment_method, payment_status, remark)
    VALUES ($1, $2, $3, $4, 'paid', $5)
  `, [user.id, config.price, plan, paymentMethod || 'manual', remark || ''])

  await trackEvent(user.id, 'payment_success', { amount: config.price, plan })

  const planName = plan === 'yearly' ? '年费' : plan === 'monthly' ? '月度' : '自定义'

  res.json({
    success: true,
    message: `已为 ${email} 开通${config.days}天${planName}会员，收费¥${config.price}`,
  })
}

async function handleRevokeMembership(req, res) {
  const { email } = req.body

  const db = getDb()
  const user = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0]

  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  await db.query(`
    UPDATE users SET
      membership_tier = 'free',
      membership_expires_at = NULL,
      remaining_times = 0,
      updated_at = NOW()::text
    WHERE id = $1
  `, [user.id])

  res.json({ success: true, message: `已取消 ${email} 的会员` })
}

async function handleFunnel(req, res) {
  const db = getDb()
  const url = new URL(req.url, 'http://localhost')
  const days = Number(url.searchParams.get('days') || 30)

  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

  const registers = (await db.query("SELECT COUNT(*) as count FROM users WHERE created_at >= $1", [since])).rows[0].count
  const startedInterview = (await db.query(
    "SELECT COUNT(DISTINCT user_id) as count FROM interview_sessions WHERE created_at >= $1",
    [since]
  )).rows[0].count
  const completedInterview = (await db.query(
    "SELECT COUNT(DISTINCT user_id) as count FROM interview_sessions WHERE is_completed = 1 AND created_at >= $1",
    [since]
  )).rows[0].count
  const exhaustedQuota = (await db.query(
    "SELECT COUNT(*) as count FROM users WHERE membership_tier = 'free' AND remaining_times = 0 AND interview_count > 0 AND created_at >= $1",
    [since]
  )).rows[0].count
  const contactedAdmin = (await db.query(
    "SELECT COUNT(DISTINCT user_id) as count FROM user_events WHERE event_type = 'contact_admin' AND created_at >= $1",
    [since]
  )).rows[0].count
  const paid = (await db.query(
    "SELECT COUNT(DISTINCT user_id) as count FROM payments WHERE payment_status = 'paid' AND created_at >= $1",
    [since]
  )).rows[0].count

  res.json({
    registers,
    started_interview: startedInterview,
    completed_interview: completedInterview,
    exhausted_quota: exhaustedQuota,
    contacted_admin: contactedAdmin,
    paid,
  })
}

async function handleTrend(req, res) {
  const db = getDb()
  const url = new URL(req.url, 'http://localhost')
  const days = Number(url.searchParams.get('days') || 30)
  const metric = url.searchParams.get('metric') || 'registers'

  const trend = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10)

    let count = 0
    if (metric === 'registers') {
      count = (await db.query("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = $1", [date])).rows[0].count
    } else if (metric === 'interviews') {
      count = (await db.query("SELECT COUNT(*) as count FROM interview_sessions WHERE DATE(created_at) = $1", [date])).rows[0].count
    } else if (metric === 'revenue') {
      count = (await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = $1", [date])).rows[0].total
    }

    trend.push({ date, count })
  }

  res.json(trend)
}

async function handleWhaleUsers(req, res) {
  const db = getDb()

  const users = (await db.query(`
    SELECT email, interview_count, last_interview_at, created_at
    FROM users
    WHERE membership_tier = 'free' AND remaining_times = 0 AND interview_count >= 3
    ORDER BY interview_count DESC
    LIMIT 50
  `)).rows

  res.json({ users })
}

async function handleGetQuestions(req, res) {
  const questions = await getAllFallbackQuestions()
  res.json({ questions })
}

async function handleAddQuestion(req, res) {
  const { position, question, sortOrder } = req.body
  if (!position || !question) {
    return res.status(400).json({ error: 'position 和 question 为必填项' })
  }
  const result = await addFallbackQuestion(position, question, sortOrder || 0)
  res.json({ success: true, id: result.id })
}

async function handleUpdateQuestion(req, res, path) {
  const id = Number(path.split('/')[2])
  const { position, question, sortOrder } = req.body
  if (!position || !question) {
    return res.status(400).json({ error: 'position 和 question 为必填项' })
  }
  await updateFallbackQuestion(id, position, question, sortOrder || 0)
  res.json({ success: true })
}

async function handleDeleteQuestion(req, res, path) {
  const id = Number(path.split('/')[2])
  await deleteFallbackQuestion(id)
  res.json({ success: true })
}

async function handleGetPositions(req, res) {
  const positions = await getAllPositions()
  res.json({ positions })
}

async function handleGetPosition(req, res, path) {
  const id = Number(path.split('/')[2])
  const position = await getPositionById(id)
  if (!position) {
    return res.status(404).json({ error: '岗位不存在' })
  }
  res.json(position)
}

async function handleCreatePosition(req, res) {
  const { name, icon, description, category, isHot, isActive, sortOrder, systemPrompt, questionStrategy, evaluationCriteria, sampleQuestions, defaultQuestionCount, defaultDuration } = req.body
  if (!name) {
    return res.status(400).json({ error: '岗位名称为必填项' })
  }

  // 处理参考题目：如果是数组则JSON序列化，如果是字符串按换行分割
  let questionsJson = null
  if (sampleQuestions) {
    if (Array.isArray(sampleQuestions)) {
      questionsJson = JSON.stringify(sampleQuestions)
    } else if (typeof sampleQuestions === 'string') {
      const lines = sampleQuestions.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      questionsJson = JSON.stringify(lines)
    }
  }

  const id = await createPosition({
    name, icon, description, category,
    isHot: isHot ? 1 : 0,
    sortOrder: sortOrder || 0,
    systemPrompt: systemPrompt || null,
    questionStrategy: questionStrategy || null,
    evaluationCriteria: evaluationCriteria || null,
    sampleQuestions: questionsJson,
    isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
    defaultQuestionCount: defaultQuestionCount != null ? defaultQuestionCount : null,
    defaultDuration: defaultDuration != null ? defaultDuration : null,
  })

  res.json({ success: true, id })
}

async function handleUpdatePosition(req, res, path) {
  const id = Number(path.split('/')[2])
  const existing = await getPositionById(id)
  if (!existing) {
    return res.status(404).json({ error: '岗位不存在' })
  }

  const { name, icon, description, category, isHot, isActive, sortOrder, systemPrompt, questionStrategy, evaluationCriteria, sampleQuestions, defaultQuestionCount, defaultDuration } = req.body
  if (!name) {
    return res.status(400).json({ error: '岗位名称为必填项' })
  }

  // 处理参考题目
  let questionsJson = null
  if (sampleQuestions) {
    if (Array.isArray(sampleQuestions)) {
      questionsJson = JSON.stringify(sampleQuestions)
    } else if (typeof sampleQuestions === 'string') {
      const lines = sampleQuestions.split('\n').map(s => s.trim()).filter(s => s.length > 0)
      questionsJson = JSON.stringify(lines)
    }
  }

  await updatePosition(id, {
    name, icon, description, category,
    isHot: isHot !== undefined ? (isHot ? 1 : 0) : existing.is_hot,
    isActive: isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order,
    systemPrompt: systemPrompt !== undefined ? systemPrompt : existing.system_prompt,
    questionStrategy: questionStrategy !== undefined ? questionStrategy : existing.question_strategy,
    evaluationCriteria: evaluationCriteria !== undefined ? evaluationCriteria : existing.evaluation_criteria,
    sampleQuestions: questionsJson !== null ? questionsJson : existing.sample_questions,
    defaultQuestionCount: defaultQuestionCount !== undefined ? defaultQuestionCount : existing.default_question_count,
    defaultDuration: defaultDuration !== undefined ? defaultDuration : existing.default_duration,
  })

  res.json({ success: true })
}

async function handleDeletePosition(req, res, path) {
  const id = Number(path.split('/')[2])
  await deletePosition(id)
  res.json({ success: true })
}