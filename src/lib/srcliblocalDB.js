// src/lib/localDB.js
// Enterprise-grade Local-First Offline Architecture
// EasyBMT SaaS Platform

import Dexie from "dexie";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  increment,
  deleteDoc,
  setDoc,
  limit,
  orderBy
} from "firebase/firestore";

import { db as firestoreDb, auth } from "@/api/firebase";

// ======================================================
// DATABASE
// ======================================================

export const db = new Dexie("easybmt");

// ======================================================
// SCHEMA
// ======================================================

db.version(1).stores({

  products:
    "id, companyId, branchId, name, barcode, category, sku, updatedAtUnix, version, isDeleted",

  customers:
    "id, companyId, branchId, name, phone, email, updatedAtUnix, version, isDeleted",

  inventory:
    "id, companyId, branchId, productId, updatedAtUnix, version, quantity",

  invoices:
    "id, companyId, branchId, invoice_no, customerId, updatedAtUnix, version",

  purchases:
    "id, companyId, branchId, purchase_no, updatedAtUnix, version",

  expenses:
    "id, companyId, branchId, updatedAtUnix, version",

  employees:
    "id, companyId, branchId, updatedAtUnix, version",

  offlineQueue:
    "++queueId, companyId, entityName, action, status, retryCount, nextRetryAt, timestamp",

  syncMeta:
    "collectionKey, updatedAtUnix",

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
// NEVER TRUST LOCALSTORAGE
// ======================================================

export async function getCompanyContext() {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("Authentication required");
  }

  const token = await user.getIdTokenResult();

  const companyId = token.claims.companyId;
  const branchId = token.claims.branchId || "main";

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

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

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

  const record = {
    ...data,
    companyId: ctx.companyId,
    branchId: data.branchId || ctx.branchId,
    updatedAtUnix: nowUnix(),
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
    return null;
  }

  return item;
}

export async function listLocal(storeName, options = {}) {

  const ctx = await getCompanyContext();

  let queryRef = db[storeName]
    .where("companyId")
    .equals(ctx.companyId);

  if (options.limit) {
    return await queryRef.limit(options.limit).toArray();
  }

  return await queryRef.toArray();
}

// ======================================================
// SOFT DELETE
// ======================================================

export async function softDeleteLocal(storeName, id) {

  const item = await getLocal(storeName, id);

  if (!item) return;

  await putLocal(storeName, {
    ...item,
    isDeleted: true,
    deletedAt: nowUnix(),
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
    return barcodeResults;
  }

  // NAME PREFIX MATCH
  return await db.products
    .filter((p) => {

      if (p.companyId !== ctx.companyId) {
        return false;
      }

      return (
        p.name?.toLowerCase().includes(text) ||
        p.category?.toLowerCase().includes(text) ||
        p.sku?.toLowerCase().includes(text)
      );
    })
    .limit(100)
    .toArray();
}

// ======================================================
// OFFLINE QUEUE
// ======================================================

let queueRunning = false;

export async function enqueueMutation(
  entityName,
  action,
  id,
  data
) {

  const ctx = await getCompanyContext();

  await db.offlineQueue.add({

    companyId: ctx.companyId,

    entityName,
    action,
    id,

    data,

    status: "pending",

    retryCount: 0,

    nextRetryAt: nowUnix(),

    timestamp: nowUnix(),

  });

  processOfflineQueue();
}

// ======================================================
// PROCESS OFFLINE QUEUE
// ======================================================

export async function processOfflineQueue() {

  if (queueRunning) return;

  if (!navigator.onLine) return;

  queueRunning = true;

  try {

    const ctx = await getCompanyContext();

    const queueItems = await db.offlineQueue
      .where("companyId")
      .equals(ctx.companyId)
      .toArray();

    for (const item of queueItems) {

      if (item.nextRetryAt > nowUnix()) {
        continue;
      }

      try {

        const docRef = doc(
          firestoreDb,
          "companies",
          ctx.companyId,
          item.entityName,
          item.id
        );

        // =====================================
        // CREATE / UPDATE
        // =====================================

        if (
          item.action === "CREATE" ||
          item.action === "UPDATE"
        ) {

          const payload = {
            ...item.data,

            updatedAtUnix: nowUnix(),

            updatedAt: serverTimestamp(),

            companyId: ctx.companyId,

            version:
              (item.data.version || 0) + 1,
          };

          // INVENTORY SAFE UPDATE

          if (
            item.entityName === "inventory" &&
            item.data.stockDelta
          ) {

            await setDoc(
              docRef,
              {
                quantity: increment(
                  item.data.stockDelta
                ),

                updatedAtUnix: nowUnix(),

                updatedAt: serverTimestamp(),

                companyId: ctx.companyId,
              },
              { merge: true }
            );

          } else {

            await setDoc(docRef, payload, {
              merge: true,
            });

          }
        }

        // =====================================
        // DELETE
        // =====================================

        if (item.action === "DELETE") {

          await setDoc(
            docRef,
            {
              isDeleted: true,
              deletedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        await db.offlineQueue.delete(item.queueId);

      } catch (err) {

        console.error("QUEUE ERROR", err);

        const retryCount = item.retryCount + 1;

        // DEAD QUEUE

        if (retryCount >= MAX_RETRIES) {

          await db.offlineQueue.update(
            item.queueId,
            {
              status: "failed",
              retryCount,
              lastError: err.message,
            }
          );

          continue;
        }

        // EXPONENTIAL BACKOFF

        const nextRetryAt =
          nowUnix() +
          Math.pow(2, retryCount) * 1000;

        await db.offlineQueue.update(
          item.queueId,
          {
            retryCount,
            nextRetryAt,
            status: "retrying",
            lastError: err.message,
          }
        );
      }
    }

  } finally {

    queueRunning = false;
  }
}

// ======================================================
// DELTA SYNC ENGINE
// ======================================================

export async function syncCollection(collectionName) {

  if (!navigator.onLine) return false;

  const ctx = await getCompanyContext();

  const metaKey =
    `${ctx.companyId}_${collectionName}`;

  const syncMeta =
    await db.syncMeta.get(metaKey);

  const lastSync =
    syncMeta?.updatedAtUnix || 0;

  try {

    const q = query(

      collection(
        firestoreDb,
        "companies",
        ctx.companyId,
        collectionName
      ),

      where(
        "updatedAtUnix",
        ">",
        lastSync
      ),

      orderBy("updatedAtUnix"),

      limit(PAGE_SIZE)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return false;
    }

    let newestTimestamp = lastSync;

    await db.transaction(
      "rw",
      db[collectionName],

      async () => {

        for (const fDoc of snapshot.docs) {

          const data = fDoc.data();

          newestTimestamp = Math.max(
            newestTimestamp,
            data.updatedAtUnix || 0
          );

          await db[collectionName].put({
            id: fDoc.id,
            ...data,
          });
        }
      }
    );

    await db.syncMeta.put({
      collectionKey: metaKey,
      updatedAtUnix: newestTimestamp,
    });

    broadcastMutation("SYNC_COMPLETE", {
      collectionName,
    });

    return true;

  } catch (err) {

    console.error(
      "SYNC FAILED",
      collectionName,
      err
    );

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
  ];

  for (const collectionName of collections) {
    await syncCollection(collectionName);
  }
}

// ======================================================
// INVENTORY SAFE UPDATE
// ======================================================

export async function updateInventory(
  productId,
  quantityDelta
) {

  const ctx = await getCompanyContext();

  const inventory = await db.inventory
    .where({
      companyId: ctx.companyId,
      productId,
    })
    .first();

  if (!inventory) {
    throw new Error("Inventory not found");
  }

  const newQuantity =
    (inventory.quantity || 0) +
    quantityDelta;

  // PREVENT NEGATIVE STOCK

  if (newQuantity < 0) {
    throw new Error(
      "Insufficient inventory"
    );
  }

  // LOCAL UPDATE FIRST

  await putLocal("inventory", {
    ...inventory,
    quantity: newQuantity,
  });

  // BACKGROUND SYNC

  await enqueueMutation(
    "inventory",
    "UPDATE",
    inventory.id,
    {
      stockDelta: quantityDelta,
    }
  );
}

// ======================================================
// NETWORK LISTENERS
// ======================================================

window.addEventListener("online", () => {
  processOfflineQueue();
  syncAllCollections();
});

// ======================================================
// BACKGROUND SYNC
// ======================================================

let syncIntervalRef = null;

export function startSyncEngine() {

  if (syncIntervalRef) {
    return;
  }

  syncIntervalRef = setInterval(() => {

    if (!navigator.onLine) {
      return;
    }

    processOfflineQueue();

    syncAllCollections();

  }, SYNC_INTERVAL);
}

export function stopSyncEngine() {

  if (syncIntervalRef) {
    clearInterval(syncIntervalRef);
    syncIntervalRef = null;
  }
}

// ======================================================
// MULTI TAB SYNC
// ======================================================

syncChannel.onmessage = async (event) => {

  const { type } = event.data;

  if (
    type === "LOCAL_PUT" ||
    type === "SYNC_COMPLETE"
  ) {

    // TRIGGER LIGHTWEIGHT UI REFRESH
    window.dispatchEvent(
      new CustomEvent("easybmt-data-updated")
    );
  }
};

// ======================================================
// APP STARTUP
// ======================================================

export async function initializeLocalArchitecture() {

  startSyncEngine();

  if (navigator.onLine) {

    processOfflineQueue();

    syncAllCollections();
  }
}