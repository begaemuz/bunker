import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Ошибки вне React тоже показываем, чтобы не было пустого экрана.
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root && !root.textContent) root.innerHTML = `<div style="color:#ff8a7a;padding:24px;font:14px system-ui">Ошибка запуска: ${String(e.message)}</div>`;
});
