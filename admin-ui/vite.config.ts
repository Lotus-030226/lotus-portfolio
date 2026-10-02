import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'/studio/',server:{port:3101,proxy:{'/api':'http://127.0.0.1:8100'}},build:{outDir:'dist'}});
