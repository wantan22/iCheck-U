import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build modes:
//   default   — web app / PWA (dist/)
//   artifact  — self-contained claude.ai Artifact page (dist-artifact/, see scripts/pack-artifact.mjs)
//   mobile    — Android app via Capacitor (dist-mobile/, then `npx cap sync android`)
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173 },
  base: mode === 'artifact' || mode === 'mobile' ? './' : '/',
  build:
    mode === 'artifact' ? { outDir: 'dist-artifact', cssCodeSplit: false, assetsInlineLimit: 100000000 }
      : mode === 'mobile' ? { outDir: 'dist-mobile' }
        : {},
}));
