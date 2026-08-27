<template>
  <div class="setup-view">
    <div class="container">
      <NCard>
        <h1 class="setup-title">⚙️ 面试设置</h1>

        <!-- ① 选择面试岗位 -->
        <div class="section">
          <h3 class="section-title">① 选择面试岗位</h3>
          <div class="positions-grid">
            <div
              v-for="pos in hotPositions"
              :key="pos.id"
              :class="['position-card', { selected: selectedPositionId === pos.id }]"
              @click="selectPosition(pos.id)"
            >
              <span class="pos-icon">{{ pos.icon }}</span>
              <span class="pos-name">{{ pos.name }}</span>
            </div>
          </div>
          <div
            :class="['expand-toggle', { open: showAllPositions }]"
            @click="showAllPositions = !showAllPositions"
          >
            {{ showAllPositions ? '收起全部岗位 ▴' : '展开全部岗位 ▾' }}
          </div>
          <div v-if="showAllPositions" class="all-positions">
            <template v-for="(group, cat) in groupedPositions" :key="cat">
              <div class="category-label">── {{ cat }} ──</div>
              <div class="positions-grid">
                <div
                  v-for="pos in group"
                  :key="pos.id"
                  :class="['position-card', { selected: selectedPositionId === pos.id }]"
                  @click="selectPosition(pos.id)"
                >
                  <span class="pos-icon">{{ pos.icon }}</span>
                  <span class="pos-name">{{ pos.name }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ② 定制面试内容 -->
        <div class="section">
          <h3 class="section-title">② 定制面试内容（可选）</h3>
          <div class="file-actions">
            <NButton @click="triggerResumeUpload" :disabled="!!resumeText">📄 上传简历</NButton>
            <NButton @click="showPasteJd = true">📋 粘贴JD文本</NButton>
          </div>
          <input ref="resumeInputRef" type="file" accept=".pdf,.txt,.doc,.docx" style="display:none" @change="handleResumeUpload" />
          <div v-if="jdText" class="file-tag">
            <span>📋 已粘贴JD</span>
            <NButton text size="tiny" @click="jdText = ''">✕ 删除</NButton>
          </div>
          <div v-if="resumeText" class="file-tag">
            <span>📄 已上传简历</span>
            <NButton text size="tiny" @click="resumeText = ''">✕ 删除</NButton>
          </div>
        </div>

        <!-- ③ 高级设置 -->
        <div class="section">
          <div
            :class="['expand-toggle', 'advanced-toggle', { open: showAdvancedSettings }]"
            @click="showAdvancedSettings = !showAdvancedSettings"
          >
            ⚙️ 高级设置 {{ showAdvancedSettings ? '▴' : '▾' }}
          </div>
          <div v-if="showAdvancedSettings" class="advanced-settings">
            <div class="setting-row">
              <span class="setting-label">强度</span>
              <div class="setting-options">
                <NButton
                  v-for="opt in difficultyOptions" :key="opt.value"
                  :type="form.difficulty === opt.value ? 'primary' : 'default'"
                  size="small"
                  @click="form.difficulty = opt.value"
                >{{ opt.icon }} {{ opt.label }}</NButton>
              </div>
            </div>
            <div class="setting-row">
              <span class="setting-label">风格</span>
              <div class="setting-options">
                <NButton
                  v-for="opt in styleOptions" :key="opt.value"
                  :type="form.interviewerStyle === opt.value ? 'primary' : 'default'"
                  size="small"
                  @click="form.interviewerStyle = opt.value"
                >{{ opt.icon }} {{ opt.label }}</NButton>
              </div>
            </div>
            <div class="setting-row">
              <span class="setting-label">时长</span>
              <div class="setting-options" v-if="!selectedPositionDefaultDuration">
                <NButton
                  v-for="opt in durationOptions" :key="opt.value"
                  :type="form.duration === opt.value ? 'primary' : 'default'"
                  size="small"
                  @click="form.duration = opt.value"
                >{{ opt.label }}</NButton>
              </div>
              <div v-else class="setting-locked">
                <NTag type="info" size="small">该岗位固定 {{ selectedPositionDefaultDuration }} 分钟</NTag>
              </div>
            </div>
            <div class="setting-row">
              <span class="setting-label">题数</span>
              <div class="setting-options" v-if="!selectedPositionDefaultQuestionCount">
                <NButton
                  v-for="opt in questionCountOptions" :key="opt.value"
                  :type="form.questionCount === opt.value ? 'primary' : 'default'"
                  size="small"
                  @click="form.questionCount = opt.value"
                >{{ opt.label }}</NButton>
              </div>
              <div v-else class="setting-locked">
                <NTag type="info" size="small">该岗位固定 {{ selectedPositionDefaultQuestionCount }} 题</NTag>
              </div>
            </div>
            <div class="setting-row">
              <span class="setting-label">语音</span>
              <div class="setting-options">
                <NButton
                  :type="form.voiceEnabled ? 'primary' : 'default'"
                  size="small"
                  @click="form.voiceEnabled = !form.voiceEnabled"
                >{{ form.voiceEnabled ? '✓ 语音播报' : '✗ 语音播报' }}</NButton>
              </div>
            </div>
          </div>
        </div>

        <!-- ④ 特殊要求 -->
        <div class="section">
          <h3 class="section-title">④ 特殊要求（可选）</h3>
          <NInput
            v-model:value="form.customRequirements"
            type="textarea"
            placeholder="例如：重点考察数据分析能力..."
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
        </div>

        <div class="start-section">
          <div class="quota-badge" v-if="quotaInfo">
            剩余免费次数：{{ quotaInfo.remaining === -1 ? '无限' : quotaInfo.remaining }}次
          </div>
          <NButton
            type="primary"
            size="large"
            :loading="starting"
            @click="handleStart"
            class="start-btn"
          >
            开始面试 →
          </NButton>
        </div>
      </NCard>
    </div>

    <NModal v-model:show="showPasteJd" title="粘贴JD文本" preset="card" style="width: 500px;">
      <NInput
        v-model:value="jdText"
        type="textarea"
        placeholder="粘贴职位描述..."
        :autosize="{ minRows: 6, maxRows: 12 }"
      />
      <template #footer>
        <NButton @click="showPasteJd = false">确定</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useInterviewStore } from '@/stores/interview'
