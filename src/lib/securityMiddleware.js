// src/lib/securityMiddleware.js
// Enterprise Client-Side Security Enforcement Layer
// EasyBMT SaaS Platform
//
// This module provides pre-write validation, companyId integrity checks,
// role-based permission enforcement, and payload sanitization.
// All validation happens BEFORE data reaches IndexedDB or the Firestore queue.
//
// It is a "defense-in-depth" layer — Firestore rules are the authoritative
// guard, but this catches violations at the client before they waste network.

import { auth } from '@/api/firebase';
import { errorLogger } from './errorLogger';

// ── Role hierarchy ─────────────────────────────────────────────────────────

const ROLE_HIERARCHY = {
  owner: 1,
  admin: 1,
  ceo: 2,
  ca: 3,
  accountant: 4,
  store_manager: 5,
  warehouse_manager: 6,
  cashier: 7,
};

// Collections that require inventory roles (level ≤ 6, excluding cashier=7)
const INVENTORY_ONLY_WRITE_COLLECTIONS = new Set([
  'inventory', 'products', 'purchases', 'warehouses',
]);

// Collections that require admin-level access (level ≤ 3)
const ADMIN_ONLY_WRITE_COLLECTIONS = new Set([
  'salaryStructures', 'monthlyPayroll', 'employeeLoans',
  'roles', 'permissions', 'sensitiveFieldAccess', 'shopSettings',
  'userSubscriptions',
]);

// Collections that require HR level (level ≤ 5)
const HR_ONLY_WRITE_COLLECTIONS = new Set([
  'departments', 'designations', 'shifts', 'holidays',
  'performanceReviews', 'employeeDocuments',
  'salaryStructures', 'monthlyPayroll',
]);

// Collections where ALL active members can write (POS + customer-facing + Manufacturing)
const OPEN_WRITE_COLLECTIONS = new Set([
  'customers', 'expenses', 'invoices', 'attendanceLogs',
  'leaveManagement', 'auditLogs',
  'manufacturingOrders', 'productionBatches', 'productionSerials', 'rawMaterialInventory',
  'consumablesInventory', 'finishedGoodsInventory', 'materialIssues', 'productionStages',
  'qualityChecks', 'dispatches', 'barcodePrintLogs', 'inventoryTransactions',
  'machineAssignments', 'productionOperators'
]);

// ── Sensitive fields that should NEVER be written by non-admins ────────────

const ADMIN_ONLY_FIELDS = new Set([
  'purchase_price', 'profit_margin', 'salary', 'salary_details',
  'bank_account', 'ifsc', 'pan', 'profile_password',
  'api_key', 'secret', 'webhook_url',
]);

// ── Core helpers ───────────────────────────────────────────────────────────

/**
 * Get the current user's resolved company context from auth claims.
 * Returns null if user is not authenticated or claims are missing.
 */
