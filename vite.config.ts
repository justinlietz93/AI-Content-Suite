import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const defaultApiKey = env.AI_CONTENT_SUITE_DEFAULT_API_KEY ?? env.API_KEY ?? '';
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(defaultApiKey),
        'process.env.AI_CONTENT_SUITE_DEFAULT_API_KEY': JSON.stringify(defaultApiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
