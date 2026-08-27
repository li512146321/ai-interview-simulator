import pkg from 'pg'
const { Pool } = pkg

let pool = null

export function getDb() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return pool
}

export async function initDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      membership_tier TEXT DEFAULT 'free',
      membership_expires_at TEXT,
      interview_count INTEGER DEFAULT 0,
      last_interview_at TEXT,
      remaining_times INTEGER DEFAULT 3,
      last_active_at TEXT,
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      position TEXT NOT NULL,
      position_name TEXT,
      duration_seconds INTEGER DEFAULT 0,
      overall_score DOUBLE PRECISION,
      scores_json TEXT,
      question_count INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS interview_messages (
      id SERIAL PRIMARY KEY,
      session_id TEXT REFERENCES interview_sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      question_number INTEGER,
      timestamp TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'register',
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount DOUBLE PRECISION NOT NULL,
      plan_type TEXT NOT NULL,
      payment_method TEXT DEFAULT 'manual',
      payment_status TEXT DEFAULT 'pending',
      remark TEXT,
      created_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS user_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS fallback_questions (
      id SERIAL PRIMARY KEY,
      position TEXT NOT NULL,
      question TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (NOW()::text)
    );

    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '💼',
      description TEXT,
      category TEXT DEFAULT '其他',
      system_prompt TEXT,
      question_strategy TEXT,
      evaluation_criteria TEXT,
      sample_questions TEXT,
      is_active INTEGER DEFAULT 1,
      is_hot INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      default_question_count INTEGER,
      default_duration INTEGER,
      created_at TEXT DEFAULT (NOW()::text),
      updated_at TEXT DEFAULT (NOW()::text)
    );
  `)

  // 种子数据
  const { rows: existingCount } = await pool.query('SELECT COUNT(*) as count FROM positions')
  if (Number(existingCount[0].count) === 0) {
    const seedPositions = [
      ['产品经理', '💼', '产品规划、需求分析、项目管理', '互联网', 1, 1,
        '你是一位资深产品经理面试官，有10年以上产品经验，面试过500+候选人。\n\n你关注的核心维度：\n1. 用户思维：是否从用户角度思考问题，而非自我感动\n2. 数据驱动：是否用数据支撑决策，而非拍脑袋\n3. 需求优先级：是否能分辨核心需求与伪需求\n4. 逻辑表达：是否能清晰阐述产品思路\n\n追问原则：\n- 候选人提到具体产品/功能时，追问"你做了什么决策？为什么？"\n- 候选人说"用户反馈好"时，追问"具体数据是什么？怎么定义的？"\n- 候选人空谈理论时，追问"能举个实际例子吗？"\n- 回答跑题时，拉回"我理解你说的，但我问的是..."\n- 回答太短时，追问"能展开说说吗？"',
        '出题顺序：自我介绍 → 项目深挖 → 需求分析场景题 → 数据思维题 → 反问环节。重点考察：用户思维、数据驱动、逻辑表达。',
        '用户思维30%、数据驱动25%、逻辑表达25%、项目经验20%。',
        '["请介绍一个你负责的产品或功能","如何判断需求的优先级","你做过的最成功的产品决策是什么","如何衡量一个功能的好坏"]'],
      ['运营', '📊', '用户运营、内容运营、数据分析', '互联网', 1, 2,
        '你是一位资深运营面试官，8年运营经验，擅长用户增长和数据分析。\n\n你关注的核心维度：\n1. 数据敏感度：是否能从数据中发现问题和机会\n2. 用户洞察：是否理解用户心理和行为\n3. 执行能力：是否有实际落地案例\n4. 复盘能力：是否能从结果中提炼方法论',
        '出题顺序：自我介绍 → 案例分析（给一个增长问题）→ 数据拆解 → 复盘能力 → 反问环节。',
        '数据敏感度30%、用户洞察25%、执行能力25%、复盘能力20%。',
        '["分享一次你做的用户增长活动","如何提升用户留存率","你如何分析运营数据"]'],
      ['销售', '💰', '客户开发、商务谈判、业绩管理', '通用', 1, 3,
        '你是一位资深销售总监面试官，12年销售管理经验。\n\n你关注的核心维度：\n1. 目标感：是否有明确的业绩目标和达成路径\n2. 沟通说服力：是否能清晰表达价值主张\n3. 抗压能力：面对拒绝和困难时的反应\n4. 诚信度：是否存在夸大或虚构业绩',
        '出题顺序：自我介绍 → 情景模拟（难缠客户）→ 压力测试（质疑数据）→ 深入追问（具体成交过程）→ 反问环节。',
        '目标感30%、沟通说服力25%、抗压能力25%、诚信度20%。',
        '["介绍你最成功的一笔销售","客户说太贵了你怎么办","如何开发新客户"]'],
      ['技术', '💻', '软件开发、架构设计、技术管理', '互联网', 1, 4,
        '你是一位资深技术面试官，10年开发经验，目前担任技术总监。\n\n你关注的核心维度：\n1. 技术深度：是否触及底层原理\n2. 问题解决能力：是否有清晰的解决思路\n3. 项目经验：是否有实际案例支撑\n4. 代码质量意识：是否关注工程规范',
        '出题顺序：自我介绍 → 技术基础 → 项目深挖 → 系统设计 → 反问环节。重点考察：技术深度、解决实际问题的能力。',
        '技术深度30%、问题解决25%、项目经验20%、沟通表达15%、学习能力10%。',
        '["介绍一个你做的项目","项目中遇到的最大技术挑战","为什么选择这个技术栈","如何保证代码质量"]'],
      ['市场', '🎨', '品牌推广、市场策划、渠道拓展', '互联网', 0, 5,
        '你是一位资深市场总监面试官，10年品牌营销经验。\n\n你关注的核心维度：\n1. 创意能力：是否有独特的营销创意\n2. 渠道理解：是否熟悉各渠道特点和玩法\n3. ROI意识：是否关注投入产出比\n4. 品牌思维：是否有长期品牌建设视角',
        '出题顺序：自我介绍 → 案例分享（营销活动）→ 渠道策略 → 预算分配 → 反问环节。',
        '创意能力30%、渠道理解25%、ROI意识25%、品牌思维20%。',
        '["分享一次你策划的营销活动","如何选择合适的推广渠道","如何衡量营销效果"]'],
      ['通用', '📝', '适用任何岗位的基础面试', '通用', 1, 6,
        '你是一位资深HR面试官，15年招聘经验，面试过5000+候选人。\n\n你关注的核心维度：\n1. 沟通表达：是否清晰有条理\n2. 自我认知：是否了解自己的优劣势\n3. 职业规划：是否有明确目标\n4. 综合素质：逻辑思维、学习能力、团队协作',
        '出题顺序：自我介绍 → 行为面（STAR法则追问）→ 职业规划 → 动机考察 → 反问环节。',
        '沟通表达30%、自我认知25%、逻辑思维25%、职业规划20%。',
        '["请做自我介绍","你最大的优势是什么","为什么选择我们公司","你的职业规划是什么"]'],
    ]

    for (const p of seedPositions) {
      await pool.query(
        `INSERT INTO positions (name, icon, description, category, is_hot, sort_order, system_prompt, question_strategy, evaluation_criteria, sample_questions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (name) DO NOTHING`,
        p
      )
    }
  }

  console.log('[DB] PostgreSQL initialized successfully')
}

export async function getUserByNickname(nickname) {
  return (await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname])).rows[0] || null
}

export async function getUserById(id) {
  return (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0] || null
}

export async function createUser(nickname) {
  const existing = await getUserByNickname(nickname)
  if (existing) return existing
  const result = await pool.query(
    'INSERT INTO users (nickname, remaining_times) VALUES ($1, 3) RETURNING id',
    [nickname]
  )
  return getUserById(result.rows[0].id)
}

export async function updateUserMembership(userId, tier, expiresAt) {
  const remainingTimes = tier === 'monthly' || tier === 'yearly' ? 999 : 3
  await pool.query(
    "UPDATE users SET membership_tier = $1, membership_expires_at = $2, remaining_times = $3, updated_at = NOW()::text WHERE id = $4",
    [tier, expiresAt, remainingTimes, userId]
  )
}

export async function decrementUserTimes(userId) {
  await pool.query(
    'UPDATE users SET remaining_times = GREATEST(remaining_times - 1, 0), interview_count = interview_count + 1, last_interview_at = NOW()::text, updated_at = NOW()::text WHERE id = $1',
    [userId]
  )
}

export async function saveInterviewSession(session) {
  await pool.query(`
    INSERT INTO interview_sessions (id, user_id, position, position_name, duration_seconds, overall_score, scores_json, question_count, is_completed, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE SET
      user_id = $2, position = $3, position_name = $4, duration_seconds = $5,
      overall_score = $6, scores_json = $7, question_count = $8, is_completed = $9
  `, [
    session.id,
    session.userId,
    session.position,
    session.positionName,
    session.durationSeconds || 0,
    session.overallScore || null,
    session.scoresJson || null,
    session.questionCount || 0,
    session.isCompleted ? 1 : 0,
    session.createdAt || new Date().toISOString()
  ])
}

export async function saveInterviewMessage(sessionId, msg) {
  await pool.query(
    'INSERT INTO interview_messages (session_id, role, content, question_number, timestamp) VALUES ($1, $2, $3, $4, $5)',
    [sessionId, msg.role, msg.content, msg.questionNumber || null, msg.timestamp || new Date().toISOString()]
  )
}

export async function getInterviewSessions(userId) {
  return (await pool.query(
    'SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )).rows
}

export async function getInterviewMessages(sessionId) {
  return (await pool.query(
    'SELECT * FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
    [sessionId]
  )).rows
}

export async function deleteInterviewSession(sessionId) {
  await pool.query('DELETE FROM interview_messages WHERE session_id = $1', [sessionId])
  await pool.query('DELETE FROM interview_sessions WHERE id = $1', [sessionId])
}

export async function getUserStats(userId) {
  const stats = (await pool.query(`
    SELECT 
      COUNT(*) as total,
      ROUND(AVG(overall_score)::numeric, 1) as avg_score,
      MAX(overall_score) as max_score
    FROM interview_sessions 
    WHERE user_id = $1 AND is_completed = 1 AND overall_score IS NOT NULL
  `, [userId])).rows[0]
  return {
    totalInterviews: Number(stats.total) || 0,
    averageScore: Number(stats.avg_score) || 0,
    highestScore: Number(stats.max_score) || 0
  }
}

export async function checkQuota(userId) {
  const user = (await pool.query(
    'SELECT remaining_times, membership_tier, membership_expires_at FROM users WHERE id = $1',
    [userId]
  )).rows[0]
  if (!user) return { allowed: false, reason: '用户不存在', code: 'USER_NOT_FOUND' }

  if (user.membership_tier !== 'free') {
    if (!user.membership_expires_at || new Date(user.membership_expires_at) > new Date()) {
      return { allowed: true, remaining: -1, membershipTier: user.membership_tier }
    }
  }

  if (user.remaining_times > 0) {
    return { allowed: true, remaining: user.remaining_times, membershipTier: user.membership_tier }
  }

  return { allowed: false, remaining: 0, reason: 'QUOTA_EXHAUSTED', code: 'QUOTA_EXHAUSTED', membershipTier: user.membership_tier }
}

export async function checkAndUpdateMembership(user) {
  if (user.membership_tier === 'free') return user

  if (user.membership_expires_at && new Date(user.membership_expires_at) <= new Date()) {
    await pool.query(
      "UPDATE users SET membership_tier = 'free', remaining_times = 3, updated_at = NOW()::text WHERE id = $1",
      [user.id]
    )
    return { ...user, membership_tier: 'free', remaining_times: 3 }
  }

  return user
}

export async function getFallbackQuestions(position) {
  return (await pool.query(
    'SELECT * FROM fallback_questions WHERE position = $1 ORDER BY sort_order ASC',
    [position]
  )).rows
}

export async function getAllFallbackQuestions() {
  return (await pool.query(
    'SELECT * FROM fallback_questions ORDER BY position, sort_order ASC'
  )).rows
}

export async function addFallbackQuestion(position, question, sortOrder) {
  return (await pool.query(
    'INSERT INTO fallback_questions (position, question, sort_order) VALUES ($1, $2, $3) RETURNING id',
    [position, question, sortOrder || 0]
  )).rows[0]
}

export async function updateFallbackQuestion(id, position, question, sortOrder) {
  await pool.query(
    'UPDATE fallback_questions SET position = $1, question = $2, sort_order = $3 WHERE id = $4',
    [position, question, sortOrder, id]
  )
}

export async function deleteFallbackQuestion(id) {
  await pool.query('DELETE FROM fallback_questions WHERE id = $1', [id])
}

export async function getAverageScore(userId) {
  const result = (await pool.query(`
    SELECT AVG(overall_score) as avg_score FROM interview_sessions
    WHERE user_id = $1 AND is_completed = 1 AND overall_score IS NOT NULL
  `, [userId])).rows[0]
  return result && result.avg_score ? Math.round(Number(result.avg_score) * 10) / 10 : 0
}

// 岗位管理
export async function getActivePositions() {
  return (await pool.query(
    'SELECT id, name, icon, description, category, is_hot as "isHot", sort_order as "sortOrder", default_question_count as "defaultQuestionCount", default_duration as "defaultDuration" FROM positions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
  )).rows
}

export async function getAllPositions() {
  return (await pool.query(
    'SELECT *, is_active as "isActive", is_hot as "isHot", sort_order as "sortOrder", default_question_count as "defaultQuestionCount", default_duration as "defaultDuration" FROM positions ORDER BY sort_order ASC, id ASC'
  )).rows
}

export async function getPositionById(id) {
  return (await pool.query('SELECT * FROM positions WHERE id = $1', [id])).rows[0] || null
}

export async function createPosition(data) {
  const result = await pool.query(`
    INSERT INTO positions (name, icon, description, category, system_prompt, question_strategy, evaluation_criteria, sample_questions, is_active, is_hot, sort_order, default_question_count, default_duration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `, [
    data.name, data.icon || '💼', data.description || '', data.category || '其他',
    data.systemPrompt || null, data.questionStrategy || null, data.evaluationCriteria || null,
    data.sampleQuestions || null, data.isActive !== 0 ? 1 : 0, data.isHot ? 1 : 0, data.sortOrder || 0,
    data.defaultQuestionCount ?? null, data.defaultDuration ?? null
  ])
  return result.rows[0].id
}

export async function updatePosition(id, data) {
  await pool.query(`
    UPDATE positions SET name = $1, icon = $2, description = $3, category = $4,
      system_prompt = $5, question_strategy = $6, evaluation_criteria = $7, sample_questions = $8,
      is_active = $9, is_hot = $10, sort_order = $11, default_question_count = $12, default_duration = $13,
      updated_at = NOW()::text
    WHERE id = $14
  `, [
    data.name, data.icon || '💼', data.description || '', data.category || '其他',
    data.systemPrompt || null, data.questionStrategy || null, data.evaluationCriteria || null,
    data.sampleQuestions || null, data.isActive !== 0 ? 1 : 0, data.isHot ? 1 : 0, data.sortOrder || 0,
    data.defaultQuestionCount ?? null, data.defaultDuration ?? null,
    id
  ])
}

export async function deletePosition(id) {
  await pool.query("UPDATE positions SET is_active = 0, updated_at = NOW()::text WHERE id = $1", [id])
}