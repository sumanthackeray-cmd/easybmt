import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'
import '@/index.css'

// Define window.Capacitor.isNative globally to support legacy checks across the app using robust getter/setter interceptor
if (typeof window !== 'undefined') {
  let capVal = window.Capacitor || {};
  try {
    capVal.isNative = Capacitor.isNativePlatform();
  } catch (_) {}
  
  try {
    Object.defineProperty(window, 'Capacitor', {
      get() {
        if (capVal && capVal.isNative === undefined) {
          try {
            capVal.isNative = Capacitor.isNativePlatform();
          } catch (_) {}
        }
        return capVal;
      },
      set(newVal) {
        capVal = newVal || {};
        try {
          capVal.isNative = Capacitor.isNativePlatform();
        } catch (_) {}
      },
      configurable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn("Failed to define Capacitor global interceptor (property is likely read-only):", err);
  }
}

const fallbackLogger = {
  captureError: (scope, error, extra = null) => {
    console.error(`[${scope}]`, error, extra || '');
  },
  generateReport: () => 'Error report unavailable in fallback logger.',
};

let errorLogger = fallbackLogger;

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
    const message = String(reason?.message || reason || '');
    // Recover once from stale chunk/service-worker cache mismatches after deployment.
    if (
      import.meta.env.PROD &&
      (message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('Loading chunk'))
    ) {
      const key = '__easybmt_chunk_recover_once';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
    }
    errorLogger.captureError('UnhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  try {
    registerSW({ immediate: true });
  } catch (e) {
    errorLogger.captureError('ServiceWorkerRegister', e);
  }
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

const renderBootError = (error, mountNode) => {
  if (!mountNode) return;
  mountNode.innerHTML = `
    <div style="padding:24px;background:#0f0f1a;color:#ff4444;font-family:system-ui,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
      <div style="font-size:40px;">Error</div>
      <h2 style="color:#ff8800;margin:0;">EasyBMT failed to start</h2>
      <p style="color:#aaa;max-width:520px;text-align:center;margin:0;">${String(error?.message || 'Unexpected startup error')}</p>
      <button onclick="window.location.reload()" style="padding:10px 24px;background:#ff8800;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Reload App</button>
    </div>
  `;
};

const bootstrap = async () => {
  const mountNode = document.getElementById('root');
  if (!mountNode) {
    throw new Error('Root element #root not found');
  }

  // Lazy-load app modules so any import-time production failure is catchable.
  const [
    { default: App },
    { ThemeProvider },
    { LanguageProvider },
    { db },
    { initializeBranchService },
    { initializeInventorySyncService },
    { initializeAuditLogging },
    loggerModule,
  ] = await Promise.all([
    import('@/App.jsx'),
    import('@/components/theme-provider'),
    import('@/lib/LanguageContext'),
    import('@/api/firebase'),
    import('@/api/branchService'),
    import('@/api/inventorySyncService'),
    import('@/api/auditLogging'),
    import('@/lib/errorLogger'),
  ]);

  errorLogger = loggerModule?.errorLogger || fallbackLogger;

  try {
    initializeBranchService(db);
    initializeInventorySyncService(db);
    initializeAuditLogging(db);
  } catch (e) {
    errorLogger.captureError('ServiceInit', e);
  }

  ReactDOM.createRoot(mountNode).render(
    <RootErrorBoundary>
      <ThemeProvider defaultTheme="light" enableSystem={false} storageKey="vite-ui-theme" attribute="class">
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  );
};

bootstrap().catch((error) => {
  errorLogger.captureError('Boot', error);
  renderBootError(error, document.getElementById('root'));
});

