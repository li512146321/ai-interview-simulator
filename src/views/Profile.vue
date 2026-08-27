<template>
  <div class="profile">
    <div class="profile-card">
      <h1>个人中心</h1>
      <div class="user-info">
        <div class="info-item">
          <span class="label">昵称：</span>
          <span class="value">{{ userStore.nickname }}</span>
        </div>
        <div class="info-item">
          <span class="label">剩余次数：</span>
          <span class="value">{{ userStore.remainingTimes }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
</script>

<style scoped>
.profile {
  max-width: 1000px;
  margin: 0 auto;
  padding: 80px 20px 40px;
}

.profile-card {
  background: white;
  padding: 40px;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
}

.profile-card h1 {
  font-size: 28px;
  margin-bottom: 32px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 16px;
}

.label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
}

.value {
  color: #333;
  font-weight: 500;
}
</style>