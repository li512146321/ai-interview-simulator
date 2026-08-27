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

function buildInterviewerPrompt({ position, difficulty, style, jdText, resumeText, customRequirements, currentQuestion, totalQuestions }) {
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

  // 3. 用户JD
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

  // 6. 进度提示
  parts.push(`\n当前进度：第${currentQuestion}题，共${totalQuestions}题。回答用纯文本，不要markdown。`)

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
    ? `\n评分标准参考：${position.evaluation_criteria}`
    : ''

  return `你是一位资深面试官，请根据以下面试对话记录，生成一份详细的面试评估报告。${criteria}

返回严格的JSON格式（不要markdown代码块标记）：

{
  "overallScore": 7.2,
  "summary": "一句话总结，30字以内，点出核心优势和要害问题",
  "dimensions": {
    "completeness": {"score": 8, "comment": "回答内容是否充实完整"},
    "logic": {"score": 6, "comment": "逻辑是否清晰有条理"},
    "persuasion": {"score": 4, "comment": "案例和数据是否有说服力"},
    "fluency": {"score": 7, "comment": "表达是否流畅自然"},
    "jobFit": {"score": 8, "comment": "回答与岗位的匹配程度"}
  },
  "strengths": [
    {"title": "优势标题", "evidence": "具体对话中的证据，引用原话"}
  ],
  "weaknesses": [
    {"title": "问题标题", "questionNumber": 3, "evidence": "具体对话中的证据，引用原话，说明为什么这是问题"}
  ],
  "questionAnalysis": [
    {
      "questionNumber": 1,
      "question": "面试官问的问题原文摘要",
      "score": 8,
      "userAnswerSummary": "候选人回答的摘要",
      "diagnosis": "问题诊断，30字以内",
      "improvedAnswer": "改进后的回答话术，50字以内"
    }
  ],
  "practiceSuggestions": ["具体的练习建议1", "建议2", "建议3", "建议4"]
}

要求：
1. overallScore 为0-10的整数或一位小数
2. strengths 列出2-3条核心优势，每条必须有evidence
3. weaknesses 列出2-4条关键问题，每条必须有evidence和questionNumber
4. questionAnalysis 为每条面试官提问做分析，每条都有score(0-10)、diagnosis和improvedAnswer
5. practiceSuggestions 列出3-5条具体可执行的练习建议
6. 所有评价必须基于对话内容，不要编造
7. 直接返回JSON，不要用markdown代码块包裹，不要任何其他文字`

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

console.log("ok")