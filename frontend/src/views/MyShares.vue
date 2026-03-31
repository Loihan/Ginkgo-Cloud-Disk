<!-- src/views/MyShares.vue (作为子视图的版本) -->
<template>
  <div>
    <div class="page-title-header">
      <h1>我的分享</h1>
      <p>管理您已创建的所有分享链接。</p>
    </div>
    <el-table :data="shares" v-loading="loading" style="width: 100%" empty-text="您还没有创建任何分享">
      <el-table-column label="分享项目" prop="name" min-width="200">
        <template #default="scope">
          <div class="file-name-cell">
            <el-icon :size="20"><component :is="getItemIcon(scope.row)" /></el-icon>
            <span>{{ scope.row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分享时间" prop="createdAt" width="200">
         <template #default="scope">{{ formatTime(scope.row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="过期时间" prop="expireAt" width="200">
         <template #default="scope">{{ formatTime(scope.row.expireAt, '永不') }}</template>
      </el-table-column>
      <el-table-column label="访问密码" prop="password" width="120">
        <template #default="scope">{{ scope.row.password || '无' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" :icon="Link" @click="copyShareLink(scope.row.shareId)">复制链接</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="cancelShare(scope.row.shareId, scope.row.name)">取消分享</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Link, Delete, Folder, Document, Picture as PictureIcon, Headset, VideoCamera } from '@element-plus/icons-vue';

const router = useRouter();
const shares = ref([]);
const loading = ref(true);

const fetchMyShares = async () => {
  loading.value = true;
  try {
    const res = await api.getMyShares();
    if (res.data.success) {
      shares.value = res.data.shares;
    }
  } catch (error) {
    ElMessage.error('获取分享列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchMyShares);

const goBack = () => {
  router.push('/dashboard');
};

const copyShareLink = (shareId) => {
  const link = `${window.location.origin}/share/${shareId}`;
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link)
      .then(() => {
        ElMessage.success('链接已复制到剪贴板！');
      })
      .catch(() => {
        ElMessage.error('自动复制失败，请手动复制');
      });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        ElMessage.success('链接已复制到剪贴板！');
      } else {
        ElMessage.error('复制失败，您的浏览器可能不支持');
      }
    } catch (err) {
      ElMessage.error('复制失败');
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

const cancelShare = (shareId, name) => {
  ElMessageBox.confirm(`确定要取消对 "${name}" 的分享吗？链接将立即失效。`, '取消分享', {
    confirmButtonText: '确定取消',
    cancelButtonText: '再想想',
    type: 'warning',
  }).then(async () => {
    try {
      await api.cancelShare(shareId);
      ElMessage.success('分享已取消');
      fetchMyShares(); // 刷新列表
    } catch (error) {
      ElMessage.error('操作失败');
    }
  }).catch(() => {});
};

const formatTime = (time, defaultText = '-') => {
  if (!time) return defaultText;
  return new Date(time).toLocaleString();
};

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
/* ★★★ 更新为子视图的样式 ★★★ */
.page-title-header {
  margin-bottom: 20px;
}
.page-title-header h1 {
  margin: 0 0 5px 0;
  font-size: 22px;
  font-weight: 600;
}
.page-title-header p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}
.file-name-cell { display: flex; align-items: center; gap: 8px; }
</style>