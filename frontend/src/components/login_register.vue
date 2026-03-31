<template>
  <div class="app-container">
    <div class="card-container">
      <div class="card welcome-card" v-if="isShow === 'welcome'">
        <div class="card-header">
          <h1 class="card-title">
            <i class="fa fa-cloud" aria-hidden="true"></i> 银杏网盘
          </h1>
        </div>
        <div class="error-message" v-if="errorMsg">{{ errorMsg }}</div>
        <div class="button-group">
          <button
            class="btn register-btn"
            @click="switchCard('register')"
            :class="{ 'active-btn': isShow === 'register' }"
          >
            注册
          </button>
          <button
            class="btn login-btn"
            @click="switchCard('login')"
            :class="{ 'active-btn': isShow === 'login' }"
          >
            登录
          </button>
        </div>
      </div>
      <div class="card register-card" v-if="isShow === 'register'">
        <div class="card-header">
          <h1 class="card-title">用户注册</h1>
        </div>
        <div class="error-message" v-if="errorMsg">{{ errorMsg }}</div>
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="userName">用户名：</label>
            <input
              id="userName"
              class="form-control"
              v-model="registerForm.userName"
              type="text"
              placeholder="请输入用户名"
              required
              autocomplete="off"
            />
          </div>
          <div class="form-group">
            <label for="email">邮箱：</label>
            <input
              id="email"
              class="form-control"
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱"
              required
              autocomplete="off"
            />
          </div>
          <div class="form-group password-group">
            <label for="password">密码：</label>
            <div class="password-input">
              <input
                id="password"
                class="form-control"
                v-model="registerForm.password"
                :type="passwordVisible ? 'text' : 'password'"
                placeholder="请输入密码"
                required
                autocomplete="off"
              />
              <button
                type="button"
                class="password-toggle"
                @click="passwordVisible = !passwordVisible"
              >
                {{ passwordVisible ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <div class="form-group password-group">
            <label for="confirmPassword">确认密码：</label>
            <div class="password-input">
              <input
                id="confirmPassword"
                class="form-control"
                v-model="registerForm.confirmPassword"
                :type="confirmPasswordVisible ? 'text' : 'password'"
                placeholder="请再次输入密码"
                required
                autocomplete="off"
              />
              <button
                type="button"
                class="password-toggle"
                @click="confirmPasswordVisible = !confirmPasswordVisible"
              >
                {{ confirmPasswordVisible ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <button class="btn register-btn" type="submit">注册</button>
        </form>
        <button class="btn back-btn" @click="switchCard('welcome')">返回</button>
      </div>
      <div class="card login-card" v-if="isShow === 'login'">
        <div class="card-header">
          <h1 class="card-title">用户登录</h1>
        </div>
        <div class="error-message" v-if="errorMsg">{{ errorMsg }}</div>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="loginEmail">邮箱：</label>
            <input
              id="loginEmail"
              class="form-control"
              v-model="loginForm.email"
              type="email"
              placeholder="请输入邮箱"
              required
              autocomplete="off"
            />
          </div>
          <div class="form-group password-group">
            <label for="loginPassword">密码：</label>
            <div class="password-input">
              <input
                id="loginPassword"
                class="form-control"
                v-model="loginForm.password"
                :type="loginPasswordVisible ? 'text' : 'password'"
                placeholder="请输入密码"
                required
                autocomplete="off"
              />
              <button
                type="button"
                class="password-toggle"
                @click="loginPasswordVisible = !loginPasswordVisible"
              >
                {{ loginPasswordVisible ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <button class="btn login-btn" type="submit">登录</button>
        </form>
        <button class="btn back-btn" @click="switchCard('welcome')">返回</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

// 替换为你的后端服务器局域网 IP 地址和端口号
const baseURL = '/api'; 

export default {
  data() {
    return {
      isShow: "welcome",
      errorMsg: "",
      registerForm: {
        userName: "",
        email: "",
        password: "",
        confirmPassword: ""
      },
      loginForm: {
        email: "",
        password: ""
      },
      passwordVisible: false,
      confirmPasswordVisible: false,
      loginPasswordVisible: false
    };
  },
  methods: {
    switchCard(next) {
      this.isShow = next;
      document.body.className = "";
      document.body.classList.add("is-" + next);
    },
    async handleRegister() {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/;
      if (!passwordRegex.test(this.registerForm.password)) {
        this.errorMsg = '密码必须包含大小写字母与数字，不含特殊字符，长度在 8 到 20 位';
        setTimeout(() => {
          this.errorMsg = "";
        }, 5000);
        return;
      }

      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.errorMsg = '两次密码不一样';
        setTimeout(() => {
          this.errorMsg = "";
        }, 5000);
        return;
      }

      try {
         // 修改为新的基础地址
        const checkResponse = await axios.get(`${baseURL}/checkEmail?email=${this.registerForm.email}`);
        if (checkResponse.data.exists) {
          this.errorMsg = '此邮箱已注册';
          setTimeout(() => {
            this.errorMsg = "";
          }, 5000);
          return;
        }

        // 修改为新的基础地址
        const response = await axios.post(`${baseURL}/register`, {
          name: this.registerForm.userName,
          email: this.registerForm.email,
          password: this.registerForm.password
        });
        if (response.data.success) {
          this.registerForm = {
            userName: "",
            email: "",
            password: "",
            confirmPassword: ""
          };
          this.passwordVisible = false;
          this.confirmPasswordVisible = false;
          this.errorMsg = '注册成功';
          setTimeout(() => {
            this.errorMsg = "";
          }, 5000);
          this.switchCard('welcome');
        } else {
          this.errorMsg = response.data.message;
          setTimeout(() => {
            this.errorMsg = "";
          }, 5000);
        }
      } catch (error) {
        console.error(error);
        this.errorMsg = '注册失败，请重试';
        setTimeout(() => {
          this.errorMsg = "";
        }, 5000);
      }
    },
    async handleLogin() {
  try {
    const response = await axios.post(`/api/login`, {
      email: this.loginForm.email,
      password: this.loginForm.password
    });

    if (response.data.success) {
      localStorage.setItem('userId', response.data.id);
      localStorage.setItem('userName', response.data.name);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isLoggedIn', 'true');
      this.$router.push('/dashboard');
    } else {
      this.errorMsg = response.data.message;
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      this.errorMsg = '邮箱或密码错误';
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
    } else {
      this.errorMsg = '登录失败，请重试';
      setTimeout(() => {
        this.errorMsg = "";
      }, 5000);
      console.error('登录失败:', error);
    }
  }
},
  }
};
</script>

<style scoped>
/* 全局样式 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(
    -45deg,
    #ff6b6b,
    #556270,
    #4ecdc4,
    #c7f464
  );
  background-size: 400% 400%;
  animation: gradientAnimation 15s ease infinite;
  overflow: hidden;
}

@keyframes gradientAnimation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.card-container {
  position: relative;
  width: 400px;
  max-width: 90%;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  padding: 3rem;
  text-align: center;
  transition: all 0.3s ease;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  margin-bottom: 2rem;
}

.card-title {
  color: #ffffff;
  font-size: 2.8rem;
  font-weight: 600;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title i {
  color: #ffffff;
  font-size: 3rem;
  margin-right: 1rem;
}

.error-message {
  color: #ff4444;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  padding: 0.8rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8px;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.btn {
  padding: 1.2rem;
  border: none;
  border-radius: 30px;
  font-size: 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
}

.register-btn {
  background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
  color: white;
}

.register-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 107, 107, 0.3);
}

.login-btn {
  background: linear-gradient(45deg, #4ecdc4, #66e0d8);
  color: white;
}

.login-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(78, 205, 196, 0.3);
}

.active-btn {
  transform: scale(1.05);
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #ffffff;
}

.back-btn {
  background: linear-gradient(45deg, #556270, #738295);
  color: white;
  margin-top: 1.5rem;
}

.back-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(85, 98, 112, 0.3);
}
.password-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
}

.password-toggle:hover {
  text-decoration: underline;
}
</style>
