// src/lib/localDB.js
// Enterprise-grade Local-First Offline Architecture
// EasyBMT SaaS Platform

import Dexie from "dexie";
import { errorLogger } from './errorLogger';
import { withFirebaseRetry, safeAsync } from './retryUtils';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment,
  deleteDoc,
  setDoc,
  limit,
  orderBy,
  writeBatch
} from "firebase/firestore";

import { db as firestoreDb, auth } from "@/api/firebase";

// ======================================================
// DATABASE DECLARATION
// ======================================================

export const db = new Dexie("easybmt");

// ======================================================
// SCHEMA
// ======================================================

db.version(2).stores({
  products: "id, companyId, branchId, name, barcode, category, sku, updated_date, version, isDeleted",
  customers: "id, companyId, branchId, name, phone, email, updated_date, version, isDeleted",
  inventory: "id, companyId, branchId, productId, updated_date, version, quantity",
  invoices: "id, companyId, branchId, invoice_no, customerId, updated_date, version, isDeleted",
  purchases: "id, companyId, branchId, purchase_no, updated_date, version, isDeleted",
  expenses: "id, companyId, branchId, updated_date, version, isDeleted",
  employees: "id, companyId, branchId, updated_date, version, isDeleted",
  loans: "id, companyId, branchId, updated_date, version, isDeleted",
  shopSettings: "id, companyId, updated_date, version, isDeleted",
  userSubscriptions: "id, companyId, updated_date, version, isDeleted",
  roles: "id, companyId, updated_date, version, isDeleted",
  users: "id, companyId, updated_date, version, isDeleted",
  permissions: "id, companyId, updated_date, version, isDeleted",
  sensitiveFieldAccess: "id, companyId, updated_date, version, isDeleted",
  auditLogs: "id, companyId, updated_date, version, isDeleted",
  salaryStructures: "id, companyId, updated_date, version, isDeleted",
  monthlyPayroll: "id, companyId, updated_date, version, isDeleted",
  attendanceLogs: "id, companyId, updated_date, version, isDeleted",
  leaveManagement: "id, companyId, updated_date, version, isDeleted",
  performanceReviews: "id, companyId, updated_date, version, isDeleted",
  employeeDocuments: "id, companyId, updated_date, version, isDeleted",
  employeeLoans: "id, companyId, updated_date, version, isDeleted",
  departments: "id, companyId, updated_date, version, isDeleted",
  designations: "id, companyId, updated_date, version, isDeleted",
  shifts: "id, companyId, updated_date, version, isDeleted",
  holidays: "id, companyId, updated_date, version, isDeleted",
  warehouses: "id, companyId, updated_date, version, isDeleted",
  inventoryMovements: "id, companyId, branchId, productId, updated_date, version, isDeleted",
  offlineQueue: "++queueId, companyId, entityName, action, id, status, retryCount, nextRetryAt, timestamp",
  syncMeta: "collectionKey, updatedAt",
});

