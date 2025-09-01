import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', 
  server: {
    host: true,     
    port: 5173,
    allowedHosts: true // permite cualquier host (incluye subdominios ngrok)
    // Si prefieres restringir explícitamente usa, por ejemplo:
    // allowedHosts: ['localhost', '.ngrok-free.app']
  }
});
