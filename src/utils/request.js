const BASE_URL = ''

class RequestError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  const response = await fetch(BASE_URL + url, config)
  const data = await response.json()

  if (!response.ok) {
    throw new RequestError(data.error || 'Request failed', response.status, data)
  }

  return data
}

request.get = (url, options = {}) => request(url, { ...options, method: 'GET' })
request.post = (url, body, options = {}) => request(url, { ...options, method: 'POST', body })
request.put = (url, body, options = {}) => request(url, { ...options, method: 'PUT', body })
request.delete = (url, options = {}) => request(url, { ...options, method: 'DELETE' })

export default request