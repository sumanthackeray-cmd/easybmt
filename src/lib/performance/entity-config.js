/**
 * Per-entity cache TTLs and default fetch limits.
 * Reduces Firestore reads while keeping UI fresh enough per domain.
 */
export const ENTITY_CONFIG = {
  shopSettings: { staleMs: 10 * 60 * 1000, bgRefreshMs: 5 * 60 * 1000, defaultLimit: null },
  products: { staleMs: 3 * 60 * 1000, bgRefreshMs: 90 * 1000, defaultLimit: null },
  customers: { staleMs: 3 * 60 * 1000, bgRefreshMs: 90 * 1000, defaultLimit: null },
  invoices: { staleMs: 60 * 1000, bgRefreshMs: 45 * 1000, defaultLimit: 200 },
  purchases: { staleMs: 2 * 60 * 1000, bgRefreshMs: 90 * 1000, defaultLimit: 200 },
  expenses: { staleMs: 2 * 60 * 1000, bgRefreshMs: 90 * 1000, defaultLimit: 200 },
  loans: { staleMs: 5 * 60 * 1000, bgRefreshMs: 3 * 60 * 1000, defaultLimit: null },
  users: { staleMs: 5 * 60 * 1000, bgRefreshMs: 3 * 60 * 1000, defaultLimit: null },
  roles: { staleMs: 10 * 60 * 1000, bgRefreshMs: 5 * 60 * 1000, defaultLimit: null },
  permissions: { staleMs: 10 * 60 * 1000, bgRefreshMs: 5 * 60 * 1000, defaultLimit: null },
  sensitiveFieldAccess: { staleMs: 10 * 60 * 1000, bgRefreshMs: 5 * 60 * 1000, defaultLimit: null },
  employees: { staleMs: 5 * 60 * 1000, bgRefreshMs: 3 * 60 * 1000, defaultLimit: null },
};

export function getEntityConfig(colName) {
  return ENTITY_CONFIG[colName] || { staleMs: 5 * 60 * 1000, bgRefreshMs: 2 * 60 * 1000, defaultLimit: null };
}