db.version(3).stores({
  products: "id, companyId, branchId, name, barcode, category, sku, updated_date, version, isDeleted",
  customers: "id, companyId, branchId, name, phone, email, updated_date, version, isDeleted",
  inventory: "id, companyId, branchId, productId, updated_date, version, quantity",
  invoices: "id, companyId, branchId, invoice_no, customerId, updated_date, version, isDeleted",
  purchases: "id, companyId, branchId, purchase_no, updated_date, version, isDeleted",
  expenses: "id, companyId, branchId, updated_date, version, isDeleted",
  employees: "id, companyId, branchId, updated_date, version, isDeleted",
  loans: "id, companyId, branchId, updated_date, version, isDeleted",
  shopSettings: "id, companyId, updated_date, version, isDeleted",
  userSubscriptions: "id, companyId, updated_date, version, isDeleted",
  roles: "id, companyId, updated_date, version, isDeleted",
  users: "id, companyId, updated_date, version, isDeleted",
  permissions: "id, companyId, updated_date, version, isDeleted",
  sensitiveFieldAccess: "id, companyId, updated_date, version, isDeleted",
  auditLogs: "id, companyId, updated_date, version, isDeleted",
  salaryStructures: "id, companyId, updated_date, version, isDeleted",
  monthlyPayroll: "id, companyId, updated_date, version, isDeleted",
  attendanceLogs: "id, companyId, updated_date, version, isDeleted",
  leaveManagement: "id, companyId, updated_date, version, isDeleted",
  performanceReviews: "id, companyId, updated_date, version, isDeleted",
  employeeDocuments: "id, companyId, updated_date, version, isDeleted",
  employeeLoans: "id, companyId, updated_date, version, isDeleted",
  departments: "id, companyId, updated_date, version, isDeleted",
  designations: "id, companyId, updated_date, version, isDeleted",
  shifts: "id, companyId, updated_date, version, isDeleted",
  holidays: "id, companyId, updated_date, version, isDeleted",
  warehouses: "id, companyId, updated_date, version, isDeleted",
  inventoryMovements: "id, companyId, branchId, productId, updated_date, version, isDeleted",
  offlineQueue: "++queueId, companyId, entityName, action, id, status, retryCount, nextRetryAt, timestamp",
  syncMeta: "collectionKey, updatedAt",
  
  // Manufacturing ERP tables
  manufacturingOrders: "id, companyId, branchId, orderNumber, customerId, productCategory, isDeleted",
  productionBatches: "id, companyId, branchId, batchNumber, orderId, isDeleted",
  productionSerials: "id, companyId, branchId, batchId, customerId, productSize, serialNumber, [companyId+customerId+productSize+serialNumber], isDeleted",
  rawMaterialInventory: "id, companyId, branchId, materialName, materialType, isDeleted",
  consumablesInventory: "id, companyId, branchId, consumableName, isDeleted",
  finishedGoodsInventory: "id, companyId, branchId, productId, isDeleted",
  materialIssues: "id, companyId, branchId, issueNumber, orderId, isDeleted",
  productionStages: "id, companyId, name, isDeleted",
  qualityChecks: "id, companyId, branchId, batchId, serialId, checkStatus, isDeleted",
  dispatches: "id, companyId, branchId, dispatchNumber, customerId, isDeleted",
  barcodePrintLogs: "id, companyId, barcodeType, isDeleted",
  inventoryTransactions: "id, companyId, branchId, transactionType, isDeleted",
  machineAssignments: "id, companyId, branchId, machineName, isDeleted",
  productionOperators: "id, companyId, branchId, operatorName, isDeleted"
});

db.version(4).stores({
  products: "id, companyId, branchId, name, barcode, category, sku, updated_date, version, isDeleted",
  customers: "id, companyId, branchId, name, phone, email, updated_date, version, isDeleted",
  inventory: "id, companyId, branchId, productId, updated_date, version, quantity",
  invoices: "id, companyId, branchId, invoice_no, customerId, updated_date, version, isDeleted",
  purchases: "id, companyId, branchId, purchase_no, updated_date, version, isDeleted",
  expenses: "id, companyId, branchId, updated_date, version, isDeleted",
  employees: "id, companyId, branchId, updated_date, version, isDeleted",
  loans: "id, companyId, branchId, updated_date, version, isDeleted",
  shopSettings: "id, companyId, updated_date, version, isDeleted",
  userSubscriptions: "id, companyId, updated_date, version, isDeleted",
  roles: "id, companyId, updated_date, version, isDeleted",
  users: "id, companyId, updated_date, version, isDeleted",
  permissions: "id, companyId, updated_date, version, isDeleted",
  sensitiveFieldAccess: "id, companyId, updated_date, version, isDeleted",
  auditLogs: "id, companyId, updated_date, version, isDeleted",
  salaryStructures: "id, companyId, updated_date, version, isDeleted",
  monthlyPayroll: "id, companyId, updated_date, version, isDeleted",
  attendanceLogs: "id, companyId, updated_date, version, isDeleted",
  leaveManagement: "id, companyId, updated_date, version, isDeleted",
  performanceReviews: "id, companyId, updated_date, version, isDeleted",
  employeeDocuments: "id, companyId, updated_date, version, isDeleted",
  employeeLoans: "id, companyId, updated_date, version, isDeleted",
  departments: "id, companyId, updated_date, version, isDeleted",
  designations: "id, companyId, updated_date, version, isDeleted",
  shifts: "id, companyId, updated_date, version, isDeleted",
  holidays: "id, companyId, updated_date, version, isDeleted",
  warehouses: "id, companyId, updated_date, version, isDeleted",
  inventoryMovements: "id, companyId, branchId, productId, updated_date, version, isDeleted",
  offlineQueue: "++queueId, companyId, entityName, action, id, status, retryCount, nextRetryAt, timestamp",
  syncMeta: "collectionKey, updatedAt",
  manufacturingOrders: "id, companyId, branchId, orderNumber, customerId, productCategory, isDeleted",
  productionBatches: "id, companyId, branchId, batchNumber, orderId, isDeleted",
  productionSerials: "id, companyId, branchId, batchId, customerId, productSize, serialNumber, [companyId+customerId+productSize+serialNumber], isDeleted",
  rawMaterialInventory: "id, companyId, branchId, materialName, materialType, isDeleted",
  consumablesInventory: "id, companyId, branchId, consumableName, isDeleted",
  finishedGoodsInventory: "id, companyId, branchId, productId, isDeleted",
  materialIssues: "id, companyId, branchId, issueNumber, orderId, isDeleted",
  productionStages: "id, companyId, name, isDeleted",
  qualityChecks: "id, companyId, branchId, batchId, serialId, checkStatus, isDeleted",
  dispatches: "id, companyId, branchId, dispatchNumber, customerId, isDeleted",
  barcodePrintLogs: "id, companyId, barcodeType, isDeleted",
  inventoryTransactions: "id, companyId, branchId, transactionType, isDeleted",
  machineAssignments: "id, companyId, branchId, machineName, isDeleted",
  productionOperators: "id, companyId, branchId, operatorName, isDeleted",
  posSessions: "id, companyId, branchId, counter_id, status, isDeleted",
  priceRules: "id, companyId, branchId, ruleType, isDeleted",
  loyaltyCards: "id, companyId, branchId, phone, card_number, isDeleted"
});

