<template>
  <div class="interview-view">
    <div class="phase-chat" v-if="started && !evaluation">
      <div class="chat-card">
        <div class="chat-header">
          <div class="header-left">
            <span class="header-position">{{ interviewStore.selectedPosition || '面试' }}</span>
          </div>
          <div class="header-center">
            <div class="question-badge" v-if="interviewStore.currentQuestionIndex > 0">
              <span class="badge-label">答题进度</span>
              <span class="badge-count">{{ interviewStore.currentQuestionIndex }} / {{ interviewStore.totalQuestions }}</span>
            </div>
            <NProgress
              type="line"
              :percentage="progressPercentage"
              :show-indicator="false"
              :height="4"
              :border-radius="2"
              class="header-progress"
            />
          </div>
          <div class="header-right">
            <div class="timer">
              <span class="timer-icon">⏱</span>
              <span class="timer-text">{{ formattedTime }}</span>
            </div>
            <NButton
              circle
              quaternary
              size="small"
              :type="voiceEnabled ? 'primary' : 'default'"
              title="语音播报"
              @click="voiceEnabled = !voiceEnabled"
            >
              <template #icon>
                <span style="font-size:16px">{{ voiceEnabled ? '🔊' : '🔇' }}</span>
              </template>
            </NButton>
            <NButton type="error" size="small" @click="handleEnd" ghost :disabled="waiting">
              结束面试
            </NButton>
          </div>
        </div>
        <div class="chat-body" ref="chatBodyRef">
          <div v-for="(msg, i) in messages" :key="i" :class="['chat-msg', msg.role]">
            <div class="msg-avatar">{{ msg.role === 'interviewer' ? '🤖' : '👤' }}</div>
            <div class="msg-bubble">
              <div v-if="msg.role === 'interviewer' && msg.questionNumber" class="question-tag">
                第{{ msg.questionNumber }}题
              </div>
              <div class="msg-content">{{ msg.content }}</div>
              <div class="msg-footer">
                <span class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                <NButton
                  v-if="msg.role === 'interviewer'"
                  text
                  size="tiny"
                  :loading="isSpeaking && speakingIndex === i"
                  @click="speak(msg.content, i)"
                  title="播放语音"
                >🔊</NButton>
              </div>
            </div>
          </div>
          <div v-if="waiting" class="chat-msg interviewer">
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble typing"><span>.</span><span>.</span><span>.</span></div>
          </div>
        </div>
        <div class="chat-footer">
          <div class="input-row">
            <NInput
              v-model:value="inputText"
              type="textarea"
              placeholder="输入你的回答..."
              @keyup.enter="handleSend"
              :disabled="waiting || isRecording"
              :autosize="{ minRows: 1, maxRows: 4 }"
              round
            />
            <NButton
              circle
              size="large"
              :type="isRecording ? 'error' : 'default'"
              :disabled="waiting || isProcessing"
              @click="toggleRecording"
              title="语音输入"
            >
              <template #icon>
                <span style="font-size:18px">🎤</span>
              </template>
            </NButton>
            <NButton
              type="primary"
              size="large"
              circle
              :disabled="!inputText.trim() || waiting || isRecording"
              @click="handleSend"
              title="发送"
            >
              <template #icon>
                <span style="font-size:16px">↑</span>
              </template>
            </NButton>
          </div>
          <div class="voice-status" v-if="isRecording || isProcessing">
            <span v-if="isRecording" class="recording-hint">🔴 正在录音... 请说话</span>
            <span v-if="isProcessing" class="processing-hint">⏳ 正在识别语音...</span>
          </div>
          
        </div>
      </div>
    </div>

    <audio ref="audioElement" @ended="onAudioEnded" @error="onAudioError" style="display:none"></audio>

    <div v-if="evaluating" class="evaluating-overlay">
      <div class="evaluating-card">
        <div class="evaluating-icon">🎉</div>
        <div class="evaluating-title">面试结束</div>
        <div class="evaluating-subtitle">正在生成你的面试报告...</div>
        <NProgress
          type="line"
          :percentage="evalProgress"
          :indicator-placement="'inside'"
          :height="8"
          :border-radius="4"
          class="eval-progress"
        />
        <div class="evaluating-steps">
          <span :class="{ active: evalProgress >= 30, done: evalProgress >= 30 }">分析回答</span>
          <span class="step-arrow">→</span>
          <span :class="{ active: evalProgress >= 60, done: evalProgress >= 60 }">评估得分</span>
          <span class="step-arrow">→</span>
          <span :class="{ active: evalProgress >= 90, done: evalProgress >= 90 }">生成建议</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useInterviewStore } from '@/stores/interview'
import { useUserStore } from '@/stores/user'
import { useTTS } from '@/hooks/useTTS'
import { useBaiduASR } from '@/hooks/useBaiduASR'

const router = useRouter()
const message = useMessage()
const interviewStore = useInterviewStore()
const userStore = useUserStore()

const { isSpeaking, speakingIndex, audioElement, speak, stop: stopTTS, onAudioEnded, onAudioError } = useTTS()
const { isRecording, isProcessing, transcript, toggleRecording } = useBaiduASR()

const started = computed(() => interviewStore.isInterviewing.value && interviewStore.messages.value.length > 0)
const waiting = ref(false)
const inputText = ref('')
const chatBodyRef = ref(null)
const voiceEnabled = ref(true)
const voiceInputEnabled = ref(false)
const timer = ref(0)
const evaluating = ref(false)
const evalProgress = ref(0)
let timerInterval = null
let evalTimer = null

