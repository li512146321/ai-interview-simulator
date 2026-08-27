<template>
  <div class="profile-view">
    <div class="container">
      <h2 class="page-title">👤 个人中心</h2>

      <NCard class="profile-card">
        <div class="profile-section">
          <h3>账户信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ userStore.email }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">昵称</span>
              <span class="info-value" v-if="!editingNickname">{{ userStore.nickname || '未设置' }}</span>
              <div class="nickname-edit" v-else>
                <NInput v-model:value="newNickname" placeholder="设置昵称" size="small" />
                <NButton size="small" type="primary" @click="saveNickname" :loading="savingNickname">保存</NButton>
                <NButton size="small" @click="editingNickname = false">取消</NButton>
              </div>
              <NButton text size="small" @click="startEditNickname" v-if="!editingNickname">编辑</NButton>
            </div>
            <div class="info-item">
              <span class="info-label">会员</span>
              <span class="info-value">
                <NTag :type="userStore.membershipTier !== 'free' ? 'success' : 'default'">
                  {{ userStore.membershipTier !== 'free' ? '付费会员' : '免费用户' }}
                </NTag>
              </span>
            </div>
            <div class="info-item" v-if="userStore.membershipExpiresAt">
              <span class="info-label">会员到期</span>
              <span class="info-value">{{ formatDate(userStore.membershipExpiresAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">剩余次数</span>
              <span class="info-value">{{ userStore.membershipTier !== 'free' ? '无限' : userStore.remainingTimes }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">累计面试</span>
              <span class="info-value">{{ userStore.totalInterviews }} 次</span>
            </div>
            <div class="info-item" v-if="userStore.averageScore">
              <span class="info-label">平均得分</span>
              <span class="info-value">{{ userStore.averageScore }}/10</span>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDate(userStore.createdAt) }}</span>
            </div>
          </div>
        </div>
      </NCard>

      <NCard class="profile-card">
        <div class="profile-section">
          <h3>修改密码</h3>
          <NForm ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" class="password-form">
            <NFormItem label="新密码" path="newPassword">
              <NInput v-model:value="passwordForm.newPassword" type="password" placeholder="至少6位" show-password-on="click" />
            </NFormItem>
            <NFormItem label="确认密码" path="confirmPassword">
              <NInput v-model:value="passwordForm.confirmPassword" type="password" placeholder="再次输入密码" show-password-on="click" />
            </NFormItem>
          </NForm>
          <NButton type="primary" @click="handleChangePassword" :loading="changingPassword">修改密码</NButton>
        </div>
      </NCard>

      <NCard class="profile-card danger">
        <div class="profile-section">
          <h3>注销账户</h3>
          <p class="danger-text">注销后，所有数据将被永久删除，不可恢复。</p>
          <NButton type="error" @click="showDeleteConfirm = true">注销账户</NButton>
        </div>
      </NCard>
    </div>

    <NModal v-model:show="showDeleteConfirm" preset="card" title="确认注销" style="width: 400px">
      <p>确定要注销账户吗？所有数据将被永久删除，不可恢复。</p>
      <template #footer>
        <NButton @click="showDeleteConfirm = false">取消</NButton>
        <NButton type="error" :loading="deleting" @click="handleDeleteAccount">确认注销</NButton>
      </template>
    </NModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { updateProfile, deleteAccount } from '@/api/data'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

const editingNickname = ref(false)
const newNickname = ref('')
const savingNickname = ref(false)
const changingPassword = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const passwordFormRef = ref(null)

const passwordForm = ref({ newPassword: '', confirmPassword: '' })

const passwordRules = {
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: (_, value) => value === passwordForm.value.newPassword, message: '两次密码不一致', trigger: 'blur' },
  ],
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function startEditNickname() {
  newNickname.value = userStore.nickname.value || ''
  editingNickname.value = true
}

async function saveNickname() {
  savingNickname.value = true
  try {
    await updateProfile({ nickname: newNickname.value })
    userStore.nickname.value = newNickname.value
    editingNickname.value = false
    message.success('昵称已更新')
  } catch (e) {
    message.error(e?.data?.error || '更新失败')
  } finally {
    savingNickname.value = false
  }
}

async function handleChangePassword() {
  try {
    await passwordFormRef.value?.validate()
  } catch { return }

  changingPassword.value = true
  try {
    await updateProfile({ password: passwordForm.value.newPassword })
    message.success('密码已修改')
    passwordForm.value = { newPassword: '', confirmPassword: '' }
  } catch (e) {
    message.error(e?.data?.error || '修改失败')
  } finally {
    changingPassword.value = false
  }
}

async function handleDeleteAccount() {
  deleting.value = true
  try {
    await deleteAccount()
    userStore.logout()
    message.success('账户已注销')
    router.push('/')
  } catch (e) {
    message.error(e?.data?.error || '注销失败')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<style scoped>
.profile-view { padding: 24px; }
.container { max-width: 700px; margin: 0 auto; }
.page-title { font-size: 24px; margin: 0 0 24px 0; }
.profile-card { margin-bottom: 16px; }
.profile-card.danger { border-color: #ff4d4f; }
.profile-section h3 { font-size: 16px; margin-bottom: 16px; }
.info-grid { display: flex; flex-direction: column; gap: 12px; }
.info-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.info-item:last-child { border-bottom: none; }
.info-label { color: #999; width: 80px; flex-shrink: 0; }
.info-value { flex: 1; }
.nickname-edit { display: flex; align-items: center; gap: 8px; flex: 1; }
.password-form { margin-bottom: 16px; }
.danger-text { color: #999; font-size: 14px; margin-bottom: 16px; }
</style>