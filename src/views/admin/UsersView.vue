<template>
  <div class="users-view">
    <h2 class="page-title">👥 用户管理</h2>
    <div class="toolbar">
      <div class="filters">
        <NButton v-for="f in filters" :key="f.value" :type="currentFilter === f.value ? 'primary' : 'default'" size="small" @click="currentFilter = f.value; loadUsers()">{{ f.label }}</NButton>
      </div>
      <NInput v-model:value="searchText" placeholder="搜索邮箱..." clearable @keyup.enter="loadUsers" @clear="loadUsers" class="search-input" />
    </div>

    <NDataTable :columns="columns" :data="users" :loading="loading" :pagination="pagination" @update:page="handlePageChange" @update:page-size="handlePageSizeChange" :row-key="(row) => row.id" />

    <NModal v-model:show="showDetail" preset="card" title="用户详情" style="width: 500px">
      <div v-if="selectedUser" class="user-detail">
        <div class="detail-row"><span>邮箱：</span><span>{{ selectedUser.email }}</span></div>
        <div class="detail-row"><span>昵称：</span><span>{{ selectedUser.nickname || '-' }}</span></div>
        <div class="detail-row"><span>会员：</span><NTag :type="selectedUser.membership_tier === 'paid' ? 'success' : 'default'">{{ selectedUser.membership_tier === 'paid' ? '付费' : '免费' }}</NTag></div>
        <div class="detail-row" v-if="selectedUser.membership_expires_at"><span>到期：</span><span>{{ formatDate(selectedUser.membership_expires_at) }}</span></div>
        <div class="detail-row"><span>剩余次数：</span><span>{{ selectedUser.remaining_times }}</span></div>
        <div class="detail-row"><span>面试次数：</span><span>{{ selectedUser.interview_count }}</span></div>
        <div class="detail-row"><span>最近活跃：</span><span>{{ selectedUser.last_active_at ? formatDate(selectedUser.last_active_at) : '-' }}</span></div>
        <div class="detail-row"><span>注册时间：</span><span>{{ formatDate(selectedUser.created_at) }}</span></div>
        <div class="detail-actions">
          <NButton v-if="selectedUser.membership_tier !== 'paid'" type="primary" @click="showDetail = false; openGrantModal(selectedUser)">开通会员</NButton>
          <template v-else>
            <NButton type="primary" @click="showDetail = false; openGrantModal(selectedUser)">续费</NButton>
            <NButton type="warning" @click="handleRevokeMembership">取消会员</NButton>
          </template>
        </div>
      </div>
    </NModal>

    <NModal v-model:show="showGrantModal" preset="card" title="开通会员" style="width: 460px">
      <div class="grant-form">
        <div class="grant-user-info">用户：<strong>{{ grantTargetUser?.email }}</strong></div>

        <div class="grant-section">
          <div class="grant-label">方案</div>
          <div class="grant-options">
            <div v-for="p in grantPlans" :key="p.value" class="grant-option" :class="{ selected: grantPlan === p.value }" @click="selectPlan(p.value)">
              <div class="grant-name">{{ p.label }}</div>
              <div class="grant-price">¥{{ grantPlan === p.value && p.value === 'custom' ? customAmount || '?' : p.price }}<span v-if="p.value !== 'custom'"> / {{ p.days }}天</span></div>
            </div>
          </div>
        </div>

        <div class="grant-section" v-if="grantPlan === 'custom'">
          <div class="grant-label">自定义天数</div>
          <NInputNumber v-model:value="customDays" :min="1" :max="3650" placeholder="填写天数" style="width: 100%" />
        </div>

        <div class="grant-section">
          <div class="grant-label">金额（元）</div>
          <NInputNumber v-model:value="customAmount" :min="0" :precision="2" placeholder="付款金额" style="width: 100%" />
        </div>

        <div class="grant-section">
          <div class="grant-label">支付方式</div>
          <NRadioGroup v-model:value="paymentMethod">
            <NRadio value="wechat">微信</NRadio>
            <NRadio value="phone">电话</NRadio>
            <NRadio value="other">其他</NRadio>
          </NRadioGroup>
        </div>

        <div class="grant-section">
          <div class="grant-label">备注</div>
          <NInput v-model:value="remark" type="textarea" placeholder="转账备注、单号等" :autosize="{ minRows: 2, maxRows: 4 }" />
        </div>

        <NButton type="primary" block :loading="isGranting" @click="handleGrantMembership" style="margin-top: 20px">确认开通</NButton>
      </div>
    </NModal>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { useMessage, useDialog, NButton, NTag, NInputNumber, NRadioGroup, NRadio } from 'naive-ui'
import request from '@/utils/request'

const message = useMessage()
const dialog = useDialog()
const users = ref([])
const loading = ref(false)
const searchText = ref('')
const currentFilter = ref('all')
const page = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)
const showDetail = ref(false)
const selectedUser = ref(null)
const showGrantModal = ref(false)
const grantTargetUser = ref(null)
const grantPlan = ref('monthly')
const customDays = ref(30)
const customAmount = ref(null)
const paymentMethod = ref('wechat')
const remark = ref('')
const isGranting = ref(false)

const filters = [
  { label: '全部', value: 'all' },
  { label: '付费', value: 'paid' },
  { label: '活跃白嫖', value: 'active' },
  { label: '流失', value: 'lost' },
  { label: '未用完', value: 'unused' },
]

const grantPlans = [
  { label: '月度会员', value: 'monthly', price: 39, days: 30 },
  { label: '年费会员', value: 'yearly', price: 199, days: 365 },
  { label: '自定义天数', value: 'custom', price: null, days: null },
]

