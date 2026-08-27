<template>
  <div class="paywall-view">
    <div class="paywall-card">
      <NCard>
        <div class="paywall-header">
          <div class="icon">🎉</div>
          <h1>你的{{ freeTrialTimes }}次免费体验已用完</h1>
        </div>

        <div class="stats" v-if="userStore.totalInterviews > 0">
          <div class="stat-item">
            <div class="stat-value">{{ userStore.totalInterviews }}</div>
            <div class="stat-label">累计练习</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ userStore.averageScore }}/10</div>
            <div class="stat-label">平均得分</div>
          </div>
        </div>

        <div class="benefits">
          <h3>继续练习，解锁无限面试：</h3>
          <div class="benefit-item">✅ 无限次面试练习</div>
          <div class="benefit-item">✅ 完整AI分析报告</div>
          <div class="benefit-item">✅ JD/简历定制面试</div>
          <div class="benefit-item">✅ 历史记录永久保存</div>
        </div>

        <div class="pricing">
          <div class="price-card">
            <div class="price-label">💰 月度会员</div>
            <div class="price-value">¥{{ pricing.monthly?.price || 39 }}/{{ pricing.monthly?.days || 30 }}天</div>
          </div>
          <div class="price-card recommended">
            <div class="price-label">💰 年费会员</div>
            <div class="price-value">¥{{ pricing.yearly?.price || 199 }}/{{ pricing.yearly?.days || 365 }}天</div>
            <div class="price-sub">相当于¥{{ ((pricing.yearly?.price || 199) / 12).toFixed(1) }}/月</div>
          </div>
        </div>

        <div class="contact-section">
          <h3>📱 开通方式：</h3>
          <div class="contact-card">
            <div class="contact-row" v-if="pricing.adminContact?.wechat">
              <span class="contact-label">微信：{{ pricing.adminContact.wechat }}</span>
              <NButton size="small" secondary type="primary" @click="copyText(pricing.adminContact.wechat)">复制</NButton>
            </div>
            <div class="contact-row">
              <span class="contact-label">电话：{{ pricing.adminContact?.phone || '15848902486' }}</span>
              <NButton size="small" secondary type="primary" @click="copyText(pricing.adminContact?.phone || '15848902486')">复制</NButton>
            </div>
          </div>
          <div class="qrcode-section">
            <p class="qrcode-hint">📱 微信扫码添加好友开通：</p>
            <img
              src="/wechat-qr.png"
              alt="微信二维码"
              class="qrcode-img"
              @error="onQrCodeError"
            />
            <p class="qrcode-fallback" v-if="qrCodeFailed">二维码加载失败，请通过上方电话/微信联系</p>
          </div>
          <p class="contact-hint">💡 添加时请备注你的注册邮箱，开通后刷新页面即可使用</p>
        </div>
      </NCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { getPricing } from '@/api/auth'

const message = useMessage()
const userStore = useUserStore()

const freeTrialTimes = ref(3)
const pricing = ref({
  monthly: { price: 39, days: 30 },
  yearly: { price: 199, days: 365 },
  adminContact: { wechat: '', phone: '' }
})

onMounted(async () => {
  try {
    const pricingData = await getPricing()
    freeTrialTimes.value = pricingData.freeTrialTimes || pricingData.free_trial_times || 3
    pricing.value = pricingData
  } catch (e) {
    console.warn('加载定价信息失败，使用默认值', e)
  }
})

const qrCodeFailed = ref(false)

function onQrCodeError() {
  qrCodeFailed.value = true
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  message.success('已复制')
}
</script>

<style scoped>
.paywall-view { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa; padding: 20px; }
.paywall-card { width: 100%; max-width: 480px; }
.paywall-header { text-align: center; margin-bottom: 24px; }
.paywall-header .icon { font-size: 48px; margin-bottom: 12px; }
.paywall-header h1 { font-size: 20px; color: #333; margin: 0; }
.stats { display: flex; justify-content: center; gap: 32px; padding: 16px; background: #f0f4f8; border-radius: 12px; margin-bottom: 24px; }
.stat-item { text-align: center; }
.stat-value { font-size: 24px; font-weight: 700; color: #1E3A5F; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.benefits { margin-bottom: 24px; padding: 16px; background: #f8faf8; border-radius: 12px; }
.benefits h3 { margin: 0 0 12px 0; font-size: 16px; color: #333; }
.benefit-item { padding: 6px 0; font-size: 14px; color: #555; }
.pricing { display: flex; gap: 12px; margin-bottom: 24px; }
.price-card { flex: 1; padding: 16px; border: 2px solid #eee; border-radius: 12px; text-align: center; }
.price-card.recommended { border-color: #667eea; background: rgba(102, 126, 234, 0.05); }
.price-label { font-size: 14px; color: #666; margin-bottom: 8px; }
.price-value { font-size: 18px; font-weight: 700; color: #1E3A5F; }
.price-sub { font-size: 12px; color: #999; margin-top: 4px; }
.contact-section { margin-top: 16px; }
.contact-section h3 { font-size: 16px; color: #333; margin: 0 0 12px 0; }
.contact-card { background: #fafafa; border-radius: 12px; padding: 16px; }
.contact-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
.contact-row + .contact-row { border-top: 1px solid #eee; margin-top: 8px; padding-top: 16px; }
.contact-label { font-size: 14px; color: #333; }
.contact-hint { margin-top: 12px; font-size: 13px; color: #999; text-align: center; }
.qrcode-section { margin-top: 16px; text-align: center; }
.qrcode-hint { font-size: 14px; color: #333; margin: 0 0 12px 0; }
.qrcode-img { width: 200px; height: 200px; border-radius: 8px; border: 1px solid #eee; object-fit: contain; }
.qrcode-fallback { font-size: 13px; color: #999; margin-top: 8px; }
</style>