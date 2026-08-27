<template>
  <div class="position-edit-view">
    <div class="page-header">
      <h2>{{ isNew ? '新增岗位' : '编辑岗位：' + form.name }}</h2>
      <NButton @click="router.push('/admin/positions')">返回列表</NButton>
    </div>

    <NCard class="section-card">
      <h3 class="section-title">基本信息</h3>
      <NSpace vertical :size="14" style="width: 100%;">
        <NFormItem label="名称">
          <NInput v-model:value="form.name" placeholder="岗位名称" />
        </NFormItem>
        <NFormItem label="图标">
          <NInput v-model:value="form.icon" placeholder="💼" style="width: 80px;" />
        </NFormItem>
        <NFormItem label="分类">
          <NInput v-model:value="form.category" placeholder="如：互联网" />
        </NFormItem>
        <NFormItem label="描述">
          <NInput v-model:value="form.description" type="textarea" placeholder="简短描述" :autosize="{ minRows: 2, maxRows: 4 }" />
        </NFormItem>
        <NFormItem label="热门">
          <NSwitch v-model:value="form.isHot" />
        </NFormItem>
        <NFormItem label="启用">
          <NSwitch v-model:value="form.isActive" />
        </NFormItem>
        <NFormItem label="排序">
          <NInputNumber v-model:value="form.sortOrder" :min="0" style="width: 100px;" />
        </NFormItem>
        <NFormItem label="默认题数">
          <NInputNumber
            v-model:value="form.defaultQuestionCount"
            :min="0"
            placeholder="留空表示用户可自由选择"
            style="width: 200px;"
          />
          <span class="field-hint">留空表示用户可自由选择题数</span>
        </NFormItem>
        <NFormItem label="默认时长(分钟)">
          <NInputNumber
            v-model:value="form.defaultDuration"
            :min="0"
            placeholder="留空表示用户可自由选择"
            style="width: 200px;"
          />
          <span class="field-hint">留空表示用户可自由选择时长</span>
        </NFormItem>
      </NSpace>
    </NCard>

    <NCard class="section-card">
      <h3 class="section-title">AI面试官提示词</h3>
      <NSpace vertical :size="14" style="width: 100%;">
        <div>
          <div class="label-row">
            <span class="field-label">面试官人设与行为准则（system_prompt）</span>
            <span class="char-count">{{ form.systemPrompt.length }}字</span>
          </div>
          <NInput
            v-model:value="form.systemPrompt"
            type="textarea"
            placeholder="你是一位资深面试官..."
            :autosize="{ minRows: 6, maxRows: 16 }"
            class="monospace-textarea"
          />
        </div>
        <div>
          <div class="label-row">
            <span class="field-label">出题策略（question_strategy）</span>
            <span class="char-count">{{ form.questionStrategy.length }}字</span>
          </div>
          <NInput
            v-model:value="form.questionStrategy"
            type="textarea"
            placeholder="出题顺序：自我介绍 → 项目深挖 → ..."
            :autosize="{ minRows: 3, maxRows: 8 }"
            class="monospace-textarea"
          />
        </div>
        <div>
          <div class="label-row">
            <span class="field-label">评分标准（evaluation_criteria）</span>
            <span class="char-count">{{ form.evaluationCriteria.length }}字</span>
          </div>
          <NInput
            v-model:value="form.evaluationCriteria"
            type="textarea"
            placeholder="用户思维30%、数据驱动25%..."
            :autosize="{ minRows: 3, maxRows: 8 }"
            class="monospace-textarea"
          />
        </div>
        <div>
          <div class="label-row">
            <span class="field-label">参考题目（每行一题）</span>
            <span class="char-count">{{ form.sampleQuestions.length }}题</span>
          </div>
          <NInput
            v-model:value="form.sampleQuestions"
            type="textarea"
            placeholder="每行一题，保存时自动转为JSON数组&#10;请介绍一个你负责的产品或功能&#10;如何判断需求的优先级"
            :autosize="{ minRows: 4, maxRows: 10 }"
            class="monospace-textarea"
          />
        </div>
      </NSpace>
    </NCard>

    <div class="action-bar">
      <NButton type="primary" :loading="saving" @click="handleSave">保存</NButton>
      <NButton @click="router.push('/admin/positions')">取消</NButton>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const posId = route.params.id
const isNew = posId === 'new'

const form = ref({
  name: '',
  icon: '💼',
  category: '其他',
  description: '',
  isHot: false,
  isActive: true,
  sortOrder: 0,
  systemPrompt: '',
  questionStrategy: '',
  evaluationCriteria: '',
  sampleQuestions: '',
  defaultQuestionCount: null,
  defaultDuration: null,
})

const saving = ref(false)

async function loadPosition() {
  if (isNew) return
  try {
    const token = localStorage.getItem('admin_token')
    const res = await request.get('/api/admin/positions/' + posId, {
      headers: { Authorization: 'Bearer ' + token }
    })
    const d = res
    form.value = {
      name: d.name || '',
      icon: d.icon || '💼',
      category: d.category || '其他',
      description: d.description || '',
      isHot: !!d.is_hot,
      isActive: !!d.is_active,
      sortOrder: d.sort_order || 0,
      systemPrompt: d.system_prompt || '',
      questionStrategy: d.question_strategy || '',
      evaluationCriteria: d.evaluation_criteria || '',
      sampleQuestions: parseSampleQuestions(d.sample_questions),
      defaultQuestionCount: d.default_question_count ?? null,
      defaultDuration: d.default_duration ?? null,
    }
  } catch (e) {
    message.error('加载失败')
    router.push('/admin/positions')
  }
}

function parseSampleQuestions(json) {
  if (!json) return ''
  try {
    const arr = JSON.parse(json)
    if (Array.isArray(arr)) return arr.join('\n')
    return ''
  } catch {
    return json
  }
}

async function handleSave() {
  if (!form.value.name.trim()) {
    message.warning('请输入岗位名称')
    return
  }
  saving.value = true
  try {
    const token = localStorage.getItem('admin_token')
    const body = {
      name: form.value.name.trim(),
      icon: form.value.icon,
      category: form.value.category,
      description: form.value.description,
      isHot: form.value.isHot,
      isActive: form.value.isActive,
      sortOrder: form.value.sortOrder,
      systemPrompt: form.value.systemPrompt,
      questionStrategy: form.value.questionStrategy,
      evaluationCriteria: form.value.evaluationCriteria,
      sampleQuestions: form.value.sampleQuestions,
      defaultQuestionCount: form.value.defaultQuestionCount,
      defaultDuration: form.value.defaultDuration,
    }

    if (isNew) {
      await request.post('/api/admin/positions', body, {
        headers: { Authorization: 'Bearer ' + token }
      })
    } else {
      await request.put('/api/admin/positions/' + posId, body, {
        headers: { Authorization: 'Bearer ' + token }
      })
    }
    message.success('保存成功')
    router.push('/admin/positions')
  } catch (e) {
    message.error('保存失败：' + (e?.data?.error || ''))
  } finally {
    saving.value = false
  }
}

onMounted(loadPosition)
</script>

<style scoped>
.position-edit-view {
  max-width: 800px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
}
.section-card {
  margin-bottom: 16px;
}
.section-title {
  font-size: 16px;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.field-label {
  font-size: 13px;
  color: #666;
}
.char-count {
  font-size: 12px;
  color: #999;
}
.field-hint {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
.monospace-textarea :deep(textarea) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}
.action-bar {
  display: flex;
  gap: 12px;
  padding-top: 16px;
}
</style>