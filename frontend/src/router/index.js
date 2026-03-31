// src/router/index.js (最终嵌套路由版)

import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import PublicShare from '../views/PublicShare.vue';
import MyFiles from '../views/MyFiles.vue';
import MyShares from '../views/MyShares.vue';
import RecycleBin from '../views/RecycleBin.vue';
import MyQuota from '../views/MyQuota.vue';
import Transfers from '../views/Transfers.vue'; 

const routes = [
  { path: '/', name: 'Login', component: Login, meta: { title: '登录 - 银杏网盘' } },
  {
    path: '/dashboard',
    component: Dashboard,
    children: [
      {
        path: '', // 默认重定向到文件视图
        redirect: '/dashboard/files',
      },
      {
        path: 'files/:folderId?', // 支持文件夹ID
        name: 'MyFiles',
        component: MyFiles,
        meta: { requiresAuth: true, title: '全部文件 - 银杏网盘' },
        props: true 
      },
      {
        path: 'my-shares',
        name: 'MyShares',
        component: MyShares,
        meta: { requiresAuth: true, title: '我的分享 - 银杏网盘' }
      },
      {
        path: 'recycle-bin',
        name: 'RecycleBin',
        component: RecycleBin,
        meta: { requiresAuth: true, title: '回收站 - 银杏网盘' }
      },
      {
        path: 'transfers',
        name: 'Transfers',
        component: Transfers,
        meta: { requiresAuth: true, title: '传输列表 - 银杏网盘' }
      },
      {
        path: 'quota',
        name: 'MyQuota',
        component: MyQuota,
        meta: { requiresAuth: true, title: '我的空间 - 银杏网盘' }
      }
    ]
  },
  { path: '/share/:shareId', name: 'PublicShare', component: PublicShare, meta: { title: '文件分享 - 银杏网盘' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token');
  if (to.meta.title) { document.title = to.meta.title; }
  if (to.meta.requiresAuth) {
    if (!token) { next({ name: 'Login' }); } 
    else { next(); }
  } else {
    if (to.name === 'Login' && token) { next({ name: 'Dashboard' }); } 
    else { next(); }
  }
});

export default router;