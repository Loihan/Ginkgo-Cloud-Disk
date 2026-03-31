<template>
  <div class="share-page-container animated-gradient-background">
    <header class="page-header">
      <img src="@/assets/logo.png" alt="logo" class="header-logo" />
      <span class="header-title">银杏网盘</span>
    </header>

    <main class="main-content">
      <!-- 状态一：加载中 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
        <p>正在加载分享信息...</p>
      </div>

      <!-- 状态二：发生错误 -->
      <el-result
        v-if="!loading && error"
        icon="error"
        :title="errorTitle"
        :sub-title="error"
        class="error-result"
      ></el-result>

      <!-- 状态三：需要输入密码 -->
      <el-card class="password-card" v-if="!loading && !error && requiresPassword && !isAuthenticated">
        <div class="card-content">
            <el-icon :size="50" color="#E6A23C"><Lock /></el-icon>
            <h3>请输入访问密码</h3>
            <p>该分享已被加密，请输入密码以继续访问。</p>
            <el-input 
              v-model="password" 
              type="password"
              placeholder="访问密码" 
              show-password
              @keyup.enter="verifyPassword"
              style="margin: 20px 0;"
            />
            <el-button type="primary" @click="verifyPassword" :loading="verifying">验证并查看</el-button>
        </div>
      </el-card>

      <!-- 状态四：成功显示分享内容 -->
      <el-card class="share-card" v-if="!loading && !error && shareInfo && isAuthenticated">
        <!-- 分享者信息 -->
        <div class="sharer-info">
          <el-avatar class="avatar" :size="50">{{ shareInfo.sharerName.charAt(0) }}</el-avatar>
          <div class="sharer-text">
            <span class="sharer-name">{{ shareInfo.sharerName }}</span>
            <span>分享了 {{ shareInfo.type === 'folder' ? '一个文件夹' : '一个文件' }} 给您</span>
          </div>
        </div>

        <el-divider />

        <!-- 文件/文件夹信息 -->
        <div class="card-content">
          <div class="file-icon-large">
            <el-icon :size="60">
              <component :is="getItemIcon(shareInfo)" />
            </el-icon>
          </div>
          <div class="file-info">
            <h1 class="file-name">{{ shareInfo.name }}</h1>
            <p v-if="shareInfo.type === 'file'" class="file-size">{{ formatFileSize(shareInfo.size) }}</p>
            <p v-else class="file-size">包含 {{ shareInfo.children.length }} 个项目</p>
            <p class="share-time">分享于 {{ formatShareTime(shareInfo.shareTime) }}</p>
          </div>
          
          <!-- 如果是文件夹，则显示内部列表 -->
          <div v-if="shareInfo.type === 'folder' && shareInfo.children.length > 0" class="folder-content">
            <div v-for="child in shareInfo.children" :key="child.id" class="folder-item">
                <el-icon><component :is="getItemIcon(child)" /></el-icon>
                <span class="child-name">{{ child.name }}</span>
                <span class="child-size">{{ child.type === 'file' ? formatFileSize(child.size) : '' }}</span>
            </div>
          </div>

          <el-button v-if="shareInfo.type === 'file'" type="primary" size="large" @click="downloadFile" class="download-btn" round>
            <el-icon><Download /></el-icon>
            <span>立即下载</span>
          </el-button>
          <el-alert v-else title="暂不支持文件夹打包下载" type="info" :closable="false" show-icon style="margin-top: 20px;" />
        </div>
      </el-card>
    </main>

    <footer class="page-footer">
      银杏网盘 © 2025
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/api';
import axios from 'axios'; 
import { ElMessage } from 'element-plus';
import { 
  Download, Document, Loading, Lock,
  Picture as PictureIcon, Headset, VideoCamera, Folder
} from '@element-plus/icons-vue';

const route = useRoute();
const shareInfo = ref(null);
const loading = ref(true);
const error = ref('');
const errorTitle = ref('分享已失效');
const shareId = route.params.shareId;

const requiresPassword = ref(false);
const isAuthenticated = ref(false);
const password = ref('');
const verifying = ref(false);

const fetchShareInfo = async (pwd = '') => {
  try {
    const res = await api.getShareInfo(shareId, pwd);
    // ★★★ 核心改动：检查响应体中的 requiresPassword 标志
    if (res.data.requiresPassword) {
      requiresPassword.value = true;
      isAuthenticated.value = false;
    } else if (res.data.success) {
      shareInfo.value = res.data.shareInfo;
      isAuthenticated.value = true;
      document.title = `${res.data.shareInfo.name} - 文件分享`;
    } else {
        // 其他业务逻辑上的失败 (例如密码错误)
        error.value = res.data.message;
        errorTitle.value = "访问被拒绝";
    }
  } catch (e) {
    error.value = e.response?.data?.message || '无法获取分享信息。';
    errorTitle.value = e.response?.status === 403 ? '分享已过期' : '分享已失效';
  } finally {
    loading.value = false;
    verifying.value = false;
  }
};

