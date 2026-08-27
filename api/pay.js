import crypto from 'crypto'

const plans = {
  single: { name: '单次体验', amount: 4.9 },
  five: { name: '5次卡', amount: 19.9 },
  monthly: { name: '月卡', amount: 29.9 }
}

function generateSign(params, key) {
  const sortedKeys = Object.keys(params).sort()
  const signStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + key
  return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase()
}

export default async function handler(req, res) {
  if (req.method === 'POST' && req.url?.includes('/create')) {
    return handleCreateOrder(req, res)
  } else if (req.method === 'POST' && req.url?.includes('/notify')) {
    return handleNotify(req, res)
  } else if (req.method === 'GET' && req.url?.includes('/query')) {
    return handleQuery(req, res)
  } else {
    return res.status(404).json({ error: 'Not found' })
  }
}

async function handleCreateOrder(req, res) {
  try {
    const { plan, userId } = req.body

    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing parameters' })
    }

    const planInfo = plans[plan]
    if (!planInfo) {
      return res.status(400).json({ error: 'Invalid plan' })
    }

    const epayPid = process.env.EPAY_PID
    const epayKey = process.env.EPAY_KEY
    const epayApiUrl = process.env.EPAY_API_URL

    if (!epayPid || !epayKey || !epayApiUrl) {
      const mockOrder = {
        outTradeNo: `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        plan,
        amount: planInfo.amount,
        status: 'paid',
        paidAt: Date.now()
      }
      console.log('Mock payment created:', mockOrder)
      return res.json({
        success: true,
        mock: true,
        order: mockOrder
      })
    }

    const outTradeNo = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const notifyUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/pay/notify`
    const returnUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/profile`

    const params = {
      pid: epayPid,
      type: 'alipay',
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: planInfo.name,
      money: planInfo.amount.toFixed(2),
      sign_type: 'MD5'
    }

    const sign = generateSign(params, epayKey)
    params.sign = sign

    const queryString = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
    const payUrl = `${epayApiUrl}?${queryString}`

    console.log('Payment order created:', { outTradeNo, plan, amount: planInfo.amount })

    res.json({
      success: true,
      mock: false,
      payUrl,
      outTradeNo
    })
  } catch (error) {
    console.error('Create order error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleNotify(req, res) {
  try {
    const epayKey = process.env.EPAY_KEY
    if (!epayKey) {
      return res.send('success')
    }

    const params = { ...req.body }
    const receivedSign = params.sign
    delete params.sign

    const calculatedSign = generateSign(params, epayKey)

    if (receivedSign !== calculatedSign) {
      console.error('Sign verification failed')
      return res.send('fail')
    }

    const { out_trade_no, trade_status } = params

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      console.log('Payment success:', out_trade_no)
    }

    res.send('success')
  } catch (error) {
    console.error('Notify error:', error)
    res.send('fail')
  }
}

async function handleQuery(req, res) {
  try {
    const { out_trade_no } = req.query

    if (!out_trade_no) {
      return res.status(400).json({ error: 'Missing out_trade_no' })
    }

    if (out_trade_no.startsWith('MOCK_')) {
      return res.json({
        status: 'paid',
        paidAt: Date.now()
      })
    }

    const epayPid = process.env.EPAY_PID
    const epayKey = process.env.EPAY_KEY
    const epayApiUrl = process.env.EPAY_API_URL

    if (!epayPid || !epayKey || !epayApiUrl) {
      return res.status(500).json({ error: 'Payment service not configured' })
    }

    const params = {
      pid: epayPid,
      out_trade_no: out_trade_no,
      sign_type: 'MD5'
    }

    const sign = generateSign(params, epayKey)
    params.sign = sign

    const queryString = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
    const queryUrl = `${epayApiUrl.replace('/submit.php', '/query.php')}?${queryString}`

    const response = await fetch(queryUrl)
    const data = await response.json()

    res.json({
      status: data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED' ? 'paid' : 'unpaid',
      paidAt: data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED' ? Date.now() : null
    })
  } catch (error) {
    console.error('Query order error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}