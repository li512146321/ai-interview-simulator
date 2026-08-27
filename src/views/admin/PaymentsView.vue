<template>
  <div class="payments-view">
    <h2 class="page-title">💰 付费记录</h2>
    <NDataTable :columns="columns" :data="payments" :loading="loading" :row-key="(row) => row.id" />
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue'
import { NTag } from 'naive-ui'
import request from '@/utils/request'

const payments = ref([])
const loading = ref(false)

const planNameMap = { monthly: '月度', yearly: '年费', single: '单次' }
const methodNameMap = { wechat: '微信', phone: '电话', manual: '手动' }

const columns = [
  { title: '时间', key: 'created_at', width: 160, render: (row) => formatDate(row.created_at) },
  { title: '邮箱', key: 'email', ellipsis: { tooltip: true } },
  { title: '方案', key: 'plan_type', width: 80, render: (row) => h(NTag, { size: 'small' }, () => planNameMap[row.plan_type] || row.plan_type) },
  { title: '金额', key: 'amount', width: 80, render: (row) => '¥' + row.amount },
  { title: '方式', key: 'payment_method', width: 80, render: (row) => methodNameMap[row.payment_method] || row.payment_method },
  { title: '备注', key: 'remark', ellipsis: { tooltip: true } },
]

function getHeaders() { return { Authorization: 'Bearer ' + localStorage.getItem('admin_token') } }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await request.get('/api/admin/payments', { headers: getHeaders() })
    payments.value = data.payments
  } catch (e) { } finally { loading.value = false }
})
</script>

<style scoped>
.payments-view { max-width: 1200px; }
.page-title { font-size: 24px; margin: 0 0 16px 0; }
</style>