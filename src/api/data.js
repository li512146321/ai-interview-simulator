import request from '@/utils/request'

export async function startInterview(params) {
  const token = localStorage.getItem('user_token')
  return await request.post('/api/interview/start', params, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function sendMessage(params) {
  const token = localStorage.getItem('user_token')
  return await request.post('/api/interview/message', params, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function evaluateInterview(params) {
  const token = localStorage.getItem('user_token')
  return await request.post('/api/interview/evaluate', params, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function getInterviewHistory() {
  const token = localStorage.getItem('user_token')
  return await request.get('/api/interview/history', {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function getSessionDetail(sessionId) {
  const token = localStorage.getItem('user_token')
  return await request.get('/api/interview/session/' + sessionId, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function deleteSession(sessionId) {
  const token = localStorage.getItem('user_token')
  return await request.delete('/api/interview/session/' + sessionId, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function getProfile() {
  const token = localStorage.getItem('user_token')
  return await request.get('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function updateProfile(params) {
  const token = localStorage.getItem('user_token')
  return await request.post('/api/auth/update-profile', params, {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function deleteAccount() {
  const token = localStorage.getItem('user_token')
  return await request.post('/api/auth/delete-account', {}, {
    headers: { Authorization: 'Bearer ' + token }
  })
}