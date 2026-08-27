<template>
  <div class="history-view">
    <div class="container">
      <h2 class="page-title">📋 面试历史</h2>

      <div v-if="loading" class="loading-state">加载中...</div>

      <div v-else-if="sessions.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>还没有面试记录</p>
        <NButton type="primary" @click="router.push('/interview')">开始面试</NButton>
      </div>

      <div v-else class="session-list">
        <NCard v-for="session in sessions" :key="session.id" class="session-card">
          <div class="session-header">
            <div class="session-info">
              <div class="session-position">{{ session.position || '通用面试' }}</div>
              <div class="session-meta">
                <NTag size="small" type="default">{{ session.position_name || session.position || '通用面试' }}</NTag>
                <span class="session-date">{{ formatDate(session.created_at) }}</span>
              </div>
            </div>
            <div class="session-score" v-if="session.score != null">
              <div class="score-badge" :class="scoreClass(session.score)">{{ session.score }}/10</div>
            </div>
            <div class="session-status" v-else>
              <NTag size="small" type="warning">进行中</NTag>
            </div>
          </div>
          <div class="session-actions">
            <NButton text size="small" @click="viewSession(session)">查看详情</NButton>
            <NButton v-if="session.score != null" text size="small" type="primary" @click="router.push(`/interview/report/${session.id}`)">查看报告</NButton>
            <NButton text size="small" type="error" @click="confirmDelete(session)">删除</NButton>
          </div>
        </NCard>
      </div>

      <NModal v-model:show="showDetail" preset="card" title="面试详情" style="width: 600px">
        <div v-if="selectedSession" class="session-detail">
          <div class="detail-meta">
            <div><strong>岗位：</strong>{{ selectedSession.position || '通用面试' }}</div>
            <div><strong>时间：</strong>{{ formatDate(selectedSession.created_at) }}</div>
            <div v-if="selectedSession.score != null"><strong>评分：</strong>{{ selectedSession.score }}/10</div>
          </div>
          <div v-if="selectedSession.evaluation" class="detail-eval">
            <h4>评估报告</h4>
            <p>{{ selectedSession.evaluation }}</p>
          </div>
          <div class="detail-messages">
            <h4>对话记录</h4>
            <div v-for="(msg, i) in selectedMessages" :key="i" :class="['detail-msg', msg.role]">
              <strong>{{ msg.role === 'interviewer' ? '🤖 面试官' : '👤 你' }}</strong>
              <p>{{ msg.content }}</p>
            </div>
          </div>
        </div>
      </NModal>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getInterviewHistory, getSessionDetail, deleteSession } from '@/api/data'

const router = useRouter()
const message = useMessage()
const sessions = ref([])
const loading = ref(false)
const showDetail = ref(false)
const selectedSession = ref(null)
const selectedMessages = ref([])



function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function scoreClass(score) {
  if (score >= 8) return 'high'
  if (score >= 6) return 'mid'
  return 'low'
}

async function loadHistory() {
  loading.value = true
  try {
    const data = await getInterviewHistory()
    sessions.value = data.sessions || []
  } catch (e) {
    message.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function viewSession(session) {
  selectedSession.value = session
  showDetail.value = true
  try {
    const detail = await getSessionDetail(session.id)
    selectedMessages.value = detail.messages || []
    if (detail.evaluation) {
      selectedSession.value.evaluation = detail.evaluation
      selectedSession.value.score = detail.score
    }
  } catch (e) {}
}

async function confirmDelete(session) {
  try {
    await deleteSession(session.id)
    message.success('已删除')
    sessions.value = sessions.value.filter(s => s.id !== session.id)
  } catch (e) {
    message.error('删除失败')
  }
}

onMounted(() => loadHistory())
</script>

<style scoped>
.history-view { padding: 24px; }
.container { max-width: 800px; margin: 0 auto; }
.page-title { font-size: 24px; margin: 0 0 24px 0; }
.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.session-list { display: flex; flex-direction: column; gap: 12px; }
.session-card { }
.session-header { display: flex; justify-content: space-between; align-items: flex-start; }
.session-position { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.session-meta { display: flex; align-items: center; gap: 8px; }
.session-date { font-size: 13px; color: #999; }
.score-badge { display: inline-flex; width: 52px; height: 52px; border-radius: 50%; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; }
.score-badge.high { background: linear-gradient(135deg, #52c41a, #73d13d); }
.score-badge.mid { background: linear-gradient(135deg, #faad14, #ffc53d); }
.score-badge.low { background: linear-gradient(135deg, #ff4d4f, #ff7875); }
.session-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.session-detail { }
.detail-meta { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.detail-eval { background: #f8f9ff; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
.detail-eval h4 { margin-bottom: 8px; }
.detail-eval p { font-size: 14px; color: #666; line-height: 1.6; }
.detail-messages { max-height: 300px; overflow-y: auto; }
.detail-messages h4 { margin-bottom: 12px; }
.detail-msg { padding: 10px; margin-bottom: 8px; border-radius: 8px; }
.detail-msg.interviewer { background: #f0f2f5; }
.detail-msg.user { background: #e8ecff; }
.detail-msg strong { font-size: 13px; display: block; margin-bottom: 4px; }
.detail-msg p { font-size: 14px; color: #333; line-height: 1.5; }
</style>