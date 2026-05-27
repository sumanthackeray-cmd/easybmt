// src/lib/errorLogger.js
// Enterprise-Grade Centralized Logging Engine
// EasyBMT SaaS Platform
//
// Log levels: DEBUG < INFO < WARN < ERROR < CRITICAL
// Features:
//   - In-memory ring-buffer (last 500 entries, zero memory leak)
//   - IndexedDB persistence for ERROR/CRITICAL entries
//   - Duplicate fingerprinting (dedupes within 5s window)
//   - Safe: never throws, never blocks the caller

const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
};

const RING_BUFFER_SIZE = 500;
const DEDUP_WINDOW_MS = 5000;
const MIN_PERSIST_LEVEL = LOG_LEVEL.ERROR;

// ── In-memory ring buffer ──────────────────────────────────────────────────
const _ringBuffer = [];
let _ringHead = 0;

// ── Duplicate fingerprint cache ────────────────────────────────────────────
const _recentFingerprints = new Map(); // fingerprint → timestamp

// ── IndexedDB persistence (lazy open) ─────────────────────────────────────
let _idb = null;

function _openIdb() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('easybmt_logs', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('errorLogs')) {
          const store = db.createObjectStore('errorLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('level', 'level');
          store.createIndex('timestamp', 'timestamp');
        }
      };
      req.onsuccess = (e) => {
        _idb = e.target.result;
        resolve(_idb);
      };
      req.onerror = () => resolve(null); // gracefully degrade
    } catch {
      resolve(null);
    }
  });
}

async function _persistToIdb(entry) {
  try {
    const db = await _openIdb();
    if (!db) return;
    const tx = db.transaction('errorLogs', 'readwrite');
    tx.objectStore('errorLogs').add(entry);
    // Prune old entries (keep last 1000)
    const countReq = tx.objectStore('errorLogs').count();
    countReq.onsuccess = () => {
      if (countReq.result > 1000) {
        const cursorReq = tx.objectStore('errorLogs').openCursor();
        let deleted = 0;
        cursorReq.onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (cursor && deleted < countReq.result - 1000) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };
  } catch {
    // Silent — logging must never throw
  }
}

// ── Core log function ──────────────────────────────────────────────────────

function _log(levelName, category, message, meta = {}) {
  try {
    const levelValue = LOG_LEVEL[levelName] ?? LOG_LEVEL.INFO;
    const timestamp = new Date().toISOString();

    // Build fingerprint for dedup
    const fingerprint = `${levelName}::${category}::${String(message).slice(0, 120)}`;
    const lastSeen = _recentFingerprints.get(fingerprint);
    if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
      return; // Suppress duplicate within dedup window
    }
    _recentFingerprints.set(fingerprint, Date.now());

    // Cleanup old fingerprints to prevent unbounded growth
    if (_recentFingerprints.size > 200) {
      const cutoff = Date.now() - DEDUP_WINDOW_MS * 2;
      for (const [k, v] of _recentFingerprints) {
        if (v < cutoff) _recentFingerprints.delete(k);
      }
    }

    const entry = {
      level: levelName,
      levelValue,
      category,
      message: String(message),
      meta: _safeSerialize(meta),
      timestamp,
      companyId: _getCompanyId(),
    };

    // Write to ring buffer
    if (_ringBuffer.length < RING_BUFFER_SIZE) {
      _ringBuffer.push(entry);
    } else {
      _ringBuffer[_ringHead] = entry;
      _ringHead = (_ringHead + 1) % RING_BUFFER_SIZE;
    }

    // Console output (structured)
    const prefix = `[EasyBMT:${category}]`;
    if (levelValue >= LOG_LEVEL.ERROR) {
      console.error(prefix, message, meta);
    } else if (levelValue === LOG_LEVEL.WARN) {
      console.warn(prefix, message, meta);
    } else if (levelValue === LOG_LEVEL.DEBUG) {
      console.debug(prefix, message, meta);
    } else {
      console.info(prefix, message, meta);
    }

    // Persist to IndexedDB for ERROR/CRITICAL
    if (levelValue >= MIN_PERSIST_LEVEL) {
      _persistToIdb(entry);
    }
  } catch {
    // Absolute last resort: logging must never throw
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _safeSerialize(value) {
  try {
    if (value instanceof Error) {
      return { errorMessage: value.message, stack: value.stack?.slice(0, 500) };
    }
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { raw: String(value) };
  }
}

function _getCompanyId() {
  try {
    return localStorage.getItem('company_id') || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export const errorLogger = {
  debug:    (category, message, meta = {}) => _log('DEBUG',    category, message, meta),
  info:     (category, message, meta = {}) => _log('INFO',     category, message, meta),
  warn:     (category, message, meta = {}) => _log('WARN',     category, message, meta),
  error:    (category, message, meta = {}) => _log('ERROR',    category, message, meta),
  critical: (category, message, meta = {}) => _log('CRITICAL', category, message, meta),

  /**
   * Log an Error object with full context.
   * @param {string}  category - e.g. 'OfflineQueue', 'Firebase', 'Auth'
   * @param {Error}   err      - The caught error
   * @param {object}  context  - Additional metadata
   */
  captureError(category, err, context = {}) {
    _log('ERROR', category, err?.message || String(err), {
      stack: err?.stack?.slice(0, 800),
      code: err?.code,
      ...context,
    });
  },

  /**
   * Get the last N log entries from the ring buffer.
   * @param {number} n
   * @returns {Array}
   */
  getRecentLogs(n = 100) {
    try {
      const all = [..._ringBuffer];
      return all.slice(-Math.min(n, RING_BUFFER_SIZE));
    } catch {
      return [];
    }
  },

  /**
   * Read persisted ERROR/CRITICAL logs from IndexedDB.
   * @returns {Promise<Array>}
   */
  async getPersistedLogs() {
    try {
      const db = await _openIdb();
      if (!db) return [];
      return new Promise((resolve) => {
        const tx = db.transaction('errorLogs', 'readonly');
        const req = tx.objectStore('errorLogs').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  /**
   * Clear persisted logs (admin action).
   */
  async clearPersistedLogs() {
    try {
      const db = await _openIdb();
      if (!db) return;
      const tx = db.transaction('errorLogs', 'readwrite');
      tx.objectStore('errorLogs').clear();
    } catch { /* silent */ }
  },

  /**
   * Generate a shareable error report string (for support).
   */
  generateReport() {
    try {
      const logs = errorLogger.getRecentLogs(50)
        .filter(e => e.levelValue >= LOG_LEVEL.WARN)
        .map(e => `[${e.timestamp}] ${e.level} [${e.category}] ${e.message}`)
        .join('\n');
      return `EasyBMT Error Report\nCompany: ${_getCompanyId()}\nGenerated: ${new Date().toISOString()}\n\n${logs}`;
    } catch {
      return 'Error report generation failed.';
    }
  },
};

export default errorLogger;
