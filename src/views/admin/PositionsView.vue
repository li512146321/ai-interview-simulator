<template>
  <div class="positions-view">
    <div class="page-header">
      <h2>岗位管理</h2>
      <NButton type="primary" @click="goCreate">+ 新增岗位</NButton>
    </div>

    <NTable :data="positions" :bordered="false" :single-line="false">
      <NThead>
        <NTh>图标</NTh>
        <NTh>名称</NTh>
        <NTh>分类</NTh>
        <NTh>热门</NTh>
        <NTh>启用</NTh>
        <NTh>排序</NTh>
        <NTh>操作</NTh>
      </NThead>
      <NTbody>
        <NTr v-for="pos in positions" :key="pos.id">
          <NTd>{{ pos.icon }}</NTd>
          <NTd>{{ pos.name }}</NTd>
          <NTd>{{ pos.category }}</NTd>
          <NTd>
            <NTag :type="pos.isHot ? 'success' : 'default'" size="small">
              {{ pos.isHot ? '✓' : '-' }}
            </NTag>
          </NTd>
          <NTd>
            <NTag :type="pos.isActive ? 'success' : 'default'" size="small">
              {{ pos.isActive ? '✓' : '-' }}
            </NTag>
          </NTd>
          <NTd>{{ pos.sortOrder }}</NTd>
          <NTd>
            <NButton size="small" @click="goEdit(pos.id)">编辑</NButton>
          </NTd>
        </NTr>
      </NTbody>
    </NTable>

    <NEmpty v-if="positions.length === 0" description="暂无岗位" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import request from '@/utils/request'

const router = useRouter()
const message = useMessage()
const positions = ref([])

async function loadPositions() {
  try {
    const token = localStorage.getItem('admin_token')
    const res = await request.get('/api/admin/positions', {
      headers: { Authorization: 'Bearer ' + token }
    })
    positions.value = res.positions || []
  } catch (e) {
    message.error('加载失败')
  }
}

function goCreate() {
  router.push('/admin/positions/new')
}

function goEdit(id) {
  router.push('/admin/positions/' + id)
}

onMounted(loadPositions)
</script>

<style scoped>
.positions-view {
  padding: 0;
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
</style>