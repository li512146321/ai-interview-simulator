const ZHIPU_API_KEY = process.env.GLM_API_KEY
const ZHIPU_TTS_URL = 'https://open.bigmodel.cn/api/paas/v4/audio/speech'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text } = req.body
  if (!text) {
    return res.status(400).json({ error: 'Missing text' })
  }

  if (!ZHIPU_API_KEY) {
    return res.status(500).json({ error: 'GLM_API_KEY not configured' })
  }

  try {
    const response = await fetch(ZHIPU_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-tts',
        input: text,
        voice: 'xiaochen',
        response_format: 'wav',
        speed: 1.0,
        volume: 1.0,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Zhipu TTS 返回 ${response.status}: ${errorText}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    const base64 = audioBuffer.toString('base64')

    res.json({ audio: base64, format: 'wav' })
  } catch (error) {
    console.error('[Zhipu TTS] 异常:', error)
    res.status(500).json({ error: 'TTS 服务异常' })
  }
}