<!-- src/views/MyFiles.vue -->
<template>
  <div v-loading="loading">
    <template v-if="!isSearchView">
      <el-upload
          class="upload-dragger"
          :action="uploadUrl"
          :headers="uploadHeaders"
          :data="{ parentId: currentFolderId }"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :before-upload="beforeUpload"
          :show-file-list="false"
          drag
          multiple
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip><div class="el-upload__tip">文件大小不超过 60MB</div></template>
      </el-upload>
      <div class="action-bar">
        <div>
          <el-button type="default" :icon="FolderAdd" @click="handleCreateFolder">新建文件夹</el-button>
        </div>
        <div class="action-buttons">
          <el-dropdown v-if="selectedItems.length > 0">
            <el-button type="primary">
              批量操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Rank" @click="handleBatchMove">移动到...</el-dropdown-item>
                <el-dropdown-item :icon="FolderAdd" @click="handleBatchPackage">打包到新文件夹</el-dropdown-item>
                <el-dropdown-item :icon="Delete" @click="handleBatchDelete" divided>移入回收站</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <el-breadcrumb separator-icon="ArrowRight" class="breadcrumb-nav">
          <el-breadcrumb-item 
            v-for="crumb in breadcrumbs" 
            :key="crumb.id"
            @click="handleCrumbClick(crumb.id)"
            class="is-link"
          >
            {{ crumb.name }}
          </el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    
    <div v-else class="search-result-header">
      <h1>关于“{{ displayedSearchKeyword }}”的搜索结果</h1>
      <el-button type="primary" link @click="exitSearchView">返回</el-button>
    </div>

    <el-table :data="items" style="width: 100%" @selection-change="handleSelectionChange" @row-dblclick="handleRowDblClick" @row-contextmenu="handleRowContextMenu">
        <el-table-column type="selection" width="55" />
        <el-table-column label="文件名" sortable prop="name" min-width="200">
            <template #default="scope">
              <div class="file-name-cell">
                <el-icon :size="20" class="file-icon"><component :is="getItemIcon(scope.row)" /></el-icon>
                <template v-if="scope.row.editing"><el-input v-model="scope.row.newName" size="small" @blur="handleRenameConfirm(scope.row)" @keyup.enter.prevent="handleRenameConfirm(scope.row)" v-focus /></template>
                <span v-else class="item-name">{{ scope.row.name }}</span>
              </div>
            </template>
        </el-table-column>
        <el-table-column v-if="isSearchView" label="所在位置" prop="path" min-width="200">
            <template #default="scope"><el-breadcrumb separator-icon="ArrowRight" class="path-breadcrumb"><el-breadcrumb-item v-for="crumb in scope.row.path" :key="crumb.id" @click.stop="navigateTo(crumb.id)">{{ crumb.name }}</el-breadcrumb-item></el-breadcrumb></template>
        </el-table-column>
        <el-table-column label="大小" width="150" align="right" sortable prop="size"><template #default="scope">{{ scope.row.type === 'folder' ? '-' : formatFileSize(scope.row.size) }}</template></el-table-column>
        <el-table-column label="修改日期" width="200" align="center" sortable prop="uploadTime"><template #default="scope">{{ formatUploadTime(scope.row.uploadTime) }}</template></el-table-column>
    </el-table>
    <el-empty v-if="!loading && items.length === 0" :description="emptyText" />

    <el-dialog v-model="moveDialogVisible" :title="dialogTitle" width="30%">
        <el-tree :props="treeProps" :load="loadTreeData" lazy @node-click="handleTreeNodeClick" highlight-current node-key="id" :expand-on-click-node="false" />
        <template #footer><span class="dialog-footer"><el-button @click="moveDialogVisible = false">取消</el-button><el-button type="primary" @click="handleDialogConfirm" :disabled="!selectedMoveTarget">{{ confirmButtonText }}</el-button></span></template>
    </el-dialog>

<!-- src/views/MyFiles.vue -->

<!-- ... (其他 template 代码) ... -->

