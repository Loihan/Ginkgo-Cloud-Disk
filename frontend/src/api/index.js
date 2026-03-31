// src/api/index.js (高级分享版)

import axios from 'axios';
import { ElMessage } from 'element-plus';

const apiClient = axios.create({
  baseURL: 'http://134.175.188.172:8082', // 您的后端公网 IP
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const setupInterceptors = (router) => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        if ([401, 403].includes(error.response.status) && error.config.url !== '/login') {
          sessionStorage.clear();
          ElMessage.error('会话已过期，请重新登录');
          router.replace('/');
        }
      } else if (error.request) {
        ElMessage.error('无法连接到服务器，请检查网络连接');
      } else {
        ElMessage.error('请求失败，发生未知错误');
      }
      return Promise.reject(error);
    }
  );
};

export default {
  baseURL: apiClient.defaults.baseURL,

  // --- 用户 API ---
  login(credentials) { return apiClient.post('/login', credentials); },
  register(userInfo) { return apiClient.post('/register', userInfo); },
  uploadAvatar(formData) { return apiClient.post('/upload-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); },

  // --- 文件与文件夹 API ---
  getItems(parentId = 0, inRecycleBin = false) { return apiClient.get(`/files?parentId=${parentId}&recycle=${inRecycleBin}`); },
  createFolder(name, parentId = 0) { return apiClient.post('/folders', { name, parentId }); },
  renameItem(id, newName) { return apiClient.patch(`/files/${id}/rename`, { name: newName }); },
  deleteItem(id) { return apiClient.delete(`/files/${id}`); },
  getBreadcrumbs(id = 0) { return apiClient.get(`/breadcrumbs?id=${id}`); },
  searchItems(keyword) { return apiClient.get(`/search?keyword=${keyword}`); },
  moveItems(itemIds, targetParentId) { return apiClient.post('/files/move', { itemIds, targetParentId }); },
  packageItems(itemIds, newFolderName, parentId) { return apiClient.post('/files/package', { itemIds, newFolderName, parentId }); },
  getDownloadUrl(fileId) { return `${apiClient.defaults.baseURL}/download/${fileId}`; },
  
  // --- 回收站 API ---
  getRecycleBinItems() { return apiClient.get('/recycle-bin'); },
  restoreItems(itemIds) { return apiClient.post('/recycle-bin/restore', { itemIds }); },
  permanentDeleteItems(itemIds) { return apiClient.delete('/recycle-bin/permanent-delete', { data: { itemIds } }); },

  // --- 空间配额 API ---
  getQuotaInfo() { return apiClient.get('/quota'); },

  // ★★★ 高级分享 API ★★★
  createShare(itemId, type, password, expiresIn) {
    return apiClient.post('/shares', { itemId, type, password, expiresIn });
  },
  getMyShares() {
    return apiClient.get('/my-shares');
  },
  cancelShare(shareId) {
    return apiClient.delete(`/shares/${shareId}`);
  },
  getShareInfo(shareId, password = '') {
    return apiClient.post(`/share/${shareId}`, { password });
  },
  uploadAvatar(formData) {
    return apiClient.post('/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },
  updateUsername(newName) {
    return apiClient.patch('/user/profile', { name: newName });
  },
};