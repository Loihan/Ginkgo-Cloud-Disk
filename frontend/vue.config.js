// vue.config.js

console.log("--- vue.config.js has been loaded! ---");

const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  
  // ★★★ 使用 chainWebpack 进行底层配置 ★★★
  chainWebpack: config => {
    // 只有在开发模式下才应用此配置
    if (process.env.NODE_ENV === 'development') {
      config
        .entry('app') // 找到主入口点
        .prepend('webpack-dev-server/client/index.js?protocol=ws&hostname=134.175.188.172&port=8081&pathname=/ws&overlay=false'); // 强制用我们的配置覆盖默认的客户端脚本
    }
  },

  devServer: {
    host: '0.0.0.0',
    port: 8081,
    // 我们依然保留 client 部分，以防万一，但 chainWebpack 的优先级更高
    client: {
      // 注意：这里的 overlay 设置现在是次要的了
      overlay: false,
      // webSocketURL 也不再需要，因为它已经在上面的 chainWebpack 中定义了
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  },
});