// ======================================================
// CONSTANTS
// ======================================================

const SYNC_INTERVAL = 15000;
const MAX_RETRIES = 5;
const PAGE_SIZE = 500;

// ======================================================
// BROADCAST CHANNEL
// ======================================================

const syncChannel = new BroadcastChannel("easybmt-sync");

export function broadcastMutation(type, payload) {
  try {
    syncChannel.postMessage({
      type,
      payload,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn("Broadcast failed", e);
  }
}

// ======================================================
// SECURE COMPANY CONTEXT
// ======================================================

export async function getCompanyContext() {
  const user = auth.currentUser;
  if (!user) {
    // If not in auth object, fallback to localStorage
    const companyId = localStorage.getItem("company_id");
    const cachedUser = localStorage.getItem("base44_cached_user");
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        resolvedCompanyId = parsed.companyId || parsed.company_id || parsed.resolvedCompanyId;
      } catch (_) {}
    }
    if (!resolvedCompanyId) {
      throw new Error("Authentication required");
    }
    return {
      companyId: resolvedCompanyId,
      branchId: localStorage.getItem("branch_id") || "main",
      userId: user ? user.uid : "unknown",
    };
  }

  const token = await user.getIdTokenResult();
  const companyId = token.claims.companyId || token.claims.company_id || localStorage.getItem("company_id");
  const branchId = token.claims.branchId || token.claims.branch_id || "main";

  if (!companyId) {
    throw new Error("Company context missing");
  }

  return {
    companyId,
    branchId,
    userId: user.uid,
  };
}

// ======================================================
// UTILITIES
// ======================================================

export function generateId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export function nowUnix() {
  return Date.now();
}

// ======================================================
// LOCAL DATABASE OPERATIONS
// ======================================================

export async function putLocal(storeName, data) {
  const ctx = await getCompanyContext();

  // Enforce company integrity check at low DB level
  if (data.companyId && data.companyId !== ctx.companyId) {
    throw new Error(`403 Forbidden: Data Isolation Violation. Target companyId ${data.companyId} mismatch with current context ${ctx.companyId}`);
  }

  // Enforce branch isolation check for non-admin profiles
  const profileStr = localStorage.getItem(`rbac_profile_${ctx.userId}`);
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      const userLevel = profile.hierarchy_level || 7;
      if (userLevel > 3) {
        const userBranch = profile.branch_id || profile.branchId || ctx.branchId;
        const targetBranch = data.branchId || data.branch_id || ctx.branchId;
        if (userBranch && targetBranch && userBranch !== targetBranch && userBranch !== 'null' && userBranch !== 'all') {
          throw new Error(`403 Forbidden: Branch Isolation Violation in ${storeName}. Account locked to branch ${userBranch}, but attempted mutation in branch ${targetBranch}`);
        }
      }
    } catch (_) {}
  }

  // Enterprise duplicate prevention with self-healing suffix resolution
  if (storeName === "invoices") {
    let invNo = data.invoice_number || data.invoice_no;
    if (invNo) {
      let uniqueInvNo = invNo;
      let counter = 1;
      let exists = await db.invoices.where("invoice_no").equals(uniqueInvNo).first();
      
      while (exists) {
        uniqueInvNo = `${invNo}-${String.fromCharCode(64 + counter)}`; // Appends -A, -B, etc.
        exists = await db.invoices.where("invoice_no").equals(uniqueInvNo).first();
        counter++;
        if (counter > 26) {
          uniqueInvNo = `${invNo}-${Date.now().toString().slice(-4)}`;
          break;
        }
      }
      data.invoice_no = uniqueInvNo;
      data.invoice_number = uniqueInvNo;
    }
  }

  const record = {
    ...data,
    companyId: ctx.companyId,
    branchId: data.branchId || ctx.branchId,
    updated_date: new Date().toISOString(),
    version: (data.version || 0) + 1,
  };

  await db[storeName].put(record);

  broadcastMutation("LOCAL_PUT", {
    storeName,
    id: record.id,
  });

  return record;
}

