
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0', // 允许局域网访问，方便手机测试
    hmr: {
      host: 'localhost' // HMR 使用 localhost
    }
  }
});
