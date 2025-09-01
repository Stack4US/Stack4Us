import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // 👈 asegura que en producción los assets se carguen desde la raíz
  server: {
    host: true,     // escucha en 0.0.0.0 para acceder desde la red / ngrok
    port: 5173,
    allowedHosts: true // permite cualquier host (incluye subdominios ngrok)
    // Si prefieres restringir explícitamente usa, por ejemplo:
    // allowedHosts: ['localhost', '.ngrok-free.app']
  }
});