export async function getLocal(storeName, id) {
  const ctx = await getCompanyContext();
  const item = await db[storeName].get(id);

  if (!item) return null;
  if (item.companyId !== ctx.companyId) {
    throw new Error("403 Forbidden: Access denied to other tenant data.");
  }
  
  // Branch-wise access control
  const profileStr = localStorage.getItem(`rbac_profile_${ctx.userId}`);
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      const userLevel = profile.hierarchy_level || 7;
      const userBranch = profile.branch_id || profile.branchId || ctx.branchId;
      const isGlobalTable = ["shopSettings", "userSubscriptions", "roles", "users", "permissions", "sensitiveFieldAccess"].includes(storeName);
      if (userLevel > 3 && !isGlobalTable && userBranch && userBranch !== 'null' && userBranch !== 'all') {
        const itemBranch = item.branchId || item.branch_id || ctx.branchId;
        if (itemBranch !== userBranch) {
          return null; // Strict branch-wise container isolation
        }
      }
    } catch (_) {}
  }

  if (item.isDeleted) return null;

  return item;
}

export async function listLocal(storeName, options = {}) {
  const ctx = await getCompanyContext();
  
  if (options.companyId && options.companyId !== ctx.companyId) {
    throw new Error("403 Forbidden: Cannot list items from another company context.");
  }

  let queryRef = db[storeName]
    .where("companyId")
    .equals(ctx.companyId);

  if (options.offset) {
    queryRef = queryRef.offset(options.offset);
  }

  let items;
  if (options.limit) {
    items = await queryRef.limit(options.limit).toArray();
  } else {
    items = await queryRef.toArray();
  }

  // Branch-wise list filtering
  const profileStr = localStorage.getItem(`rbac_profile_${ctx.userId}`);
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      const userLevel = profile.hierarchy_level || 7;
      const userBranch = profile.branch_id || profile.branchId || ctx.branchId;
      const isGlobalTable = ["shopSettings", "userSubscriptions", "roles", "users", "permissions", "sensitiveFieldAccess"].includes(storeName);
      if (userLevel > 3 && !isGlobalTable && userBranch && userBranch !== 'null' && userBranch !== 'all') {
        items = items.filter(item => {
          const itemBranch = item.branchId || item.branch_id || ctx.branchId;
          return itemBranch === userBranch;
        });
      }
    } catch (_) {}
  }

  return items.filter((item) => !item.isDeleted);
}

// ======================================================
// SOFT DELETE
// ======================================================

export async function softDeleteLocal(storeName, id) {
  const ctx = await getCompanyContext();
  const item = await db[storeName].get(id);
  if (!item) return;

  if (item.companyId !== ctx.companyId) {
    throw new Error("403 Forbidden: Cannot delete another tenant's data.");
  }

  // Enforce branch isolation check for non-admin profiles on deletes
  const profileStr = localStorage.getItem(`rbac_profile_${ctx.userId}`);
  if (profileStr) {
    try {
      const profile = JSON.parse(profileStr);
      const userLevel = profile.hierarchy_level || 7;
      if (userLevel > 3) {
        const userBranch = profile.branch_id || profile.branchId || ctx.branchId;
        const itemBranch = item.branchId || item.branch_id || ctx.branchId;
        if (userBranch && itemBranch && userBranch !== itemBranch && userBranch !== 'null' && userBranch !== 'all') {
          throw new Error(`403 Forbidden: Cannot delete items from another branch.`);
        }
      }
    } catch (_) {}
  }

  const updatedItem = {
    ...item,
    isDeleted: true,
    updated_date: new Date().toISOString(),
  };

  await db[storeName].put(updatedItem);

  broadcastMutation("LOCAL_PUT", {
    storeName,
    id,
  });

  await enqueueMutation(storeName, "DELETE", id, {
    isDeleted: true,
  });
}

// ======================================================
// SEARCH ENGINE
// ======================================================

