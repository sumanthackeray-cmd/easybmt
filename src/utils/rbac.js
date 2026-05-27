/**
 * Role-Based Access Control (RBAC) System
 * Manages permissions for different roles (owner, ceo, ca, accountant, store_manager, warehouse_manager, cashier)
 */

export const ROLES = {
  OWNER: 'owner',
  CEO: 'ceo',
  CA: 'ca',
  ACCOUNTANT: 'accountant',
  STORE_MANAGER: 'store_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  CASHIER: 'cashier',
};

// Standard Actions across pages
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
};

export const PERMISSIONS = {
  // POS & Billing
  POS_VIEW: 'pos:view',
  POS_CREATE_BILL: 'pos:create:bill',
  POS_VOID_BILL: 'pos:void:bill',
  POS_APPLY_DISCOUNT: 'pos:apply:discount',
  POS_PRICE_OVERRIDE: 'pos:price:override',
  POS_SHIFT_MGMT: 'pos:shift:mgmt',
  POS_REPRINT_BILL: 'pos:reprint:bill',
  POS_CASH_DRAWER: 'pos:cash:drawer',

  // Invoices Page
  INVOICES_VIEW: 'invoices:view',
  INVOICES_EDIT: 'invoices:edit',
  INVOICES_DELETE: 'invoices:delete',
  INVOICES_EXPORT: 'invoices:export',

  // Customers & Loyalty
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_EDIT: 'customers:edit',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_LOYALTY: 'customers:loyalty',

  // E-Waybills
  WAYBILLS_VIEW: 'waybills:view',
  WAYBILLS_CREATE: 'waybills:create',
  WAYBILLS_CANCEL: 'waybills:cancel',
  WAYBILLS_EXPORT: 'waybills:export',

  // Purchases & Vendor POs
  PURCHASES_VIEW: 'purchases:view',
  PURCHASES_CREATE_PO: 'purchases:create:po',
  PURCHASES_APPROVE_PO: 'purchases:approve:po',
  PURCHASES_EXECUTE_GRN: 'purchases:execute:grn',
  PURCHASES_VENDOR_MANAGE: 'purchases:vendor:manage',

  // Inventory Registry
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_STOCK_ADJUST: 'inventory:stock:adjust',
  INVENTORY_BARCODE_PRINT: 'inventory:barcode:print',

  // Stock Transfer
  STOCK_TRANSFER_VIEW: 'stock_transfer:view',
  STOCK_TRANSFER_CREATE: 'stock_transfer:create',
  STOCK_TRANSFER_APPROVE: 'stock_transfer:approve',

  // Inventory Sync
  INVENTORY_SYNC_VIEW: 'inventory_sync:view',
  INVENTORY_SYNC_EXECUTE: 'inventory_sync:execute',

  // Warehouse Hub
  WAREHOUSE_VIEW: 'warehouse:view',
  WAREHOUSE_MANAGE_LAYOUT: 'warehouse:manage:layout',
  WAREHOUSE_RECEIVE: 'warehouse:receive',
  WAREHOUSE_DISPATCH: 'warehouse:dispatch',
  WAREHOUSE_AUDIT: 'warehouse:audit',

  // Accounting Ledger
  ACCOUNTING_VIEW: 'accounting:view',
  ACCOUNTING_CREATE_JOURNAL: 'accounting:create:journal',
  ACCOUNTING_DAY_CLOSING: 'accounting:day:closing',
  ACCOUNTING_AUDIT_TRAIL: 'accounting:audit:trail',

  // Expenses Tracker
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_APPROVE: 'expenses:approve',
  EXPENSES_DELETE: 'expenses:delete',

  // Loans Management
  LOANS_VIEW: 'loans:view',
  LOANS_APPLY: 'loans:apply',
  LOANS_PAY: 'loans:pay',

  // GST Filing
  GST_FILING_VIEW: 'gst_filing:view',
  GST_FILING_RECONCILE: 'gst_filing:reconcile',
  GST_FILING_EXPORT: 'gst_filing:export',

  // HRMS Dashboard & Insights
  HRMS_DASHBOARD_VIEW: 'hrms_dashboard:view',

  // Employee Master
  HRMS_EMPLOYEES_VIEW: 'hrms_employees:view',
  HRMS_EMPLOYEES_CREATE: 'hrms_employees:create',
  HRMS_EMPLOYEES_EDIT: 'hrms_employees:edit',
  HRMS_EMPLOYEES_DELETE: 'hrms_employees:delete',

  // Org Structure & Departments
  HRMS_ORG_VIEW: 'hrms_org:view',
  HRMS_ORG_MANAGE: 'hrms_org:manage',

  // Salary & Payroll Engine
  HRMS_SALARY_VIEW: 'hrms_salary:view',
  HRMS_SALARY_PROCESS: 'hrms_salary:process',
  HRMS_SALARY_APPROVE: 'hrms_salary:approve',

  // Biometrics & MES Terminal
  HRMS_MES_VIEW: 'hrms_mes:view',
  HRMS_MES_ATTENDANCE: 'hrms_mes:attendance',

  // Compliance & Vault
  HRMS_COMPLIANCE_VIEW: 'hrms_compliance:view',
  HRMS_COMPLIANCE_UPLOAD: 'hrms_compliance:upload',
  HRMS_COMPLIANCE_FILING: 'hrms_compliance:filing',

  // Executive Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_PROFIT_MARGINS: 'reports:profit:margins',
  REPORTS_AI_COPILOT: 'reports:ai:copilot',

  // Branches Configuration
  BRANCHES_VIEW: 'branches:view',
  BRANCHES_CREATE: 'branches:create',
  BRANCHES_EDIT: 'branches:edit',
  BRANCHES_DELETE: 'branches:delete',

  // Audit Logs
  AUDIT_LOGS_VIEW: 'audit_logs:view',
};

