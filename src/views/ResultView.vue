<template>
  <div class="report-page">
    <div class="report-header">
      <NButton text class="back-btn" @click="goHome">
        <template #icon><span class="back-icon">←</span></template>
        返回
      </NButton>
      <h1 class="report-title">面试分析报告</h1>
      <div class="header-actions">
        <NButton text class="action-btn" @click="handleShare">
          <span class="action-icon">📤</span> 分享
        </NButton>
        <NButton text class="action-btn" @click="handleExport">
          <span class="action-icon">📄</span> 导出
        </NButton>
      </div>
    </div>

    <div class="report-body">
      <!-- 总分卡片 -->
      <NCard class="score-card">
        <div class="score-card-header">
          <span class="score-meta">{{ reportMeta }}</span>
        </div>
        <div class="score-main">
          <div class="score-circle">
            <span class="score-number">{{ reportData.overallScore || '--' }}</span>
            <span class="score-divider">/</span>
            <span class="score-max">10</span>
          </div>
          <div class="score-stars">
            <span
              v-for="i in 10"
              :key="i"
              class="star"
              :class="{ filled: i <= Math.round(reportData.overallScore || 0) }"
            >★</span>
          </div>
        </div>
        <p class="score-summary">{{ reportData.summary || '报告生成中...' }}</p>
      </NCard>

      <!-- 五维评分 -->
      <NCard class="dimension-card">
        <h3 class="section-title">
          <span class="section-icon">📊</span> 五维评分
        </h3>
        <div class="dimension-list">
          <div v-for="(dim, key) in dimensionItems" :key="key" class="dimension-item">
            <div class="dimension-header">
              <span class="dimension-name">{{ dim.label }}</span>
              <span class="dimension-score" :style="{ color: getScoreColor(dim.score) }">
                {{ isPaid ? dim.score + '/10' : '??/10' }}
              </span>
            </div>
            <NProgress
              type="line"
              :percentage="isPaid ? dim.score * 10 : 0"
              :show-indicator="false"
              :height="8"
              :border-radius="4"
              :color="isPaid ? getProgressColor(dim.score) : '#e8e8e8'"
              rail-color="#f0f0f0"
            />
            <p v-if="isPaid && dim.comment" class="dimension-comment">{{ dim.comment }}</p>
          </div>
        </div>
        <div v-if="!isPaid" class="lock-overlay" @click="showPaywall">
          <div class="lock-content">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">解锁完整评分</span>
          </div>
        </div>
      </NCard>

      <!-- 核心优势 -->
      <NCard class="strength-card">
        <h3 class="section-title">
          <span class="section-icon">✅</span> 核心优势
          <span v-if="reportData.strengths?.length" class="section-count">{{ reportData.strengths.length }}项</span>
        </h3>
        <div v-if="isPaid && reportData.strengths?.length" class="strength-list">
          <div v-for="(item, idx) in reportData.strengths" :key="idx" class="strength-item">
            <div class="strength-num">{{ idx + 1 }}</div>
            <div class="strength-content">
              <h4 class="strength-title">{{ item.title }}</h4>
              <p class="strength-evidence">"{{ item.evidence }}"</p>
            </div>
          </div>
        </div>
        <div v-else-if="isPaid && !reportData.strengths?.length" class="empty-state">
          暂无数据
        </div>
        <div v-else class="lock-overlay" @click="showPaywall">
          <div class="lock-content">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">解锁查看核心优势</span>
          </div>
        </div>
      </NCard>

      <!-- 关键问题 -->
      <NCard class="weakness-card">
        <h3 class="section-title">
          <span class="section-icon">⚠️</span> 关键问题
          <span v-if="reportData.weaknesses?.length" class="section-count">{{ reportData.weaknesses.length }}项</span>
        </h3>
        <div v-if="isPaid && reportData.weaknesses?.length" class="weakness-list">
          <div v-for="(item, idx) in reportData.weaknesses" :key="idx" class="weakness-item">
            <div class="weakness-num">{{ idx + 1 }}</div>
            <div class="weakness-content">
              <h4 class="weakness-title">{{ item.title }}</h4>
              <p v-if="item.questionNumber" class="weakness-question">
                问题{{ item.questionNumber }}：{{ item.evidence }}
              </p>
              <p v-else class="weakness-evidence">{{ item.evidence }}</p>
            </div>
          </div>
        </div>
        <div v-else-if="isPaid && !reportData.weaknesses?.length" class="empty-state">
          暂无数据
        </div>
        <div v-else class="lock-overlay" @click="showPaywall">
          <div class="lock-content">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">解锁查看关键问题</span>
          </div>
        </div>
      </NCard>

      <!-- 逐题详细分析 -->
      <NCard class="question-card">
        <h3 class="section-title">
          <span class="section-icon">📝</span> 逐题详细分析
          <span v-if="reportData.questionAnalysis?.length" class="section-count">{{ reportData.questionAnalysis.length }}题</span>
        </h3>
        <div v-if="isPaid && reportData.questionAnalysis?.length" class="question-list">
          <div
            v-for="(item, idx) in reportData.questionAnalysis"
            :key="idx"
            class="question-item"
          >
            <div class="question-header" @click="toggleQuestion(idx)">
              <div class="question-info">
                <span class="question-expand">{{ expandedQuestions[idx] ? '▼' : '▶' }}</span>
                <span class="question-label">问题{{ item.questionNumber }}：</span>
                <span class="question-text">{{ item.question }}</span>
              </div>
              <span class="question-score-badge" :style="{ background: getScoreBadgeColor(item.score) }">
                ⭐ {{ item.score }}/10
              </span>
            </div>
            <div v-show="expandedQuestions[idx]" class="question-detail">
              <div class="detail-section">
                <div class="detail-label">你的回答摘要：</div>
                <p class="detail-text answer-text">"{{ item.userAnswerSummary }}"</p>
              </div>
              <div class="detail-section">
                <div class="detail-label">问题诊断：</div>
                <p class="detail-text diagnosis-text">{{ item.diagnosis }}</p>
              </div>
              <div class="detail-section improved-section">
                <div class="detail-label">改进话术：</div>
                <p class="detail-text improved-text">"{{ item.improvedAnswer }}"</p>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="isPaid && !reportData.questionAnalysis?.length" class="empty-state">
          暂无逐题分析数据
        </div>
        <div v-else class="lock-overlay" @click="showPaywall">
          <div class="lock-content">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">解锁查看逐题分析</span>
          </div>
        </div>
      </NCard>

      <!-- 针对性练习建议 -->
      <NCard class="practice-card">
        <h3 class="section-title">
          <span class="section-icon">🎯</span> 针对性练习建议
        </h3>
        <div v-if="isPaid && reportData.practiceSuggestions?.length" class="practice-list">
          <div v-for="(item, idx) in reportData.practiceSuggestions" :key="idx" class="practice-item">
            <span class="practice-num">{{ idx + 1 }}.</span>
            <span class="practice-text">{{ item }}</span>
          </div>
          <NButton type="primary" class="retry-weakness-btn" @click="retryWithWeakness">
            针对这些弱项再练一次 →
          </NButton>
        </div>
        <div v-else-if="isPaid && !reportData.practiceSuggestions?.length" class="empty-state">
          暂无练习建议
        </div>
        <div v-else class="lock-overlay" @click="showPaywall">
          <div class="lock-content">
            <span class="lock-icon">🔒</span>
            <span class="lock-text">解锁查看练习建议</span>
          </div>
        </div>
      </NCard>

      <!-- 底部操作按钮 -->
      <div class="bottom-actions">
        <NButton size="large" class="action-btn-retry" @click="retryInterview">
          🔄 再练一次
        </NButton>
        <NButton size="large" class="action-btn-share" @click="handleShare">
          📤 分享报告
        </NButton>
        <NButton size="large" class="action-btn-export" @click="handleExport">
          📄 导出PDF
        </NButton>
      </div>
    </div>

    <!-- 移动端固定付费按钮 -->
    <div v-if="!isPaid" class="mobile-pay-bar">
      <NButton type="primary" size="large" class="mobile-pay-btn" @click="showPaywall">
        解锁完整报告 ¥{{ pricing.monthly?.price || 39 }}/月
      </NButton>
    </div>

    <!-- 付费弹窗 -->
    <NModal v-model:show="paywallVisible" :mask-closable="true" class="paywall-modal">
      <NCard class="paywall-card" :bordered="true">
        <h3 class="paywall-title">🔒 解锁完整报告</h3>
        <p class="paywall-desc">完整报告包含：</p>
        <ul class="paywall-features">
          <li>✅ 五维能力评分</li>
          <li>✅ 逐题分析 + 改进话术</li>
          <li>✅ 个性化练习建议</li>
          <li>✅ 弱项针对性再练</li>
        </ul>
        <div class="paywall-plans">
          <div class="paywall-plan">
            <div class="plan-name">月度会员</div>
            <div class="plan-price">¥{{ pricing.monthly?.price || 39 }}<span class="plan-period">/{{ pricing.monthly?.days || 30 }}天</span></div>
          </div>
          <div class="paywall-plan">
            <div class="plan-name">年费会员</div>
            <div class="plan-price">¥{{ pricing.yearly?.price || 199 }}<span class="plan-period">/{{ pricing.yearly?.days || 365 }}天</span></div>
          </div>
        </div>
        <div v-if="qrCodeUrl" class="qr-section">
          <img :src="qrCodeUrl" alt="微信二维码" class="qr-image" />
          <p class="qr-hint">微信扫码添加，备注注册邮箱</p>
        </div>
        <div class="paywall-contact">
          <div class="contact-row">
            <span class="contact-text">📱 微信：{{ pricing.adminContact?.wechat || '请联系客服' }}</span>
            <NButton size="small" text class="copy-btn" @click="copyWechat">复制</NButton>
          </div>
          <div class="contact-row" v-if="pricing.adminContact?.phone">
            <span class="contact-text">📞 电话：{{ pricing.adminContact.phone }}</span>
            <NButton size="small" text class="copy-btn" @click="copyPhone">复制</NButton>
          </div>
          <p class="contact-hint">💡 备注注册邮箱，5分钟开通</p>
        </div>
        <NButton class="paywall-close-btn" text @click="paywallVisible = false">
          关闭
        </NButton>
      </NCard>
    </NModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useInterviewStore } from '@/stores/interview'
