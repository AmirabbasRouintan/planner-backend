import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import iconUrl from '@/assets/icon.gif'

document.documentElement.classList.add('dark')

// Ensure favicon uses bundled GIF in both dev and production
;(() => {
  const setFavicon = (href: string, type = 'image/gif') => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = type;
    link.href = href;
  };
  try {
    setFavicon(iconUrl);
  } catch {
    setFavicon('/icon.gif');
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)