// Role-Permission Matrix: Maps roles to their permissions array
export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    // Owner has all permissions
    Object.values(PERMISSIONS),
  ].flat(),

  [ROLES.CEO]: [
    // CEO has access to everything except core branch deletion/audit settings
    Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.BRANCHES_DELETE),
  ].flat(),

  [ROLES.CA]: [
    // CA has full accounting, expense control, GST filing, reports, and HR salary access
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE_JOURNAL,
    PERMISSIONS.ACCOUNTING_DAY_CLOSING,
    PERMISSIONS.ACCOUNTING_AUDIT_TRAIL,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,
    PERMISSIONS.GST_FILING_VIEW,
    PERMISSIONS.GST_FILING_RECONCILE,
    PERMISSIONS.GST_FILING_EXPORT,
    PERMISSIONS.HRMS_SALARY_VIEW,
    PERMISSIONS.HRMS_SALARY_PROCESS,
    PERMISSIONS.HRMS_SALARY_APPROVE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_PROFIT_MARGINS,
    PERMISSIONS.AUDIT_LOGS_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.PURCHASES_VIEW,
  ],

  [ROLES.ACCOUNTANT]: [
    // Accountant has accounting ledger, expense draft/view, loans, invoices, reports (excluding profit margins)
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE_JOURNAL,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_APPLY,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_EXPORT,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.STORE_MANAGER]: [
    // Manager manages store sales, inventory, stock transfers, and basic workforce scheduling
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE_BILL,
    PERMISSIONS.POS_VOID_BILL,
    PERMISSIONS.POS_APPLY_DISCOUNT,
    PERMISSIONS.POS_SHIFT_MGMT,
    PERMISSIONS.POS_REPRINT_BILL,
    PERMISSIONS.POS_CASH_DRAWER,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_STOCK_ADJUST,
    PERMISSIONS.INVENTORY_BARCODE_PRINT,
    PERMISSIONS.STOCK_TRANSFER_VIEW,
    PERMISSIONS.STOCK_TRANSFER_CREATE,
    PERMISSIONS.INVENTORY_SYNC_VIEW,
    PERMISSIONS.HRMS_DASHBOARD_VIEW,
    PERMISSIONS.HRMS_MES_VIEW,
    PERMISSIONS.HRMS_MES_ATTENDANCE,
    PERMISSIONS.REPORTS_VIEW,
  ],

  [ROLES.WAREHOUSE_MANAGER]: [
    // Warehouse manager manages stocks, locations, transfers, PO execution, and MES
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_STOCK_ADJUST,
    PERMISSIONS.STOCK_TRANSFER_VIEW,
    PERMISSIONS.STOCK_TRANSFER_CREATE,
    PERMISSIONS.STOCK_TRANSFER_APPROVE,
    PERMISSIONS.WAREHOUSE_VIEW,
    PERMISSIONS.WAREHOUSE_MANAGE_LAYOUT,
    PERMISSIONS.WAREHOUSE_RECEIVE,
    PERMISSIONS.WAREHOUSE_DISPATCH,
    PERMISSIONS.WAREHOUSE_AUDIT,
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_EXECUTE_GRN,
    PERMISSIONS.HRMS_MES_VIEW,
    PERMISSIONS.HRMS_MES_ATTENDANCE,
  ],

  [ROLES.CASHIER]: [
    // Cashier does checkout bills, shifts, reprint, and loyalty profile viewing
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_CREATE_BILL,
    PERMISSIONS.POS_SHIFT_MGMT,
    PERMISSIONS.POS_REPRINT_BILL,
    PERMISSIONS.POS_CASH_DRAWER,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
  ],
};