import { checkQuota } from '@/api/auth'
import request from '@/utils/request'

const router = useRouter()
const message = useMessage()
const interviewStore = useInterviewStore()

const positions = ref([])
const selectedPositionId = ref(null)
const showAllPositions = ref(false)
const showAdvancedSettings = ref(false)
const showPasteJd = ref(false)
const jdText = ref('')
const resumeText = ref('')
const starting = ref(false)
const quotaInfo = ref(null)
const resumeInputRef = ref(null)

const form = ref({
  difficulty: 'standard',
  interviewerStyle: 'professional',
  duration: 10,
  questionCount: 8,
  voiceEnabled: false,
  customRequirements: '',
})

const difficultyOptions = [
  { value: 'easy', label: '轻松', icon: '😊' },
  { value: 'standard', label: '标准', icon: '💪' },
  { value: 'pressure', label: '压力', icon: '🔥' },
]

const styleOptions = [
  { value: 'professional', label: '专业', icon: '🤵' },
  { value: 'friendly', label: '亲和', icon: '😊' },
  { value: 'strict', label: '严厉', icon: '🔥' },
]

const durationOptions = [
  { value: 5, label: '5分' },
  { value: 10, label: '10分' },
  { value: 15, label: '15分' },
  { value: 0, label: '不限' },
]

const questionCountOptions = [
  { value: 5, label: '5题' },
  { value: 8, label: '8题' },
  { value: 10, label: '10题' },
  { value: 0, label: '自适应' },
]

const hotPositions = computed(() => {
  return positions.value.filter(p => p.isHot)
})

const groupedPositions = computed(() => {
  const groups = {}
  positions.value.forEach(p => {
    const cat = p.category || '其他'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(p)
  })
  return groups
})

function selectPosition(id) {
  selectedPositionId.value = selectedPositionId.value === id ? null : id
  if (selectedPositionId.value) {
    const pos = positions.value.find(p => p.id === selectedPositionId.value)
    if (pos) {
      if (pos.defaultQuestionCount) {
        form.value.questionCount = pos.defaultQuestionCount
      }
      if (pos.defaultDuration) {
        form.value.duration = pos.defaultDuration
      }
    }
  }
}

const selectedPositionDefaultQuestionCount = computed(() => {
  if (!selectedPositionId.value) return null
  const pos = positions.value.find(p => p.id === selectedPositionId.value)
  return pos?.defaultQuestionCount || null
})