export function getCurrentSecurityContext() {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    // Prioritize localStorage rbac_profile for dynamic database role mapping
    let resolvedRole = 'cashier';
    const profileStr = localStorage.getItem(`rbac_profile_${user.uid}`);
    const cachedUserStr = localStorage.getItem('base44_cached_user');
    
    let cachedUserCode = '';
    let cachedUserRole = '';
    if (cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr);
        if (cachedUser.role) resolvedRole = cachedUser.role;
        cachedUserCode = cachedUser.user_code || cachedUser.userCode || '';
        cachedUserRole = cachedUser.role || cachedUser.role_id || '';
      } catch (_) {}
    }

    if (profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        if (profile.role_name) resolvedRole = profile.role_name;
      } catch (_) {}
    }

    // Try to get claims from cached token payload in localStorage
    const token = localStorage.getItem('base44_access_token');
    let tokenUserCode = '';
    let tokenRole = '';
    let decodedPayload = null;
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          decodedPayload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (decodedPayload) {
            tokenUserCode = decodedPayload.user_code || '';
            tokenRole = decodedPayload.role || '';
          }
        } catch (_) {}
      }
    }

    // Force absolute owner/admin bypass based on user code or owner email context
    const isOwnerContext = 
      user.email?.toLowerCase().includes("kksp010452") || 
      user.email?.toLowerCase().includes("kamlesh") ||
      localStorage.getItem("user_code")?.toUpperCase().includes("ADMIN") || 
      user.uid?.toUpperCase().includes("ADMIN") ||
      cachedUserCode.toUpperCase().includes("ADMIN") ||
      cachedUserRole.toLowerCase().includes("admin") ||
      cachedUserRole.toLowerCase().includes("owner") ||
      tokenUserCode.toUpperCase().includes("ADMIN") ||
      tokenRole.toLowerCase().includes("admin") ||
      tokenRole.toLowerCase().includes("owner") ||
      resolvedRole.toLowerCase().includes("admin") ||
      resolvedRole.toLowerCase().includes("owner");

    if (isOwnerContext) {
      resolvedRole = 'owner';
    }

    if (decodedPayload && decodedPayload.company_id) {
      return {
        uid: user.uid,
        companyId: decodedPayload.company_id,
        role: resolvedRole !== 'cashier' ? resolvedRole : (decodedPayload.role || 'cashier'),
        isActive: decodedPayload.is_active !== false,
        userCode: decodedPayload.user_code || localStorage.getItem("user_code") || cachedUserCode || 'UNKNOWN',
        branchId: decodedPayload.branch_id || decodedPayload.branchId || localStorage.getItem('branch_id') || 'main',
      };
    }

    // Fallback to localStorage company_id
    const companyId = localStorage.getItem('company_id');
    if (companyId) {
      return {
        uid: user.uid,
        companyId,
        role: resolvedRole,
        isActive: true,
        userCode: localStorage.getItem("user_code") || cachedUserCode || 'UNKNOWN',
        branchId: localStorage.getItem('branch_id') || 'main',
      };
    }

    return null;
  } catch (err) {
    errorLogger.captureError('SecurityMiddleware', err, { context: 'getCurrentSecurityContext' });
    return null;
  }
}

/**
 * Get the role hierarchy level for a given role name.
 * Lower = more powerful. Defaults to cashier (7) for unknown roles.
 */
export function getRoleLevel(roleName) {
  if (!roleName) return 7;
  const cleanName = String(roleName).replace("role-", "").toLowerCase().trim();
  return ROLE_HIERARCHY[cleanName] ?? 7;
}

// ── Assertion functions (throw on violation) ───────────────────────────────

/**
 * Assert that the current user is authenticated and active.
 * @throws {Error} if not authenticated or deactivated
 */
export function assertAuthenticated() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('403 Forbidden: Authentication required.');
  }

  const ctx = getCurrentSecurityContext();
  if (!ctx) {
    throw new Error('403 Forbidden: Security context could not be resolved.');
  }

  if (!ctx.isActive) {
    const err = new Error('403 Forbidden: Your account has been deactivated.');
    errorLogger.warn('SecurityMiddleware', 'Deactivated user attempted operation', {
      uid: user.uid,
    });
    throw err;
  }

  return ctx;
}

/**
 * Assert that the caller's companyId matches what's in the data payload.
 * CRITICAL: Prevents cross-tenant data injection.
 *
 * @param {object} data         - The data being written
 * @param {string} collectionName - For logging context
 * @throws {Error} if companyId mismatch detected
 */
export function assertCompanyIntegrity(data, collectionName = 'unknown') {
  const ctx = assertAuthenticated();

  if (data.companyId && data.companyId !== ctx.companyId) {
    const violation = `SECURITY VIOLATION: companyId mismatch in ${collectionName}. ` +
                      `Expected=${ctx.companyId}, Got=${data.companyId}`;
    errorLogger.critical('SecurityMiddleware', violation, {
      uid: ctx.uid,
      expected: ctx.companyId,
      received: data.companyId,
      collection: collectionName,
    });
    // Log as audit event (fire-and-forget)
    _logSecurityEvent('COMPANY_ID_MISMATCH', ctx, { collection: collectionName, received: data.companyId });
    throw new Error(violation);
  }

  return ctx;
}

