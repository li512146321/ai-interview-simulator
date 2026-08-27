<template>
  <div class="homeview">
    <div class="home-hero">
      <div class="hero-content">
        <div class="hero-icon">🤖</div>
        <h1 class="hero-title">AI面试官</h1>
        <p class="hero-subtitle">你的私人面试陪练</p>

        <div class="hero-features">
          <div class="feature"><span class="feature-icon">✨</span><span>自适应追问</span></div>
          <div class="feature"><span class="feature-icon">✨</span><span>完整分析报告</span></div>
          <div class="feature"><span class="feature-icon">✨</span><span>{{ freeTrialTimes }}次免费体验</span></div>
        </div>

        <template v-if="userStore.isLoggedIn">
          <div class="welcome-back">欢迎回来，{{ maskedEmail }}</div>
          <div class="quota-info" v-if="quotaInfo">
            <span v-if="quotaInfo.membershipTier === 'paid'" class="quota-tag success">会员有效至 {{ membershipExpiresAt }}</span>
            <span v-else class="quota-tag">剩余免费次数：{{ quotaInfo.remaining }}次</span>
          </div>
          <div class="hero-actions">
            <NButton type="primary" size="large" @click="goInterview" class="start-btn" :disabled="quotaLoading">开始面试 →</NButton>
          </div>
          <div class="quick-links">
            <NButton text @click="router.push('/history')">查看历史</NButton>
            <NButton text @click="router.push('/profile')">个人中心</NButton>
          </div>
        </template>
        <template v-else>
          <div class="hero-actions">
            <NButton type="primary" size="large" @click="router.push('/register')" class="start-btn">免费注册，开始练习 →</NButton>
          </div>
          <div class="quick-links">
            <NButton text @click="router.push('/login')">已有账号？登录</NButton>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { checkQuota, getPricing } from '@/api/auth'

const router = useRouter()
const userStore = useUserStore()
const quotaInfo = ref(null)
const freeTrialTimes = ref(3)

const maskedEmail = computed(() => {
  const email = userStore.email.value || ''
  if (!email.includes('@')) return email
  const [name, domain] = email.split('@')
  return (name.length > 3 ? name.slice(0, 3) + '***' : name[0] + '***') + '@' + domain
})

const membershipExpiresAt = computed(() => {
  if (!userStore.membershipExpiresAt.value) return ''
  return new Date(userStore.membershipExpiresAt.value).toLocaleDateString('zh-CN')
})

const quotaLoading = ref(false)

function goInterview() {
  if (quotaInfo.value && !quotaInfo.value.allowed) {
    router.push('/paywall')
    return
  }
  router.push('/interview/setup')
}

onMounted(async () => {
  try { const p = await getPricing(); freeTrialTimes.value = p.freeTrialTimes } catch (e) {}
  if (userStore.isLoggedIn.value) {
    quotaLoading.value = true
    try { quotaInfo.value = await checkQuota() } catch (e) {}
    quotaLoading.value = false
  }
})
</script>

<style scoped>
.homeview { min-height: calc(100vh - 56px); display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.home-hero { text-align: center; padding: 40px 20px; }
.hero-content { max-width: 480px; margin: 0 auto; }
.hero-icon { font-size: 64px; margin-bottom: 16px; }
.hero-title { font-size: 42px; color: white; margin: 0 0 8px 0; font-weight: 800; }
.hero-subtitle { font-size: 18px; color: rgba(255,255,255,0.85); margin: 0 0 24px 0; }
.hero-features { display: flex; justify-content: center; gap: 20px; margin-bottom: 32px; flex-wrap: wrap; }
.feature { color: rgba(255,255,255,0.9); font-size: 14px; display: flex; align-items: center; gap: 4px; }
.feature-icon { font-size: 16px; }
.welcome-back { color: white; font-size: 16px; margin-bottom: 12px; }
.quota-info { margin-bottom: 20px; }
.quota-tag { display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.2); color: white; border-radius: 20px; font-size: 14px; }
.quota-tag.success { background: rgba(82, 196, 26, 0.4); }
.hero-actions { margin-bottom: 16px; }
.start-btn { border-radius: 10px; padding: 12px 32px; font-size: 16px; height: auto; }
.quick-links { display: flex; justify-content: center; gap: 16px; }
.quick-links .n-button { color: rgba(255,255,255,0.7) !important; }
</style>