onMounted(() => {
  if (interviewStore.evaluation.value && interviewStore.sessionId.value) {
    router.replace(`/interview/report/${interviewStore.sessionId.value}`)
    return
  }
  if (!started.value) {
    router.replace('/interview/setup')
    return
  }
  if (interviewStore.isFinished.value) {
    startEvaluating()
    return
  }
  startTimer()
})

onUnmounted(() => {
  stopTTS()
  stopTimer()
  if (evalTimer) clearInterval(evalTimer)
})

watch(() => interviewStore.messages.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    nextTick(() => scrollToBottom())
    if (voiceEnabled.value) {
      const lastMsg = interviewStore.messages.value[newLen - 1]
      if (lastMsg && lastMsg.role === 'interviewer') {
        nextTick(() => {
          speak(lastMsg.content, newLen - 1)
        })
      }
    }
  }
})

watch(() => interviewStore.isFinished.value, (finished) => {
  if (finished) {
    waiting.value = false
    setTimeout(() => {
      startEvaluating()
    }, 1000)
  }
})

watch(transcript, (text) => {
  if (text) {
    inputText.value = inputText.value ? inputText.value + text : text
  }
})

const messages = interviewStore.messages
const evaluation = interviewStore.evaluation

const progressPercentage = computed(() => {
  if (interviewStore.totalQuestions <= 0) return 0
  return Math.round((interviewStore.currentQuestionIndex / interviewStore.totalQuestions) * 100)
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timer.value / 60)
  const seconds = timer.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function startTimer() {
  timerInterval = setInterval(() => { timer.value++ }, 1000)
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || waiting.value) return
  if (interviewStore.isFinished.value) {
    startEvaluating()
    return
  }
  inputText.value = ''
  waiting.value = true

  try {
    await interviewStore.sendAnswer(text)
  } catch (e) {
    message.error('回复失败，请重试')
  } finally {
    waiting.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function handleEnd() {
  waiting.value = true
  startEvaluating()
}

function startEvaluating() {
  waiting.value = false
  evaluating.value = true
  evalProgress.value = 0
  evalTimer = setInterval(() => {
    if (evalProgress.value < 90) {
      evalProgress.value += Math.random() * 15 + 5
      if (evalProgress.value > 90) evalProgress.value = 90
    }
  }, 400)
  interviewStore.evaluate().then((result) => {
    evalProgress.value = 100
    setTimeout(() => {
      router.push(`/interview/report/${result.sessionId || interviewStore.sessionId.value}`)
    }, 500)
  }).catch(() => {
    clearInterval(evalTimer)
    evaluating.value = false
    interviewStore.isFinished.value = false
    message.error('评估失败，请重试')
  })
}

function handleRestart() {
  if (evalTimer) clearInterval(evalTimer)
  evaluating.value = false
  evalProgress.value = 0
  interviewStore.reset()
  router.push('/interview/setup')
}

function scrollToBottom() {
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}
</script>

<style scoped>
.interview-view {
  height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  display: flex;
  justify-content: center;
  padding: 16px;
}

.phase-chat {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
}

.chat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.chat-header {
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.header-left {
  flex-shrink: 0;
}

.header-position {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  white-space: nowrap;
}

.header-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.question-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-label {
  font-size: 12px;
  color: #999;
}

.badge-count {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  font-variant-numeric: tabular-nums;
}

.header-progress {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #999;
  font-variant-numeric: tabular-nums;
}

.timer-icon {
  font-size: 14px;
}

.chat-body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fafbfc;
}

.chat-msg {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-msg.interviewer {
  justify-content: flex-start;
}

.chat-msg.user {
  justify-content: flex-end;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: white;
}

.chat-msg.interviewer .msg-avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.chat-msg.user .msg-avatar {
  background: #e8f4fd;
}

.msg-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px;
  position: relative;
}

.chat-msg.interviewer .msg-bubble {
  background: white;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.chat-msg.user .msg-bubble {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-bottom-right-radius: 4px;
}

.question-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  padding: 2px 8px;
  border-radius: 10px;
  margin-bottom: 6px;
}

.msg-content {
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.msg-time {
  font-size: 11px;
  opacity: 0.5;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 6px 0;
}

.typing span {
  width: 7px;
  height: 7px;
  background: #bbb;
  border-radius: 50%;
  animation: typingAnim 1.4s infinite;
}

.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingAnim {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-7px); }
}

.chat-footer {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  background: white;
  flex-shrink: 0;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-row :deep(.n-input) {
  flex: 1;
}

.voice-status {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 13px;
}

.recording-hint {
  color: #f5222d;
}

.processing-hint {
  color: #faad14;
}

@media (max-width: 768px) {
  .interview-view {
    padding: 0;
  }

  .chat-card {
    border-radius: 0;
  }

  .chat-header {
    padding: 12px 16px;
    gap: 10px;
  }

  .header-position {
    font-size: 14px;
  }

  .badge-count {
    font-size: 16px;
  }

  .chat-body {
    padding: 12px 16px;
  }

  .msg-bubble {
    max-width: 85%;
  }

  .chat-footer {
    padding: 10px 14px;
  }
}

.finished-hint {
  text-align: center;
  margin-top: 10px;
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
}

.evaluating-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: overlayIn 0.3s ease;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.evaluating-card {
  background: white;
  border-radius: 20px;
  padding: 40px 48px;
  text-align: center;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: cardIn 0.4s ease;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.evaluating-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.evaluating-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.evaluating-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.eval-progress {
  margin-bottom: 20px;
}

.evaluating-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #bbb;
}

.evaluating-steps span {
  transition: color 0.3s;
}

.evaluating-steps .step-arrow {
  color: #bbb;
}

.evaluating-steps .active {
  color: #667eea;
  font-weight: 600;
}

.evaluating-steps .done {
  color: #52c41a;
}
</style>