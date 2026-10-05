import '@fontsource-variable/ibm-plex-sans/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import 'virtual:design-tokens.css';
import '@/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { boot } from '@/app/boot';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Mount element #root is missing from index.html.');
}

boot();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