import { getInterviewReport } from '@/api/interview'
import { getPricing } from '@/api/auth'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const interviewStore = useInterviewStore()

const reportData = reactive({
  overallScore: 0,
  summary: '',
  dimensions: {},
  strengths: [],
  weaknesses: [],
  questionAnalysis: [],
  practiceSuggestions: [],
  createdAt: '',
})

const expandedQuestions = ref({})
const paywallVisible = ref(false)
const qrCodeUrl = ref('')
const isLoading = ref(true)
const pricing = ref({ monthly: { price: 39, days: 30 }, yearly: { price: 199, days: 365 }, adminContact: { wechat: '', phone: '' } })

const isPaid = computed(() => userStore.canAccessFullReport())

const reportMeta = computed(() => {
  if (!reportData.createdAt) return '面试报告'
  const d = new Date(reportData.createdAt)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `面试报告 · ${year}年${month}月${day}日 ${hours}:${mins}`
})

const dimensionItems = computed(() => {
  const dims = reportData.dimensions || {}
  const map = [
    { key: 'completeness', label: '回答完整性', score: dims.completeness?.score || 0, comment: dims.completeness?.comment || '' },
    { key: 'logic', label: '逻辑清晰度', score: dims.logic?.score || 0, comment: dims.logic?.comment || '' },
    { key: 'persuasion', label: '案例说服力', score: dims.persuasion?.score || 0, comment: dims.persuasion?.comment || '' },
    { key: 'fluency', label: '表达流畅度', score: dims.fluency?.score || 0, comment: dims.fluency?.comment || '' },
    { key: 'jobFit', label: '岗位匹配度', score: dims.jobFit?.score || 0, comment: dims.jobFit?.comment || '' },
  ]
  return map
})