const columns = [
  { title: '邮箱', key: 'email', ellipsis: { tooltip: true } },
  { title: '类型', key: 'membership_tier', width: 80, render: (row) => h(NTag, { type: row.membership_tier === 'paid' ? 'success' : 'default', size: 'small' }, () => row.membership_tier === 'paid' ? '付费' : '免费') },
  { title: '剩余', key: 'remaining_times', width: 60 },
  { title: '面试', key: 'interview_count', width: 60 },
  { title: '最近活跃', key: 'last_active_at', width: 120, render: (row) => row.last_active_at ? formatDate(row.last_active_at) : '-' },
  {
    title: '操作', key: 'actions', width: 140,
    render: (row) => {
      if (row.membership_tier !== 'paid') {
        return h('div', { style: 'display:flex;gap:6px' }, [
          h(NButton, { size: 'tiny', type: 'primary', onClick: () => openGrantModal(row) }, () => '开通会员')
        ])
      }
      return h('div', { style: 'display:flex;gap:6px' }, [
        h(NButton, { size: 'tiny', type: 'primary', onClick: () => openGrantModal(row) }, () => '续费'),
        h(NButton, { size: 'tiny', type: 'warning', onClick: () => confirmRevoke(row) }, () => '取消')
      ])
    }
  },
]

const pagination = ref({ page: 1, pageSize: 20, showSizePicker: true, pageSizes: [10, 20, 50], itemCount: 0 })

function getHeaders() { return { Authorization: 'Bearer ' + localStorage.getItem('admin_token') } }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams({ filter: currentFilter.value, search: searchText.value, page: page.value, pageSize: pageSize.value })
    const data = await request.get('/api/admin/users?' + params, { headers: getHeaders() })
    users.value = data.users
    totalCount.value = data.totalCount
    pagination.value.itemCount = data.totalCount
    pagination.value.page = page.value
    pagination.value.pageSize = pageSize.value
  } catch (e) { } finally { loading.value = false }
}

function handlePageChange(p) { page.value = p; loadUsers() }
function handlePageSizeChange(ps) { pageSize.value = ps; page.value = 1; loadUsers() }

function openGrantModal(user) {
  grantTargetUser.value = user
  grantPlan.value = 'monthly'
  customDays.value = 30
  customAmount.value = null
  paymentMethod.value = 'wechat'
  remark.value = ''
  showGrantModal.value = true
}

function selectPlan(plan) {
  grantPlan.value = plan
  if (plan !== 'custom') {
    const config = grantPlans.find(p => p.value === plan)
    customAmount.value = config?.price || null
  } else {
    customAmount.value = null
  }
}

async function handleGrantMembership() {
  if (!grantTargetUser.value) return

  const plan = grantPlan.value
  const days = plan === 'custom' ? customDays.value : undefined
  const amount = plan === 'custom' ? customAmount.value : undefined

  if (plan === 'custom' && !days) {
    message.warning('请填写自定义天数')
    return
  }
  if (plan === 'custom' && (!amount || amount <= 0)) {
    message.warning('请填写金额')
    return
  }

  isGranting.value = true
  try {
    const body = {
      email: grantTargetUser.value.email,
      plan,
      paymentMethod: paymentMethod.value,
      remark: remark.value,
    }
    if (plan === 'custom') {
      body.durationDays = days
      body.amount = amount
    }
    await request.post('/api/admin/grant-membership', body, { headers: getHeaders() })
    message.success('开通成功')
    showGrantModal.value = false
    grantTargetUser.value = null
    loadUsers()
  } catch (e) { message.error(e?.data?.error || '开通失败') } finally { isGranting.value = false }
}

function confirmRevoke(user) {
  dialog.warning({
    title: '确认取消会员',
    content: `确定取消 ${user.email} 的会员吗？取消后该用户将变为免费用户，剩余次数归零。`,
    positiveText: '确认取消',
    negativeText: '再想想',
    onPositiveClick: () => handleRevokeMembership(user)
  })
}

async function handleRevokeMembership(user) {
  try {
    await request.post('/api/admin/revoke-membership', { email: user.email }, { headers: getHeaders() })
    message.success('已取消会员')
    showDetail.value = false
    loadUsers()
  } catch (e) { message.error(e?.data?.error || '操作失败') }
}

onMounted(() => loadUsers())
</script>

<style scoped>
.users-view { max-width: 1200px; }
.page-title { font-size: 24px; margin: 0 0 16px 0; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.search-input { width: 200px; }
.user-detail { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.detail-row span:first-child { color: #999; }
.detail-actions { display: flex; gap: 12px; margin-top: 16px; justify-content: flex-end; }
.grant-form { display: flex; flex-direction: column; }
.grant-user-info { margin-bottom: 16px; font-size: 14px; color: #666; }
.grant-section { margin-bottom: 16px; }
.grant-label { font-size: 13px; color: #666; margin-bottom: 8px; }
.grant-options { display: flex; gap: 10px; }
.grant-option { flex: 1; padding: 14px 10px; border: 2px solid #eee; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
.grant-option:hover { border-color: #667eea; }
.grant-option.selected { border-color: #667eea; background: rgba(102, 126, 234, 0.05); }
.grant-name { font-size: 13px; color: #333; margin-bottom: 4px; }
.grant-price { font-size: 18px; font-weight: 700; color: #1E3A5F; }
.grant-price span { font-size: 12px; font-weight: 400; color: #999; }
</style>