/**
 * Assert that the caller's branchId matches what's in the data payload.
 * CRITICAL: Prevents cross-branch stock or transaction leakage.
 *
 * @param {object} data         - The data being written
 * @param {string} collectionName - For logging context
 * @throws {Error} if branchId mismatch detected for non-admin accounts
 */
export function assertBranchIntegrity(data, collectionName = 'unknown') {
  const ctx = assertAuthenticated();
  const userLevel = getRoleLevel(ctx.role);

  // Non-super-admins (level > 3, i.e. store_manager, cashier, accountant, etc.)
  if (userLevel > 3) {
    const userBranch = ctx.branchId || localStorage.getItem('branch_id') || 'main';
    const targetBranch = data.branchId || data.branch_id || 'main';

    if (userBranch && targetBranch && userBranch !== targetBranch && userBranch !== 'null' && userBranch !== 'all') {
      const violation = `403 Forbidden: Branch Isolation Violation in ${collectionName}. ` +
                        `Your account is locked to branch ${userBranch}, but attempted transaction in branch ${targetBranch}`;
      errorLogger.critical('SecurityMiddleware', violation, {
        uid: ctx.uid,
        expected: userBranch,
        received: targetBranch,
        collection: collectionName,
      });
      _logSecurityEvent('BRANCH_ID_MISMATCH', ctx, { collection: collectionName, received: targetBranch });
      throw new Error(violation);
    }
  }

  return ctx;
}

/**
 * Assert the current user has permission to write to a given collection.
 * Enforces role-based restrictions without a UI roundtrip.
 *
 * @param {string} collectionName - Target Dexie/Firestore collection
 * @throws {Error} if the user's role is insufficient
 */
export function assertWritePermission(collectionName) {
  const ctx = assertAuthenticated();
  const userLevel = getRoleLevel(ctx.role);

  // Admin-only collections
  if (ADMIN_ONLY_WRITE_COLLECTIONS.has(collectionName)) {
    if (userLevel > 3) {
      _logAccessDenied(ctx, collectionName, 'Admin only');
      throw new Error(`403 Forbidden: ${collectionName} requires admin access (owner/ceo/ca).`);
    }
  }

  // HR-only collections
  if (HR_ONLY_WRITE_COLLECTIONS.has(collectionName)) {
    if (userLevel > 5) {
      _logAccessDenied(ctx, collectionName, 'HR role required');
      throw new Error(`403 Forbidden: ${collectionName} requires HR-level access.`);
    }
  }

  // Inventory-only collections
  if (INVENTORY_ONLY_WRITE_COLLECTIONS.has(collectionName)) {
    if (collectionName !== 'products' && userLevel >= 7) { // cashier = 7
      _logAccessDenied(ctx, collectionName, 'Inventory role required');
      throw new Error(`403 Forbidden: ${collectionName} requires warehouse or manager access.`);
    }
  }

  return ctx;
}

/**
 * Assert the user can delete from this collection.
 * Deletes are more destructive — require higher privilege.
 *
 * @param {string} collectionName
 * @throws {Error} if the user cannot delete
 */
export function assertDeletePermission(collectionName) {
  const ctx = assertAuthenticated();
  const userLevel = getRoleLevel(ctx.role);

  // Invoice deletion: admin + store_manager only
  if (collectionName === 'invoices' && userLevel > 5) {
    _logAccessDenied(ctx, collectionName, 'Delete requires admin or manager');
    throw new Error('403 Forbidden: Invoice deletion requires admin or store_manager role.');
  }

  // Most deletions: admin only
  const adminDeleteOnly = ['customers', 'expenses', 'purchases',
                           'inventory', 'loans', 'users', 'warehouses'];
  if (adminDeleteOnly.includes(collectionName) && userLevel > 3) {
    _logAccessDenied(ctx, collectionName, 'Admin only delete');
    throw new Error(`403 Forbidden: Deleting ${collectionName} requires admin access.`);
  }

  return ctx;
}

