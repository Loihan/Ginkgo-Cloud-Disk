<template>
  <div class="dashboard-container">
    <div class="header-section">
      <div class="logo">
        <h1>银杏网盘 - 用户界面</h1>
      </div>
      <div class="user-info">
        <p>欢迎，{{ userName }} (ID: {{ userId }})</p>
      </div>
    </div>
    <div class="main-content">
      <div class="upload-section">
        <el-upload
          class="upload-demo"
          action="/api/upload"
          :on-success="handleUploadSuccess" 
          :on-error="handleUploadError" 
          multiple
          :headers="getAuthHeaders()"
        >
          <el-button size="small" type="primary" class="upload-btn">
            <i class="el-icon-upload"></i> 点击上传
          </el-button>
          <template #tip>
            <div class="el-upload__tip">
              <i class="el-icon-info"></i> 支持上传文件，且不超过 10MB
            </div>
          </template>
        </el-upload>
      </div>
      <div class="table-section">
        <el-table :data="fileList" style="width: 100%" class="custom-table">
          <el-table-column prop="name" label="文件名" width="180" />
          <el-table-column label="文件大小" width="120">
            <template #default="scope">
              {{ formatFileSize(scope.row.size) }}
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="180">
            <template #default="scope">
              {{ formatUploadTime(scope.row.uploadTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" type="primary" @click="downloadFile(scope.row)" class="action-btn">
                <i class="el-icon-download"></i> 下载
              </el-button>
              <el-button size="small" type="danger" @click="deleteFile(scope.row)" class="action-btn">
                <i class="el-icon-delete"></i> 删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <div class="footer-section">
      <p>银杏网盘 © 2025</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
const router = useRouter(); 

// 新增：获取认证头部函数
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`
  };
};

const fileList = ref([]);
const userId = ref(localStorage.getItem('userId') || '');
const userName = ref(localStorage.getItem('userName') || '');

const formatFileSize = (size) => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

const formatUploadTime = (time) => {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}：${minute}`;
};

onMounted(async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // 自动重定向到登录页
      router.push('/login');
      return;
    }
    const response = await axios.get(`/api/files`, {
      headers: getAuthHeaders(),
    });
    fileList.value = response.data;
  } catch (error) {
    console.error('获取文件列表失败:', error);
    ElMessage.error('获取文件列表失败，请稍后重试');
  }
});

const handleUploadSuccess = (response) => {
  if (response.success) {
    fileList.value.push(response.file);
    ElMessage.success('文件上传成功');
  }
};

const handleUploadError = (error) => {
  console.error('文件上传失败:', error);
  ElMessage.error('文件上传失败，请检查网络或文件大小');
};

const downloadFile = async (file) => {
  try {
    const response = await axios.get(`/api/download/${file.id}`, { 
      responseType: 'blob',
      headers: {
         ...getAuthHeaders(), // 合并认证头部
        'Accept': 'application/octet-stream'
      }
    });

    // 从响应头中获取文件名
    const contentDisposition = response.headers['content-disposition'];
    let fileName = file.name;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      if (match) {
        fileName = decodeURIComponent(match[1]);
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('文件下载开始');
  } catch (error) {
    console.error('文件下载失败:', error);
    ElMessage.error('文件下载失败，请稍后重试');
  }
};

const deleteFile = async (file) => {
  try {
    console.log('尝试删除文件，userId:', userId.value, 'file.id:', file.id); 
    await axios.delete(`/api/files/${file.id}`, {
    headers: getAuthHeaders(),
    });
    fileList.value = fileList.value.filter((item) => item.id !== file.id);
    ElMessage.success('文件删除成功');
  } catch (error) {
    console.error('文件删除失败:', error);
    console.error('响应数据:', error.response?.data); 
    ElMessage.error('文件删除失败，请稍后重试');
  }
};
</script>

<style scoped>
/* 使用更稳定、更明确的 Flexbox 布局来重写整个仪表盘结构 */

.dashboard-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; 
}

.header {
  flex-shrink: 0; 
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
  border-bottom: 1px solid #dcdfe6;
}

.logo-area {
  display: flex;
  align-items: center;
}

.header-logo {
  height: 40px;
  margin-right: 15px;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* 包含侧边栏和主内容的核心区域 */
.el-container {
  flex: 1; 
  overflow: hidden; 
}

.aside {
  background-color: #ffffff;
  border-right: 1px solid #dcdfe6;
}

.aside-menu {
  border-right: none;
}

.main-content {
  /* ★★★ 最终的根治方案 ★★★ */
  /* 将 auto 修改为 scroll，强制滚动条轨道始终存在，杜绝布局抖动 */
  overflow-y: scroll;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 20px;
  flex-shrink: 0;
}

.upload-component {
  flex-grow: 1;
}

.search-area {
  display: flex;
  gap: 10px;
  min-width: 400px;
}

.file-name-cell {
  display: flex;
  align-items: center;
}

.el-table {
  flex-grow: 1;
}

</style>