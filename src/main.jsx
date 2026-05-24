// Prevent React DOM crashes from browser extensions / Google Translate
if (typeof window !== 'undefined') {
  const nativeRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child?.parentNode !== this) return child;
    return nativeRemoveChild.apply(this, arguments);
  };

  const nativeInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (newNode?.parentNode === this && referenceNode === newNode) return newNode;
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return nativeInsertBefore.apply(this, arguments);
  };

  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      return;
    }
    console.error('[EasyBMT] Uncaught error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[EasyBMT] Unhandled promise rejection:', event.reason);
  });
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

console.log('[v0] Loading app...');

const rootElement = document.getElementById('root');
console.log('[v0] Root element found:', rootElement);

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(<App />);
    console.log('[v0] App rendered successfully');
  } catch (err) {
    console.error('[v0] Render error:', err);
    rootElement.innerHTML = '<div style="padding: 20px; color: red;"><h2>App Failed to Load</h2><p>' + err.message + '</p></div>';
  }
} else {
  console.error('[v0] Root element not found!');
}
