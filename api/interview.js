import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getDb, checkQuota, checkAndUpdateMembership, getFallbackQuestions, getPositionById } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-interview-secret-key-2024'

function getUserId(req) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET)
    return decoded.userId
  } catch {
    return null
  }
}

function uuid() {
  return crypto.randomUUID()
}

function buildInterviewerPrompt({ position, difficulty, style, jdText, resumeText, customRequirements, currentQuestion, totalQuestions, isCivilServant }) {
  const parts = []

  // 1. 基础人设
  parts.push(getBasePersona(difficulty, style))

  // 2. 岗位专属提示词
  if (position) {
    if (position.system_prompt) {
      parts.push(`\n## 岗位面试官人设\n${position.system_prompt}`)
    }
    if (position.question_strategy) {
      parts.push(`\n## 出题策略\n${position.question_strategy}`)
    }
    if (position.evaluation_criteria) {
      parts.push(`\n## 评分标准\n${position.evaluation_criteria}`)
    }
    if (position.sample_questions) {
      try {
        const questions = JSON.parse(position.sample_questions)
        parts.push(`\n## 参考题目\n${questions.join('\n')}`)
      } catch {}
    }
  }

  // 3. 公务员面试特殊约束
  if (isCivilServant) {
    parts.push(`\n## 公务员面试核心规则（必须严格遵守）
1. 开场白已由系统发出（含第一题），你不得重复或修改开场白及第一题。
2. 系统会通过用户消息告诉你现在读第几题，你只读题目内容，不要自己数题号。
3. 总题数固定为${totalQuestions}题，不得增减。
4. 读题格式固定："第X题：[题目内容]。请思考后作答。"
5. 收到"面试已结束"指令时，请说结束语。
6. 如果是第2题及以后，请先简短过渡再读题。`)
  }

  // 4. 用户JD
  if (jdText) {
    parts.push(`\n## 用户提供的JD（请重点围绕以下要求提问）\n${jdText}`)
  }

  // 4. 用户简历
  if (resumeText) {
    parts.push(`\n## 候选人简历（请针对简历内容深挖追问）\n${resumeText}`)
  }

  // 5. 用户特殊要求
  if (customRequirements) {
    parts.push(`\n## 用户特别要求\n${customRequirements}`)
  }

  // 6. 进度提示（公务员面试已在上面包含进度信息，不重复）
  if (!isCivilServant) {
    parts.push(`\n当前进度：第${currentQuestion}题，共${totalQuestions}题。回答用纯文本，不要markdown。`)
  }

  return parts.join('\n\n---\n\n')
}

function getBasePersona(difficulty, style) {
  const diffMap = {
    easy: '你是一位温和的面试官，以鼓励为主，适当引导候选人。',
    pressure: '你是一位高压面试官，会质疑候选人的回答，测试其抗压能力。',
    standard: '你是一位专业的面试官，按照标准流程评估候选人。'
  }
  const styleMap = {
    friendly: '语气亲切，适当给予肯定。',
    strict: '语气严肃，不给暗示，严谨追问。',
    professional: '语气专业中立，客观提问。'
  }
  return `${diffMap[difficulty] || diffMap.standard} ${styleMap[style] || styleMap.professional}`
}

function buildScorePrompt(position) {
  const criteria = position?.evaluation_criteria
    ? '\n评分标准参考：' + position.evaluation_criteria
    : ''

  return '你是一位资深面试官，请根据以下面试对话记录，生成一份详细的面试评估报告。' + criteria + '\n' +
'\n' +
'返回严格的JSON格式（不要markdown代码块标记）：\n' +
'\n' +
'{\n' +
'  "overallScore": 7.2,\n' +
'  "summary": "一句话总结，30字以内，点出核心优势和要害问题",\n' +
'  "dimensions": {\n' +
'    "completeness": {"score": 8, "comment": "回答内容是否充实完整"},\n' +
'    "logic": {"score": 6, "comment": "逻辑是否清晰有条理"},\n' +
'    "persuasion": {"score": 4, "comment": "案例和数据是否有说服力"},\n' +
'    "fluency": {"score": 7, "comment": "表达是否流畅自然"},\n' +
'    "jobFit": {"score": 8, "comment": "回答与岗位的匹配程度"}\n' +
'  },\n' +
'  "strengths": [\n' +
'    {"title": "优势标题", "evidence": "具体对话中的证据，引用原话"}\n' +
'  ],\n' +
'  "weaknesses": [\n' +
'    {"title": "问题标题", "questionNumber": 3, "evidence": "具体对话中的证据，引用原话，说明为什么这是问题"}\n' +
'  ],\n' +
'  "questionAnalysis": [\n' +
'    {\n' +
'      "questionNumber": 1,\n' +
'      "question": "面试官问的问题原文摘要",\n' +
'      "score": 8,\n' +
'      "userAnswerSummary": "候选人回答的摘要",\n' +
'      "diagnosis": "问题诊断，30字以内",\n' +
'      "improvedAnswer": "改进后的回答话术，50字以内"\n' +
'    }\n' +
'  ],\n' +
'  "practiceSuggestions": ["具体的练习建议1", "建议2", "建议3", "建议4"]\n' +
'}\n' +
'\n' +
'要求：\n' +
'1. overallScore 为0-10的整数或一位小数\n' +
'2. strengths 列出2-3条核心优势，每条必须有evidence\n' +
'3. weaknesses 列出2-4条关键问题，每条必须有evidence和questionNumber\n' +
'4. questionAnalysis 为每条面试官提问做分析，每条都有score(0-10)、diagnosis和improvedAnswer\n' +
'5. practiceSuggestions 列出3-5条具体可执行的练习建议\n' +
'6. 所有评价必须基于对话内容，不要编造\n' +
'7. 直接返回JSON，不要用markdown代码块包裹，不要任何其他文字'
}

