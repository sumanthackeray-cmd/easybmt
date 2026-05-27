// src/lib/retryUtils.js
// Enterprise Async Retry Engine with Exponential Backoff + Jitter
// EasyBMT SaaS Platform
//
// Usage:
//   import { withRetry, withFirebaseRetry, withTimeout } from '@/lib/retryUtils';
//
//   const data = await withFirebaseRetry(() => getDocs(q));
//   const result = await withTimeout(fetchSomething(), 8000);

import { errorLogger } from './errorLogger';

// ── Firebase error code classification ────────────────────────────────────

/**
 * Errors that indicate a transient infrastructure problem — safe to retry.
 */
const RETRYABLE_FIREBASE_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
  'cancelled',
  'unknown',
  'aborted',
]);

/**
 * Errors that are permanent / business-logic — should NOT be retried.
 */
const PERMANENT_FIREBASE_CODES = new Set([
  'permission-denied',
  'unauthenticated',
  'not-found',
  'already-exists',
  'invalid-argument',
  'failed-precondition',
]);

/**
 * HTTP status codes in error messages that indicate conflict/dupe — no retry.
 */
const PERMANENT_HTTP_MESSAGES = ['409', '422', '403', '401'];

export function isRetryableError(err) {
  if (!err) return false;

  // Firebase SDK error code
  if (err.code && RETRYABLE_FIREBASE_CODES.has(err.code)) return true;
  if (err.code && PERMANENT_FIREBASE_CODES.has(err.code)) return false;

  // Our own business-logic errors (409 Conflict, 422 Unprocessable, etc.)
  const msg = String(err.message || '');
  if (PERMANENT_HTTP_MESSAGES.some(code => msg.startsWith(code) || msg.includes(` ${code} `))) {
    return false;
  }

  // Network errors — always retryable
  if (err instanceof TypeError && msg.toLowerCase().includes('fetch')) return true;
  if (msg.toLowerCase().includes('network')) return true;
  if (msg.toLowerCase().includes('timeout')) return true;

  // Default: retry on unknown errors
  return true;
}

// ── Core retry engine ──────────────────────────────────────────────────────

/**
 * Retry an async function with exponential backoff and jitter.
 *
 * @param {Function} fn         - Async function to retry: () => Promise<T>
 * @param {object}   options
 * @param {number}   options.maxAttempts  - Max retry attempts (default: 4)
 * @param {number}   options.baseDelayMs  - Base backoff delay in ms (default: 500)
 * @param {number}   options.maxDelayMs   - Cap on backoff delay (default: 30000)
 * @param {string}   options.category     - Log category for error logger
 * @param {string}   options.operation    - Human-readable op name for logs
 * @param {Function} options.shouldRetry  - Custom predicate (err) => boolean
 * @returns {Promise<T>}
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 30000,
    category = 'RetryEngine',
    operation = 'operation',
    shouldRetry = isRetryableError,
  } = options;

  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const retryable = shouldRetry(err);

      if (!retryable) {
        // Permanent error — propagate immediately without logging noise
        throw err;
      }

      if (attempt === maxAttempts) {
        errorLogger.error(category, `"${operation}" failed after ${maxAttempts} attempts`, {
          code: err?.code,
          message: err?.message,
        });
        throw err;
      }

      // Exponential backoff with full jitter
      const expDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = Math.random() * expDelay * 0.3;
      const delay = Math.round(expDelay + jitter);

      errorLogger.warn(category, `"${operation}" attempt ${attempt} failed — retrying in ${delay}ms`, {
        code: err?.code,
        message: err?.message,
      });

      await _sleep(delay);
    }
  }

  throw lastErr;
}

// ── Firebase-tuned convenience wrapper ─────────────────────────────────────

/**
 * Convenience wrapper pre-configured for Firestore operations.
 * 3 retries, 800ms base delay, 20s max delay.
 *
 * @param {Function} fn        - Async Firestore operation
 * @param {string}   operation - Human-readable name for logs
 * @returns {Promise<T>}
 */
export function withFirebaseRetry(fn, operation = 'Firebase op') {
  return withRetry(fn, {
    maxAttempts: 3,
    baseDelayMs: 800,
    maxDelayMs: 20000,
    category: 'Firebase',
    operation,
    shouldRetry: isRetryableError,
  });
}

// ── Timeout wrapper ────────────────────────────────────────────────────────

/**
 * Races a promise against a timeout. Throws if the timeout fires first.
 *
 * @param {Promise<T>|Function}  fnOrPromise  - Promise or factory () => Promise
 * @param {number}               ms           - Timeout in milliseconds
 * @param {string}               label        - Label for timeout error message
 * @returns {Promise<T>}
 */
export function withTimeout(fnOrPromise, ms = 10000, label = 'operation') {
  const promise = typeof fnOrPromise === 'function' ? fnOrPromise() : fnOrPromise;

  const timer = new Promise((_, reject) => {
    const handle = setTimeout(() => {
      reject(new Error(`Timeout: "${label}" exceeded ${ms}ms limit`));
    }, ms);
    // Ensure the timer doesn't keep the process alive in Node
    if (handle?.unref) handle.unref();
  });

  return Promise.race([promise, timer]);
}

// ── Safe async wrapper ─────────────────────────────────────────────────────

/**
 * Wraps an async function so it NEVER throws. Instead returns { data, error }.
 * Use for fire-and-forget background operations.
 *
 * @param {Function} fn
 * @param {string}   category - Log category
 * @returns {Promise<{ data: T|null, error: Error|null }>}
 */
export async function safeAsync(fn, category = 'SafeAsync') {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    errorLogger.captureError(category, err);
    return { data: null, error: err };
  }
}

// ── Internal ───────────────────────────────────────────────────────────────

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
