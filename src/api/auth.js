import request from '@/utils/request'

export async function login(email, password) {
  return await request.post('/api/auth/login', { email, password })
}

export async function register(email, password, code) {
  return await request.post('/api/auth/register', { email, password, code })
}

export async function getMe() {
  const token = localStorage.getItem('user_token')
  return await request.get('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function sendVerificationCode(email, purpose = 'register') {
  return await request.post('/api/verification/send', { email, purpose })
}

export async function checkQuota() {
  const token = localStorage.getItem('user_token')
  return await request.get('/api/quota/check', {
    headers: { Authorization: 'Bearer ' + token }
  })
}

export async function getPricing() {
  return await request.get('/api/pricing')
}

export async function trackEvent(eventType, eventData = {}) {
  const token = localStorage.getItem('user_token')
  try {
    await request.post('/api/events/track', { eventType, eventData }, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
  } catch (e) {
    // silent fail
  }
}