function toggleQuestion(idx) {
  expandedQuestions.value[idx] = !expandedQuestions.value[idx]
}

function getScoreColor(score) {
  if (score >= 8) return '#52c41a'
  if (score >= 6) return '#1890ff'
  if (score >= 4) return '#faad14'
  return '#f5222d'
}

function getProgressColor(score) {
  if (score >= 8) return '#52c41a'
  if (score >= 6) return '#1890ff'
  if (score >= 4) return '#faad14'
  return '#f5222d'
}

function getScoreBadgeColor(score) {
  if (score >= 8) return 'linear-gradient(135deg, #52c41a, #73d13d)'
  if (score >= 6) return 'linear-gradient(135deg, #1890ff, #40a9ff)'
  if (score >= 4) return 'linear-gradient(135deg, #faad14, #ffc53d)'
  return 'linear-gradient(135deg, #f5222d, #ff4d4f)'
}

function goHome() {
  router.push('/')
}

function retryInterview() {
  interviewStore.resetInterview()
  router.push('/interview/setup')
}

function retryWithWeakness() {
  const weaknesses = reportData.weaknesses || []
  const suggestions = reportData.practiceSuggestions || []
  const focusAreas = [...weaknesses.map(w => w.title), ...suggestions.slice(0, 2)]
  interviewStore.resetInterview()
  router.push({
    path: '/interview/setup',
    query: { focusAreas: focusAreas.join(',') },
  })
}

