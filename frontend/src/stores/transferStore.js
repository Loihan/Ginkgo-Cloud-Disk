// src/stores/transferStore.js (最终用户隔离版)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTransferStore = defineStore('transfer', () => {
  const uploadingTasks = ref({});
  const historyTasks = ref([]);
  const currentUserId = ref(null);

  // ★★★ 核心改动：动态生成 localStorage 的 key ★★★
  const historyKey = computed(() => `transferHistory_${currentUserId.value}`);

  // ★★★ 核心改动：初始化或加载用户历史记录 ★★★
  function loadUserHistory() {
    const userId = sessionStorage.getItem('userId');
    if (userId) {
      currentUserId.value = userId;
      historyTasks.value = JSON.parse(localStorage.getItem(historyKey.value) || '[]');
    } else {
      // 如果没有用户信息，则清空
      clearAllState();
    }
  }
  
  function saveHistory() {
    if (!currentUserId.value) return; // 如果没有用户ID，不保存
    localStorage.setItem(historyKey.value, JSON.stringify(historyTasks.value));
  }

  function addUploadingTask(file) {
    uploadingTasks.value[file.uid] = {
      uid: file.uid, name: file.name, size: file.size, percentage: 0,
      status: 'pending', type: 'upload', timestamp: Date.now(),
    };
  }

  function updateUploadingTaskProgress(file, percentage) {
    if (uploadingTasks.value[file.uid]) {
      const task = uploadingTasks.value[file.uid];
      if (task.status === 'pending' && percentage > 0) {
        task.status = 'uploading';
      }
      task.percentage = percentage;
    }
  }

  function setTaskSuccess(file) {
    if (uploadingTasks.value[file.uid]) {
      const task = uploadingTasks.value[file.uid];
      task.status = 'success';
      task.percentage = 100;
      historyTasks.value.unshift(task);
      delete uploadingTasks.value[file.uid];
      saveHistory();
    }
  }

  function setTaskFail(file) {
     if (uploadingTasks.value[file.uid]) {
      const task = uploadingTasks.value[file.uid];
      task.status = 'fail';
      historyTasks.value.unshift(task);
      delete uploadingTasks.value[file.uid];
      saveHistory();
    }
  }
  
  function addDownloadHistory(file) {
      const task = {
        uid: `dl-${Date.now()}-${file.id}`, name: file.name, size: file.size,
        status: 'success', type: 'download', timestamp: Date.now(),
      };
      historyTasks.value.unshift(task);
      saveHistory();
  }

  function removeHistoryTasks(uids) {
    historyTasks.value = historyTasks.value.filter(task => !uids.includes(task.uid));
    saveHistory();
  }

  function clearHistory() {
      historyTasks.value = [];
      if (currentUserId.value) {
        localStorage.removeItem(historyKey.value);
      }
  }

  // ★★★ 新增：用于登出时彻底清空状态 ★★★
  function clearAllState() {
      uploadingTasks.value = {};
      historyTasks.value = [];
      currentUserId.value = null;
  }

  return { 
    uploadingTasks, 
    historyTasks,
    loadUserHistory, // 导出
    addUploadingTask, 
    updateUploadingTaskProgress,
    setTaskSuccess,
    setTaskFail,
    addDownloadHistory,
    clearHistory,
    removeHistoryTasks,
    clearAllState // 导出
  };
});