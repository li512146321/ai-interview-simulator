import request from '@/utils/request'

export async function getFirstQuestion(position, resumeText) {
  return await request.post('/api/ai', {
    action: 'chat',
    messages: [],
    position,
    resumeText,
    currentQuestion: 1,
    totalQuestions: 15
  })
}

export async function sendMessage(text, options) {
  const { position, resumeText, messages: historyMessages, currentQuestion, totalQuestions } = options

  const requestMessages = [
    ...historyMessages,
    { role: 'user', content: text }
  ]

  return await request.post('/api/ai', {
    action: 'chat',
    messages: requestMessages,
    position,
    resumeText,
    currentQuestion,
    totalQuestions
  })
}

export async function endInterview(position, chatHistory) {
  return await request.post('/api/ai', {
    action: 'score',
    messages: chatHistory,
    position
  })
}

export async function parseResume(resumeRawText) {
  return await request.post('/api/ai', {
    action: 'parse_resume',
    resumeRawText
  })
}

export async function speechToText(audioBase64) {
  return await request.post('/api/speech', { audio: audioBase64 })
}

export async function textToSpeech(text) {
  return await request.post('/api/tts', { text })
}

export async function getInterviewReport(sessionId) {
  const token = localStorage.getItem('user_token')
  return await request.get(`/api/interview/report/${sessionId}`, {
    headers: { Authorization: 'Bearer ' + token }
  })
}