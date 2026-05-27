export const AVAILABLE_ROLES = [
  { id: "role-owner", role_name: "owner", label: "Owner", hierarchy_level: 1 },
  { id: "role-admin", role_name: "admin", label: "Administrator", hierarchy_level: 1 },
  { id: "role-ceo", role_name: "ceo", label: "Chief Executive (CEO)", hierarchy_level: 2 },
  { id: "role-ca", role_name: "ca", label: "Chartered Accountant (CA)", hierarchy_level: 3 },
  { id: "role-accountant", role_name: "accountant", label: "Accountant", hierarchy_level: 4 },
  { id: "role-store_manager", role_name: "store_manager", label: "Store Manager", hierarchy_level: 5 },
  { id: "role-warehouse_manager", role_name: "warehouse_manager", label: "Warehouse Manager", hierarchy_level: 6 },
  { id: "role-cashier", role_name: "cashier", label: "Cashier", hierarchy_level: 7 }
];

export const ACCESS_CATEGORIES = [
  {
    name: "Core & AI Intelligence",
    pages: [
      { key: "dashboard", name: "Core Business Dashboard", actions: ["view", "view_staff", "ai_insights", "own_data_only"] },
      { key: "ai_intel", name: "AI Intelligence Hub & Copilot", actions: ["view", "ask_copilot", "export_insights"] }
    ]
  },
  {
    name: "Sales & POS Operations",
    pages: [
      { key: "pos", name: "Quick POS Billing Terminal", actions: ["view", "create_bill", "void_bill", "apply_discount", "price_override", "shift_mgmt", "reprint_bill", "cash_drawer"] },
      { key: "invoices", name: "Sales Invoices History Ledger", actions: ["view", "edit", "delete", "export"] },
      { key: "customers", name: "Customer Directory & CRM Loyalty", actions: ["view", "create", "edit", "delete", "loyalty_adjust"] },
      { key: "waybills", name: "Government E-Waybill Portal", actions: ["view", "create", "cancel", "export"] }
    ]
  },
  {
    name: "Inventory & Supply Chain ERP",
    pages: [
      { key: "inventory", name: "Product Registry & Catalog", actions: ["view", "create", "edit", "delete", "stock_adjust", "barcode_print"] },
      { key: "stock_transfer", name: "Inter-Branch Stock Transfer", actions: ["view", "create", "approve"] },
      { key: "inventory_sync", name: "Real-time Multi-Branch Sync", actions: ["view", "sync_now"] },
      { key: "purchases", name: "Vendor Procurement POs", actions: ["view", "create_po", "approve_po", "execute_grn", "vendor_manage"] },
      { key: "warehouse", name: "Warehouse Storage & Racking", actions: ["view_racks", "manage_layout", "receive_stock", "dispatch_stock", "stock_count_audit"] }
    ]
  },
  {
    name: "Finance, Ledger & Tax Compliance",
    pages: [
      { key: "finance", name: "Finance Suite", actions: ["view", "cashbook", "bank_reconciliation", "pl_statement", "balance_sheet"] },
      { key: "accounting", name: "Double-Entry General Ledger", actions: ["view_ledger", "create_journal", "day_closing", "view_audit_trail"] },
      { key: "expenses", name: "Corporate Expenses Registry", actions: ["view", "create", "approve", "delete"] },
      { key: "loans", name: "Employee Cash Advance Loans", actions: ["view", "apply", "pay"] },
      { key: "gst_filing", name: "GST Tax Return Compliance", actions: ["view", "reconcile", "export_returns"] }
    ]
  },
  {
    name: "Workforce & HRMS Suite",
    pages: [
      { key: "hrms_dashboard", name: "HRMS Executive Dashboard", actions: ["view"] },
      { key: "hrms_employees", name: "Employee Directory Master", actions: ["view", "create", "edit", "delete"] },
      { key: "hrms_org", name: "Departments & Org Structures", actions: ["view", "manage"] },
      { key: "hrms_salary", name: "Salary Structure & Payroll Engine", actions: ["view", "process_payroll", "approve_payroll"] },
      { key: "hrms_mes", name: "Factory Floor Biometric MES", actions: ["view", "log_attendance"] },
      { key: "hrms_compliance", name: "Regulatory Compliance Vault", actions: ["view_vault", "upload_docs", "statutory_filing"] }
    ]
  },
  {
    name: "Audit & Global Controls",
    pages: [
      { key: "reports", name: "Executive P&L Analytics Reports", actions: ["view_sales", "view_inventory", "view_profit", "export_pdf"] },
      { key: "branches", name: "Enterprise Multi-Branch Config", actions: ["view", "create", "edit", "delete"] },
      { key: "audit_logs", name: "System Operations Audit Logs", actions: ["view"] }
    ]
  },
  {
    name: "Enterprise Manufacturing ERP",
    pages: [
      { key: "manufacturing", name: "Manufacturing Control Center", actions: ["view", "create", "edit", "delete", "approve", "export"] }
    ]
  }
];
