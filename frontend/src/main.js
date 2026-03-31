// src/main.js

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { setupInterceptors } from './api'; // 注意这里导入的是 setupInterceptors 函数
import { createPinia } from 'pinia'; 

// ★★★ 关键改动 ★★★
// 调用该函数，并将 router 实例传递进去，以设置全局拦截器
setupInterceptors(router);

const app = createApp(App);
const pinia = createPinia();

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(router);
app.use(pinia); 
app.use(ElementPlus);
app.mount('#app');