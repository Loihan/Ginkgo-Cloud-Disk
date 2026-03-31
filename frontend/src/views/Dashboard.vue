<!-- src/views/Dashboard.vue (最终版 - 已补全传输列表) -->
<template>
  <el-container class="dashboard-container">
    <el-header class="header">
      <div class="logo-area">
        <img src="@/assets/logo.png" alt="logo" class="header-logo" />
        <span class="title">银杏网盘</span>
      </div>
      <div class="global-search">
        <el-input
          v-model="globalSearchQuery"
          placeholder="搜索您的所有文件"
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleGlobalSearch"
          @clear="handleSearchClear"
        />
      </div>
      <el-dropdown>
        <span class="user-info">
          <el-avatar :size="32" :src="userAvatarUrl" class="user-avatar">{{ userName.charAt(0) }}</el-avatar>
          <span class="user-name">{{ userName }}</span>
          <el-icon class="el-icon--right"><arrow-down /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="openUsernameDialog">修改用户名</el-dropdown-item>
            <el-dropdown-item @click="avatarDialogVisible = true">更换头像</el-dropdown-item>
            <el-dropdown-item @click="handleLogout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-header>

    <el-container>
      <el-aside width="240px" class="aside">
        <el-menu :default-active="activeMenu" class="aside-menu" router>
          <el-menu-item index="MyFiles" route="/dashboard/files/0">
            <el-icon><Files /></el-icon>
            <span>全部文件</span>
          </el-menu-item>
          <!-- ★★★ 核心修复：在这里添加回“传输列表” ★★★ -->
          <el-menu-item index="Transfers" route="/dashboard/transfers">
            <el-icon><Switch /></el-icon>
            <span>传输列表</span>
          </el-menu-item>
          <el-menu-item index="MyShares" route="/dashboard/my-shares">
            <el-icon><Share /></el-icon>
            <span>我的分享</span>
          </el-menu-item>
          <el-menu-item index="RecycleBin" route="/dashboard/recycle-bin">
            <el-icon><Delete /></el-icon>
            <span>回收站</span>
          </el-menu-item>
          <el-menu-item index="MyQuota" route="/dashboard/quota">
            <el-icon><DataAnalysis /></el-icon>
            <span>我的空间</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="main-content">
        <router-view v-slot="{ Component, route }">
            <component :is="Component" :key="route.fullPath" />
        </router-view>
      </el-main>
    </el-container>
    
    <el-dialog v-model="avatarDialogVisible" title="更换头像" width="300px" center>
      <el-upload
        class="avatar-uploader"
        action="#"
        :http-request="handleAvatarUpload"
        :show-file-list="false"
        :before-upload="beforeAvatarUpload"
      >
        <img v-if="tempAvatarUrl || userAvatarUrl" :src="tempAvatarUrl || userAvatarUrl" class="avatar-preview" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>
      <template #footer>
          <div class="dialog-footer">
              <span class="upload-tip">点击上方区域选择图片 (不超过5MB)</span>
          </div>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
// ★★★ 核心修复：在这里导入 Switch 图标 ★★★
import { Search, User, ArrowDown, Files, Share, Delete, DataAnalysis, Plus, Switch } from '@element-plus/icons-vue';
import { useTransferStore } from '@/stores/transferStore';

const router = useRouter();
const transferStore = useTransferStore();
const route = useRoute();
const userName = ref(sessionStorage.getItem('userName') || '用户');
const userAvatar = ref(sessionStorage.getItem('avatar') || '');
const globalSearchQuery = ref(route.query.search || '');
const activeMenu = ref('MyFiles');
const avatarDialogVisible = ref(false);
const tempAvatarUrl = ref('');
const userAvatarUrl = computed(() => userAvatar.value ? `${api.baseURL}${userAvatar.value}` : '');

watch(() => route.name, (newName) => { activeMenu.value = newName; if (newName !== 'MyFiles') { globalSearchQuery.value = ''; }}, { immediate: true });

