<template>
  <div class="home">
    <div class="welcome-card">
      <h1>欢迎使用AI面试模拟器</h1>
      <p>这是一个基于Vue3 + Naive UI的面试模拟系统</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.welcome-card {
  background: white;
  padding: 40px;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.welcome-card h1 {
  font-size: 32px;
  margin-bottom: 16px;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-card p {
  color: #666;
  font-size: 16px;
}
</style>