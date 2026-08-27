import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { checkQuota } from '@/api/auth'
import request from '@/utils/request'

const isInterviewing = ref(false)
const messages = ref([])
const sessionId = ref(null)
const evaluation = ref(null)
const isEvaluating = ref(false)
const currentQuestionIndex = ref(0)
const totalQuestions = ref(8)
const selectedPosition = ref('')
const isFinished = ref(false)
const isLoading = ref(false)

export function useInterviewStore() {
  const userStore = useUserStore()

  const scores = computed(() => {
    return evaluation.value?.detail || null
  })

  const reportUnlocked = ref(false)

  async function startInterview(params) {
    const quota = await checkQuota()
    if (!quota.allowed) {
      throw new Error(quota.reason === 'QUOTA_EXHAUSTED' ? 'QUOTA_EXHAUSTED' : '无法开始面试')
    }
    const token = localStorage.getItem('user_token')
    const result = await request.post('/api/interview/start', params, {
      headers: { Authorization: 'Bearer ' + token }
    })
    sessionId.value = result.sessionId
    messages.value = result.messages || []
    isInterviewing.value = true
    isFinished.value = false
    evaluation.value = null
    currentQuestionIndex.value = 0
    if (params && params.position) {
      selectedPosition.value = params.position
    }
    return result
  }

  function addMessage(msg) {
    messages.value.push(msg)
  }

  function endInterview() {
    isInterviewing.value = false
  }

  async function sendAnswer(text) {
    if (!text.trim()) return
    addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    isLoading.value = true
    try {
      const token = localStorage.getItem('user_token')
      const result = await request.post('/api/interview/message', {
        sessionId: sessionId.value,
        message: text
      }, { headers: { Authorization: 'Bearer ' + token } })

      if (result.reply) {
        addMessage({ role: 'interviewer', content: result.reply, timestamp: new Date().toISOString(), questionNumber: result.questionIndex || undefined })
      }
      if (result.questionIndex) {
        currentQuestionIndex.value = result.questionIndex
      }
      if (result.isFinished) {
        isFinished.value = true
      }
    } finally {
      isLoading.value = false
    }
  }

  async function finishInterview() {
    isFinished.value = true
    isInterviewing.value = false
    await evaluate()
  }

  async function evaluate() {
    isEvaluating.value = true
    try {
      const token = localStorage.getItem('user_token')
      const result = await request.post('/api/interview/evaluate', {
        sessionId: sessionId.value,
        messages: messages.value,
      }, { headers: { Authorization: 'Bearer ' + token } })
      evaluation.value = result
      userStore.remainingTimes.value = result.remainingTimes ?? userStore.remainingTimes.value
      userStore.totalInterviews.value = (userStore.totalInterviews.value || 0) + 1
      return result
    } finally {
      isEvaluating.value = false
    }
  }

  function reset() {
    isInterviewing.value = false
    messages.value = []
    sessionId.value = null
    evaluation.value = null
    isEvaluating.value = false
    currentQuestionIndex.value = 0
    selectedPosition.value = ''
    isFinished.value = false
    isLoading.value = false
    reportUnlocked.value = false
  }

  function unlockReport() {
    reportUnlocked.value = true
  }

  function resetInterview() {
    reset()
  }

  return {
    isInterviewing,
    messages,
    sessionId,
    evaluation,
    scores,
    isEvaluating,
    currentQuestionIndex,
    totalQuestions,
    selectedPosition,
    isFinished,
    isLoading,
    reportUnlocked,
    startInterview,
    addMessage,
    endInterview,
    sendAnswer,
    finishInterview,
    evaluate,
    reset,
    unlockReport,
    resetInterview,
  }
}