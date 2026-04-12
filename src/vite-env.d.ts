/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "*.css?raw" {
  const content: string;
  export default content;
}