async function callGLM(messages, temperature = 0.7, maxTokens = 2000) {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) throw new Error('GLM_API_KEY not configured')

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages,
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error('GLM API error: ' + errorText)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callAI(chatMessages, temperature, maxTokens) {
  try {
    return await callGLM(chatMessages, temperature, maxTokens)
  } catch (err) {
    console.error('[AI] 智谱调用失败:', err.message)
    return null
  }
}

function getFallbackQuestion(position, questionIndex, fallbackQuestions) {
  if (!fallbackQuestions || fallbackQuestions.length === 0) return null
  const idx = questionIndex % fallbackQuestions.length
  return fallbackQuestions[idx].question
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname.replace('/api/interview', '')

  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: '未登录' })
  }

  const db = getDb()
  const user = (await db.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0]
  if (!user) {
    return res.status(401).json({ error: '用户不存在' })
  }

  if (req.method === 'POST' && path === '/start') {
    await handleStart(req, res, user)
  } else if (req.method === 'POST' && path === '/message') {
    await handleMessage(req, res, user)
  } else if (req.method === 'POST' && path === '/evaluate') {
    await handleEvaluate(req, res, user)
  } else if (req.method === 'GET' && path === '/history') {
    await handleHistory(req, res, user)
  } else if (req.method === 'GET' && path.startsWith('/report/')) {
    await handleReport(req, res, user, path)
  } else if (req.method === 'GET' && path.startsWith('/session/')) {
    await handleSessionDetail(req, res, user, path)
  } else if (req.method === 'DELETE' && path.startsWith('/session/')) {
    await handleDeleteSession(req, res, user, path)
  } else {
    res.status(404).json({ error: 'Not Found' })
  }
}

