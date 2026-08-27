import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let cachedToken = null
let tokenExpireTime = 0

async function getAccessToken(apiKey, secretKey) {
    const now = Date.now()
    if (cachedToken && now < tokenExpireTime) return cachedToken

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    const response = await fetch(url, { method: 'POST' })
    const data = await response.json()

    if (data.access_token) {
        cachedToken = data.access_token
        tokenExpireTime = now + (data.expires_in - 300) * 1000
        return cachedToken
    }
    throw new Error('获取百度 access_token 失败: ' + JSON.stringify(data))
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { audio } = req.body
    if (!audio) {
        return res.status(400).json({ error: 'Missing audio data' })
    }

    const apiKey = process.env.BAIDU_API_KEY
    const secretKey = process.env.BAIDU_SECRET_KEY

    if (!apiKey || !secretKey) {
        console.log('[百度语音] 环境变量未配置，返回降级信号')
        return res.status(500).json({ error: '百度语音未配置' })
    }

    try {
        // 1. 把 base64 写入临时 webm 文件
        const tempDir = path.join(__dirname, '..', 'temp')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)
        const webmPath = path.join(tempDir, `audio_${Date.now()}.webm`)
        const pcmPath = webmPath.replace('.webm', '.pcm')
        fs.writeFileSync(webmPath, Buffer.from(audio, 'base64'))

        // 2. ffmpeg 转码 webm → pcm (16k, mono, 16bit)
        await execAsync(`ffmpeg -i "${webmPath}" -f s16le -acodec pcm_s16le -ar 16000 -ac 1 "${pcmPath}" -y`, { stdio: 'pipe' })
        const pcmBuffer = fs.readFileSync(pcmPath)
        const pcmBase64 = pcmBuffer.toString('base64')

        // 3. 清理临时文件
        fs.unlinkSync(webmPath)
        fs.unlinkSync(pcmPath)

        // 4. 调百度语音
        const token = await getAccessToken(apiKey, secretKey)
        const response = await fetch('https://vop.baidu.com/server_api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                format: 'pcm',
                rate: 16000,
                channel: 1,
                cuid: 'ai_interview',
                token: token,
                len: pcmBuffer.length,
                speech: pcmBase64,
                dev_pid: 1537
            })
        })

        const data = await response.json()
        console.log('[百度语音] 响应:', JSON.stringify(data).substring(0, 200))

        if (data.err_no !== 0) {
            console.error('[百度语音] 返回错误:', data)
            return res.status(500).json({ error: data.err_msg || '百度语音识别失败' })
        }

        const text = data.result ? data.result.join('') : ''
        res.json({ text })
    } catch (error) {
        console.error('[百度语音] 异常:', error)
        res.status(500).json({ error: '百度语音服务异常' })
    }
}