function handleShare() {
  if (navigator.share) {
    navigator.share({
      title: '面试分析报告',
      text: `我完成了AI模拟面试，得分 ${reportData.overallScore}/10！${reportData.summary}`,
      url: window.location.href,
    }).catch(() => {})
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      message.success('链接已复制到剪贴板')
    }).catch(() => {
      message.info('分享链接：' + window.location.href)
    })
  }
}

function handleExport() {
  window.print()
}

function showPaywall() {
  paywallVisible.value = true
}

function copyWechat() {
  const wechat = pricing.value.adminContact?.wechat
  if (!wechat) {
    message.info('请联系客服获取联系方式')
    return
  }
  navigator.clipboard.writeText(wechat).then(() => {
    message.success('微信号已复制')
  }).catch(() => {})
}

function copyPhone() {
  const phone = pricing.value.adminContact?.phone
  if (!phone) return
  navigator.clipboard.writeText(phone).then(() => {
    message.success('手机号已复制')
  }).catch(() => {})
}

onMounted(async () => {
  qrCodeUrl.value = '/wechat-qr.png'

  const sessionId = route.params.sessionId
  if (!sessionId) {
    message.error('缺少会话ID')
    router.replace('/')
    return
  }

  try {
    const pricingData = await getPricing()
    if (pricingData) {
      pricing.value = pricingData
    }
  } catch {}

  try {
    const data = await getInterviewReport(sessionId)
    if (data) {
      reportData.overallScore = data.overallScore || 0
      reportData.summary = data.summary || ''
      reportData.dimensions = data.dimensions || {}
      reportData.strengths = data.strengths || []
      reportData.weaknesses = data.weaknesses || []
      reportData.questionAnalysis = data.questionAnalysis || []
      reportData.practiceSuggestions = data.practiceSuggestions || []
      reportData.createdAt = data.createdAt || ''

      if (reportData.questionAnalysis?.length) {
        expandedQuestions.value[0] = true
      }
    }
  } catch (e) {
    console.error('获取报告失败:', e)
    message.error('获取报告数据失败')
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.report-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 15px;
  color: #666;
}

.back-icon {
  font-size: 18px;
  margin-right: 4px;
}

.report-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  font-size: 14px;
  color: #666;
}

.action-icon {
  margin-right: 4px;
}

.report-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 总分卡片 */
.score-card {
  text-align: center;
  padding: 8px;
}

.score-card-header {
  margin-bottom: 16px;
}

.score-meta {
  font-size: 14px;
  color: #999;
}

.score-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.score-circle {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 12px;
}

.score-number {
  font-size: 64px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.score-divider {
  font-size: 28px;
  color: #bbb;
  margin: 0 4px;
}

.score-max {
  font-size: 28px;
  color: #999;
  font-weight: 500;
}

.score-stars {
  display: flex;
  gap: 2px;
  margin-bottom: 4px;
}

.star {
  font-size: 22px;
  color: #e0e0e0;
  transition: color 0.2s;
}

.star.filled {
  color: #f5a623;
}

.score-summary {
  font-size: 16px;
  color: #555;
  margin: 0;
  font-style: italic;
  line-height: 1.5;
}

/* 区域标题 */
.section-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
}

.section-count {
  font-size: 13px;
  color: #999;
  font-weight: 400;
  margin-left: auto;
}

/* 五维评分 */
.dimension-card {
  position: relative;
}

.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dimension-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dimension-name {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.dimension-score {
  font-size: 14px;
  font-weight: 600;
}

.dimension-comment {
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* 核心优势 */
.strength-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strength-item {
  display: flex;
  gap: 12px;
}

.strength-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.strength-content {
  flex: 1;
}

.strength-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 6px 0;
}

.strength-evidence {
  font-size: 13px;
  color: #888;
  margin: 0;
  line-height: 1.6;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #52c41a;
}

/* 关键问题 */
.weakness-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weakness-item {
  display: flex;
  gap: 12px;
}

.weakness-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #faad14, #ffc53d);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.weakness-content {
  flex: 1;
}

.weakness-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 6px 0;
}

.weakness-question,
.weakness-evidence {
  font-size: 13px;
  color: #888;
  margin: 0;
  line-height: 1.6;
  background: #fffbf0;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #faad14;
}

