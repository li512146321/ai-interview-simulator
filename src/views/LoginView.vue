<template>
  <div class="auth-view">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">🤖</div>
        <h1>AI面试官</h1>
      </div>
      <NCard>
        <h2 class="card-title">登录</h2>
        <NForm ref="formRef" :model="form" :rules="rules">
          <NFormItem label="邮箱" path="email">
            <NInput v-model:value="form.email" placeholder="请输入邮箱" />
          </NFormItem>
          <NFormItem label="密码" path="password">
            <NInput v-model:value="form.password" type="password" placeholder="请输入密码" show-password-on="click" @keyup.enter="handleLogin" />
          </NFormItem>
        </NForm>
        <NButton type="primary" block :loading="loading" @click="handleLogin" class="submit-btn">登录</NButton>
        <div class="auth-footer">没有账号？<router-link to="/register">免费注册</router-link></div>
      </NCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { login } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const form = ref({ email: '', password: '' })

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  formRef.value?.validate(async (errors) => {
    if (errors) return
    loading.value = true
    try {
      const result = await login(form.value.email, form.value.password)
      localStorage.setItem('user_token', result.token)
      userStore.setUser(result.user)
      message.success('登录成功')
      router.push(route.query.redirect || '/')
    } catch (e) {
      message.error(e?.data?.error || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.auth-view { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
.auth-card { width: 100%; max-width: 420px; }
.auth-header { text-align: center; margin-bottom: 24px; color: white; }
.auth-header .logo { font-size: 48px; margin-bottom: 8px; }
.auth-header h1 { font-size: 28px; margin: 0; font-weight: 700; }
.card-title { text-align: center; margin: 0 0 24px 0; font-size: 20px; }
.submit-btn { margin-top: 8px; height: 44px; font-size: 16px; border-radius: 8px; }
.auth-footer { text-align: center; margin-top: 16px; color: #999; font-size: 14px; }
.auth-footer a { color: #667eea; text-decoration: none; }
</style>