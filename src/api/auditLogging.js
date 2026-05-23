/**
 * Audit Logging Service - Supabase Edition
 * Tracks all user actions for compliance, security, and accountability
 */

import { supabase } from './supabase';

let client = supabase;

export function initializeAuditLogging(supabaseInstance) {
  if (supabaseInstance) {
    client = supabaseInstance;
  }
}

/**
 * Action types for audit logging
 */
export const AUDIT_ACTIONS = {
  // User Actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',

  // Invoice Actions
  INVOICE_CREATE: 'INVOICE_CREATE',
  INVOICE_UPDATE: 'INVOICE_UPDATE',
  INVOICE_VOID: 'INVOICE_VOID',
  INVOICE_DELETE: 'INVOICE_DELETE',
  INVOICE_REPRINT: 'INVOICE_REPRINT',

  // Return Actions
  RETURN_CREATE: 'RETURN_CREATE',
  RETURN_APPROVE: 'RETURN_APPROVE',
  RETURN_COMPLETE: 'RETURN_COMPLETE',

  // Inventory Actions
  INVENTORY_ADJUST: 'INVENTORY_ADJUST',
  INVENTORY_TRANSFER: 'INVENTORY_TRANSFER',
  INVENTORY_MARK_EXPIRY: 'INVENTORY_MARK_EXPIRY',
  BATCH_CREATE: 'BATCH_CREATE',
  BATCH_UPDATE: 'BATCH_UPDATE',

  // Purchase Actions
  PURCHASE_ORDER_CREATE: 'PURCHASE_ORDER_CREATE',
  PURCHASE_ORDER_APPROVE: 'PURCHASE_ORDER_APPROVE',
  PURCHASE_ORDER_CANCEL: 'PURCHASE_ORDER_CANCEL',
  PURCHASE_ORDER_RECEIVE: 'PURCHASE_ORDER_RECEIVE',
  GRN_CREATE: 'GRN_CREATE',

  // Vendor Actions
  VENDOR_CREATE: 'VENDOR_CREATE',
  VENDOR_UPDATE: 'VENDOR_UPDATE',
  VENDOR_DELETE: 'VENDOR_DELETE',

  // Product Actions
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  PRODUCT_PRICE_CHANGE: 'PRODUCT_PRICE_CHANGE',

  // Customer Actions
  CUSTOMER_CREATE: 'CUSTOMER_CREATE',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  CUSTOMER_DELETE: 'CUSTOMER_DELETE',

  // Loyalty Actions
  LOYALTY_POINTS_ADD: 'LOYALTY_POINTS_ADD',
  LOYALTY_POINTS_REDEEM: 'LOYALTY_POINTS_REDEEM',
  LOYALTY_TIER_CHANGE: 'LOYALTY_TIER_CHANGE',

  // Offer/Promotion Actions
  OFFER_CREATE: 'OFFER_CREATE',
  OFFER_UPDATE: 'OFFER_UPDATE',
  OFFER_DELETE: 'OFFER_DELETE',
  OFFER_ACTIVATE: 'OFFER_ACTIVATE',
  OFFER_DEACTIVATE: 'OFFER_DEACTIVATE',

  // Settings Actions
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  BRANCH_SETTINGS_UPDATE: 'BRANCH_SETTINGS_UPDATE',

  // Cash Management
  SHIFT_OPEN: 'SHIFT_OPEN',
  SHIFT_CLOSE: 'SHIFT_CLOSE',
  DAY_CLOSING: 'DAY_CLOSING',

  // Access Control
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // System Actions
  BACKUP_CREATED: 'BACKUP_CREATED',
  DATA_IMPORTED: 'DATA_IMPORTED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
};

/**
 * Log a user action to the audit trail
 * @param {Object} auditData - Audit log data
 * @param {string} auditData.action - Action type (from AUDIT_ACTIONS)
 * @param {string} auditData.userId - ID of user performing action
 * @param {string} auditData.entityType - Type of entity (Invoice, Product, etc)
 * @param {string} auditData.entityId - ID of entity being acted upon
 * @param {string} auditData.branchId - Branch where action occurred
 * @param {Object} auditData.changes - Object with before/after values
 * @param {string} auditData.description - Human-readable description
 * @param {string} auditData.ipAddress - IP address of user
 * @param {string} auditData.userAgent - User agent string
 * @param {Object} auditData.metadata - Additional metadata
 * @returns {Promise<string>} Document ID of created audit log
 */
