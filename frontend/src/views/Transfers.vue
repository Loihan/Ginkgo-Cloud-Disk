<!-- src/views/Transfers.vue (带多选删除) -->
<template>
  <div>
    <div class="page-title-header">
      <h1>传输列表</h1>
      <p>查看您最近的上传和下载记录。</p>
    </div>

    <div class="action-bar">
      <el-button 
        type="danger" 
        :icon="Delete" 
        @click="handleBatchDelete" 
        :disabled="selectedHistoryItems.length === 0"
        plain
      >
        删除选中记录
      </el-button>
      <el-button 
        type="danger" 
        @click="clearHistory" 
        :disabled="historyTasks.length === 0 && Object.keys(uploadingTasks).length === 0"
      >
        清空所有记录
      </el-button>
    </div>

    <div class="transfer-list">
      <!-- 正在上传的任务 (保持不变) -->
      <div v-if="Object.keys(uploadingTasks).length > 0" class="transfer-group">
  <h3 class="group-title">正在进行</h3>
  <div v-for="task in uploadingTasks" :key="task.uid" class="transfer-item card-style">
    <div class="item-icon upload">
      <!-- ★★★ 根据状态显示不同图标 ★★★ -->
      <el-icon v-if="task.status === 'pending'" class="is-loading"><Clock /></el-icon>
      <el-icon v-else class="is-loading"><Loading /></el-icon>
    </div>
    <div class="item-info">
      <span class="item-name">{{ task.name }}</span>
      <el-progress :percentage="task.percentage" :stroke-width="6" :show-text="false" />
    </div>
    <div class="item-status uploading">
      <!-- ★★★ 根据状态显示不同文本 ★★★ -->
      <span v-if="task.status === 'pending'" class="status-text pending">准备中...</span>
      <span v-else class="status-text">{{ task.percentage.toFixed(0) }}%</span>
      <span class="size-text">{{ formatFileSize(task.size * (task.percentage / 100)) }} / {{ formatFileSize(task.size) }}</span>
    </div>
  </div>
</div>
      
      <!-- ★★★ 历史记录改造为 el-table ★★★ -->
      <div v-if="historyTasks.length > 0" class="transfer-group">
         <h3 class="group-title">传输完成</h3>
        <el-table :data="historyTasks" style="width: 100%" @selection-change="handleSelectionChange" row-key="uid">
            <el-table-column type="selection" width="55" />
            <el-table-column label="文件名" min-width="250">
                <template #default="scope">
                    <div class="file-cell">
                        <div class="item-icon" :class="scope.row.type">
                            <el-icon><component :is="scope.row.type === 'upload' ? Upload : Download" /></el-icon>
                        </div>
                        <div class="item-info">
                            <span class="item-name">{{ scope.row.name }}</span>
                            <span class="item-time">{{ formatTime(scope.row.timestamp) }}</span>
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="大小" width="150" align="right">
                <template #default="scope">{{ formatFileSize(scope.row.size) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="150" align="center">
                <template #default="scope">
                    <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'" size="small">
                        {{ scope.row.status === 'success' ? '已完成' : '失败' }}
                    </el-tag>
                </template>
            </el-table-column>
        </el-table>
      </div>
    </div>
    <el-empty v-if="historyTasks.length === 0 && Object.keys(uploadingTasks).length === 0" description="没有传输记录"></el-empty>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useTransferStore } from '@/stores/transferStore';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Upload, Download, Delete, Loading ,Clock} from '@element-plus/icons-vue';

const store = useTransferStore();

const uploadingTasks = computed(() => store.uploadingTasks);
const historyTasks = computed(() => store.historyTasks);
const selectedHistoryItems = ref([]);

const handleSelectionChange = (val) => {
    selectedHistoryItems.value = val;
};

const handleBatchDelete = () => {
    const uids = selectedHistoryItems.value.map(item => item.uid);
    store.removeHistoryTasks(uids);
    ElMessage.success('选中的记录已删除');
};

const clearHistory = () => {
    ElMessageBox.confirm('确定要清空所有传输记录吗？此操作不可恢复。', '提示', {
        type: 'warning'
    }).then(() => {
        store.clearHistory();
        ElMessage.success('历史记录已清空');
    }).catch(()=>{});
};

const formatTime = (time) => new Date(time).toLocaleString();
const formatFileSize = (size) => {
    if (size === null || size === undefined) return '0 B';
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
</script>

<style scoped>
.page-title-header { margin-bottom: 20px; }
.page-title-header h1 { margin: 0 0 5px 0; font-size: 22px; font-weight: 600; color: #303133; }
.page-title-header p { margin: 0; font-size: 14px; color: #909399; }

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  gap: 10px;
}

.transfer-group { margin-bottom: 30px; }
.group-title { font-size: 16px; color: #303133; margin: 0 0 15px 5px; font-weight: 600; }

/* Styles for uploading tasks (unchanged) */
.transfer-item { display: flex; align-items: center; gap: 15px; padding: 15px; margin-bottom: 10px; }
.card-style { background-color: #fff; border-radius: 8px; border: 1px solid #e4e7ed; transition: box-shadow 0.3s; }
.card-style:hover { box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); }

/* Styles for history table */
.el-table {
    border-radius: 8px;
}
:deep(.el-table__header-wrapper) {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
:deep(.el-table th.el-table__cell) {
  background-color: #fafbfe !important;
  font-weight: 600;
  color: #606266;
}
.file-cell {
    display: flex;
    align-items: center;
    gap: 15px;
}
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  font-size: 20px;
}
.item-icon.upload { background-color: #ecf5ff; color: #409EFF; }
.item-icon.download { background-color: #f0f9eb; color: #67C23A; }
.item-info { flex-grow: 1; overflow: hidden; }
.item-name { display: block; font-weight: 500; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-time { font-size: 12px; color: #909399; }
.item-status.uploading .status-text.pending {
  font-weight: 500;
  font-size: 13px;
  color: #E6A23C; /* 使用警告色 */
}
</style>