/**
 * Sanitize a write payload before it reaches IndexedDB or Firestore:
 *   1. Stamps the correct companyId from auth context
 *   2. Adds userId and updated_date
 *   3. Strips admin-only fields if caller is not admin
 *
 * @param {object} data           - Raw input data
 * @param {string} collectionName - Target collection (for field filtering)
 * @returns {object} Sanitized, context-stamped payload
 */
export function sanitizeWritePayload(data, collectionName = 'unknown') {
  const ctx = assertAuthenticated();
  const userLevel = getRoleLevel(ctx.role);
  const isAdmin = userLevel <= 3;

  const sanitized = { ...data };

  // Always stamp companyId from auth context — cannot be overridden by client
  sanitized.companyId = ctx.companyId;

  // Add audit metadata
  sanitized.updated_date = new Date().toISOString();
  if (!sanitized.created_date) {
    sanitized.created_date = new Date().toISOString();
  }
  sanitized._lastModifiedBy = ctx.uid;

  // Strip admin-only sensitive fields if not admin
  if (!isAdmin) {
    for (const field of ADMIN_ONLY_FIELDS) {
      if (field in sanitized && field !== 'purchase_price' && field !== 'profit_margin') {
        // purchase_price and profit_margin are product fields — masking is read-side
        delete sanitized[field];
        errorLogger.warn('SecurityMiddleware', `Stripped admin field "${field}" from ${collectionName} write`, {
          uid: ctx.uid,
          role: ctx.role,
        });
      }
    }
    // Never allow profile_password in any client write
    delete sanitized.profile_password;
    delete sanitized.api_key;
    delete sanitized.secret;
  }

  return sanitized;
}

/**
 * Full write validation pipeline.
 * Call this at the entry point of create/update operations.
 *
 * @param {object} data           - Raw write payload
 * @param {string} collectionName - Target collection
 * @returns {object}              - Sanitized, authorized payload
 */
export function validateAndSanitizeWrite(data, collectionName) {
  assertWritePermission(collectionName);
  assertCompanyIntegrity(data, collectionName);
  return sanitizeWritePayload(data, collectionName);
}

// ── Internal event loggers ─────────────────────────────────────────────────

function _logAccessDenied(ctx, resource, reason) {
  errorLogger.warn('SecurityMiddleware', `ACCESS_DENIED: ${resource}`, {
    uid: ctx.uid,
    role: ctx.role,
    reason,
  });

  // Fire-and-forget audit log (imported lazily to avoid circular deps)
  import('@/api/auditLogging').then(({ logAccessDenied }) => {
    logAccessDenied(ctx.uid, null, resource, reason).catch(() => {});
  }).catch(() => {});
}

function _logSecurityEvent(eventType, ctx, details = {}) {
  errorLogger.critical('SecurityMiddleware', `SECURITY_EVENT: ${eventType}`, {
    uid: ctx?.uid,
    role: ctx?.role,
    ...details,
  });

  import('@/api/auditLogging').then(({ logAuditAction, AUDIT_ACTIONS }) => {
    logAuditAction({
      action: 'ACCESS_DENIED',
      userId: ctx?.uid || 'unknown',
      entityType: 'SecurityEvent',
      entityId: eventType,
      description: `Security event: ${eventType}. ${JSON.stringify(details)}`,
    }).catch(() => {});
  }).catch(() => {});
}

export default {
  getCurrentSecurityContext,
  getRoleLevel,
  assertAuthenticated,
  assertCompanyIntegrity,
  assertWritePermission,
  assertDeletePermission,
  sanitizeWritePayload,
  validateAndSanitizeWrite,
};
