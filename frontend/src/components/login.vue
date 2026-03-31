<template>
  <div class="login-container">
    <el-form :model="loginForm" @submit.prevent="handleLogin">
      <el-form-item label="邮箱">
        <el-input v-model="loginForm.email" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="loginForm.password" type="password" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const loginForm = ref({
  email: '',
  password: ''
});

const handleLogin = async () => {
  try {
    const response = await axios.post('/api/login', loginForm.value);
    if (response.data.success) {
      // 保存用户信息到 localStorage
      localStorage.setItem('userId', response.data.id);
      localStorage.setItem('userName', response.data.name);
      localStorage.setItem('token', response.data.token);
      // 致命修复：添加路由守卫需要的 isLoggedin 标志
      localStorage.setItem('isLoggedIn', 'true');
      // 跳转到用户界面
      router.push('/dashboard');
    } else {
      alert(response.data.message);
    }
  } catch (error) {
    // 在这里，我们提前处理服务器返回的 401 错误
    if (error.response && error.response.status === 401) {
      // 如果服务器返回的状态码是 401
      this.errorMsg = '邮箱或密码错误';
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
    } else {
      // 如果是其他类型的错误，让全局拦截器去处理
      this.errorMsg = '登录失败，请重试';
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
      console.error('登录失败:', error);
  }
};
</script>

<style scoped>
.login-container {
  max-width: 300px;
  margin: 100px auto;
}
</style>
