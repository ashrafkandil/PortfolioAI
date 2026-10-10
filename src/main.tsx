import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// The page itself never scrolls, so there is nothing meaningful for the browser
// to restore — and left on its own it re-applies the old offset to the inner
// scroll region after the app has already reset it to the top of the view.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