const handleGlobalSearch = () => { const keyword = globalSearchQuery.value.trim(); if (!keyword) return; router.push({ name: 'MyFiles', query: { search: keyword } }); };
const handleSearchClear = () => { router.push({ name: 'MyFiles', params: { folderId: 0 } }); };
const handleLogout = () => { 
  transferStore.clearAllState(); 
  sessionStorage.clear(); 
  router.push('/'); 
};

const openUsernameDialog = () => {
  ElMessageBox.prompt('请输入新的用户名', '修改用户名', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: userName.value,
    inputValidator: (val) => val && val.trim().length > 0,
    inputErrorMessage: '用户名不能为空',
  })
  .then(async ({ value }) => {
    const trimmedName = value.trim();
    if (trimmedName === userName.value) { return; }
    try {
      const res = await api.updateUsername(trimmedName);
      if (res.data.success) {
        ElMessage.success('用户名更新成功！');
        userName.value = res.data.newName;
        sessionStorage.setItem('userName', res.data.newName);
        sessionStorage.setItem('token', res.data.newToken);
      } else {
        ElMessage.error(res.data.message || '更新失败');
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '更新时发生错误');
    }
  })
  .catch(() => {
    ElMessage.info('已取消修改');
  });
};

const handleAvatarUpload = async (options) => {
  const formData = new FormData();
  formData.append('avatar', options.file);
  try {
    const response = await api.uploadAvatar(formData);
    if (response.data.success) {
      ElMessage.success('头像更换成功！');
      userAvatar.value = response.data.avatarUrl;
      sessionStorage.setItem('avatar', response.data.avatarUrl);
      avatarDialogVisible.value = false;
      tempAvatarUrl.value = '';
    } else { ElMessage.error(response.data.message || '上传失败'); }
  } catch (error) { ElMessage.error('上传失败'); }
};

const beforeAvatarUpload = (rawFile) => {
  if (!rawFile.type.startsWith('image/')) { ElMessage.error('只能上传图片文件!'); return false; }
  if (rawFile.size / 1024 / 1024 > 5) { ElMessage.error('头像图片大小不能超过 5MB!'); return false; }
  tempAvatarUrl.value = URL.createObjectURL(rawFile);
  return true;
};
</script>

<style scoped>
.dashboard-container { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background-color: #f7f9fc; }
.header { flex-shrink: 0; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 20px; background-color: #ffffff; border-bottom: 1px solid #e4e7ed; padding: 0 20px; box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08); }
.logo-area { display: flex; align-items: center; }
.header-logo { height: 40px; margin-right: 15px; }
.title { font-size: 20px; font-weight: 600; color: #303133; }
.global-search { max-width: 500px; width: 100%; justify-self: center; }
:deep(.el-input__wrapper) { border-radius: 20px !important; }
.user-info { cursor: pointer; display: flex; align-items: center; gap: 10px; }
.user-avatar { border: 1px solid #eee; flex-shrink: 0; background-color: var(--el-color-primary); color: #fff; }
.user-name { font-weight: 500; }
.el-container { flex: 1; overflow: hidden; }
.aside { background-color: #ffffff; }
.aside-menu { border-right: none; height: 100%; }
.aside-menu a { text-decoration: none; }
:deep(.el-menu-item.is-active) { background-color: #ecf5ff !important; color: #409EFF !important; font-weight: bold; }
:deep(.el-menu-item:hover) { background-color: #f5f7fa; }
.main-content { padding: 24px; }
.avatar-uploader .el-upload { border: 1px dashed var(--el-border-color); border-radius: 50%; cursor: pointer; position: relative; overflow: hidden; transition: var(--el-transition-duration-fast); width: 178px; height: 178px; display: flex; justify-content: center; align-items: center; }
.avatar-uploader .el-upload:hover { border-color: var(--el-color-primary); }
.avatar-uploader-icon { font-size: 28px; color: #8c939d; }
.avatar-preview { width: 178px; height: 178px; object-fit: cover; }
.upload-tip { font-size: 12px; color: #909399; }
</style>