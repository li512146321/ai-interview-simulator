import { ref } from 'vue'
import { textToSpeech } from '@/api/interview'

export function useTTS() {
  const isSpeaking = ref(false)
  const speakingIndex = ref(-1)
  const audioElement = ref(null)

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

  async function speak(text, index) {
    if (isSpeaking.value) return
    isSpeaking.value = true
    speakingIndex.value = index

    try {
      const result = await textToSpeech(text)
      if (result.audio && audioElement.value) {
        const mimeType = `audio/${result.format || 'wav'}`
        const blob = base64ToBlob(result.audio, mimeType)
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

  function stop() {
    if (audioElement.value) {
      audioElement.value.pause()
      audioElement.value.currentTime = 0
    }
    isSpeaking.value = false
    speakingIndex.value = -1
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

  return {
    isSpeaking,
    speakingIndex,
    audioElement,
    speak,
    stop,
    onAudioEnded,
    onAudioError,
  }
}