export async function searchProducts(searchText = "") {
  const ctx = await getCompanyContext();
  const text = searchText.trim().toLowerCase();

  if (!text) {
    return await db.products
      .where("companyId")
      .equals(ctx.companyId)
      .limit(100)
      .toArray();
  }

  // BARCODE EXACT MATCH
  const barcodeResults = await db.products
    .where("barcode")
    .equals(text)
    .toArray();

  if (barcodeResults.length) {
    return barcodeResults.filter((p) => p.companyId === ctx.companyId && !p.isDeleted);
  }

  // NAME PREFIX MATCH
  const allProducts = await db.products
    .where("companyId")
    .equals(ctx.companyId)
    .toArray();

  return allProducts
    .filter((p) => {
      if (p.isDeleted) return false;
      return (
        p.name?.toLowerCase().includes(text) ||
        p.category?.toLowerCase().includes(text) ||
        p.sku?.toLowerCase().includes(text)
      );
    })
    .slice(0, 100);
}

// ======================================================
// OFFLINE QUEUE
// ======================================================

let queueRunning = false;

export async function enqueueMutation(entityName, action, id, data) {
  const ctx = await getCompanyContext();

  if (data.companyId && data.companyId !== ctx.companyId) {
    throw new Error(`403 Forbidden: Mismatch mutation context companyId ${data.companyId}`);
  }

  await db.offlineQueue.add({
    companyId: ctx.companyId,
    entityName,
    action,
    id,
    data: {
      ...data,
      companyId: ctx.companyId,
    },
    status: "pending",
    retryCount: 0,
    nextRetryAt: nowUnix(),
    timestamp: nowUnix(),
  });

  processOfflineQueue();
}

// ======================================================
// QUEUE CORRUPTION RECOVERY
// ======================================================

/**
 * On startup, reset any 'failed' items older than 1 hour back to 'pending'
 * for one additional retry cycle, and delete corrupt (unprocessable) entries.
 */
export async function recoverCorruptedQueue() {
  try {
    const ctx = await getCompanyContext();
    const oneHourAgo = nowUnix() - 60 * 60 * 1000;

    const allItems = await db.offlineQueue
      .where("companyId")
      .equals(ctx.companyId)
      .toArray();

    for (const item of allItems) {
      // Strip corrupt entries: missing required fields or unparseable data
      const isCorrupt =
        !item.entityName ||
        !item.id ||
        !item.action ||
        (item.data !== null && item.data !== undefined && typeof item.data !== 'object');

      if (isCorrupt) {
        errorLogger.warn('OfflineQueue', `Removing corrupt queue item queueId=${item.queueId}`, {
          entityName: item.entityName,
          id: item.id,
        });
        await db.offlineQueue.delete(item.queueId);
        continue;
      }

      // Reset stale 'failed' items older than 1 hour for one more attempt
      if (item.status === 'failed' && item.timestamp < oneHourAgo) {
        errorLogger.info('OfflineQueue', `Recovering stale failed item queueId=${item.queueId}`, {
          entityName: item.entityName,
          action: item.action,
        });
        await db.offlineQueue.update(item.queueId, {
          status: 'pending',
          retryCount: 0,
          nextRetryAt: nowUnix(),
          lastError: null,
        });
      }
    }

    errorLogger.info('OfflineQueue', 'Queue corruption recovery complete');
  } catch (err) {
    errorLogger.captureError('OfflineQueue', err, { context: 'recoverCorruptedQueue' });
  }
}

// ======================================================
// PROCESS OFFLINE QUEUE
// ======================================================

