# EasyBMT Ultra-Performance Optimization Plan

**Goal:** Near-instant perceived response (~100ms UI feedback), minimal Firestore reads/writes, real-time sync without waste, scale for high concurrency.

**Status:** Phase 1 foundations implemented in code (see § Implemented). Remaining work is phased below.

---

## Executive summary

| Area | Current bottleneck | Target | Phase |
|------|-------------------|--------|-------|
| Auth boot | 4× full RBAC `list()` + 4 collection listeners | Cached user + 1 user-doc listener | **Done (partial)** |
| Login prefetch | 8 parallel full collection reads | Tiered idle prefetch | **Done** |
| Firestore | No offline persistence | IndexedDB cache | **Done** |
| `base44.list()` | Always full scan + constant background refresh | Dedup + TTL + `get(id)` | **Done (partial)** |
| Inventory sync | Duplicate branch listeners | Shared hub per branch | **Done** |
| POS checkout | Await stock before UI update | Optimistic stock | **Done** |
| POS invoices query | Unbounded `Invoice.list()` | Limit 120 | **Done** |
| Reports/HRMS | 14+ parallel full lists | Paginate + aggregate docs | Phase 2 |
| Product search | Full array filter in memory | Virtualized list + search index | Phase 2 |
| Charts | Re-render on every parent update | `React.memo` + stable data refs | Phase 2 |

**Estimated Firestore read reduction (Phase 1):** 40–70% for typical daily sessions (fewer duplicate fetches, throttled background sync, smaller POS invoice window).

---

## 1. Frontend performance

### Implemented
- **Staggered prefetch** (`src/lib/performance/prefetch-manager.js`): critical `shopSettings` + `products` first; customers/invoices/purchases/expenses deferred via `requestIdleCallback`.
- **Route chunk preload** on sidebar hover/focus (`prefetchRoute`).
- **React Query** `networkMode: 'offlineFirst'` + reconnect refetch (`src/lib/query-client.js`).
- **POS branch stock Map** — O(n) product overlay vs O(n×m) `find()` per product.
- **Optimistic stock** on checkout (`adjustProductStockOptimistic` + local `branchInventory` patch).

### Phase 2 — apply globally
- Wrap heavy list rows in `React.memo` (Inventory table, POS product grid, Reports tables).
- **Virtualize** lists >100 rows (`@tanstack/react-virtual` — add dependency).
- Split **HRMS** into tab-level lazy queries (load only active tab).
- Replace full-page spinners with **skeleton components** per module.
- Audit `useEffect` dependency arrays causing double-fetch (EnterpriseIntelligence, GSTFiling).

### Phase 3
- Service Worker: cache API responses for static entity snapshots (beyond Workbox asset cache).
- Preconnect to Firebase host in `index.html`.

---

## 2. Firestore optimization

### Implemented
- **Persistent local cache** — `initializeFirestore` + `persistentLocalCache` (`src/api/firebase.js`).
- **Background fetch throttle** per entity via `ENTITY_CONFIG` (`src/lib/performance/entity-config.js`).
- **In-flight deduplication** for concurrent `list()` calls (`base44Client.js`).
- **`entities.*.get(id)`** — single-document read instead of full list scan.
- **Default limits** for invoices (150 prefetch / 120 POS), purchases/expenses (100–200).

### Phase 2 — high impact
| Change | Reads saved | Files |
|--------|-------------|-------|
| Server-side `limit()` + `orderBy` + cursor pagination | 80%+ on large tenants | `base44Client.js`, all list pages |
| Denormalized **`/companies/{id}/stats/daily`** aggregation doc | Avoid 500-invoice scans for dashboard | New Cloud Function or client rollup |
| **`products_search`** lightweight docs `{id,name,sku,barcode,rate,stock}` | Faster POS search, smaller payload | Migration script |
| Batch writes on checkout (stock + invoice) | 2N → 1 batch | POS, inventorySyncService |
| Remove duplicate auth warmup | Login + AuthContext both list RBAC | `authService.js`, AuthContext |

### Phase 3 — architecture
- **Hot/cold split:** archive invoices older than 12 months to `invoices_archive`.
- Composite indexes for: `invoices (created_date desc)`, `inventory (branchId, productId)`.
- Move inventory under `companies/{companyId}/inventory` for tenant isolation.

---

## 3. Realtime system

### Implemented
- **Single branch inventory hub** — one `onSnapshot` per branch, fan-out to POS/Inventory/Sync (`inventorySyncService.js`).
- **RBAC listener reduced** from 4 collections → 1 user document + 4s debounce (`AuthContext.jsx`).

### Phase 2
- **Customer updates:** `onSnapshot` on `customers` with `limit(50)` + merge into React Query cache (Customers page only when mounted).
- **Permission changes:** optional listener on current user's `permissions` doc only (when admin edits role).
- **Deduplicate** `useShopSettings` + `base44_shop_settings` localStorage keys.
- Event bus: `window.dispatchEvent('entity:products:updated')` for cross-tab sync without second listener.

### Avoid
- Collection-wide listeners on `products`, `invoices`, `customers` (use cache-first + targeted doc listeners).

---

## 4. Inventory speed

### Implemented
- Optimistic UI on POS sale (global product cache + branch state).
- Shared realtime hub (no duplicate listeners).
- Fixed `getLowStockItems` invalid query (client-side filter).

### Phase 2
- **`updateInventory`:** use `increment()` FieldValue instead of read-then-write.
- **Delta sync:** pass `{ productId, delta }` in listener metadata; don't replace entire branch array if one doc changed.
- Cache branch inventory in React Query key `['branchInventory', branchId]` for cross-component reuse.

---

## 5. Offline-first

