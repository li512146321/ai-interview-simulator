<template>
  <div class="admin-login">
    <div class="login-card">
      <NCard>
        <div class="card-header">
          <div class="icon">🔐</div>
          <h1>管理员登录</h1>
        </div>
        <NInput v-model:value="password" type="password" placeholder="请输入管理密码" show-password-on="click" @keyup.enter="handleLogin" size="large" />
        <NButton type="primary" block :loading="loading" @click="handleLogin" class="login-btn" size="large">进入后台</NButton>
      </NCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import request from '@/utils/request'

const router = useRouter()
const message = useMessage()
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!password.value) return
  loading.value = true
  try {
    const result = await request.post('/api/admin/login', { adminPassword: password.value })
    localStorage.setItem('admin_token', result.adminToken)
    localStorage.setItem('admin_token_expires', String(result.expiresAt))
    message.success('登录成功')
    router.push('/admin/dashboard')
  } catch (e) {
    message.error(e?.data?.error || '密码错误')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; padding: 20px; }
.login-card { width: 100%; max-width: 380px; }
.card-header { text-align: center; margin-bottom: 24px; }
.card-header .icon { font-size: 40px; margin-bottom: 8px; }
.card-header h1 { font-size: 22px; margin: 0; color: #333; }
.login-btn { margin-top: 16px; }
</style>