const selectedPositionDefaultDuration = computed(() => {
  if (!selectedPositionId.value) return null
  const pos = positions.value.find(p => p.id === selectedPositionId.value)
  return pos?.defaultDuration || null
})

function triggerResumeUpload() {
  resumeInputRef.value?.click()
}

function handleResumeUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    resumeText.value = reader.result?.toString() || ''
  }
  reader.readAsText(file)
}

async function handleStart() {
  starting.value = true
  interviewStore.isFinished.value = false
  try {
    const token = localStorage.getItem('user_token')
    const result = await request.post('/api/interview/start', {
      positionId: selectedPositionId.value || null,
      jdText: jdText.value || null,
      resumeText: resumeText.value || null,
      difficulty: form.value.difficulty,
      interviewerStyle: form.value.interviewerStyle,
      duration: form.value.duration,
      questionCount: form.value.questionCount,
      customRequirements: form.value.customRequirements || null,
      voiceEnabled: form.value.voiceEnabled,
    }, { headers: { Authorization: 'Bearer ' + token } })

    interviewStore.sessionId.value = result.sessionId
    interviewStore.messages.value = result.messages || []
    interviewStore.isInterviewing.value = true
    interviewStore.isFinished.value = false
    interviewStore.evaluation.value = null
    interviewStore.currentQuestionIndex.value = result.questionIndex || 0
    interviewStore.totalQuestions.value = result.totalQuestions || 8
    const pos = positions.value.find(p => p.id === selectedPositionId.value)
    interviewStore.selectedPosition.value = pos ? pos.name : '面试'

    router.push('/interview')
  } catch (e) {
    if (e?.message === 'QUOTA_EXHAUSTED' || e?.data?.code === 'QUOTA_EXHAUSTED') {
      router.push('/paywall')
    } else {
      message.error(e?.data?.error || '开始失败，请重试')
    }
  } finally {
    starting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await request.get('/api/positions')
    positions.value = res || []
    // 默认选中通用
    const general = positions.value.find(p => p.name === '通用')
    if (general) selectedPositionId.value = general.id
  } catch (e) {
    console.error('获取岗位列表失败:', e)
  }
  try {
    quotaInfo.value = await checkQuota()
  } catch (e) {}
})
</script>

<style scoped>
.setup-view {
  padding: 24px 16px;
  min-height: calc(100vh - 56px);
  background: #f5f7fa;
}
.container {
  max-width: 640px;
  margin: 0 auto;
}
.setup-title {
  font-size: 22px;
  margin: 0 0 24px 0;
  text-align: center;
}
.section {
  margin-bottom: 28px;
}
.section-title {
  font-size: 15px;
  margin: 0 0 12px 0;
  color: #333;
}
.positions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.position-card {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  font-size: 14px;
}
.position-card:hover {
  border-color: #667eea;
}
.position-card.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.08);
}
.pos-icon {
  font-size: 16px;
}
.pos-name {
  white-space: nowrap;
}
.expand-toggle {
  margin-top: 10px;
  color: #667eea;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}
.expand-toggle:hover {
  text-decoration: underline;
}
.advanced-toggle {
  display: inline-block;
  padding: 8px 16px;
  background: #f0f2f5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}
.advanced-toggle:hover {
  background: #e4e7ed;
  text-decoration: none;
}
.advanced-toggle.open {
  background: rgba(102, 126, 234, 0.08);
  color: #667eea;
}
.advanced-settings {
  margin-top: 12px;
  padding: 12px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.category-label {
  font-size: 12px;
  color: #999;
  margin: 12px 0 6px 0;
}
.file-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.file-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 12px;
  background: #f0f2f5;
  border-radius: 6px;
  font-size: 13px;
}
.setting-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}
.setting-label {
  width: 40px;
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}
.setting-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.setting-locked {
  font-size: 13px;
  color: #666;
}
.start-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.quota-badge {
  font-size: 13px;
  color: #999;
  padding: 6px 12px;
  background: #f0f2f5;
  border-radius: 20px;
}
.start-btn {
  padding: 12px 32px;
  font-size: 16px;
  height: auto;
  border-radius: 10px;
}

@media (max-width: 480px) {
  .positions-grid {
    grid-template-columns: 1fr 1fr;
  }
  .position-card {
    font-size: 13px;
    padding: 6px 10px;
  }
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>