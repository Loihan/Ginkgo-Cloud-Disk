<!-- src/App.vue -->
<template>
  <div id="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useTransferStore } from '@/stores/transferStore';

const transferStore = useTransferStore();

// ★★★ 核心改动：应用加载时，尝试加载用户历史 ★★★
onMounted(() => {
  transferStore.loadUserHistory();
});
</script>

<style>
/* 全局样式 */
html,
body,
#app,
#app-container {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ★★★ 更淡雅、更缓慢的动态渐变背景 ★★★ */
.animated-gradient-background {
  background: linear-gradient(-45deg, #a8edea, #fed6e3, #8BC6EC, #9599E2);
  background-size: 400% 400%;
  animation: gradient 20s ease infinite; /* 动画时间延长到20秒 */
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}

@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>