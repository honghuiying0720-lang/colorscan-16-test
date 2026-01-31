import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/colorscan16test/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // 豆包 API 代理
          '/doubao-api': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/doubao-api/, ''),
          },
          // DeepSeek API 代理
          '/deepseek-api': {
            target: 'https://api.deepseek.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/deepseek-api/, ''),
          },
          // 飞书 API 代理
          '/feishu-api': {
            target: 'https://open.feishu.cn',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/feishu-api/, '/open-apis'),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