async function handleStart(req, res, user) {
  const { positionId, jdText, resumeText, difficulty, interviewerStyle, duration, questionCount, customRequirements, voiceEnabled } = req.body

  const updatedUser = await checkAndUpdateMembership(user)
  const quota = await checkQuota(updatedUser.id)
  if (!quota.allowed) {
    return res.status(403).json({ error: quota.reason || '面试次数已用完', code: quota.code || 'QUOTA_EXHAUSTED' })
  }

  const db = getDb()
  const sessionId = uuid()

  let positionData = null
  let positionName = '通用'
  if (positionId) {
    positionData = await getPositionById(positionId)
    if (positionData) {
      positionName = positionData.name
    }
  }

  if (!positionData) {
    positionData = (await db.query("SELECT * FROM positions WHERE name = '通用' AND is_active = 1")).rows[0]
    if (positionData) {
      positionName = positionData.name
    }
  }

  const totalQ = Math.max(2, Number(positionData?.default_question_count) || Number(questionCount) || 8)
  const effectiveDuration = positionData?.default_duration || duration || 10
  const effectiveDifficulty = difficulty || 'standard'
  const effectiveStyle = interviewerStyle || 'professional'

  await db.query(`
    INSERT INTO interview_sessions (id, user_id, position, position_name, question_count)
    VALUES ($1, $2, $3, $4, $5)
  `, [sessionId, user.id, positionName, positionName, totalQ])

  await db.query(
    "UPDATE users SET remaining_times = remaining_times - 1, last_active_at = NOW()::text WHERE id = $1",
    [user.id]
  )

  const isCivilServant = positionData?.category === '公务员' || positionName?.includes('公务员')
  let greeting
  let greetingQuestionNumber = 0
  if (isCivilServant) {
    const q1Prompt = `你是一位公考结构化面试考官。请为${positionName}候选人出一道面试题。
${resumeText ? '候选人的简历摘要：' + resumeText : ''}
${jdText ? '岗位JD：' + jdText : ''}
${customRequirements ? '特殊要求：' + customRequirements : ''}
只输出题目内容，不要加任何序号、不要加任何说明。`

    const q1Messages = [
      { role: 'system', content: q1Prompt },
      { role: 'user', content: '请出第一道面试题。' }
    ]

    let q1Content = await callAI(q1Messages, 0.7, 500)
    if (!q1Content) {
      q1Content = '请做一下自我介绍，并谈谈你为什么报考这个岗位。'
    }
    q1Content = q1Content.trim()

    greeting = `考生你好！欢迎参加今天的面试。本次面试共${totalQ}道题，总时长${effectiveDuration}分钟。请听题。\n\n${q1Content}。请思考后作答。`
    greetingQuestionNumber = 1
  } else {
    greeting = `你好！欢迎参加${positionName}的面试。我是今天的面试官，让我们开始吧，请先简单介绍一下你自己。`
    if (positionData?.question_strategy) {
      greeting = `你好！欢迎参加${positionName}的面试。${positionData.question_strategy.includes('自我介绍') ? '让我们开始吧，请先简单介绍一下你自己。' : '让我们开始吧！'}`
    }
  }

  await db.query(`
    INSERT INTO interview_messages (session_id, role, content, question_number)
    VALUES ($1, $2, $3, $4)
  `, [sessionId, 'interviewer', greeting, greetingQuestionNumber])

  const configJson = JSON.stringify({
    positionId: positionId || null,
    jdText: jdText || '',
    resumeText: resumeText || '',
    difficulty: effectiveDifficulty,
    interviewerStyle: effectiveStyle,
    questionCount: totalQ,
    duration: effectiveDuration,
    customRequirements: customRequirements || '',
    voiceEnabled: !!voiceEnabled,
    isCivilServant: !!isCivilServant,
  })

  await db.query('UPDATE interview_sessions SET scores_json = $1 WHERE id = $2', [configJson, sessionId])

  res.json({
    sessionId,
    messages: [{ role: 'interviewer', content: greeting }],
    positionName,
    totalQuestions: totalQ,
    questionIndex: isCivilServant ? 1 : 0,
  })
}

async function handleMessage(req, res, user) {
  const { sessionId, message } = req.body

  const db = getDb()
  const session = (await db.query(
    'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, user.id]
  )).rows[0]
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }

  const countResult = (await db.query(
    'SELECT COUNT(*) as count FROM interview_messages WHERE session_id = $1',
    [sessionId]
  )).rows[0]
  const questionNumber = Number(countResult.count)

  await db.query(`
    INSERT INTO interview_messages (session_id, role, content, question_number)
    VALUES ($1, $2, $3, $4)
  `, [sessionId, 'user', message, questionNumber])

  const history = (await db.query(
    'SELECT role, content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
    [sessionId]
  )).rows

  const totalQuestions = Math.max(2, Number(session.question_count) || 8)

  let config = {}
  try {
    config = JSON.parse(session.scores_json || '{}')
  } catch {}

  let currentQuestion
  let isClosing = false
  if (config.isCivilServant) {
    const realQCount = (await db.query(
      'SELECT COUNT(*) as count FROM interview_messages WHERE session_id = $1 AND role = $2 AND question_number > 0',
      [sessionId, 'interviewer']
    )).rows[0].count
    currentQuestion = Number(realQCount) + 1

    if (currentQuestion > totalQuestions) {
      isClosing = true
    }
  } else {
    currentQuestion = Math.floor(questionNumber / 2) + 2
  }

  if (!config.isCivilServant && currentQuestion > totalQuestions) {
    const closingReply = '好的，今天的面试就到这里。感谢你的参与，我会整理一份详细的面试报告，请稍等...'
    await db.query(`
      INSERT INTO interview_messages (session_id, role, content, question_number)
      VALUES ($1, $2, $3, $4)
    `, [sessionId, 'interviewer', closingReply, questionNumber + 1])
    return res.json({
      reply: closingReply,
      questionIndex: totalQuestions,
      isFinished: true,
    })
  }

  let positionData = null
  if (config.positionId) {
    positionData = await getPositionById(config.positionId)
  }
  if (!positionData) {
    positionData = (await db.query("SELECT * FROM positions WHERE name = '通用' AND is_active = 1")).rows[0]
  }

  const normalizedMessages = history.map(m => ({
    role: m.role === 'interviewer' ? 'assistant' : 'user',
    content: m.content
  }))

  if (config.isCivilServant) {
    for (let i = normalizedMessages.length - 1; i >= 0; i--) {
      if (normalizedMessages[i].role === 'user') {
        if (isClosing) {
          normalizedMessages[i].content = '面试已结束，请说结束语。\n' + normalizedMessages[i].content
        } else {
          normalizedMessages[i].content = `考生已回答完毕，你现在必须读出第${currentQuestion}题。\n` + normalizedMessages[i].content
        }
        break
      }
    }
  }

  const systemPrompt = buildInterviewerPrompt({
    position: positionData,
    difficulty: config.difficulty || 'standard',
    style: config.interviewerStyle || 'professional',
    jdText: config.jdText || '',
    resumeText: config.resumeText || '',
    customRequirements: config.customRequirements || '',
    currentQuestion,
    totalQuestions,
    isCivilServant: !!config.isCivilServant,
  })

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...normalizedMessages
  ]

  const aiReply = await callAI(chatMessages, 0.7, 2000)

  let reply
  if (aiReply) {
    reply = aiReply.replace('[INTERVIEW_END]', '').trim()
  } else if (isClosing) {
    reply = '好的，今天的面试就到这里。感谢你的参与，我会整理一份详细的面试报告，请稍等...'
  } else {
    const fallbackQuestions = getFallbackQuestions(session.position || 'general')
    const allFallback = fallbackQuestions.length > 0
      ? fallbackQuestions
      : getFallbackQuestions('general')
    const fallback = getFallbackQuestion(session.position, currentQuestion - 1, allFallback)
    reply = fallback || '请继续回答，你刚才提到的内容很有意思，能再详细展开说说吗？'
  }

  await db.query(`
    INSERT INTO interview_messages (session_id, role, content, question_number)
    VALUES ($1, $2, $3, $4)
  `, [sessionId, 'interviewer', reply, questionNumber + 1])

  res.json({
    reply,
    questionIndex: Math.min(currentQuestion, totalQuestions),
    isFinished: isClosing,
  })
}

