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
          // 把前端的 /api/v3/chat/completions 代理到真实模型服务，解决 404 和浏览器直连跨域问题
          '/api': {
            target: env.API_BASE_URL || 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: true,
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
