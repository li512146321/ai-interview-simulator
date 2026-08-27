import { ref } from 'vue'
import { speechToText } from '@/api/interview'

const MAX_RECORD_SECONDS = 55

export function useBaiduASR() {
  const isRecording = ref(false)
  const isProcessing = ref(false)
  const transcript = ref('')
  let mediaRecorder = null
  let audioChunks = []
  let stream = null
  let recognition = null
  let recordingTimer = null

  async function startRecording() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream = mediaStream
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
      audioChunks = []

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)

      mediaRecorder.onstop = async () => {
        isRecording.value = false
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
          stream = null
        }
        if (recordingTimer) {
          clearTimeout(recordingTimer)
          recordingTimer = null
        }

        isProcessing.value = true
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = async () => {
          try {
            const base64 = reader.result.split(',')[1]
            const result = await speechToText(base64)
            isProcessing.value = false
            if (result.text) {
              transcript.value = result.text
            } else {
              transcript.value = ''
            }
          } catch (e) {
            console.error('[百度语音] 失败，降级 WebSpeech:', e)
            const text = await tryWebSpeech()
            transcript.value = text
            isProcessing.value = false
          }
        }
      }

      mediaRecorder.start()
      isRecording.value = true
      transcript.value = ''

      recordingTimer = setTimeout(() => {
        if (isRecording.value) {
          stopRecording()
          alert('单次录音最长55秒，请分段表达')
        }
      }, MAX_RECORD_SECONDS * 1000)
    } catch (e) {
      console.error('[录音] 权限被拒绝:', e)
      alert('无法访问麦克风，请检查浏览器权限设置')
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
    }
    if (recordingTimer) {
      clearTimeout(recordingTimer)
      recordingTimer = null
    }
    isRecording.value = false
  }

  function tryWebSpeech() {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('语音服务暂不可用，建议使用 Edge 浏览器或手动输入')
        resolve('')
        return
      }

      recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        isRecording.value = true
      }

      recognition.onresult = (event) => {
        let text = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript
        }
        resolve(text)
      }

      recognition.onerror = (event) => {
        console.error('[WebSpeech] 错误:', event.error)
        isRecording.value = false
        if (event.error === 'not-allowed') {
          alert('请允许麦克风权限后重试')
        } else {
          alert('语音识别不可用，建议使用 Edge 浏览器或手动输入')
        }
        resolve('')
      }

      recognition.onend = () => {
        isRecording.value = false
      }

      try {
        recognition.start()
      } catch (e) {
        alert('语音服务暂不可用，建议使用 Edge 浏览器或手动输入')
        resolve('')
      }
    })
  }

  function toggleRecording() {
    if (isRecording.value) {
      stopRecording()
      return
    }
    startRecording()
  }

  return {
    isRecording,
    isProcessing,
    transcript,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}