async function handleEvaluate(req, res, user) {
  const { sessionId } = req.body

  const db = getDb()
  const session = (await db.query(
    'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, user.id]
  )).rows[0]
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }

  const history = (await db.query(
    'SELECT role, content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
    [sessionId]
  )).rows

  const normalizedMessages = history.map(m => ({
    role: m.role === 'interviewer' ? 'assistant' : 'user',
    content: m.content
  }))

  normalizedMessages.push({ role: 'user', content: '请根据以上面试对话生成评分报告' })

  let config = {}
  try {
    config = JSON.parse(session.scores_json || '{}')
  } catch {}
  let positionData = null
  if (config.positionId) {
    positionData = await getPositionById(config.positionId)
  }
  if (!positionData) {
    positionData = (await db.query("SELECT * FROM positions WHERE name = '通用' AND is_active = 1")).rows[0]
  }

  const systemPrompt = buildScorePrompt(positionData)
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...normalizedMessages
  ]

  const aiContent = await callAI(chatMessages, 0.3, 3000)

  let overallScore = null
  let scoresJson = null

  if (aiContent) {
    try {
      let cleanContent = aiContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const scores = JSON.parse(jsonMatch[0])
        overallScore = scores.overallScore || scores.total
        scoresJson = JSON.stringify(scores)
      }
    } catch (e) {
      console.error('[Evaluate] 解析 AI 评分失败:', e.message)
    }
  }

  if (!overallScore) {
    const userMessages = history.filter(m => m.role === 'user')
    const wordCount = userMessages.reduce((t, m) => t + m.content.length, 0)
    const avgLength = userMessages.length ? wordCount / userMessages.length : 0
    overallScore = Math.min(Math.round((avgLength / 20 + userMessages.length * 0.5) * 10) / 10, 10)
    scoresJson = JSON.stringify({
      overallScore,
      summary: 'AI 评分暂不可用，当前为规则评分。',
      dimensions: {
        completeness: { score: Math.round(overallScore * 10), comment: '综合表现' },
        logic: { score: Math.round(overallScore * 10), comment: '综合表现' },
        persuasion: { score: Math.round(overallScore * 10), comment: '综合表现' },
        fluency: { score: Math.round(overallScore * 10), comment: '综合表现' },
        jobFit: { score: Math.round(overallScore * 10), comment: '综合表现' },
      },
      strengths: [],
      weaknesses: [],
      questionAnalysis: [],
      practiceSuggestions: ['建议开启 AI 评分获得更准确的评估'],
    })
  }

  const questionCount = (await db.query(
    'SELECT COUNT(*) as count FROM interview_messages WHERE session_id = $1',
    [sessionId]
  )).rows[0].count

  await db.query(`
    UPDATE interview_sessions
    SET is_completed = 1, overall_score = $1, scores_json = $2, question_count = $3
    WHERE id = $4
  `, [overallScore, scoresJson, questionCount, sessionId])

  await db.query(`
    UPDATE users SET interview_count = interview_count + 1,
    last_interview_at = NOW()::text, last_active_at = NOW()::text
    WHERE id = $1
  `, [user.id])

  const updatedUser = (await db.query('SELECT * FROM users WHERE id = $1', [user.id])).rows[0]
  const parsedScores = JSON.parse(scoresJson)

  res.json({
    sessionId,
    overallScore: parsedScores.overallScore || overallScore,
    summary: parsedScores.summary || '',
    dimensions: parsedScores.dimensions || {},
    strengths: parsedScores.strengths || [],
    weaknesses: parsedScores.weaknesses || [],
    questionAnalysis: parsedScores.questionAnalysis || [],
    practiceSuggestions: parsedScores.practiceSuggestions || [],
    remainingTimes: updatedUser.remaining_times,
  })
}