### Current
- PWA asset cache (Workbox).
- `localStorage` entity cache in `base44Client`.
- POS offline invoice queue (`gst_pos_offline_invoice_sync_queue`).
- Firestore persistence (Phase 1).

### Phase 2
- Unified **`easybmt_write_queue`** IndexedDB store for failed mutations.
- Background sync via `navigator.serviceWorker.ready` + `sync` event.
- Show subtle “syncing…” badge when queue non-empty.

---

## 6. Database architecture audit

### Collections (tenant path)
| Collection | Issue | Recommendation |
|------------|-------|----------------|
| `companies/{id}/products` | Full scan on every list | Pagination + search index |
| `companies/{id}/invoices` | POS loaded all | Limit + date filter |
| `companies/{id}/users,roles,permissions` | Full list on auth | Cache 10min; get-by-id for updates |
| `inventory` (root) | Not under company path | Migrate to tenant subcollection |
| `branches` | Per-user query OK | Keep + cache |

### Indexes to add (Firebase Console)
```
invoices: companyId + created_date DESC
inventory: branchId + productId
auditLogs: companyId + timestamp DESC (already partial in auditLogging.js)
```

---

## 7. Mobile / low-end Android

- Reduce POS bundle: lazy-load print/PDF modules (`pdf-share-utils` dynamic import on print only).
- Disable `html2canvas` until print action.
- Touch: `passive: true` on scroll listeners.
- Limit concurrent `useQuery` on HRMS dashboard (14 → 3 visible tabs).
- Test on Chrome Android with 4× CPU throttle — target TTI < 3s on cached login.

---

## 8. Network optimization

### Implemented
- Request dedup on `list()`.
- Throttled background refresh (45s–5min per entity type).
- Smaller default fetch windows.

### Phase 2
- **Stale-while-revalidate** headers if moving to HTTP API layer.
- Debounce product search input 150ms (POS already partially debounced via React state).
- Compress large localStorage caches with LZ-string if >500KB.

---

## 9. UI/UX speed perception

| Action | Pattern |
|--------|---------|
| Save settings | Optimistic `updateSettingsOptimistically` (already in Settings) |
| Create invoice | Show receipt modal immediately; sync stock in background |
| Button click | Disable + spinner only if >200ms (`useTransition`) |
| List delete | Remove from UI first, rollback on error |

---

## 10. Module-specific checklist

### Authentication ✅ partial
- [x] Cached user instant render
- [x] Debounced RBAC listener
- [ ] Skip RBAC re-list if only `name` field changed on user doc
- [ ] Merge `firebase/config` and `api/firebase`

### Dashboard
- [ ] Load KPIs from single stats doc
- [ ] Lazy-load chart libraries (recharts dynamic import)

### POS ✅ partial
- [x] Invoice list limit 120
- [x] Optimistic stock
- [x] Branch stock Map
- [ ] Dynamic import print/PDF
- [ ] Virtualize product grid >200 SKUs

### Inventory
- [x] Shared branch listener
- [ ] Virtualized table
- [ ] Optimistic adjust on stock edit

### Customers
- [ ] Pagination (50/page)
- [ ] Optimistic create/update in React Query cache

### Reports & analytics
- [ ] Server-side date-range queries only
- [ ] Memoize chart data arrays
- [ ] Single shared `useReportsData({from,to})` hook

### Expenses / Loans
- [ ] Default limit 100 + “Load more”
- [ ] Shared query keys with Reports

### HRMS
- [ ] Tab-scoped queries (biggest win — 14 lists → 2–3 per view)

### Notifications
- [ ] Poll or doc listener only when notification panel open

---

## Implemented files (Phase 1)

```
src/api/firebase.js                          — Firestore IndexedDB persistence
src/api/base44Client.js                      — get(), dedup, TTL, default limits
src/api/inventorySyncService.js              — branch listener hub, low-stock fix
src/lib/query-client.js                      — offlineFirst
src/lib/performance/entity-config.js         — per-entity TTL
src/lib/performance/prefetch-manager.js        — tiered prefetch + route preload
src/lib/performance/optimistic-cache.js        — React Query patch helpers
src/lib/performance/debounce.js
src/lib/AuthContext.jsx                        — 1 user listener + debounce
src/App.jsx                                  — warmCriticalCaches
src/components/layout/Sidebar.jsx            — hover prefetch
src/pages/POS.jsx                            — optimistic stock, invoice limit, stock Map
src/pages/InventorySync.jsx                  — unsubscribe fix
```

---

## Measurement plan

1. **Firebase Usage** — compare daily reads before/after (Console → Usage).
2. **Chrome Performance** — Lighthouse mobile on `/pos`, `/inventory`, `/`.
3. **Custom marks:**
   ```js
   performance.mark('pos-checkout-start');
   performance.mark('pos-checkout-ui-done');
   ```
4. **Target metrics:**
   - Auth visible UI: <500ms (cached), <2s (cold)
   - POS product grid interactive: <1s after navigation
   - Checkout button → receipt modal: <300ms perceived
   - Firestore reads per active user hour: <200 (down from ~500+)

---

## Priority roadmap

| Week | Focus | Impact |
|------|-------|--------|
| 1 | Phase 1 (done) + pagination on invoices/products | High |
| 2 | HRMS tab lazy load + Inventory virtualization | High |
| 3 | Stats aggregation doc + dashboard rewrite | Medium |
| 4 | Inventory migration to tenant path + batch writes | Medium |
| 5 | IndexedDB write queue + full offline sync | High |

---

## Security & consistency notes

- Optimistic updates must **rollback** on mutation failure (toast + revert cache).
- Field masking in `base44Client` must run after cache patch.
- Permission checks remain server-side via Firestore rules (client cache is UX only).

---

*Last updated: Phase 1 implementation. Run `npm run build` after changes; monitor Firebase console for read trends.*
