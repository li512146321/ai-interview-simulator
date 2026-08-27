<template>
  <div class="auth-view">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">🤖</div>
        <h1>AI面试官</h1>
      </div>
      <NCard>
        <h2 class="card-title">免费注册，立即体验3次</h2>
        <NForm ref="formRef" :model="form" :rules="rules">
          <NFormItem label="邮箱" path="email">
            <NInput v-model:value="form.email" placeholder="请输入邮箱" />
          </NFormItem>
          <NFormItem label="密码" path="password">
            <NInput v-model:value="form.password" type="password" placeholder="请输入密码（至少6位）" show-password-on="click" />
          </NFormItem>
          <NFormItem label="验证码" path="code">
            <div class="code-row">
              <NInput v-model:value="form.code" placeholder="请输入验证码" class="code-input" />
              <NButton :disabled="countdown > 0 || !form.email" :loading="sending" @click="handleSendCode" class="code-btn">
                {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
              </NButton>
            </div>
          </NFormItem>
        </NForm>
        <NButton type="primary" block :loading="loading" @click="handleRegister" class="submit-btn">注册并开始</NButton>
        <div class="auth-footer">已有账号？<router-link to="/login">去登录</router-link></div>
      </NCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { register, sendVerificationCode } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
const form = ref({ email: '', password: '', code: '' })

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

function startCountdown() {
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function handleSendCode() {
  sending.value = true
  try {
    await sendVerificationCode(form.value.email, 'register')
    message.success('验证码已发送')
    startCountdown()
  } catch (e) {
    message.error(e?.data?.error || '发送失败')
  } finally {
    sending.value = false
  }
}

async function handleRegister() {
  formRef.value?.validate(async (errors) => {
    if (errors) return
    loading.value = true
    try {
      const result = await register(form.value.email, form.value.password, form.value.code)
      localStorage.setItem('user_token', result.token)
      userStore.setUser(result.user)
      message.success('注册成功')
      router.push('/')
    } catch (e) {
      message.error(e?.data?.error || '注册失败')
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
.card-title { text-align: center; margin: 0 0 24px 0; font-size: 18px; color: #666; }
.code-row { display: flex; gap: 8px; }
.code-input { flex: 1; }
.code-btn { flex-shrink: 0; min-width: 110px; }
.submit-btn { margin-top: 8px; height: 44px; font-size: 16px; border-radius: 8px; }
.auth-footer { text-align: center; margin-top: 16px; color: #999; font-size: 14px; }
.auth-footer a { color: #667eea; text-decoration: none; }
</style>