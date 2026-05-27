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
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.jsx'
import '@/index.css'
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/LanguageContext"
import { db } from '@/api/firebase'
import { initializeBranchService } from '@/api/branchService'
import { initializeInventorySyncService } from '@/api/inventorySyncService'
import { initializeAuditLogging } from '@/api/auditLogging'
import { errorLogger } from '@/lib/errorLogger'

// ── Global error capture (connects to structured logger) ──────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver')) {
      event.stopImmediatePropagation();
      return;
    }
    errorLogger.captureError('GlobalError', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Suppress benign Firebase auth promise cancellations
    const reason = event.reason;
    if (reason?.code === 'auth/popup-closed-by-user') return;
    errorLogger.captureError('UnhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  });
}

// ── Service initialisation ─────────────────────────────────────────────────
try {
  initializeBranchService(db);
  initializeInventorySyncService(db);
  initializeAuditLogging(db);
} catch (e) {
  errorLogger.captureError('ServiceInit', e);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// ── Root Error Boundary (catches entire React tree) ───────────────────────
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this._copyReport = this._copyReport.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    errorLogger.captureError('RootBoundary', error, {
      componentStack: errorInfo?.componentStack?.slice(0, 800),
    });
  }

  _copyReport() {
    try {
      const report = errorLogger.generateReport();
      navigator.clipboard?.writeText(report).then(() => {
        alert('Error report copied to clipboard. Please send to support.');
      }).catch(() => {
        prompt('Copy this report:', report);
      });
    } catch { /* silent */ }
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div style={{ padding: '24px', background: '#0f0f1a', color: '#ff4444', fontFamily: 'system-ui,sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ color: '#ff8800', marginTop: 0, fontSize: '20px' }}>EasyBMT encountered an error</h2>
          <p style={{ color: '#aaa', maxWidth: '420px', textAlign: 'center', margin: 0 }}>{err?.message || 'An unexpected error occurred.'}</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: '10px 24px', background: '#ff8800', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              Reload App
            </button>
            <button
              type="button"
              onClick={this._copyReport}
              style={{ padding: '10px 24px', background: 'rgba(255,136,0,0.15)', color: '#ff8800', border: '1px solid rgba(255,136,0,0.4)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
            >
              Copy Error Report
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </RootErrorBoundary>
)

