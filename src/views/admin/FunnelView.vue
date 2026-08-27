<template>
  <div class="funnel-view">
    <h2 class="page-title">🔽 转化漏斗</h2>

    <div class="days-selector">
      <NButton v-for="d in dayOptions" :key="d" :type="days === d ? 'primary' : 'default'" size="small" @click="days = d; loadFunnel()">{{ d }}天</NButton>
    </div>

    <div class="funnel-container" v-if="funnel">
      <div class="funnel-step" v-for="(step, index) in funnelSteps" :key="step.key">
        <div class="step-bar" :style="{ width: stepPercent(step) + '%' }">
          <div class="step-label">{{ step.label }}</div>
          <div class="step-value">{{ funnel[step.key] }}</div>
        </div>
        <div v-if="index < funnelSteps.length - 1" class="step-arrow">↓ {{ conversionRate(step, funnelSteps[index + 1]) }}%</div>
      </div>
    </div>

    <h3 class="section-title">趋势图</h3>
    <div class="trend-selector">
      <NButton v-for="m in metrics" :key="m.value" :type="metric === m.value ? 'primary' : 'default'" size="small" @click="metric = m.value; loadTrend()">{{ m.label }}</NButton>
    </div>

    <div class="trend-chart" v-if="trend.length">
      <div class="trend-bars">
        <div class="trend-bar" v-for="item in trend" :key="item.date">
          <div class="bar-value">{{ item.count }}</div>
          <div class="bar-fill" :style="{ height: barHeight(item) + 'px' }"></div>
          <div class="bar-date">{{ item.date.slice(5) }}</div>
        </div>
      </div>
    </div>

    <h3 class="section-title">白嫖用户（用完额度未付费）</h3>
    <NDataTable :columns="whaleColumns" :data="whaleUsers" :loading="loadingWhale" :row-key="(row) => row.id" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'

const days = ref(30)
const metric = ref('registers')
const funnel = ref(null)
const trend = ref([])
const whaleUsers = ref([])
const loadingWhale = ref(false)

const dayOptions = [7, 14, 30, 60, 90]
const metrics = [
  { label: '注册', value: 'registers' },
  { label: '面试', value: 'interviews' },
  { label: '收入', value: 'revenue' },
]

const funnelSteps = [
  { key: 'registers', label: '注册' },
  { key: 'started_interview', label: '开始面试' },
  { key: 'completed_interview', label: '完成面试' },
  { key: 'exhausted_quota', label: '用完额度' },
  { key: 'contacted_admin', label: '联系管理员' },
  { key: 'paid', label: '付费' },
]

const whaleColumns = [
  { title: '邮箱', key: 'email', ellipsis: { tooltip: true } },
  { title: '面试次数', key: 'interview_count', width: 80 },
  { title: '最近活跃', key: 'last_interview_at', width: 140, render: (row) => row.last_interview_at ? formatDate(row.last_interview_at) : '-' },
  { title: '注册时间', key: 'created_at', width: 140, render: (row) => formatDate(row.created_at) },
]

function getHeaders() { return { Authorization: 'Bearer ' + localStorage.getItem('admin_token') } }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function stepPercent(step) {
  if (!funnel.value || !funnel.value.registers) return 0
  return Math.round((funnel.value[step.key] / funnel.value.registers) * 100)
}

function conversionRate(from, to) {
  if (!funnel.value || !funnel.value[from.key]) return 0
  return Math.round((funnel.value[to.key] / funnel.value[from.key]) * 100)
}

function barHeight(item) {
  const max = Math.max(...trend.value.map(t => t.count), 1)
  return Math.max(item.count / max * 120, 2)
}

async function loadFunnel() {
  try {
    funnel.value = await request.get('/api/admin/funnel?days=' + days.value, { headers: getHeaders() })
  } catch (e) {}
}

async function loadTrend() {
  try {
    trend.value = await request.get('/api/admin/trend?days=' + days.value + '&metric=' + metric.value, { headers: getHeaders() })
  } catch (e) {}
}

async function loadWhaleUsers() {
  loadingWhale.value = true
  try {
    const data = await request.get('/api/admin/whale-users', { headers: getHeaders() })
    whaleUsers.value = data.users
  } catch (e) {} finally { loadingWhale.value = false }
}

onMounted(() => { loadFunnel(); loadTrend(); loadWhaleUsers() })
</script>

<style scoped>
.funnel-view { max-width: 1000px; }
.page-title { font-size: 24px; margin: 0 0 16px 0; }
.days-selector { display: flex; gap: 8px; margin-bottom: 24px; }
.funnel-container { background: white; padding: 24px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 32px; }
.funnel-step { margin-bottom: 8px; }
.step-bar { background: linear-gradient(90deg, #667eea, #764ba2); color: white; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; min-width: 60px; transition: width 0.5s; }
.step-label { font-size: 14px; }
.step-value { font-size: 16px; font-weight: 700; }
.step-arrow { text-align: center; font-size: 12px; color: #999; padding: 4px 0; }
.section-title { font-size: 16px; color: #666; margin: 24px 0 12px 0; }
.trend-selector { display: flex; gap: 8px; margin-bottom: 16px; }
.trend-chart { background: white; padding: 24px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 32px; }
.trend-bars { display: flex; align-items: flex-end; justify-content: space-around; height: 160px; gap: 4px; }
.trend-bar { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-value { font-size: 11px; color: #666; margin-bottom: 4px; }
.bar-fill { width: 100%; max-width: 40px; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 4px 4px 0 0; transition: height 0.5s; min-height: 2px; }
.bar-date { font-size: 10px; color: #999; margin-top: 6px; writing-mode: vertical-lr; }
</style>