/**
 * Check if a user has a specific permission
 * @param {string} role - User's role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has permission
 */
export function hasPermission(role, permission) {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}

/**
 * Check if a user has any of the provided permissions
 * @param {string} role - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if user has any of the permissions
 */
export function hasAnyPermission(role, permissions) {
  return permissions.some(perm => hasPermission(role, perm));
}

/**
 * Check if a user has all of the provided permissions
 * @param {string} role - User's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if user has all permissions
 */
export function hasAllPermissions(role, permissions) {
  return permissions.every(perm => hasPermission(role, perm));
}

/**
 * Get all permissions for a role
 * @param {string} role - User's role
 * @returns {string[]} Array of permissions
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can access a specific module
 * @param {string} role - User's role
 * @param {string} module - Module name (pos, inventory, purchase, etc)
 * @returns {boolean} True if role can access module
 */
export function canAccessModule(role, module) {
  const modulePermissionMap = {
    pos: [PERMISSIONS.POS_VIEW],
    inventory: [PERMISSIONS.INVENTORY_VIEW],
    purchase: [PERMISSIONS.PURCHASES_VIEW],
    warehouse: [PERMISSIONS.WAREHOUSE_VIEW],
    branch: [PERMISSIONS.BRANCHES_VIEW],
    customer: [PERMISSIONS.CUSTOMERS_VIEW],
    reports: [PERMISSIONS.REPORTS_VIEW],
    accounting: [PERMISSIONS.ACCOUNTING_VIEW],
    settings: [PERMISSIONS.BRANCHES_VIEW],
  };

  const requiredPermissions = modulePermissionMap[module] || [];
  return hasAnyPermission(role, requiredPermissions);
}

/**
 * Get role display name
 * @param {string} role - Role ID
 * @returns {string} Display name
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    [ROLES.OWNER]: 'Administrator/Owner',
    [ROLES.CEO]: 'Chief Executive (CEO)',
    [ROLES.CA]: 'Chartered Accountant (CA)',
    [ROLES.ACCOUNTANT]: 'Accountant',
    [ROLES.STORE_MANAGER]: 'Store Manager',
    [ROLES.WAREHOUSE_MANAGER]: 'Warehouse Manager',
    [ROLES.CASHIER]: 'Cashier',
  };
  return roleNames[role] || 'Unknown Role';
}

export default {
  ROLES,
  ACTIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessModule,
  getRoleDisplayName,
};