<el-dialog v-model="shareDialogVisible" title="创建分享" width="500px">
    <!-- 阶段一：显示创建选项 -->
    <div v-if="!shareLink">
      <el-form :model="shareOptions" label-width="80px">
        <el-form-item label="有效期">
          <el-radio-group v-model="shareOptions.expiresIn">
            <el-radio :label="0">永久有效</el-radio>
            <el-radio :label="1">1 天</el-radio>
            <el-radio :label="7">7 天</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="密码">
          <el-switch v-model="shareOptions.usePassword" active-text="设置密码"></el-switch>
          <el-input 
            v-if="shareOptions.usePassword" 
            v-model="shareOptions.password"
            placeholder="请输入4位密码"
            maxlength="4"
            style="width: 200px; margin-left: 20px;"
          ></el-input>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 阶段二：显示生成的链接 -->
    <div v-else>
      <p>分享链接已生成，请复制：</p>
      <!-- ★★★ 核心改动：分离输入框和按钮 ★★★ -->
      <div class="share-link-wrapper">
        <el-input v-model="shareLink" readonly class="share-link-input"></el-input>
        <el-button @click="copyShareLink" type="primary">复制链接</el-button>
      </div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="shareDialogVisible = false">关闭</el-button>
        <el-button v-if="!shareLink" type="primary" @click="createShareLink" :loading="shareCreating">
          创建链接
        </el-button>
      </span>
    </template>
</el-dialog>



<!-- ... (其他对话框) ... -->
    <div id="context-menu" v-show="contextMenu.visible" :style="{ left: contextMenu.left + 'px', top: contextMenu.top + 'px' }">
        <el-dropdown ref="contextMenuRef" trigger="contextmenu" @visible-change="handleContextMenuVisibleChange">
          <span></span> 
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Edit" @click="handleRename(contextMenu.item)">重命名</el-dropdown-item>
              <el-dropdown-item :icon="Rank" @click="handleContextMove(contextMenu.item)">移动到...</el-dropdown-item>
              <el-dropdown-item :icon="Share" @click="handleShare(contextMenu.item)">分享</el-dropdown-item>
              <el-dropdown-item v-if="contextMenu.item?.type === 'file'" :icon="Download" @click="handleDownload(contextMenu.item)">下载</el-dropdown-item>
              <el-dropdown-item :icon="Delete" @click="handleDelete(contextMenu.item)" divided class="danger">移入回收站</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/api';
import axios from 'axios';
import { Upload, Download, Delete, Search, FolderAdd, Edit, ArrowRight, Folder, Document, Files, Share, Rank, UploadFilled } from '@element-plus/icons-vue';
import { Picture as PictureIcon, Headset, VideoCamera } from '@element-plus/icons-vue';
import { useTransferStore } from '@/stores/transferStore';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const items = ref([]); 
const selectedItems = ref([]);
const currentFolderId = ref(0);
const breadcrumbs = ref([]);
const isSearchView = ref(false);
const displayedSearchKeyword = ref('');
const transferStore = useTransferStore();

const moveDialogVisible = ref(false);
const selectedMoveTarget = ref(null);
const dialogMode = ref('move');
const shareDialogVisible = ref(false);
const shareLink = ref('');
const shareCreating = ref(false);
const itemToShare = ref(null);
const shareOptions = ref({ expiresIn: 0, usePassword: false, password: '' });

const contextMenuRef = ref(null);
const contextMenu = ref({ visible: false, left: 0, top: 0, item: null });

const vFocus = { mounted: (el) => el.querySelector('input').focus() };
const treeProps = { label: 'name', isLeaf: 'isLeaf' };

