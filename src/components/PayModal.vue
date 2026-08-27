<template>
  <NModal v-model:show="show" preset="card" title="选择套餐" style="width: 500px">
    <div class="pay-modal">
      <div class="plan-cards">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card"
          :class="{ selected: selectedPlan === plan.id }"
          @click="selectedPlan = plan.id"
        >
          <div class="plan-icon">{{ plan.icon }}</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-price">{{ plan.price }}</div>
          <div class="plan-desc">{{ plan.desc }}</div>
          <div v-if="selectedPlan === plan.id" class="plan-badge">已选择</div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="modal-footer">
        <NButton @click="handleClose">取消</NButton>
        <NButton type="primary" :loading="isPaying" :disabled="selectedPlan === 'free'" @click="handlePay">
          确认支付
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useMessage } from 'naive-ui'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const message = useMessage()
const selectedPlan = ref('single')
const isPaying = ref(false)

const plans = [
  { id: 'free', name: '免费体验', price: '¥0', desc: '每天1次，限前3题', icon: '🆓' },
  { id: 'single', name: '单次体验', price: '¥4.9', desc: '完整面试1次', icon: '🎯' },
  { id: 'five', name: '5次卡', price: '¥19.9', desc: '5次完整面试', icon: '📦' },
  { id: 'monthly', name: '月卡', price: '¥29.9', desc: '30天不限次', icon: '📅' }
]

watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedPlan.value = 'single'
  }
})

function handleClose() {
  emit('close')
}

async function handlePay() {
  if (selectedPlan.value === 'free') {
    message.warning('免费版无法解锁完整报告，请选择付费套餐')
    return
  }

  isPaying.value = true
  
  setTimeout(() => {
    isPaying.value = false
    emit('success', selectedPlan.value)
    message.success('支付成功！')
  }, 1000)
}
</script>

<style scoped>
.pay-modal {
  padding: 8px 0;
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.plan-card {
  position: relative;
  padding: 16px;
  border: 2px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.plan-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.plan-card.selected {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.plan-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.plan-price {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.plan-desc {
  font-size: 13px;
  color: #999;
}

.plan-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 12px;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .plan-cards {
    grid-template-columns: 1fr;
  }
}
</style>