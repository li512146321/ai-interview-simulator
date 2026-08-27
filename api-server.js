import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import handler from './api/ai.js'
import { initDb } from './api/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    content.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=')
        if (key && vals.length) {
            process.env[key.trim()] = vals.join('=').trim()
        }
    })
}

function createFakeRes(res) {
    return {
        status: (code) => ({
            json: (data) => {
                res.writeHead(code, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(data))
            }
        }),
        json: (data) => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
        }
    }
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
            try {
                req.body = body ? JSON.parse(body) : {}
                resolve()
            } catch (e) {
                reject(e)
            }
        })
        req.on('error', reject)
    })
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id')

    if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
    }

    try {
        await readBody(req)
    } catch (e) {
        res.writeHead(400)
        res.end('Invalid JSON')
        return
    }

    const url = req.url

    if (url === '/api/ai' && req.method === 'POST') {
        await handler(req, createFakeRes(res))
    } else if (url === '/api/speech' && req.method === 'POST') {
        const { default: speechHandler } = await import('./api/speech.js')
        await speechHandler(req, createFakeRes(res))
    } else if (url === '/api/tts' && req.method === 'POST') {
        const { default: ttsHandler } = await import('./api/tts.js')
        await ttsHandler(req, createFakeRes(res))
    } else if (url.startsWith('/api/interview')) {
        const { default: interviewHandler } = await import('./api/interview.js')
        await interviewHandler(req, createFakeRes(res))
    } else if (url.startsWith('/api/auth')) {
        const { default: authHandler } = await import('./api/auth.js')
        await authHandler(req, createFakeRes(res))
    } else if (url.startsWith('/api/verification')) {
        const { default: verificationHandler } = await import('./api/verification.js')
        await verificationHandler(req, createFakeRes(res))
    } else if (url.startsWith('/api/admin')) {
        const { default: adminHandler } = await import('./api/admin.js')
        await adminHandler(req, createFakeRes(res))
    } else if (url.startsWith('/api/events')) {
        const { default: eventsHandler } = await import('./api/events.js')
        await eventsHandler(req, createFakeRes(res))
    } else if (url === '/api/quota/check' && req.method === 'GET') {
        const { verifyToken } = await import('./api/auth.js')
        const { checkQuota } = await import('./api/db.js')
        const decoded = verifyToken(req)
        if (!decoded) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: '未登录' }))
            return
        }
        const result = await checkQuota(decoded.userId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
    } else if (url === '/api/pricing' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            freeTrialTimes: Number(process.env.FREE_TRIAL_TIMES || 3),
            monthly: { price: Number(process.env.PRICE_MONTHLY || 39), days: Number(process.env.MEMBERSHIP_MONTHLY_DAYS || 30) },
            yearly: { price: Number(process.env.PRICE_YEARLY || 199), days: Number(process.env.MEMBERSHIP_YEARLY_DAYS || 365) },
            single: { price: Number(process.env.PRICE_SINGLE || 9.9) },
            adminContact: {
                wechat: process.env.ADMIN_WECHAT || '',
                phone: process.env.ADMIN_PHONE || ''
            }
        }))
    } else if (url === '/api/positions' && req.method === 'GET') {
        const { default: positionsHandler } = await import('./api/positions.js')
        await positionsHandler(req, createFakeRes(res))
    } else {
        res.writeHead(404)
        res.end('Not Found')
    }
})

initDb().then(() => {
    server.listen(3001, () => {
        console.log('API Server running on http://localhost:3001')
        console.log('Routes: /api/ai | /api/speech | /api/tts | /api/interview | /api/auth | /api/verification | /api/admin | /api/positions | /api/events | /api/quota | /api/pricing')
    })
}).catch(err => {
    console.error('Failed to initialize database:', err)
    process.exit(1)
})