import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import path from 'path'

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Check if HTTPS is enabled via environment variable
  const HTTPS_ENABLED = env.VITE_HTTPS_ENABLED === 'true';
  
  return {
    base: '/app/',
    appType: 'spa',
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    build: {
      outDir: 'docs/app',
      emptyOutDir: true, // Svuota la directory prima del build
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // Keep React core packages together (react, react-dom, react-router)
              // to avoid initialization issues with React internals like 'Activity'
              if (
                id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') || 
                id.includes('node_modules/react-router')
              ) {
                return 'react-vendor';
              }
              // Keep i18n packages together (i18next and react-i18next)
              if (
                id.includes('node_modules/i18next') || 
                id.includes('node_modules/react-i18next')
              ) {
                return 'i18n-vendor';
              }
              // Don't create a separate vendor chunk to avoid circular dependencies
              // Other node_modules will be included in the main bundle or page chunks
              return null;
            }
            // Page chunks - split by pages directory
            if (id.includes('/pages/')) {
              const pageName = id.split('/pages/')[1]?.split('/')[0];
              if (pageName) {
                return `page-${pageName}`;
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
      // Improve compatibility with CommonJS modules
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    server: {
      ...(HTTPS_ENABLED && {
        https: {
          key: readFileSync(path.resolve(__dirname, 'certs/key.pem')),
          cert: readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
        },
      }),
      port: 5173,
    },
  }
})