async function handleReport(req, res, user, path) {
  const sessionId = path.split('/')[2]
  const db = getDb()

  const session = (await db.query(
    'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, user.id]
  )).rows[0]
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }

  let scoresJson = {}
  try {
    scoresJson = JSON.parse(session.scores_json || '{}')
  } catch {}

  const history = (await db.query(
    'SELECT role, content FROM interview_messages WHERE session_id = $1 ORDER BY id ASC',
    [sessionId]
  )).rows

  res.json({
    sessionId: session.id,
    overallScore: session.overall_score || scoresJson.overallScore || 0,
    summary: scoresJson.summary || '',
    dimensions: scoresJson.dimensions || {},
    strengths: scoresJson.strengths || [],
    weaknesses: scoresJson.weaknesses || [],
    questionAnalysis: scoresJson.questionAnalysis || [],
    practiceSuggestions: scoresJson.practiceSuggestions || [],
    history: history.map(m => ({ role: m.role, content: m.content })),
    createdAt: session.created_at,
  })
}

async function handleHistory(req, res, user) {
  const db = getDb()
  const sessions = (await db.query(`
    SELECT id, position, position_name, duration_seconds, overall_score,
           scores_json, question_count, is_completed, created_at
    FROM interview_sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [user.id])).rows

  const completedSessions = sessions.filter(s => s.overall_score !== null)
  const stats = {
    totalSessions: sessions.length,
    averageScore: completedSessions.length
      ? Math.round(completedSessions.reduce((s, r) => s + Number(r.overall_score), 0) / completedSessions.length * 10) / 10
      : 0,
    highestScore: completedSessions.length
      ? Math.max(...completedSessions.map(s => Number(s.overall_score)))
      : 0,
  }

  const mapped = sessions.map(s => ({
    id: s.id,
    position: s.position,
    position_name: s.position_name,
    duration_seconds: s.duration_seconds,
    score: s.overall_score,
    scores_json: s.scores_json,
    question_count: s.question_count,
    is_completed: s.is_completed,
    created_at: s.created_at,
  }))

  res.json({ sessions: mapped, stats })
}

async function handleSessionDetail(req, res, user, path) {
  const sessionId = path.split('/')[2]
  const db = getDb()

  const session = (await db.query(
    'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, user.id]
  )).rows[0]
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }

  const messages = (await db.query(`
    SELECT role, content, question_number, timestamp FROM interview_messages
    WHERE session_id = $1
    ORDER BY id ASC
  `, [sessionId])).rows

  res.json({
    session: {
      id: session.id,
      position: session.position,
      position_name: session.position_name,
      duration_seconds: session.duration_seconds,
      overall_score: session.overall_score,
      scores_json: session.scores_json,
      question_count: session.question_count,
      is_completed: session.is_completed,
      created_at: session.created_at,
    },
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      question_number: m.question_number,
      timestamp: m.timestamp,
    })),
  })
}

async function handleDeleteSession(req, res, user, path) {
  const sessionId = path.split('/')[2]
  const db = getDb()

  const session = (await db.query(
    'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
    [sessionId, user.id]
  )).rows[0]
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }

  await db.query('DELETE FROM interview_messages WHERE session_id = $1', [sessionId])
  await db.query('DELETE FROM interview_sessions WHERE id = $1', [sessionId])

  res.json({ success: true })
}