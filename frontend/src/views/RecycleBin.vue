<!-- src/views/RecycleBin.vue -->
<template>
  <div v-loading="loading">
    <div class="page-title-header">
      <h1>回收站</h1>
      <p>项目将在删除30天后被永久清除。此处的项目仍占用您的空间。</p>
    </div>

    <div class="action-bar">
        <el-button type="primary" :icon="RefreshLeft" @click="handleBatchRestore" :disabled="selectedItems.length === 0">还原</el-button>
        <el-button type="danger" :icon="Delete" @click="handleBatchPermanentDelete" :disabled="selectedItems.length === 0">彻底删除</el-button>
    </div>
    
    <el-table :data="items" style="width: 100%" @selection-change="handleSelectionChange" empty-text="回收站是空的">
      <el-table-column type="selection" width="55" />
      <el-table-column label="项目名称" prop="name" min-width="200">
        <template #default="scope">
          <div class="file-name-cell">
            <el-icon :size="20" class="file-icon"><component :is="getItemIcon(scope.row)" /></el-icon>
            <span class="item-name">{{ scope.row.name }}</span>
          </div>
        </template>
      </el-table-column>
       <el-table-column label="大小" width="150" align="right" sortable prop="size">
        <template #default="scope">{{ scope.row.type === 'folder' ? '-' : formatFileSize(scope.row.size) }}</template>
      </el-table-column>
      <el-table-column label="删除日期" prop="deletedAt" width="200" align="center" sortable>
          <template #default="scope">{{ formatTime(scope.row.deletedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="scope">
           <el-button size="small" type="primary" :icon="RefreshLeft" @click.stop="handleRestore([scope.row.id])">还原</el-button>
           <el-button size="small" type="danger" :icon="Delete" @click.stop="handlePermanentDelete([scope.row.id])">彻底删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';
import { RefreshLeft, Delete, Folder, Document, Picture as PictureIcon, Headset, VideoCamera } from '@element-plus/icons-vue';

const loading = ref(true);
const items = ref([]);
const selectedItems = ref([]);

const loadRecycleBinContent = async () => {
  loading.value = true;
  try {
    // 只加载回收站的顶层项目
    const res = await api.getRecycleBinItems();
    items.value = res.data;
  } catch (error) {
    ElMessage.error('加载回收站失败');
  } finally {
    loading.value = false;
  }
};

onMounted(loadRecycleBinContent);

const handleSelectionChange = (val) => {
  selectedItems.value = val;
};

const handleRestore = async (itemIds) => {
  try {
    await api.restoreItems(itemIds);
    ElMessage.success('还原成功！');
    loadRecycleBinContent();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '还原失败');
  }
};

const handlePermanentDelete = (itemIds) => {
  ElMessageBox.confirm(`文件将被永久删除，无法恢复。确定吗？`, '警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await api.permanentDeleteItems(itemIds);
      ElMessage.success('彻底删除成功！');
      loadRecycleBinContent();
    } catch (error) {
      ElMessage.error('彻底删除失败');
    }
  }).catch(() => { ElMessage.info('已取消操作'); });
};

const handleBatchRestore = () => {
  const itemIds = selectedItems.value.map(item => item.id);
  handleRestore(itemIds);
};

const handleBatchPermanentDelete = () => {
  const itemIds = selectedItems.value.map(item => item.id);
  handlePermanentDelete(itemIds);
};

const formatTime = (time) => {
  if (!time) return '-';
  return new Date(time).toLocaleString();
};

const formatFileSize = (size) => { if (size === null || size === undefined) return ''; if (size === 0) return '0'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(size) / Math.log(k)); return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };

const getItemIcon = (item) => {
  if (item.type === 'folder') return Folder;
  const ext = item.name.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) return PictureIcon;
  if (['mp3', 'wav', 'ogg'].includes(ext)) return Headset;
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return VideoCamera;
  return Document;
};
</script>

<style scoped>
.page-title-header { margin-bottom: 20px; }
.page-title-header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: 600; color: #303133; }
.page-title-header p { margin: 0; font-size: 14px; color: #909399; }
.action-bar { display: flex; align-items: center; margin-bottom: 20px; }
.file-name-cell { display: flex; align-items: center; gap: 8px; }
.file-icon { flex-shrink: 0; }
.item-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-table { border-radius: 8px; }
:deep(.el-table__header-wrapper) { border-top-left-radius: 8px; border-top-right-radius: 8px; }
:deep(.el-table th.el-table__cell) { background-color: #fafbfe !important; font-weight: 600; color: #606266; }
</style>