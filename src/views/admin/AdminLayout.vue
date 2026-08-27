<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">📊</div>
        <span class="title">AI面试官</span>
      </div>
      <nav class="nav-menu">
        <router-link to="/admin/dashboard" class="nav-item" active-class="active"><span class="nav-icon">📈</span><span>概览</span></router-link>
        <router-link to="/admin/users" class="nav-item" active-class="active"><span class="nav-icon">👥</span><span>用户</span></router-link>
        <router-link to="/admin/payments" class="nav-item" active-class="active"><span class="nav-icon">💰</span><span>付费</span></router-link>
        <router-link to="/admin/funnel" class="nav-item" active-class="active"><span class="nav-icon">🔽</span><span>漏斗</span></router-link>
        <router-link to="/admin/positions" class="nav-item" active-class="active"><span class="nav-icon">💼</span><span>岗位</span></router-link>
      </nav>
      <div class="sidebar-footer">
        <NButton text @click="handleLogout" class="logout-btn">🚪 退出</NButton>
      </div>
    </aside>
    <main class="main-content">
      <NDialogProvider>
        <router-view />
      </NDialogProvider>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useMessage, NDialogProvider } from 'naive-ui'

const router = useRouter()
const message = useMessage()

function handleLogout() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_token_expires')
  message.success('已退出')
  router.push('/admin')
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f0f2f5; }
.sidebar { width: 200px; background: #1a1a2e; color: white; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-header { padding: 20px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-header .logo { font-size: 24px; }
.sidebar-header .title { font-size: 16px; font-weight: 600; }
.nav-menu { flex: 1; padding: 12px 0; }
.nav-item { display: flex; align-items: center; gap: 8px; padding: 12px 20px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 14px; transition: all 0.2s; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(102, 126, 234, 0.3); color: white; border-right: 3px solid #667eea; }
.nav-icon { font-size: 16px; }
.sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.logout-btn { color: rgba(255,255,255,0.6) !important; width: 100%; }
.main-content { flex: 1; padding: 24px; overflow-y: auto; }
</style>