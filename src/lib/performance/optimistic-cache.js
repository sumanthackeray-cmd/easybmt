import { queryClientInstance } from "@/lib/query-client";

/**
 * Optimistically patch a list in React Query (instant UI before Firestore confirms).
 */
export function patchListItem(queryKey, id, patch) {
  queryClientInstance.setQueryData(queryKey, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((item) => (item.id === id ? { ...item, ...patch } : item));
  });
}

export function prependListItem(queryKey, item) {
  queryClientInstance.setQueryData(queryKey, (old) => {
    if (!Array.isArray(old)) return [item];
    const exists = old.some((i) => i.id === item.id);
    if (exists) return old;
    return [item, ...old];
  });
}

export function adjustProductStockOptimistic(productId, delta) {
  queryClientInstance.setQueryData(["products"], (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((p) => {
      if (p.id !== productId) return p;
      const current = Number(p.stock ?? 0);
      return { ...p, stock: Math.max(0, current - Number(delta || 0)) };
    });
  });
}

export function setBranchInventoryOptimistic(branchId, productId, newQty) {
  queryClientInstance.setQueryData(["branchInventory", branchId], (old) => {
    if (!Array.isArray(old)) return old;
    const idx = old.findIndex((r) => r.productId === productId);
    if (idx === -1) {
      return [...old, { productId, branchId, quantity: newQty }];
    }
    const next = [...old];
    next[idx] = { ...next[idx], quantity: newQty };
    return next;
  });
}
