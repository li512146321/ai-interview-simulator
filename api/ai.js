export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, messages, position, resumeText, currentQuestion, totalQuestions, resumeRawText } = req.body

  if (!action) {
    return res.status(400).json({ error: 'Missing action' })
  }

  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GLM_API_KEY not configured' })
  }

  try {
    let systemPrompt = ''

    if (action === 'chat') {
      const positionNames = {
        java: 'Java',
        frontend: '前端',
        shengkao: '省考公务员',
        guokao: '国考公务员',
        shiyebian: '事业单位',
        jiaoshi: '教师招聘'
      }
      const techTypes = ['java', 'frontend']
      const positionName = positionNames[position] || position
      const currentQ = currentQuestion || 1
      const totalQ = totalQuestions || 15

      if (techTypes.includes(position)) {
        systemPrompt = `你是一位资深技术面试官，正在面试一位${positionName}开发工程师。
候选人的简历摘要：${resumeText || '未提供简历'}
规则：
- 根据简历内容提问，围绕候选人的项目经验和技术栈
- 每次只问一个问题，问题要有深度
- 根据回答质量决定是否追问
- 总共问${totalQ}个问题
- 当前是第${currentQ}题，共${totalQ}题
- 回答用纯文本，不要markdown`
      } else if (position === 'jiaoshi') {
        systemPrompt = `你是一位教师招聘面试考官，正在面试一位${positionName}候选人。
候选人的简历摘要：${resumeText || '未提供简历'}
面试分为结构化问答和试讲两个环节：
- 结构化问答：围绕教育理念、班级管理、学生心理、家校沟通、应急处理等方向提问
- 试讲环节：请候选人选择一个学科知识点进行8分钟模拟试讲
规则：
- 每次只问一个问题，问题要有深度和针对性
- 根据回答质量决定是否追问
- 总共问${totalQ}个问题
- 当前是第${currentQ}题，共${totalQ}题
- 回答用纯文本，不要markdown`
      } else {
        systemPrompt = `你是一位公考结构化面试考官，正在面试一位${positionName}候选人。
候选人的简历摘要：${resumeText || '未提供简历'}
结构化面试考察要素：
1. 综合分析能力（社会现象分析、政策理解、哲理观点评析）
2. 组织协调能力（活动策划、调研组织、工作安排）
3. 应急应变能力（突发事件处理、群众工作、舆情应对）
4. 人际关系处理（与领导、同事、群众、家人的关系处理）
5. 岗位匹配与自我认知（报考动机、职业规划、优缺点）
6. 言语表达能力（逻辑清晰、表达流畅）
规则：
- 每次只出一道题，题型随机覆盖以上6个考察要素
- 根据回答质量可适当追问
- 总共问${totalQ}个问题
- 当前是第${currentQ}题，共${totalQ}题
- 回答用纯文本，不要markdown`
      }
    } else if (action === 'score') {
        const isCivil = ['shengkao', 'guokao', 'shiyebian', 'jiaoshi'].includes(position)

        if (position === 'jiaoshi') {
            systemPrompt = `根据以下面试对话记录，生成评分报告。返回JSON格式：
{
  "total": 85,
  "details": [
    {"category": "教育理念", "score": 90},
    {"category": "教学能力", "score": 85},
    {"category": "学生管理", "score": 80},
    {"category": "家校沟通", "score": 88},
    {"category": "语言表达", "score": 82}
  ],
  "comment": "综合评价...",
  "suggestions": ["建议1", "建议2", "建议3"]
}

只返回JSON，不要其他内容。`
        } else if (isCivil) {
            systemPrompt = `根据以下面试对话记录，生成评分报告。返回JSON格式：
{
  "total": 85,
  "details": [
    {"category": "综合分析", "score": 90},
    {"category": "组织协调", "score": 85},
    {"category": "应急应变", "score": 80},
    {"category": "人际沟通", "score": 88},
    {"category": "岗位匹配", "score": 82}
  ],
  "comment": "综合评价...",
  "suggestions": ["建议1", "建议2", "建议3"]
}

只返回JSON，不要其他内容。`
        } else {
            systemPrompt = `根据以下面试对话记录，生成评分报告。返回JSON格式：
{
  "total": 85,
  "details": [
    {"category": "技术基础", "score": 90},
    {"category": "项目经验", "score": 85},
    {"category": "问题解决", "score": 80},
    {"category": "沟通表达", "score": 88},
    {"category": "学习能力", "score": 82}
  ],
  "comment": "综合评价...",
  "suggestions": ["建议1", "建议2", "建议3"]
}

只返回JSON，不要其他内容。`
        }
    } else if (action === 'parse_resume') {
        console.log('parse_resume start, resumeRawText length:', resumeRawText?.length)

        systemPrompt = `你是一位专业的简历解析助手。请根据以下简历原始文本，提取关键信息并整理成简洁的摘要。
摘要应包含：
1. 姓名（如果有）
2. 技术栈/技能
3. 工作经历和项目经验（重点）
4. 教育背景
5. 其他亮点

要求：
- 用中文输出
- 控制在300字以内
- 突出技术相关的项目经验
- 纯文本，不要markdown格式`

        const chatMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请解析以下简历内容：\n${resumeRawText}` }
        ]

        console.log('Calling GLM API for parse_resume...')

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: chatMessages,
                temperature: 0.3,
                max_tokens: 1000
            })
        })

        console.log('GLM API response status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('GLM API error:', errorText)
            return res.status(500).json({ error: 'GLM API request failed: ' + errorText })
        }

        const data = await response.json()
        console.log('GLM API response data:', JSON.stringify(data).substring(0, 200))

        const parsedText = data.choices[0]?.message?.content || ''
        console.log('parse_resume result:', parsedText.substring(0, 100))

        res.json({
            resumeText: parsedText,
            timestamp: Date.now()
        })
        return
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

    // 把 role: 'ai' 转成智谱要求的 role: 'assistant'
    const normalizedMessages = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
    }))

      if (action === 'score' && normalizedMessages.length > 0) {
          const lastMsg = normalizedMessages[normalizedMessages.length - 1]
          if (lastMsg.role === 'assistant') {
              normalizedMessages.push({ role: 'user', content: '请根据以上面试对话生成评分报告' })
          }
      }

    const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(normalizedMessages.length > 0 ? normalizedMessages : [{ role: 'user', content: '开始面试' }])
    ]

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: chatMessages,
        temperature: action === 'score' ? 0.3 : 0.7,
        max_tokens: action === 'score' ? 1500 : 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GLM API error:', errorText)
      return res.status(500).json({ error: 'GLM API request failed' })
    }

    const data = await response.json()
    let aiContent = data.choices[0]?.message?.content || ''
    console.log('[GLM] action:', action, 'content length:', aiContent.length, 'preview:', aiContent.substring(0, 200))
      if (!aiContent && action === 'score') {
          console.log('[Score] 返回空，重试一次')
          const retryRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                  model: 'glm-4-flash',
                  messages: chatMessages,
                  temperature: 0.3,
                  max_tokens: 1500
              })
          })
          const retryData = await retryRes.json()
          aiContent = retryData.choices[0]?.message?.content || ''
      }
    if (action === 'chat') {
      const isFinished = aiContent.includes('[INTERVIEW_END]') || aiContent.includes('面试结束')
      const question = aiContent.replace('[INTERVIEW_END]', '').trim()
      res.json({
        question,
        timestamp: Date.now(),
        isFinished
      })
    } else if (action === 'score') {
    try {
        let cleanContent = aiContent
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim()

        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
        console.log('[Score] AI 返回原始内容:', aiContent.substring(0, 500))
        if (jsonMatch) {
            const scores = JSON.parse(jsonMatch[0])
            // 拆分 suggestions：如果是单个字符串用分号或数字序号拆分
            if (scores.suggestions && scores.suggestions.length === 1 && typeof scores.suggestions[0] === 'string') {
                const text = scores.suggestions[0]
                // 按分号、数字序号、换行拆分
                const split = text.split(/[；;]|\d+[.、．]|\n/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0)
                if (split.length > 1) {
                    scores.suggestions = split
                }
            }
            res.json({ scores })
        } else {
          res.json({
            scores: {
              total: 75,
              details: [
                { category: '技术基础', score: 80 },
                { category: '项目经验', score: 75 },
                { category: '问题解决', score: 70 },
                { category: '沟通表达', score: 78 },
                { category: '学习能力', score: 72 }
              ],
              comment: '面试表现良好，建议继续提升技术深度。',
              suggestions: [
                '加强对核心技术的理解',
                '多参与实际项目',
                '提升问题解决能力'
              ]
            }
          })
        }
      } catch (parseError) {
        console.error('Parse scores error:', parseError)
        res.json({
          scores: {
            total: 75,
            details: [
              { category: '技术基础', score: 80 },
              { category: '项目经验', score: 75 },
              { category: '问题解决', score: 70 },
              { category: '沟通表达', score: 78 },
              { category: '学习能力', score: 72 }
            ],
            comment: '面试表现良好，建议继续提升技术深度。',
            suggestions: [
              '加强对核心技术的理解',
              '多参与实际项目',
              '提升问题解决能力'
            ]
          }
        })
      }
    }
  } catch (error) {
    console.error('AI API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}