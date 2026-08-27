import { ref } from 'vue'
import { getMe } from '@/api/auth'

const isLoggedIn = ref(false)
const userId = ref(null)
const email = ref('')
const nickname = ref('')
const membershipTier = ref('free')
const membershipExpiresAt = ref(null)
const remainingTimes = ref(0)
const totalInterviews = ref(0)
const averageScore = ref(0)
const createdAt = ref('')

export function useUserStore() {
  const isInitialized = ref(false)

  async function init() {
    const token = localStorage.getItem('user_token')
    if (!token) {
      isLoggedIn.value = false
      isInitialized.value = true
      return
    }
    try {
      const user = await getMe()
      setUser(user)
    } catch (e) {
      localStorage.removeItem('user_token')
      isLoggedIn.value = false
    } finally {
      isInitialized.value = true
    }
  }

  function setUser(user) {
    isLoggedIn.value = true
    userId.value = user.id
    email.value = user.email
    nickname.value = user.nickname || ''
    membershipTier.value = user.membership_tier || 'free'
    membershipExpiresAt.value = user.membership_expires_at || null
    remainingTimes.value = user.remaining_times || 0
    totalInterviews.value = user.interview_count || 0
    averageScore.value = user.average_score || 0
    createdAt.value = user.created_at || ''
  }

  function logout() {
    isLoggedIn.value = false
    userId.value = null
    email.value = ''
    nickname.value = ''
    membershipTier.value = 'free'
    membershipExpiresAt.value = null
    remainingTimes.value = 0
    totalInterviews.value = 0
    averageScore.value = 0
    createdAt.value = ''
    localStorage.removeItem('user_token')
  }

  function canAccessFullReport() {
    return membershipTier.value !== 'free'
  }

  async function purchasePlan() {
    return { success: false, error: '支付功能暂未开放' }
  }

  return {
    isLoggedIn,
    userId,
    email,
    nickname,
    membershipTier,
    membershipExpiresAt,
    remainingTimes,
    totalInterviews,
    averageScore,
    createdAt,
    isInitialized,
    init,
    setUser,
    logout,
    canAccessFullReport,
    purchasePlan,
  }
}