import { queryClientInstance } from "@/lib/query-client";
import { base44 } from "@/api/base44Client";

/** Critical data for instant POS / dashboard — loaded first. */
const TIER_CRITICAL = [
  { key: ["shopSettings"], fn: () => base44.entities.ShopSettings.list() },
  { key: ["products"], fn: () => base44.entities.Product.list() },
  { key: ["customers"], fn: () => base44.entities.Customer.list() },
  { key: ["invoices"], fn: () => base44.entities.Invoice.list("-created_date", 150) },
  { key: ["purchases"], fn: () => base44.entities.Purchase.list("-created_date", 100) },
  { key: ["expenses"], fn: () => base44.entities.Expense.list("-created_date", 100) },
  { key: ["loans"], fn: () => base44.entities.Loan.list() },
];

/** Secondary — deferred until browser is idle. */
const TIER_DEFERRED = [];

let prefetchStarted = false;

function prefetchOne({ key, fn }, staleTime) {
  return queryClientInstance.prefetchQuery({
    queryKey: key,
    queryFn: fn,
    staleTime,
  });
}

/**
 * Staggered warm-cache — avoids 8 parallel full-collection reads on login.
 */
export function warmCriticalCaches() {
  if (prefetchStarted) return;
  prefetchStarted = true;

  const stale = 5 * 60 * 1000;

  // Fetch all immediately so dashboard renders instantly on login
  TIER_CRITICAL.forEach((q) => {
    prefetchOne(q, stale).catch(() => {});
  });
}

/** Preload route chunk + route-specific queries on hover/focus. */
const routePrefetchers = {
  "/pos": () => import("@/pages/POS"),
  "/inventory": () => import("@/pages/Inventory"),
  "/invoices": () => import("@/pages/Invoices"),
  "/customers": () => import("@/pages/Customers"),
  "/reports": () => import("@/pages/Reports"),
};

export function prefetchRoute(path) {
  const loader = routePrefetchers[path];
  if (loader) loader().catch(() => {});

  if (path === "/pos" || path === "/inventory") {
    queryClientInstance.prefetchQuery({
      queryKey: ["products"],
      queryFn: () => base44.entities.Product.list(),
      staleTime: 3 * 60 * 1000,
    }).catch(() => {});
  }
}

export function resetPrefetchState() {
  prefetchStarted = false;
}
