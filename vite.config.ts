import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// Read package.json to get version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Plugin to generate 404.html for GitHub Pages SPA routing
const githubPages404Plugin = () => {
  return {
    name: 'github-pages-404',
    closeBundle() {
      // After build, copy index.html to 404.html in the docs root
      // This allows GitHub Pages to serve the SPA for all routes
      const indexPath = path.resolve(__dirname, 'docs/app/index.html')
      const notFoundPath = path.resolve(__dirname, 'docs/404.html')
      
      try {
        // Read the built index.html
        let indexContent = readFileSync(indexPath, 'utf-8')
        
        // Add a script before closing body tag to handle SPA routing
        // This script redirects to /app/ with the current path preserved
        const redirectScript = `
  <script>
    // GitHub Pages 404 redirect for SPA routing
    (function() {
      var path = window.location.pathname;
      // If we're not already at /app/, redirect to /app/ with the path
      if (!path.startsWith('/app/')) {
        // Extract the path after the domain
        var redirectPath = '/app/' + path.replace(/^\\//, '').replace(/^app\\//, '');
        // Preserve query string and hash
        var query = window.location.search;
        var hash = window.location.hash;
        window.location.replace(redirectPath + query + hash);
      }
    })();
  </script>`
        
        // Insert the script before the closing </body> tag
        indexContent = indexContent.replace('</body>', redirectScript + '\n</body>')
        
        // Write the modified content to 404.html
        writeFileSync(notFoundPath, indexContent, 'utf-8')
        console.log('✓ Generated 404.html for GitHub Pages SPA routing')
      } catch (error) {
        console.error('Error generating 404.html:', error)
      }
    },
  }
}

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
    plugins: [react(), githubPages404Plugin()],
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
