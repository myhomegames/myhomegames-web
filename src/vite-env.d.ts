/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_API_TOKEN?: string;
  readonly VITE_TUNNEL_MANAGER_URL?: string;
  readonly VITE_CLOUDFLARE_TUNNEL_ENABLED?: string;
  readonly VITE_GITHUB_REPO?: string;
  readonly VITE_HTTPS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css?raw" {
  const content: string;
  export default content;
}

declare module "virtual:tailwind-entry.css";