export async function logAuditAction(auditData) {
  if (!client) {
    console.warn('[EasyBMT] Audit logging not initialized.');
    return null;
  }

  try {
    const companyId = localStorage.getItem('company_id');
    const auditLog = {
      action: auditData.action,
      user_id: auditData.userId,
      entity_type: auditData.entityType,
      entity_id: auditData.entityId,
      branch_id: auditData.branchId,
      company_id: companyId,
      changes: auditData.changes || {},
      description: auditData.description || '',
      ip_address: auditData.ipAddress || 'unknown',
      user_agent: auditData.userAgent || '',
      metadata: auditData.metadata || {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditLog])
      .select()
      .single();

    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error('[v0] Error logging audit action:', error);
    throw error;
  }
}

/**
 * Get audit logs for a specific entity
 * @param {string} entityType - Type of entity (Invoice, Product, etc)
 * @param {string} entityId - ID of entity
 * @param {number} limitCount - Max number of logs to return
 * @returns {Promise<Array>} Array of audit logs
 */
export async function getEntityAuditLogs(entityType, entityId, limitCount = 50) {
  if (!client) return [];

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 * @param {string} userId - User ID
 * @param {string} branchId - Optional branch filter
 * @param {number} limitCount - Max number of logs
 * @returns {Promise<Array>} Array of audit logs
 */
export async function getUserAuditLogs(userId, branchId = null, limitCount = 100) {
  if (!client) return [];

  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query.limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching user audit logs:', error);
    return [];
  }
}

/**
 * Get all audit logs for a branch
 * @param {string} branchId - Branch ID
 * @param {number} limitCount - Max number of logs
 * @returns {Promise<Array>} Array of audit logs
 */
export async function getBranchAuditLogs(branchId, limitCount = 500) {
  if (!client) return [];

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching branch audit logs:', error);
    return [];
  }
}

/**
 * Helper function to log invoice creation
 */
export async function logInvoiceCreated(invoiceId, branchId, userId, total) {
  return logAuditAction({
    action: AUDIT_ACTIONS.INVOICE_CREATE,
    userId,
    entityType: 'Invoice',
    entityId: invoiceId,
    branchId,
    description: `Invoice ${invoiceId} created with amount ₹${total}`,
  });
}

/**
 * Helper function to log inventory adjustment
 */
export async function logInventoryAdjusted(
  productId,
  branchId,
  userId,
  previousQty,
  newQty,
  reason
) {
  return logAuditAction({
    action: AUDIT_ACTIONS.INVENTORY_ADJUST,
    userId,
    entityType: 'Inventory',
    entityId: productId,
    branchId,
    changes: {
      before: { quantity: previousQty },
      after: { quantity: newQty },
    },
    description: `Inventory adjusted from ${previousQty} to ${newQty} units. Reason: ${reason}`,
  });
}

/**
 * Helper function to log purchase order approval
 */
export async function logPurchaseOrderApproved(poId, branchId, userId, amount) {
  return logAuditAction({
    action: AUDIT_ACTIONS.PURCHASE_ORDER_APPROVE,
    userId,
    entityType: 'PurchaseOrder',
    entityId: poId,
    branchId,
    description: `Purchase Order ${poId} approved for ₹${amount}`,
  });
}

/**
 * Helper function to log price changes
 */
export async function logProductPriceChange(productId, branchId, userId, oldPrice, newPrice) {
  return logAuditAction({
    action: AUDIT_ACTIONS.PRODUCT_PRICE_CHANGE,
    userId,
    entityType: 'Product',
    entityId: productId,
    branchId,
    changes: {
      before: { price: oldPrice },
      after: { price: newPrice },
    },
    description: `Product price changed from ₹${oldPrice} to ₹${newPrice}`,
  });
}

/**
 * Helper function to log access denied
 */
export async function logAccessDenied(userId, branchId, resource, reason) {
  return logAuditAction({
    action: AUDIT_ACTIONS.ACCESS_DENIED,
    userId,
    entityType: 'AccessControl',
    entityId: resource,
    branchId,
    description: `Access denied to ${resource}. Reason: ${reason}`,
  });
}

export default {
  initializeAuditLogging,
  logAuditAction,
  getEntityAuditLogs,
  getUserAuditLogs,
  getBranchAuditLogs,
  AUDIT_ACTIONS,
  logInvoiceCreated,
  logInventoryAdjusted,
  logPurchaseOrderApproved,
  logProductPriceChange,
  logAccessDenied,
};