/* 逐题分析 */
.question-list {
  display: flex;
  flex-direction: column;
}

.question-item {
  border-bottom: 1px solid #f0f0f0;
}

.question-item:last-child {
  border-bottom: none;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.question-header:hover {
  background: #fafafa;
  margin: 0 -12px;
  padding: 12px;
  border-radius: 6px;
}

.question-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.question-expand {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.question-label {
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}

.question-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-score-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.question-detail {
  padding: 0 0 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 13px;
  color: #888;
  font-weight: 500;
}

.detail-text {
  font-size: 14px;
  margin: 0;
  line-height: 1.6;
}

.answer-text {
  color: #555;
  font-style: italic;
  background: #f9f9f9;
  padding: 8px 12px;
  border-radius: 6px;
}

.diagnosis-text {
  color: #e67e22;
  background: #fff8f0;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #e67e22;
}

.improved-section {
  margin-top: 4px;
}

.improved-text {
  color: #27ae60;
  background: #f0faf5;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #27ae60;
}

/* 练习建议 */
.practice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.practice-item {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.04), rgba(118, 75, 162, 0.04));
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.practice-num {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  flex-shrink: 0;
}

.practice-text {
  font-size: 14px;
  color: #444;
  line-height: 1.5;
}

.retry-weakness-btn {
  width: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-size: 15px;
  height: 44px;
}

/* 底部操作 */
.bottom-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 8px 0;
}

.action-btn-retry {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  font-weight: 600;
}

.action-btn-share,
.action-btn-export {
  border: 1px solid #ddd;
}

/* 锁定遮罩 */
.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(2px);
  border-radius: 12px;
  z-index: 2;
  transition: all 0.2s;
}

.lock-overlay:hover {
  background: rgba(255, 255, 255, 0.75);
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.lock-icon {
  font-size: 32px;
}

.lock-text {
  font-size: 15px;
  color: #667eea;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 24px;
  color: #bbb;
  font-size: 14px;
}

/* 移动端付费栏 */
.mobile-pay-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 20;
}

.mobile-pay-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
}

/* 付费弹窗 */
.paywall-card {
  max-width: 380px;
  text-align: center;
  padding: 8px;
}

.paywall-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1a1a1a;
}

.paywall-desc {
  font-size: 14px;
  color: #888;
  margin: 0 0 16px 0;
}

.paywall-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  text-align: left;
  display: inline-block;
}

.paywall-features li {
  font-size: 14px;
  color: #444;
  padding: 4px 0;
}

.paywall-plans {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.paywall-plan {
  flex: 1;
  padding: 16px 12px;
  border: 2px solid #eee;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.03), rgba(118, 75, 162, 0.03));
}

.plan-name {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}

.plan-price {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.plan-period {
  font-size: 13px;
  font-weight: 400;
  color: #999;
}

.paywall-contact {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.qr-section {
  text-align: center;
  margin-bottom: 16px;
}

.qr-image {
  width: 180px;
  height: 180px;
  border: 1px solid #eee;
  border-radius: 12px;
}

.qr-hint {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}

.contact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  width: 100%;
}

.contact-text {
  font-size: 14px;
  color: #444;
  margin: 0;
}

.copy-btn {
  font-size: 13px;
  color: #667eea;
}

.contact-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
  width: 100%;
}

.paywall-close-btn {
  width: 100%;
  color: #999;
}

/* 响应式 */
@media (max-width: 768px) {
  .report-header {
    padding: 12px 16px;
  }

  .report-title {
    font-size: 16px;
  }

  .header-actions {
    gap: 0;
  }

  .action-btn {
    font-size: 13px;
    padding: 4px 8px;
  }

  .report-body {
    padding: 12px;
    gap: 12px;
  }

  .score-number {
    font-size: 52px;
  }

  .score-stars .star {
    font-size: 18px;
  }

  .bottom-actions {
    flex-direction: column;
  }

  .action-btn-retry,
  .action-btn-share,
  .action-btn-export {
    width: 100%;
  }

  .mobile-pay-bar {
    display: block;
  }

  .report-page {
    padding-bottom: 80px;
  }

  .paywall-plans {
    flex-direction: column;
  }
}

@media print {
  .report-header,
  .bottom-actions,
  .mobile-pay-bar,
  .lock-overlay {
    display: none !important;
  }

  .report-page {
    background: #fff;
    padding-bottom: 0;
  }

  .report-body {
    max-width: 100%;
    padding: 0;
  }
}
</style>