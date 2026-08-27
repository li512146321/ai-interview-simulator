<template>
  <div class="dashboard">
    <h2 class="page-title">📈 数据概览</h2>

    <h3 class="section-title">今日概览</h3>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-value">{{ overview.today?.registers || 0 }}</div><div class="stat-label">新注册</div></div>
      <div class="stat-card"><div class="stat-value">{{ overview.today?.interviews || 0 }}</div><div class="stat-label">面试</div></div>
      <div class="stat-card"><div class="stat-value">{{ overview.today?.payments || 0 }}</div><div class="stat-label">付费</div></div>
      <div class="stat-card"><div class="stat-value">¥{{ overview.today?.revenue || 0 }}</div><div class="stat-label">收入</div></div>
    </div>

    <h3 class="section-title">累计数据</h3>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-value">{{ overview.total?.users || 0 }}</div><div class="stat-label">总用户</div></div>
      <div class="stat-card success"><div class="stat-value">{{ overview.total?.paidUsers || 0 }}</div><div class="stat-label">付费用户</div></div>
      <div class="stat-card"><div class="stat-value">{{ overview.total?.interviews || 0 }}</div><div class="stat-label">总面试</div></div>
      <div class="stat-card success"><div class="stat-value">¥{{ overview.total?.revenue || 0 }}</div><div class="stat-label">总收入</div></div>
    </div>

    <h3 class="section-title">用户类型分布</h3>
    <div class="user-types" v-if="overview.userTypes">
      <div class="type-bar" v-for="item in typeBars" :key="item.key">
        <div class="type-label">{{ item.label }}</div>
        <div class="type-bar-track">
          <div class="type-bar-fill" :class="item.key" :style="{ width: item.percent + '%' }"></div>
        </div>
        <div class="type-count">{{ item.count }} ({{ item.percent }}%)</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import request from '@/utils/request'

const overview = ref({ today: {}, total: {}, userTypes: {} })

function getHeaders() {
  return { Authorization: 'Bearer ' + localStorage.getItem('admin_token') }
}

const typeBars = computed(() => {
  const types = overview.value.userTypes || {}
  const total = Object.values(types).reduce((a, b) => a + b, 0) || 1
  return [
    { key: 'paid', label: '🟢 付费用户', count: types.paid || 0, percent: Math.round((types.paid || 0) / total * 100) },
    { key: 'active', label: '🟡 活跃白嫖', count: types.active_free || 0, percent: Math.round((types.active_free || 0) / total * 100) },
    { key: 'lost', label: '🔴 流失白嫖', count: types.lost_free || 0, percent: Math.round((types.lost_free || 0) / total * 100) },
    { key: 'unused', label: '⚪ 未用完', count: types.unused || 0, percent: Math.round((types.unused || 0) / total * 100) },
    { key: 'never', label: '⚫ 从未面试', count: types.never_started || 0, percent: Math.round((types.never_started || 0) / total * 100) },
  ]
})

onMounted(async () => {
  try {
    overview.value = await request.get('/api/admin/overview', { headers: getHeaders() })
  } catch (e) {}
})
</script>

<style scoped>
.dashboard { max-width: 1000px; }
.page-title { font-size: 24px; margin: 0 0 24px 0; }
.section-title { font-size: 16px; color: #666; margin: 24px 0 12px 0; }
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-card.success { border-left: 4px solid #52c41a; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.user-types { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.type-bar { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.type-bar + .type-bar { border-top: 1px solid #f0f0f0; }
.type-label { width: 100px; font-size: 13px; flex-shrink: 0; }
.type-bar-track { flex: 1; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
.type-bar-fill { height: 100%; border-radius: 10px; transition: width 0.5s; }
.type-bar-fill.paid { background: #52c41a; }
.type-bar-fill.active { background: #faad14; }
.type-bar-fill.lost { background: #ff4d4f; }
.type-bar-fill.unused { background: #d9d9d9; }
.type-bar-fill.never { background: #bfbfbf; }
.type-count { width: 100px; font-size: 13px; color: #666; text-align: right; flex-shrink: 0; }
</style>