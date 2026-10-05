import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { designTokens } from './tooling/design-tokens.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), designTokens()],
  resolve: {
    // Single source of truth for the `@/` alias: `paths` in tsconfig.app.json.
    tsconfigPaths: true,
  },
  build: {
    // Budget sized to the three.js vendor chunk (~737 kB minified), which is
    // retained whole because <Canvas> registers the full THREE namespace, and is
    // loaded lazily behind the document shell. Anything larger warrants review.
    chunkSizeWarningLimit: 760,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks. Their hashes change only when the pinned
        // versions do, so app releases don't invalidate them in browser caches.
        codeSplitting: {
          groups: [
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 20 },
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
