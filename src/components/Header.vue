<template>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <router-link to="/" class="logo">
          <span class="logo-icon">🤖</span>
          <span class="logo-text">AI面试官</span>
        </router-link>
      </div>
      <div class="header-center">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/" class="nav-item">首页</router-link>
          <router-link to="/history" class="nav-item">历史</router-link>
          <router-link to="/profile" class="nav-item">个人中心</router-link>
        </template>
      </div>
      <div class="header-right">
        <template v-if="userStore.isLoggedIn">
          <NDropdown trigger="click" :options="userMenuOptions" @select="handleUserMenuSelect">
            <NButton text class="user-btn">{{ maskedEmail }}</NButton>
          </NDropdown>
        </template>
        <template v-else>
          <NButton type="primary" size="small" @click="goLogin">登录/注册</NButton>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const maskedEmail = computed(() => {
  const email = userStore.email.value || ''
  if (!email.includes('@')) return email
  const [name, domain] = email.split('@')
  const masked = name.length > 3 ? name.slice(0, 3) + '***' : name[0] + '***'
  return masked + '@' + domain
})

const userMenuOptions = [
  { label: '个人中心', key: 'profile' },
  { label: '退出登录', key: 'logout' },
]

function goLogin() { router.push('/login') }

function handleUserMenuSelect(key) {
  if (key === 'profile') {
    router.push('/profile')
  } else if (key === 'logout') {
    userStore.logout()
    message.success('已退出登录')
    if (router.currentRoute.value.path === '/profile') router.push('/')
  }
}
</script>

<style scoped>
.header { background: white; box-shadow: 0 2px 12px rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 100; }
.header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 56px; }
.header-left { flex-shrink: 0; }
.logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1E3A5F; }
.logo-icon { font-size: 24px; }
.logo-text { font-size: 18px; font-weight: 700; }
.header-center { display: flex; gap: 24px; }
.nav-item { color: #666; text-decoration: none; font-size: 14px; padding: 4px 0; transition: color 0.2s; }
.nav-item:hover { color: #1E3A5F; }
.nav-item.router-link-exact-active { color: #1E3A5F; font-weight: 600; }
.header-right { flex-shrink: 0; }
.user-btn { font-size: 14px; color: #1E3A5F; }
</style>