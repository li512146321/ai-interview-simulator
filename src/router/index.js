import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/HomeView.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },
  { path: '/interview', name: 'Interview', component: () => import('@/views/InterviewView.vue'), meta: { requiresAuth: true } },
  { path: '/interview/setup', name: 'InterviewSetup', component: () => import('@/views/InterviewSetup.vue'), meta: { requiresAuth: true } },
  { path: '/interview/report/:sessionId', name: 'InterviewReport', component: () => import('@/views/ResultView.vue'), meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: () => import('@/views/HistoryView.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/paywall', name: 'Paywall', component: () => import('@/views/PaywallView.vue'), meta: { requiresAuth: true } },
  { path: '/admin', name: 'AdminLogin', component: () => import('@/views/admin/AdminLoginView.vue') },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: () => import('@/views/admin/DashboardView.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('@/views/admin/UsersView.vue') },
      { path: 'payments', name: 'AdminPayments', component: () => import('@/views/admin/PaymentsView.vue') },
      { path: 'funnel', name: 'AdminFunnel', component: () => import('@/views/admin/FunnelView.vue') },
      { path: 'positions', name: 'AdminPositions', component: () => import('@/views/admin/PositionsView.vue') },
      { path: 'positions/:id', name: 'AdminPositionEdit', component: () => import('@/views/admin/PositionEditView.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const userToken = localStorage.getItem('user_token')
  const adminToken = localStorage.getItem('admin_token')

  if (to.meta.requiresAdmin) {
    if (!adminToken) { next('/admin'); return }
    const expires = Number(localStorage.getItem('admin_token_expires'))
    if (Date.now() > expires) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_token_expires')
      next('/admin')
      return
    }
  }

  if (to.meta.requiresAuth && !userToken) {
    next('/login?redirect=' + encodeURIComponent(to.fullPath))
    return
  }

  if (to.meta.guest && userToken) {
    next('/')
    return
  }

  next()
})

export default router