export async function processOfflineQueue() {
  if (queueRunning) return;
  if (!navigator.onLine) return;

  queueRunning = true;

  try {
    // Web Locks API guarantees this is only executed by one tab at a time
    await navigator.locks.request('easybmt_offline_sync', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        // Another tab is currently running the sync, skip.
        return;
      }

      const ctx = await getCompanyContext();

      const queueItems = await db.offlineQueue
        .where("companyId")
        .equals(ctx.companyId)
        .toArray();

      // --- ENTERPRISE BATCH OPTIMIZATION ---
      // Chunk items into batches of up to 400 (Firestore limit is 500, keeping safe margin)
      const BATCH_SIZE = 400;
      for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
        const chunk = queueItems.slice(i, i + BATCH_SIZE);
        const batchOps = [];

        for (const item of chunk) {
          if (item.nextRetryAt > nowUnix()) continue;
          if (!item.entityName || !item.id || !item.action) {
            await db.offlineQueue.delete(item.queueId);
            continue;
          }
          batchOps.push(item);
        }

        if (batchOps.length === 0) continue;

        // Attempt Batch Write
        try {
          const batch = writeBatch(firestoreDb);
          batchOps.forEach(item => {
            const docRef = doc(firestoreDb, "companies", ctx.companyId, item.entityName, item.id);
            
            if (item.action === "CREATE" || item.action === "UPDATE") {
              const payload = {
                ...item.data,
                updated_date: new Date().toISOString(),
                companyId: ctx.companyId,
                version: (item.data?.version || 0) + 1,
              };
              if (item.entityName === "inventory" && item.data?.stockDelta) {
                batch.set(docRef, {
                  quantity: increment(item.data.stockDelta),
                  updated_date: new Date().toISOString(),
                  companyId: ctx.companyId,
                }, { merge: true });
              } else {
                batch.set(docRef, payload, { merge: true });
              }
            } else if (item.action === "DELETE") {
              batch.delete(docRef);
            }
          });

          // Execute batch
          await batch.commit();

          // If batch succeeds, delete all processed items from offline queue
          for (const item of batchOps) {
            await db.offlineQueue.delete(item.queueId);
          }

        } catch (batchErr) {
          errorLogger.warn('OfflineQueue', `Batch failed, falling back to sequential: ${batchErr.message}`);
          
          // --- FALLBACK: Sequential processing if batch fails (e.g. permission error on 1 doc) ---
          for (const item of batchOps) {
            try {
              const docRef = doc(firestoreDb, "companies", ctx.companyId, item.entityName, item.id);
              await withFirebaseRetry(async () => {
                if (item.action === "CREATE" || item.action === "UPDATE") {
                  const payload = {
                    ...item.data,
                    updated_date: new Date().toISOString(),
                    companyId: ctx.companyId,
                    version: (item.data?.version || 0) + 1,
                  };
                  if (item.entityName === "inventory" && item.data?.stockDelta) {
                    await setDoc(docRef, {
                      quantity: increment(item.data.stockDelta),
                      updated_date: new Date().toISOString(),
                      companyId: ctx.companyId,
                    }, { merge: true });
                  } else {
                    await setDoc(docRef, payload, { merge: true });
                  }
                } else if (item.action === "DELETE") {
                  await deleteDoc(docRef);
                }
              }, `Queue:${item.entityName}:${item.action}`);

              await db.offlineQueue.delete(item.queueId);


            } catch (err) {
              errorLogger.captureError('OfflineQueue', err, {
                entityName: item.entityName,
                action: item.action,
                id: item.id,
                retryCount: item.retryCount,
              });

              const retryCount = (item.retryCount || 0) + 1;

              if (retryCount >= MAX_RETRIES) {
                await db.offlineQueue.update(item.queueId, {
                  status: "failed",
                  retryCount,
                  lastError: err.message,
                });
                continue;
              }

              // Exponential backoff
              const nextRetryAt = nowUnix() + Math.pow(2, retryCount) * 1000;
              await db.offlineQueue.update(item.queueId, {
                retryCount,
                nextRetryAt,
                status: "retrying",
                lastError: err.message,
              });
            }
          }
        }
      }
    }); // End of lock
  } catch (globalErr) {
    errorLogger.captureError('OfflineQueue', globalErr, { context: 'processOfflineQueue' });
  } finally {
    queueRunning = false;
  }
}

// ======================================================
// DELTA SYNC ENGINE
// ======================================================

export async function syncCollection(collectionName) {
  if (!navigator.onLine) return false;
  if (!db[collectionName]) {
    errorLogger.warn('SyncEngine', `Unknown collection: ${collectionName}`);
    return false;
  }

  const ctx = await getCompanyContext();
  const metaKey = `${ctx.companyId}_${collectionName}`;
  const syncMeta = await db.syncMeta.get(metaKey);
  const lastSync = syncMeta?.updatedAt || "";

  try {
    let q;
    if (lastSync) {
      q = query(
        collection(firestoreDb, "companies", ctx.companyId, collectionName),
        where("updated_date", ">", lastSync)
      );
    } else {
      q = query(
        collection(firestoreDb, "companies", ctx.companyId, collectionName)
      );
    }

    // Wrap in Firebase retry for transient network errors
    const snapshot = await withFirebaseRetry(
      () => getDocs(q),
      `syncCollection:${collectionName}`
    );

    if (snapshot.empty) return false;

    let newestTimestamp = lastSync;
    let conflictCount = 0;

    await db.transaction("rw", db[collectionName], async () => {
      for (const fDoc of snapshot.docs) {
        const remoteData = fDoc.data();
        const docUpdated = remoteData.updated_date || "";
        if (docUpdated > newestTimestamp) {
          newestTimestamp = docUpdated;
        }

        // ── Sync conflict detection ───────────────────────────────────────
        const localDoc = await db[collectionName].get(fDoc.id);
        if (
          localDoc &&
          localDoc.version !== undefined &&
          remoteData.version !== undefined &&
          remoteData.version < localDoc.version
        ) {
          // Remote is OLDER than local — server-wins policy: log and skip
          conflictCount++;
          errorLogger.warn('SyncConflict', `Conflict on ${collectionName}/${fDoc.id}`, {
            localVersion: localDoc.version,
            remoteVersion: remoteData.version,
          });
          // Server wins: overwrite with remote to maintain consistency
          // This prevents local ghost edits from persisting indefinitely.
        }
        // ── End conflict detection ────────────────────────────────────────

        await db[collectionName].put({
          id: fDoc.id,
          ...remoteData,
        });
      }
    });

    if (conflictCount > 0) {
      errorLogger.warn('SyncEngine', `${conflictCount} conflict(s) resolved (server-wins) for ${collectionName}`);
    }

    await db.syncMeta.put({
      collectionKey: metaKey,
      updatedAt: newestTimestamp,
    });

    broadcastMutation("SYNC_COMPLETE", { collectionName });
    return true;

  } catch (err) {
    errorLogger.captureError('SyncEngine', err, { collectionName });
    return false;
  }
}