const uploadUrl = computed(() => `${api.baseURL}/upload`);
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${sessionStorage.getItem('token')}` }));
const dialogTitle = computed(() => dialogMode.value === 'move' ? '移动到' : '选择新文件夹的位置');
const confirmButtonText = computed(() => dialogMode.value === 'move' ? '移动到此处' : '在此处创建');
const emptyText = computed(() => isSearchView.value ? `未找到关于“${displayedSearchKeyword.value}”的文件` : '这个文件夹是空的');

const loadContent = async (folderId, searchQuery = '') => {
  if (loading.value) return;
  loading.value = true;
  items.value = [];
  
  try {
    if (searchQuery) {
      isSearchView.value = true;
      displayedSearchKeyword.value = searchQuery;
      const res = await api.searchItems(searchQuery);
      items.value = res.data;
      breadcrumbs.value = [];
    } else {
      isSearchView.value = false;
      const [itemsRes, crumbsRes] = await Promise.all([
        api.getItems(folderId, false),
        api.getBreadcrumbs(folderId)
      ]);
      items.value = itemsRes.data;
      breadcrumbs.value = crumbsRes.data;
    }
    currentFolderId.value = folderId;
  } catch (error) {
    ElMessage.error('加载内容失败');
  } finally {
    loading.value = false;
  }
};

const navigateTo = (folderId) => { router.push({ name: 'MyFiles', params: { folderId } }); };
const handleCrumbClick = (crumbId) => { navigateTo(crumbId); };
const handleRowDblClick = (row) => { 
  if (row.type === 'folder') {
    navigateTo(row.id);
  }
  // 如果是文件，则不执行任何操作
};
const handleRowClick = (row) => { if (row.type === 'folder' && !row.editing) navigateTo(row.id); };
const exitSearchView = () => { router.push({ name: 'MyFiles', params: { folderId: currentFolderId.value } }); };

watch(() => route.params.folderId, (newId) => { loadContent(Number(newId) || 0); }, { immediate: true });
watch(() => route.query.search, (newQuery) => { if(newQuery) loadContent(0, newQuery); }, { immediate: true });


const handleCreateFolder = () => { ElMessageBox.prompt('请输入新文件夹的名称', '新建文件夹', { confirmButtonText: '确定', cancelButtonText: '取消', inputValidator: (val) => val && val.trim() !== '', inputErrorMessage: '文件夹名称不能为空', }).then(async ({ value }) => { try { await api.createFolder(value.trim(), currentFolderId.value); ElMessage.success('文件夹创建成功！'); loadContent(currentFolderId.value); } catch (error) { ElMessage.error(error.response?.data?.message || '创建失败'); } }).catch(() => {}); };
const handleRename = (item) => { items.value.forEach(i => i.editing = false); item.newName = item.name; item.editing = true; };
const handleRenameConfirm = async (item) => { const newName = item.newName.trim(); item.editing = false; if (!newName || newName === item.name) return; try { await api.renameItem(item.id, newName); ElMessage.success('重命名成功！'); item.name = newName; } catch (error) { ElMessage.error(error.response?.data?.message || '重命名失败'); } };
const handleDelete = (item) => { const typeText = item.type === 'folder' ? '文件夹' : '文件'; ElMessageBox.confirm(`${typeText} "${item.name}" 将被移入回收站。`, '移至回收站', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', }).then(async () => { try { await api.deleteItem(item.id); ElMessage.success('已移至回收站'); loadContent(currentFolderId.value); } catch (error) { ElMessage.error('操作失败'); } }).catch(() => {}); };
const handleSelectionChange = (val) => { selectedItems.value = val; };
const handleDownload = async (file) => { 
    ElMessage.info(`正在准备下载: ${file.name}`); 
    try { 
        const response = await axios({ 
            url: api.getDownloadUrl(file.id), 
            method: 'GET', responseType: 'blob', 
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } 
        }); 
        const url = window.URL.createObjectURL(new Blob([response.data])); 
        const link = document.createElement('a'); 
        link.href = url; link.setAttribute('download', file.name); 
        document.body.appendChild(link); link.click(); document.body.removeChild(link); 
        window.URL.revokeObjectURL(url); 
        transferStore.addDownloadHistory(file); 
    } catch (error) { ElMessage.error('下载失败'); } 
};

const handleBatchDelete = () => { ElMessageBox.confirm(`确定要将 ${selectedItems.value.length} 个项目移入回收站吗？`, '移至回收站', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning', }).then(async () => { const deletePromises = selectedItems.value.map(item => api.deleteItem(item.id)); try { await Promise.all(deletePromises); ElMessage.success('批量操作成功！'); loadContent(currentFolderId.value); } catch (error) { ElMessage.error('部分或全部项目操作失败'); loadContent(currentFolderId.value); } }).catch(() => {}); };
const handleBatchMove = () => { dialogMode.value = 'move'; selectedMoveTarget.value = null; moveDialogVisible.value = true; };
const handleBatchPackage = () => { dialogMode.value = 'package'; selectedMoveTarget.value = null; moveDialogVisible.value = true; };
const loadTreeData = async (node, resolve) => { if (node.level === 0) { return resolve([{ id: 0, name: '全部文件', isLeaf: false }]); } const parentId = node.data.id; try { const res = await api.getItems(parentId, false); const folders = res.data.filter(item => item.type === 'folder'); const idsBeingMoved = selectedItems.value.map(i => i.id); const availableFolders = folders.filter(f => !idsBeingMoved.includes(f.id)); const nodes = availableFolders.map(f => ({ ...f, isLeaf: false })); return resolve(nodes); } catch (error) { return resolve([]); } };
const handleTreeNodeClick = (data) => { selectedMoveTarget.value = data; };
const handleDialogConfirm = () => { if (dialogMode.value === 'move') { confirmMove(); } else { confirmPackage(); } };
const confirmMove = async () => { if (!selectedMoveTarget.value) { ElMessage.warning('请选择一个目标文件夹'); return; } const targetId = selectedMoveTarget.value.id; if (selectedItems.value.every(item => item.parentId === targetId)) { ElMessage.info('项目已在目标位置'); moveDialogVisible.value = false; return; } try { const itemIds = selectedItems.value.map(item => item.id); await api.moveItems(itemIds, targetId); ElMessage.success('移动成功！'); moveDialogVisible.value = false; loadContent(currentFolderId.value); } catch (error) { ElMessage.error(error.response?.data?.message || '移动失败'); } };
const confirmPackage = () => { if (!selectedMoveTarget.value) { ElMessage.warning('请选择一个位置'); return; } const targetParentId = selectedMoveTarget.value.id; ElMessageBox.prompt('请输入新文件夹的名称', '打包到新文件夹', { confirmButtonText: '创建并移入', cancelButtonText: '取消', inputValidator: (val) => val && val.trim() !== '', inputErrorMessage: '文件夹名称不能为空', }).then(async ({ value }) => { try { const itemIds = selectedItems.value.map(item => item.id); await api.packageItems(itemIds, value.trim(), targetParentId); ElMessage.success('打包成功！'); moveDialogVisible.value = false; loadContent(currentFolderId.value); } catch (error) { ElMessage.error(error.response?.data?.message || '打包失败'); } }).catch(() => {}); };
const handleShare = (item) => { itemToShare.value = item; shareLink.value = ''; shareOptions.value = { expiresIn: 0, usePassword: false, password: '' }; shareDialogVisible.value = true; };
const createShareLink = async () => { if (!itemToShare.value) return; if (shareOptions.value.usePassword && shareOptions.value.password.length !== 4) { ElMessage.warning('密码必须为4位'); return; } shareCreating.value = true; try { const res = await api.createShare( itemToShare.value.id, itemToShare.value.type, shareOptions.value.usePassword ? shareOptions.value.password : null, shareOptions.value.expiresIn ); if (res.data.success) { shareLink.value = `${window.location.origin}/share/${res.data.shareId}`; ElMessage.success('分享链接已生成！'); } else { ElMessage.error(res.data.message || '创建分享失败'); } } catch (error) { ElMessage.error('创建分享链接时发生错误'); } finally { shareCreating.value = false; } };
const copyShareLink = () => {
  const linkToCopy = shareLink.value;

  // 方案一：优先使用现代、安全的 Clipboard API
  // 这个 API 只能在 HTTPS 或 localhost 环境下工作
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(linkToCopy)
      .then(() => {
        ElMessage.success('链接已复制到剪贴板！');
      })
      .catch(err => {
        ElMessage.error('自动复制失败，请手动复制');
        console.error('Clipboard API copy failed:', err);
      });
  } 
  // 方案二：备用方案，使用 document.execCommand，兼容性极好
  else {
    // 动态创建一个 textarea 元素
    const textArea = document.createElement('textarea');
    textArea.value = linkToCopy;
    
    // 将其设置为屏幕外不可见
    textArea.style.position = 'absolute';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select(); // 选中 textarea 中的内容
    
    try {
      // 执行浏览器的复制命令
      const successful = document.execCommand('copy');
      if (successful) {
        ElMessage.success('链接已复制到剪贴板！');
      } else {
        ElMessage.error('复制失败，您的浏览器可能不支持此操作');
      }
    } catch (err) {
      ElMessage.error('复制时发生错误，请手动复制');
      console.error('Fallback copy failed:', err);
    } finally {
      // 操作完成后，移除这个临时元素
      document.body.removeChild(textArea);
    }
  }
};
const handleRowContextMenu = async (row, column, event) => { event.preventDefault(); if (items.value.some(i => i.editing)) { const editingItem = items.value.find(i => i.editing); if (editingItem) await handleRenameConfirm(editingItem); } contextMenu.value.item = row; if (contextMenu.value.visible) { contextMenu.value.visible = false; } await nextTick(); contextMenu.value.left = event.clientX; contextMenu.value.top = event.clientY; contextMenu.value.visible = true; contextMenuRef.value.handleOpen(); };
const handleContextMenuVisibleChange = (visible) => { if (!visible) { contextMenu.value.visible = false; } };
const handleContextMove = (item) => { handleBatchMove([item]); };
const formatFileSize = (size) => { if (size === null || size === undefined) return ''; if (size === 0) return '0'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(size) / Math.log(k)); return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; };
const formatUploadTime = (time) => new Date(time).toLocaleString();
const getItemIcon = (item) => { if (item.type === 'folder') return Folder; const ext = item.name.split('.').pop().toLowerCase(); if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(ext)) return PictureIcon; if (['mp3', 'wav', 'ogg'].includes(ext)) return Headset; if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return VideoCamera; return Document; };
// ★★★ 3. 新增上传相关钩子函数 ★★★
const handleUploadProgress = (event, file) => {
  transferStore.updateUploadingTaskProgress(file, event.percent);
};

const beforeUpload = (rawFile) => {
  const isLt60M = rawFile.size / 1024 / 1024 < 60;
  if (!isLt60M) { ElMessage.error('上传文件大小不能超过 60MB!'); return false; }
  
  // 在上传开始前，添加任务到 store
  transferStore.addUploadingTask(rawFile);
  return true;
};

const handleUploadSuccess = (response, file) => { 
  if (response.success) { 
    ElMessage.success('上传成功！');
    loadContent(currentFolderId.value);
    transferStore.setTaskSuccess(file); // ★★★ 通知 store 任务成功
  } else { 
    ElMessage.error(response.message || '上传失败');
    transferStore.setTaskFail(file); // ★★★ 通知 store 任务失败
  }
};

const handleUploadError = (error, file) => {
  // ★★★ 1. 无论发生什么错误，首先通知 store 任务失败
  transferStore.setTaskFail(file);

  // ★★★ 2. 然后尝试解析并显示具体的错误信息
  try {
    // el-upload 的 error hook 返回的 error 对象，其 message 属性是一个字符串化的 JSON
    const responseBody = JSON.parse(error.message);
    ElMessage.error(responseBody.message || '上传失败');
  } catch {
    // 如果解析失败，说明是一个网络错误或其他非标准错误
    ElMessage.error('上传失败，请检查文件大小或网络连接');
  }
};
</script>

<style scoped>
.upload-dragger { margin-bottom: 24px; }
:deep(.el-upload-dragger) { padding: 24px; border: 1px dashed #dcdfe6; transition: border-color 0.3s; }
:deep(.el-upload-dragger:hover) { border-color: var(--el-color-primary); }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
.action-bar > div:first-child .el-button { margin-right: 12px; }
.action-buttons { display: flex; align-items: center; gap: 12px; }
.breadcrumb-nav { margin-bottom: 20px; background-color: #ffffff; padding: 10px 15px; border-radius: 8px; border: 1px solid #e4e7ed; }
.breadcrumb-nav .is-link { cursor: pointer; font-weight: 600; }
.breadcrumb-nav .is-link:hover { color: #409EFF; }
.search-result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e4e7ed; }
.search-result-header h1 { margin: 0; font-size: 18px; color: #303133; }
.el-table { flex-grow: 1; border-radius: 8px; }
:deep(.el-table__header-wrapper) { border-top-left-radius: 8px; border-top-right-radius: 8px; }
:deep(.el-table th.el-table__cell) { background-color: #fafbfe !important; font-weight: 600; color: #606266; }
.path-breadcrumb { font-size: 12px; }
:deep(.path-breadcrumb .el-breadcrumb__item .el-breadcrumb__inner) { cursor: pointer !important; }
:deep(.path-breadcrumb .el-breadcrumb__item .el-breadcrumb__inner:hover) { color: var(--el-color-primary) !important; }
.file-name-cell { display: flex; align-items: center; cursor: pointer; }
.file-name-cell .item-name { margin-left: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-name-cell .file-icon { margin-right: 8px; flex-shrink: 0; }
#context-menu { position: fixed; z-index: 3000; }
.el-dropdown-menu__item.danger { color: var(--el-color-danger); }
/* ★★★ 新增分享链接样式 ★★★ */
.share-link-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.share-link-input {
  flex-grow: 1;
}
/* 强制覆盖 disabled 状态下的默认样式，使其看起来像 readonly */
:deep(.share-link-input.is-disabled .el-input__wrapper) {
  background-color: #F5F7FA !important;
  box-shadow: 0 0 0 1px #E4E7ED inset !important;
}
:deep(.share-link-input.is-disabled .el-input__inner) {
  color: #606266 !important;
  -webkit-text-fill-color: #606266 !important; /* 确保在 Chrome/Edge 中颜色正确 */
  cursor: default !important;
}
</style>