onMounted(() => {
  fetchShareInfo(); // 页面加载时，先尝试无密码访问
});

const verifyPassword = async () => {
    if(!password.value) {
        ElMessage.warning('请输入密码');
        return;
    }
    verifying.value = true;
    error.value = ''; // 清除之前的错误提示
    await fetchShareInfo(password.value);
};

const downloadFile = () => {
  const downloadUrl = `${api.baseURL}/share/${shareId}/download`;
  
  ElMessage.info('正在准备下载，请稍候...');

  // ★★★ 核心修复：统一使用 axios 发起 POST 请求 ★★★
  axios({
    url: downloadUrl,
    method: 'POST',
    responseType: 'blob', // 必须是 blob
    data: {
      // 即使没有密码，也传递一个空的 password 字段，以匹配 validateShare 中间件的 req.body
      password: password.value || '' 
    }
  }).then(response => {
      // 浏览器兼容性处理：从 Content-Disposition 获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let fileName = shareInfo.value.name; // 默认文件名
      if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename\*?=UTF-8''(.+)/);
          if (fileNameMatch && fileNameMatch.length > 1) {
              fileName = decodeURIComponent(fileNameMatch[1]);
          } else {
              const fileNameMatch2 = contentDisposition.match(/filename="(.+)"/);
              if(fileNameMatch2 && fileNameMatch2.length > 1) {
                fileName = fileNameMatch2[1];
              }
          }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  }).catch(() => {
      ElMessage.error("下载失败，请重试");
  });
};

const formatFileSize = (size) => {
  if (!size && size !== 0) return '0';
  if (size === 0) return '0';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatShareTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getItemIcon = (item) => {
    if (!item) return Document;
    if (item.type === 'folder') return Folder;
    const ext = item.name.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) return PictureIcon;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return Headset;
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return VideoCamera;
    return Document;
};
</script>

<style scoped>
/* ... (大部分样式与上一版一致，但增加了 password-card 和 folder-content 的样式) ... */
.share-page-container {
  padding: 20px; box-sizing: border-box; overflow: hidden;
}
.page-header { display: flex; align-items: center; width: 100%; }
.header-logo { height: 40px; margin-right: 15px; }
.header-title { font-size: 22px; font-weight: 600; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.main-content { flex-grow: 1; display: flex; justify-content: center; align-items: center; width: 100%; }

.password-card, .share-card {
  width: 100%;
  max-width: 520px;
  border-radius: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
.password-card .card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
}
.password-card h3 {
    margin: 10px 0 0 0;
    font-size: 20px;
}
.password-card p {
    color: #606266;
    font-size: 14px;
}

.sharer-info { display: flex; align-items: center; gap: 15px; padding: 10px; }
.avatar { background-color: var(--el-color-primary); font-size: 24px; flex-shrink: 0; }
.sharer-text { font-size: 16px; color: #555; }
.sharer-name { font-weight: bold; color: #333; }
.el-divider { margin: 10px 0 25px 0; }
.card-content { display: flex; flex-direction: column; align-items: center; gap: 15px; }
.file-icon-large { width: 100px; height: 100px; border-radius: 20px; background-color: rgba(255, 255, 255, 0.3); display: flex; justify-content: center; align-items: center; color: #fff; }
.file-info { text-align: center; }
.file-name { font-size: 22px; font-weight: 600; color: #333; margin: 0 0 8px 0; word-break: break-all; }
.file-size { font-size: 14px; color: #555; margin: 0; }
.share-time { font-size: 12px; color: #999; margin-top: 8px; }

.folder-content {
    width: 100%;
    margin-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.1);
    padding-top: 20px;
    max-height: 200px;
    overflow-y: auto;
}
.folder-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 6px;
}
.folder-item:hover {
    background-color: rgba(0,0,0,0.05);
}
.folder-item .el-icon {
    margin-right: 10px;
    color: #409EFF;
}
.child-name {
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
}
.child-size {
    color: #909399;
    font-size: 12px;
}

.download-btn { width: 80%; margin-top: 20px; font-weight: bold; }
.page-footer { width: 100%; text-align: center; font-size: 12px; color: rgba(255, 255, 255, 0.7); padding: 20px 0 0 0; }
.loading-state { text-align: center; color: #fff; font-size: 16px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.error-result { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border-radius: 20px; }
:deep(.el-result__title p) { color: #333; }
:deep(.el-result__subtitle p) { color: #555; }
</style>