// ======================================================
// SYNC ALL
// ======================================================

export async function syncAllCollections() {
  const collections = [
    "products",
    "customers",
    "inventory",
    "invoices",
    "expenses",
    "purchases",
    "loans",
    "shopSettings",
    "userSubscriptions",
    "roles",
    "users",
    "permissions",
    "sensitiveFieldAccess",
    "auditLogs",
    "salaryStructures",
    "monthlyPayroll",
    "attendanceLogs",
    "leaveManagement",
    "performanceReviews",
    "employeeDocuments",
    "employeeLoans",
    "departments",
    "designations",
    "shifts",
    "holidays",
    "warehouses",
    "inventoryMovements",
    "manufacturingOrders",
    "productionBatches",
    "productionSerials",
    "rawMaterialInventory",
    "consumablesInventory",
    "finishedGoodsInventory",
    "materialIssues",
    "productionStages",
    "qualityChecks",
    "dispatches",
    "barcodePrintLogs",
    "inventoryTransactions",
    "machineAssignments",
    "productionOperators",
    "posSessions",
    "priceRules",
    "loyaltyCards"
  ];

  for (const collectionName of collections) {
    await syncCollection(collectionName);
  }
}

// ======================================================
// INVENTORY SAFE UPDATE
// ======================================================

export async function updateInventory(productId, branchId, quantityDelta, reason = "") {
  const ctx = await getCompanyContext();
  const targetBranch = branchId || ctx.branchId;

  const allInv = await db.inventory.where("productId").equals(productId).toArray();
  const inventory = allInv.find(
    (inv) => inv.companyId === ctx.companyId && inv.branchId === targetBranch
  );

  let record;
  if (!inventory) {
    record = {
      id: `${productId}_${targetBranch}`,
      branchId: targetBranch,
      productId,
      quantity: Math.max(0, quantityDelta),
    };
  } else {
    const newQuantity = Math.max(0, (inventory.quantity || 0) + quantityDelta);
    record = {
      ...inventory,
      quantity: newQuantity,
    };
  }

  const saved = await putLocal("inventory", record);

  await enqueueMutation("inventory", "UPDATE", saved.id, {
    productId,
    branchId: targetBranch,
    quantity: saved.quantity,
    stockDelta: quantityDelta,
  });

  // Append inventory movement log (append-only ledger tracking)
  const movementRecord = {
    id: generateId(),
    companyId: ctx.companyId,
    branchId: targetBranch,
    productId,
    quantityDelta,
    previousQuantity: inventory ? (inventory.quantity || 0) : 0,
    newQuantity: saved.quantity,
    type: reason || "adjustment",
    notes: reason || "Stock adjusted manually",
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
  };

  await putLocal("inventoryMovements", movementRecord);
  await enqueueMutation("inventoryMovements", "CREATE", movementRecord.id, movementRecord);
}

// ======================================================
// TRANSACTION-SAFE INVENTORY VALIDATION & RESERVATION
// ======================================================

