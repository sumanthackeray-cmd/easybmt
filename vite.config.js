import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    logLevel: 'warn',
    resolve: {
        alias: {
            "@": fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    plugins: [
        react(),
    ],
    server: {
        port: 5173,
        strictPort: false,
        host: '0.0.0.0',
        middlewareMode: false
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false,
                drop_debugger: true,
            },
        }
    }
});
