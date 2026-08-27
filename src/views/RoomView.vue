<template>
  <div class="room-view">
    <div class="room-container">
      <div class="room-header">
        <div class="header-left">
          <h2 class="position-title">{{ positionName }}</h2>
        </div>
        <div class="header-center">
          <div class="question-badge">
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
          <NButton type="error" size="small" @click="handleEndInterview" ghost>
            结束面试
          </NButton>
        </div>
      </div>

      <div class="chat-container" ref="chatContainer">
        <div v-if="interviewStore.messages.length === 0" class="empty-state">
          <div class="empty-icon">🎤</div>
          <p class="empty-title">面试即将开始</p>
          <p class="empty-desc">面试官将向你提问，请准备好回答</p>
        </div>
        
        <div
          v-for="(message, index) in interviewStore.messages"
          :key="index"
          class="message-item"
          :class="message.role"
        >
          <div v-if="message.role === 'interviewer'" class="msg-avatar">🤖</div>
          <div class="message-bubble">
            <div v-if="message.role === 'interviewer' && message.questionNumber" class="question-tag">
              第{{ message.questionNumber }}题
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div class="message-footer">
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              <NButton
                v-if="message.role === 'interviewer'"
                text
                size="tiny"
                :loading="isSpeaking && speakingIndex === index"
                @click="playTTS(message.content, index)"
                title="播放语音"
              >🔊</NButton>
            </div>
          </div>
          <div v-if="message.role === 'user'" class="msg-avatar">👤</div>
        </div>

        <div v-if="interviewStore.isLoading" class="message-item ai">
          <div class="msg-avatar">🤖</div>
          <div class="message-bubble">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="message-time">思考中...</div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-wrapper">
          <NInput
            ref="inputRef"
            v-model:value="inputText"
            type="textarea"
            placeholder="请输入你的回答..."
            :autosize="{ minRows: 1, maxRows: 4 }"
            :disabled="interviewStore.isLoading || interviewStore.isFinished"
            @keydown="handleKeyDown"
            round
          />
          <div class="input-actions">
            <NButton
              circle
              size="large"
              :type="isRecording ? 'error' : 'default'"
              :disabled="interviewStore.isLoading || interviewStore.isFinished"
              @click="toggleVoiceInput"
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
              :disabled="!inputText.trim() || interviewStore.isLoading || interviewStore.isFinished"
              @click="handleSend"
              title="发送"
            >
              <template #icon>
                <span style="font-size:16px">↑</span>
              </template>
            </NButton>
          </div>
        </div>
      </div>
    </div>

    <audio ref="audioElement" @ended="onAudioEnded" @error="onAudioError" style="display:none"></audio>

    <NModal v-model:show="showEndDialog" preset="dialog" title="确认结束面试">
      <p>确定要结束面试吗？结束后将无法继续回答问题。</p>
      <template #action>
        <NButton @click="showEndDialog = false">取消</NButton>
        <NButton type="error" @click="confirmEndInterview">确定结束</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useInterviewStore } from '@/stores/interview'
import { useUserStore } from '@/stores/user'
import { speechToText, textToSpeech } from '@/api/interview'

const router = useRouter()
const message = useMessage()
const interviewStore = useInterviewStore()
const userStore = useUserStore()

const inputText = ref('')
const chatContainer = ref(null)
const inputRef = ref(null)
const showEndDialog = ref(false)
const timer = ref(0)
const timerInterval = ref(null)
const isRecording = ref(false)
let mediaRecorder = null
let audioChunks = []
let recognition = null
const voiceEnabled = ref(false)
const isSpeaking = ref(false)
const speakingIndex = ref(-1)
const audioElement = ref(null)

const positionName = computed(() => {
  return interviewStore.selectedPosition || '面试房间'
})

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

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  if (!inputText.value.trim()) return
  
  interviewStore.sendAnswer(inputText.value)
  inputText.value = ''
  
  nextTick(() => {
    inputRef.value?.focus()
  })
  
  scrollToBottom()
}

async function startBaiduRecord() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)

    mediaRecorder.onstop = async () => {
      isRecording.value = false
      stream.getTracks().forEach(t => t.stop())

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1]
        message.info('正在识别...')
        try {
          const result = await speechToText(base64)
          if (result.text) {
            inputText.value += result.text
            message.success('识别成功')
          }
        } catch (e) {
          console.error('[百度语音] 失败，降级 WebSpeech:', e)
          tryWebSpeech()
        }
      }
    }

    mediaRecorder.start()
    isRecording.value = true
    message.info('正在录音...')
  } catch (e) {
    console.error('[录音] 权限被拒绝:', e)
    message.warning('请允许麦克风权限后重试')
  }
}

function tryWebSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    message.warning('语音服务暂不可用，建议使用 Edge 浏览器或手动输入')
    return
  }

  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = true

  recognition.onstart = () => {
    isRecording.value = true
    message.info('正在使用浏览器语音识别...')
  }

  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
    }
    inputText.value = transcript
    message.success('识别成功')
  }

  recognition.onerror = (event) => {
    console.error('[WebSpeech] 错误:', event.error)
    isRecording.value = false
    if (event.error === 'not-allowed') {
      message.warning('请允许麦克风权限后重试')
    } else {
      message.warning('语音识别不可用，建议使用 Edge 浏览器或手动输入')
    }
  }

  recognition.onend = () => {
    isRecording.value = false
  }

  try {
    recognition.start()
  } catch (e) {
    message.warning('语音服务暂不可用，建议使用 Edge 浏览器或手动输入')
  }
}

function toggleVoiceInput() {
  if (isRecording.value) {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop()
    if (recognition) recognition.stop()
    return
  }
  startBaiduRecord()
}

async function playTTS(text, index) {
  if (isSpeaking.value) return
  isSpeaking.value = true
  speakingIndex.value = index
  try {
    const result = await textToSpeech(text)
    if (result.audio && audioElement.value) {
      const blob = base64ToBlob(result.audio, 'audio/mp3')
      const url = URL.createObjectURL(blob)
      audioElement.value.src = url
      await audioElement.value.play()
    }
  } catch (e) {
    console.error('[TTS] 播放失败:', e)
  } finally {
    isSpeaking.value = false
    speakingIndex.value = -1
  }
}

function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64)
  const byteArrays = []
  for (let offset = 0; offset < byteChars.length; offset += 512) {
    const slice = byteChars.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }
  return new Blob(byteArrays, { type: mimeType })
}

function onAudioEnded() {
  isSpeaking.value = false
  speakingIndex.value = -1
}

function onAudioError() {
  console.error('[TTS] 音频播放错误')
  isSpeaking.value = false
  speakingIndex.value = -1
}

function handleEndInterview() {
  showEndDialog.value = true
}

async function confirmEndInterview() {
  showEndDialog.value = false
  await interviewStore.finishInterview()
}

function startTimer() {
  timerInterval.value = setInterval(() => {
    timer.value++
  }, 1000)
}

function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

watch(() => interviewStore.messages, (newMessages, oldMessages) => {
  scrollToBottom()
  if (voiceEnabled.value && newMessages.length > 0) {
    const lastMsg = newMessages[newMessages.length - 1]
    if (lastMsg.role === 'interviewer' && (!oldMessages || newMessages.length !== oldMessages.length)) {
      playTTS(lastMsg.content, newMessages.length - 1)
    }
  }
}, { deep: true })

watch(() => interviewStore.isFinished, (newValue) => {
  if (newValue) {
    message.info('面试结束，正在生成评分报告...')
    setTimeout(() => {
      router.push(`/interview/report/${interviewStore.sessionId.value}`)
    }, 1500)
  }
})

onMounted(async () => {
  if (!interviewStore.isInterviewing) {
    await interviewStore.startInterview()
  }
  startTimer()
})

onUnmounted(() => {
  stopTimer()
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop()
  if (recognition) recognition.abort()
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.src = ''
  }
})
</script>

<style scoped>
.room-view {
  height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  display: flex;
  justify-content: center;
  padding: 16px;
}

.room-container {
  width: 100%;
  max-width: 900px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.room-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.header-left {
  flex-shrink: 0;
}

.position-title {
  font-size: 16px;
  margin: 0;
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

.chat-container {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafbfc;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #666;
  margin: 0 0 4px 0;
}

.empty-desc {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.message-item {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-item.ai {
  justify-content: flex-start;
}

.message-item.user {
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
  background: #f0f2f5;
}

.message-item.ai .msg-avatar {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.message-item.user .msg-avatar {
  background: #e8f4fd;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px;
  position: relative;
}

.message-item.ai .message-bubble {
  background: white;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.message-item.user .message-bubble {
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

.message-content {
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.message-item.user .message-content {
  color: white;
}

.message-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.message-time {
  font-size: 11px;
  opacity: 0.5;
}

.message-item.user .message-time {
  opacity: 0.7;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 6px 0;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  background: #bbb;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-7px); }
}

.input-area {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  background: white;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.input-wrapper :deep(.n-input) {
  flex: 1;
}

.input-actions {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .room-view {
    padding: 0;
  }

  .room-container {
    border-radius: 0;
    height: 100vh;
  }

  .room-header {
    padding: 12px 16px;
    gap: 12px;
  }

  .position-title {
    font-size: 14px;
  }

  .badge-count {
    font-size: 16px;
  }

  .chat-container {
    padding: 12px 16px;
  }

  .message-bubble {
    max-width: 85%;
  }

  .input-area {
    padding: 10px 14px;
  }
}
</style>