export async function validateAndReserveInventory(items, branchId) {
  const ctx = await getCompanyContext();
  const targetBranch = branchId || ctx.branchId;
  const updatedRecords = [];

  await db.transaction("rw", db.inventory, db.shopSettings, db.products, db.offlineQueue, async () => {
    // 1. Fetch shop settings to check negative stock preference
    const settings = await db.shopSettings.where("companyId").equals(ctx.companyId).first();
    const allowNegative = settings ? !!settings.allow_negative_stock : false;

    // 2. Process all products sequentially under transaction scope
    for (const item of items) {
      const productId = item.product_id || item.id;
      const qty = Number(item.qty || item.quantity || 1);

      const allInv = await db.inventory.where("productId").equals(productId).toArray();
      const inventory = allInv.find(
        (inv) => inv.companyId === ctx.companyId && inv.branchId === targetBranch
      );

      let currentQty = inventory ? Number(inventory.quantity || 0) : 0;
      
      if (!inventory) {
         const globalProd = await db.products.get(productId);
         if (globalProd && globalProd.companyId === ctx.companyId) {
            currentQty = Number(globalProd.stock || 0);
         }
      }

      const nextQty = currentQty - qty;

      if (nextQty < 0 && !allowNegative) {
        throw new Error(`422 Unprocessable Entity: Insufficient stock for product "${item.name || productId}". Available: ${currentQty}`);
      }

      let record;
      if (!inventory) {
        record = {
          id: `${productId}_${targetBranch}`,
          branchId: targetBranch,
          productId,
          companyId: ctx.companyId,
          quantity: nextQty,
          updated_date: new Date().toISOString(),
          version: 1
        };
      } else {
        record = {
          ...inventory,
          quantity: nextQty,
          updated_date: new Date().toISOString(),
          version: (inventory.version || 0) + 1
        };
      }

      // Safe update
      await db.inventory.put(record);

      // Queue increment sync delta
      await db.offlineQueue.add({
        companyId: ctx.companyId,
        entityName: "inventory",
        action: "UPDATE",
        id: record.id,
        data: {
          productId,
          branchId: targetBranch,
          quantity: record.quantity,
          stockDelta: -qty,
          companyId: ctx.companyId
        },
        status: "pending",
        retryCount: 0,
        nextRetryAt: nowUnix(),
        timestamp: nowUnix(),
      });
      
      updatedRecords.push(record);
    }
  });

  updatedRecords.forEach(rec => {
    broadcastMutation("LOCAL_PUT", {
      storeName: "inventory",
      id: rec.id,
    });
  });
  
  processOfflineQueue();
}

// ======================================================
// NETWORK LISTENERS
// ======================================================

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processOfflineQueue();
    syncAllCollections();
  });
}

// ======================================================
// BACKGROUND SYNC
// ======================================================

let syncIntervalRef = null;
let inventoryUnsubscribe = null;

export async function startRealtimeInventorySync() {
  if (inventoryUnsubscribe) return;
  const ctx = await getCompanyContext();
  if (!ctx.companyId) return;

  const { onSnapshot, collection } = await import("firebase/firestore");
  const colRef = collection(firestoreDb, "companies", ctx.companyId, "inventory");
  
  inventoryUnsubscribe = onSnapshot(colRef, async (snapshot) => {
    let changed = false;
    await db.transaction("rw", db.inventory, async () => {
      for (const docChange of snapshot.docChanges()) {
        const data = docChange.doc.data();
        if (docChange.type === 'added' || docChange.type === 'modified') {
          const existing = await db.inventory.get(docChange.doc.id);
          if (!existing || data.updated_date > (existing.updated_date || "")) {
            await db.inventory.put({ id: docChange.doc.id, ...data });
            changed = true;
          }
        } else if (docChange.type === 'removed') {
          await db.inventory.delete(docChange.doc.id);
          changed = true;
        }
      }
    });
    
    if (changed) {
      broadcastMutation("SYNC_COMPLETE", { collectionName: "inventory" });
    }
  });
}

export function startSyncEngine() {
  if (syncIntervalRef) return;
  
  startRealtimeInventorySync().catch(console.error);

  syncIntervalRef = setInterval(() => {
    if (!navigator.onLine) return;
    processOfflineQueue().catch(console.error);
    syncAllCollections().catch(console.error);
  }, SYNC_INTERVAL);
}

export function stopSyncEngine() {
  if (syncIntervalRef) {
    clearInterval(syncIntervalRef);
    syncIntervalRef = null;
  }
  if (inventoryUnsubscribe) {
    inventoryUnsubscribe();
    inventoryUnsubscribe = null;
  }
}

// ======================================================
// MULTI TAB SYNC
// ======================================================

syncChannel.onmessage = async (event) => {
  const { type } = event.data;
  if (type === "LOCAL_PUT" || type === "SYNC_COMPLETE") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("easybmt-data-updated"));
    }
  }
};

// ======================================================
// APP STARTUP
// ======================================================

export async function initializeLocalArchitecture() {
  // 1. Recover any corrupted/stale queue items before processing
  await safeAsync(() => recoverCorruptedQueue(), 'LocalDB');

  // 2. Start periodic sync engine
  startSyncEngine();

  // 3. Immediate first sync if online
  if (navigator.onLine) {
    safeAsync(() => processOfflineQueue(), 'LocalDB');
    safeAsync(() => syncAllCollections(), 'LocalDB');
  }

  errorLogger.info('LocalDB', 'Local architecture initialized');
}
