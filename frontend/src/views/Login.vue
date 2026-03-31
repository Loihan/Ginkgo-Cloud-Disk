<!-- src/views/Login.vue (最终修正版) -->
<template>
  <div class="login-container animated-gradient-background">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <img src="@/assets/logo.png" alt="Logo" class="logo" />
          <h1>银杏网盘</h1>
        </div>
      </template>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" @keyup.enter="handleLogin">
            <el-form-item prop="email">
              <el-input v-model="loginForm.email" placeholder="邮箱" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" @click="handleLogin" :loading="loading" round>
                登 录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" @keyup.enter="handleRegister">
            <el-form-item prop="name">
              <el-input v-model="registerForm.name" placeholder="用户名" :prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="registerForm.email" placeholder="邮箱" :prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="密码" show-password :prefix-icon="Lock" />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="确认密码" show-password :prefix-icon="Lock" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" @click="handleRegister" :loading="loading" round>
                注 册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, Message } from '@element-plus/icons-vue';
import api from '@/api';
import { useTransferStore } from '@/stores/transferStore';

const router = useRouter();
const transferStore = useTransferStore();
const activeTab = ref('login');
const loading = ref(false);

const loginFormRef = ref(null);
const loginForm = ref({ email: '', password: '' });
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const response = await api.login(loginForm.value);
        if (response.data.success) {
          sessionStorage.setItem('token', response.data.token);
          sessionStorage.setItem('userId', response.data.id);
          sessionStorage.setItem('userName', response.data.name);
          sessionStorage.setItem('avatar', response.data.avatar || '');
          transferStore.loadUserHistory();
          ElMessage.success('登录成功！');
          router.push('/dashboard');
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || '登录失败，请检查您的凭证';
        ElMessage.error(errorMsg);
      } finally {
        loading.value = false;
      }
    }
  });
};
const validatePasswordStrength = (rule, value, callback) => {
  // 正则表达式：必须包含至少一个大写字母、一个小写字母和一个数字
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  if (!value) {
    callback(new Error('请输入密码'));
  } else if (value.length < 8) {
    callback(new Error('密码长度不能少于8位'));
  } else if (!regex.test(value)) {
    callback(new Error('密码必须包含大小写字母和数字'));
  } else {
    callback();
  }
};

const registerFormRef = ref(null);
const registerForm = ref({ name: '', email: '', password: '', confirmPassword: '' });
const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.value.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};
const registerRules = {
  name: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  // ★★★ 2. 将新的校验规则应用到 password 字段 ★★★
  password: [
    { required: true, validator: validatePasswordStrength, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
};

const handleRegister = async () => {
  if (!registerFormRef.value) return;
  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const response = await api.register({
          name: registerForm.value.name,
          email: registerForm.value.email,
          password: registerForm.value.password,
        });
        if (response.data.success) {
          ElMessage.success('注册成功！将自动切换到登录。');
          activeTab.value = 'login';
          loginForm.value.email = registerForm.value.email;
          loginForm.value.password = '';
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || '注册失败，请稍后重试';
        ElMessage.error(errorMsg);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.login-container {
  overflow: hidden;
}

.login-card {
  width: 400px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.logo {
  width: 65px;
  height: 65px;
}

.card-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

:deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(255, 255, 255, 0.2);
}
:deep(.el-tabs__item) {
  color: #555;
  font-size: 16px;
}
:deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: bold;
}
:deep(.el-tabs__active-bar) {
  height: 3px;
}
:deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.4) !important;
  border-radius: 20px !important;
  box-shadow: none !important;
  border: 1px solid transparent;
}
:deep(.el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.5);
}
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--el-color-primary);
}
</style>