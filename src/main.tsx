import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import './styles.css';

// Monaco 在销毁编辑器 / 取消异步任务时会抛出名为 Canceled 的 Promise 拒绝，属于正常现象，不必报错
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason as { name?: string; message?: string } | undefined;
  if (r?.name === 'Canceled' || r?.message === 'Canceled') e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
