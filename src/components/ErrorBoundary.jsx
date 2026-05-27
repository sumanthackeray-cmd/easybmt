// src/components/ErrorBoundary.jsx
// Reusable React Error Boundary
// EasyBMT SaaS Platform
//
// Props:
//   children        — React subtree to protect
//   fallback        — Optional custom fallback element
//   onError         — Optional callback(error, errorInfo)
//   resetOnNavigate — If true, auto-reset when location changes (default: true)
//   silent          — If true, no fallback UI; errors are swallowed (use for non-critical widgets)

import React from 'react';
import { errorLogger } from '@/lib/errorLogger';

// ── Minimal inline fallback (intentionally no imports — avoids cascading failures) ──

const DefaultFallback = ({ error, resetError, compact }) => {
  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'rgba(255,68,68,0.08)',
          border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: '8px',
          color: '#ff8888',
          fontSize: '13px',
          fontFamily: 'system-ui,sans-serif',
        }}
      >
        <span>⚠️</span>
        <span>Component error</span>
        <button
          onClick={resetError}
          style={{
            marginLeft: '8px',
            padding: '2px 10px',
            background: 'rgba(255,136,0,0.2)',
            border: '1px solid rgba(255,136,0,0.4)',
            borderRadius: '4px',
            color: '#ffaa44',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        minHeight: '200px',
        background: 'rgba(255,68,68,0.04)',
        border: '1px solid rgba(255,68,68,0.15)',
        borderRadius: '12px',
        fontFamily: 'system-ui,sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <h3 style={{ color: '#ffaa44', margin: '0 0 8px', fontSize: '16px' }}>
        Something went wrong
      </h3>
      <p style={{ color: '#888', margin: '0 0 20px', fontSize: '13px', maxWidth: '340px' }}>
        {error?.message || 'An unexpected error occurred in this section.'}
      </p>
      <button
        onClick={resetError}
        style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, #ff8800, #ff4400)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Try Again
      </button>
    </div>
  );
};

// ── Error Boundary class component ─────────────────────────────────────────

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
    this._resetError = this._resetError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorId: Date.now() };
  }

  componentDidCatch(error, errorInfo) {
    const { category = 'ReactTree', onError } = this.props;

    errorLogger.captureError(category, error, {
      componentStack: errorInfo?.componentStack?.slice(0, 600),
    });

    if (typeof onError === 'function') {
      try {
        onError(error, errorInfo);
      } catch { /* swallow callback error */ }
    }
  }

  _resetError() {
    this.setState({ hasError: false, error: null, errorId: null });
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, silent, compact } = this.props;

    if (!hasError) return children;

    // Silent mode — render nothing (for non-critical widgets)
    if (silent) return null;

    // Custom fallback
    if (fallback) {
      return typeof fallback === 'function'
        ? fallback({ error, reset: this._resetError })
        : fallback;
    }

    return (
      <DefaultFallback
        error={error}
        resetError={this._resetError}
        compact={compact}
      />
    );
  }
}

// ── Navigation-aware wrapper (functional, uses hooks) ──────────────────────

// We use a key trick: when the route changes, force-remount the boundary
// by changing its key — which resets its error state automatically.

let _useLocation;
try {
  // Dynamic import to avoid hard dependency in non-router contexts
  ({ useLocation: _useLocation } = require('react-router-dom'));
} catch {
  _useLocation = null;
}

export function ErrorBoundary({
  children,
  fallback,
  onError,
  resetOnNavigate = true,
  silent = false,
  compact = false,
  category = 'ReactTree',
}) {
  // If react-router-dom is available and resetOnNavigate is true,
  // key the boundary on the current pathname so it auto-resets on nav.
  let locationKey = 'static';
  if (resetOnNavigate && _useLocation) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const loc = _useLocation();
      locationKey = loc.pathname;
    } catch { /* not in router context */ }
  }

  return (
    <ErrorBoundaryInner
      key={locationKey}
      fallback={fallback}
      onError={onError}
      silent={silent}
      compact={compact}
      category={category}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

export default ErrorBoundary;
