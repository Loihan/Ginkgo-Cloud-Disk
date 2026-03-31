<template>
  <div class="quota-view" v-loading="loading">
    <div class="quota-header">我的空间</div>

    <div class="colorful-progress-wrapper">
      <!-- SVG 容器 -->
      <svg class="colorful-progress-svg" :viewBox="`0 0 ${svgSize} ${svgSize}`">
        <!-- 1. 底层灰色环 -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke-width="strokeWidth"
          stroke="#E5E9F2"
          fill="none"
        />
        <!-- 2. 多个彩色环段 (v-for 渲染) -->
        <circle
          v-for="segment in progressSegments"
          :key="segment.key"
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke-width="strokeWidth"
          :stroke="segment.color"
          fill="none"
          class="progress-segment"
          :style="segment.style"
        />
      </svg>
      <!-- 3. 中间显示的文字 (唯一) -->
      <div class="progress-text-content">
        <span class="percentage-value">{{ quotaPercentage.toFixed(1) }}%</span>
        <span class="percentage-label">已使用</span>
      </div>
    </div>

    <div class="quota-text">
      {{ formatFileSize(quotaInfo.usedQuota) }} / {{ formatFileSize(quotaInfo.totalQuota) }}
    </div>
    <div class="usage-details">
      <div class="usage-item" v-for="item in usageDetails" :key="item.label">
        <span class="item-color-dot" :style="{ backgroundColor: item.color }"></span>
        <span class="item-label">{{ item.label }}</span>
        <span class="item-percentage">{{ item.percentageString }}</span>
        <span class="item-size">{{ formatFileSize(item.size) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '@/api';

const loading = ref(true);
const quotaInfo = ref({
  totalQuota: 1073741824,
  usedQuota: 0,
  usageDetails: { video: 0, audio: 0, document: 0, archive: 0, image: 0, other: 0 }
});

const quotaPercentage = computed(() => {
  if (!quotaInfo.value.totalQuota) return 0;
  return (quotaInfo.value.usedQuota / quotaInfo.value.totalQuota) * 100;
});

const usageDetails = computed(() => {
  const totalUsed = quotaInfo.value.usedQuota;
  const categories = [
    { label: '图片', key: 'image', size: quotaInfo.value.usageDetails.image, color: '#409EFF' },
    { label: '文档', key: 'document', size: quotaInfo.value.usageDetails.document, color: '#67C23A' },
    { label: '视频', key: 'video', size: quotaInfo.value.usageDetails.video, color: '#E6A23C' },
    { label: '音频', key: 'audio', size: quotaInfo.value.usageDetails.audio, color: '#9B59B6' },
    { label: '压缩文件', key: 'archive', size: quotaInfo.value.usageDetails.archive, color: '#F56C6C' },
    { label: '其他', key: 'other', size: quotaInfo.value.usageDetails.other, color: '#B0B0B0' },
  ];
  
  // ★★★ 核心改动：移除了 .filter() ★★★
  return categories.map(item => {
    let percentage = 0;
    if (totalUsed > 0 && item.size > 0) {
      percentage = (item.size / totalUsed) * 100;
    }
    return { ...item, percentage, percentageString: `(${(percentage).toFixed(1)}%)` };
  });
});

// ★★★ SVG 相关计算属性 (全新逻辑) ★★★
const svgSize = 200;
const strokeWidth = 15;
const center = svgSize / 2;
const radius = center - strokeWidth / 2;
const circumference = 2 * Math.PI * radius;

// ★★★ 核心：计算每个颜色段的样式 ★★★
const progressSegments = computed(() => {
  const segments = [];
  let accumulatedPercentage = 0;

  usageDetails.value.forEach(item => {
    if (item.size > 0) {
      // 占总空间的百分比
      const percentageOfTotal = (item.size / quotaInfo.value.totalQuota) * 100;
      
      const dash = (percentageOfTotal / 100) * circumference;
      const rotation = accumulatedPercentage * 3.6; // 1% = 3.6 degrees

      segments.push({
        key: item.key,
        color: item.color,
        style: {
          strokeDasharray: `${dash} ${circumference}`,
          transform: `rotate(${rotation}deg)`,
        }
      });

      accumulatedPercentage += percentageOfTotal;
    }
  });

  return segments;
});

const fetchQuotaInfo = async () => {
  loading.value = true;
  try {
    const res = await api.getQuotaInfo();
    if(res.data.success) {
      quotaInfo.value = res.data;
    }
  } catch (error) {
    ElMessage.error('获取空间信息失败');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchQuotaInfo);

const formatFileSize = (size) => {
  if (size === null || size === undefined) return '';
  // ★★★ 修正为0时的显示 ★★★
  if (size === 0) return '0';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  // 增加对 size < 1 的处理
  if (size < 1) return (size * k).toFixed(0) + ' ' + 'Bytes';
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.quota-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}
.quota-header {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 40px;
}

/* ★★★ 新增/修改样式 ★★★ */
.colorful-progress-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  margin-bottom: 20px;
}
.colorful-progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.progress-segment {
  transform-origin: center;
  transition: stroke-dasharray 0.6s ease;
}
.progress-text-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.percentage-value {
  display: block;
  font-size: 36px;
  font-weight: bold;
}
.percentage-label {
  display: block;
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}
/* (其余样式保持不变) */
.quota-text { font-size: 16px; color: #606266; margin-bottom: 40px; }
.usage-details { width: 100%; max-width: 400px; border-top: 1px solid #e4e7ed; padding-top: 20px; }
.usage-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 14px; }
.item-color-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
.item-label { color: #606266; }
.item-percentage { color: #909399; font-size: 12px; margin-left: 8px; }
.item-size { margin-left: auto; color: #303133; font-weight: 500; }
</style>