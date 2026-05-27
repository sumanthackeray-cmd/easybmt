/**
 * Real-Time Inventory Synchronization Service
 * Handles instant stock updates across all branches with strict tenant-scoped data isolation
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firebaseDb } from './firebase';
import { db as dexieDb, updateInventory as localUpdateInventory } from '@/lib/localDB';

let db = firebaseDb;
const inventoryCache = new Map();

/** One Firestore listener per branch — shared across POS, Inventory, Sync pages. */
const branchHubs = new Map(); // branchId -> { unsubscribe, callbacks: Set, lastData: [] }

export function initializeInventorySyncService(injectedDb) {
  if (injectedDb) db = injectedDb;
}

function getCompanyId() {
  return localStorage.getItem("company_id") || null;
}

function getInventoryCollectionRef() {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Data Isolation Policy Violation: Company ID not found");
  return collection(db, 'companies', companyId, 'inventory');
}

function getInventoryDocRef(inventoryId) {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Data Isolation Policy Violation: Company ID not found");
  return doc(db, 'companies', companyId, 'inventory', inventoryId);
}

/**
 * Get inventory for a specific product in a branch
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Inventory data
 */
export async function getInventory(productId, branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const q = query(
      getInventoryCollectionRef(),
      where('productId', '==', productId),
      where('branchId', '==', branchId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.docs.length > 0) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Get all inventory for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of inventory items
 */
export async function getBranchInventory(branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const q = query(getInventoryCollectionRef(), where('branchId', '==', branchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching branch inventory:', error);
    throw error;
  }
}

/**
 * Update inventory quantity in real-time
 * Called when items are added/removed (billing, stock transfers, purchases)
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID
 * @param {number} quantityDelta - Change in quantity (+/-)
 * @param {string} reason - Reason for change (billing, stock_transfer, purchase, adjustment)
 * @returns {Promise<Object>} Updated inventory
 */
export async function updateInventory(productId, branchId, quantityDelta, reason) {
  try {
    // High-performance local-first inventory adjustment
    await localUpdateInventory(productId, branchId, quantityDelta, reason);

    // Retrieve the updated local record for React compatibility
    const companyId = getCompanyId();
    const allInv = await dexieDb.inventory.where("productId").equals(productId).toArray();
    const inventory = allInv.find(inv => inv.companyId === companyId && inv.branchId === branchId);

    return inventory || { productId, branchId, quantity: Math.max(0, quantityDelta) };
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time inventory changes for a product across all branches
 * @param {string} productId - Product ID
 * @param {Function} callback - Callback function when inventory changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToProductInventory(productId, callback) {
  const fetchAndCallback = async () => {
    try {
      const companyId = localStorage.getItem("company_id");
      if (!companyId) return;
      const inventory = await dexieDb.inventory
        .where('productId')
        .equals(productId)
        .toArray();
      const filtered = inventory.filter(inv => inv.companyId === companyId);
      callback(filtered);
    } catch (e) {
      console.error("Local inventory fetch failed", e);
    }
  };

  fetchAndCallback();

  let timeoutId = null;
  const handleDataUpdated = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fetchAndCallback();
    }, 300);
  };

  window.addEventListener("easybmt-data-updated", handleDataUpdated);
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    window.removeEventListener("easybmt-data-updated", handleDataUpdated);
  };
}

export function subscribeToBranchInventory(branchId, callback) {
  const fetchAndCallback = async () => {
    try {
      const companyId = localStorage.getItem("company_id");
      if (!companyId) return;
      const inventory = await dexieDb.inventory
        .where('branchId')
        .equals(branchId)
        .toArray();
      const filtered = inventory.filter(inv => inv.companyId === companyId);
      callback(filtered);
    } catch (e) {
      console.error("Local branch inventory fetch failed", e);
    }
  };

  fetchAndCallback();

  let timeoutId = null;
  const handleDataUpdated = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fetchAndCallback();
    }, 300);
  };

  window.addEventListener("easybmt-data-updated", handleDataUpdated);
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    window.removeEventListener("easybmt-data-updated", handleDataUpdated);
  };
}

/**
 * Get low stock items for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of low stock items
 */
export async function getLowStockItems(branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const items = await getBranchInventory(branchId);
    return items.filter((row) => {
      const qty = Number(row.quantity ?? 0);
      const reorder = Number(row.reorderPoint ?? 10);
      return qty <= reorder;
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
}

/**
 * Transfer inventory between branches
 * @param {string} productId - Product ID
 * @param {string} fromBranchId - Source branch ID
 * @param {string} toBranchId - Destination branch ID
 * @param {number} quantity - Quantity to transfer
 * @returns {Promise<Object>} Transfer result
 */
export async function transferInventory(productId, fromBranchId, toBranchId, quantity) {
  if (!db) throw new Error('Database not initialized');

  try {
    // Update source branch (reduce)
    await updateInventory(productId, fromBranchId, -quantity, 'transfer_out');

    // Update destination branch (increase)
    await updateInventory(productId, toBranchId, quantity, 'transfer_in');

    return {
      success: true,
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      productId,
      quantity,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error transferring inventory:', error);
    throw error;
  }
}

/**
 * Unsubscribe from real-time updates
 * @param {string} key - Product ID or branch key
 * @returns {void}
 */
export function unsubscribeFromInventory(branchId) {
  const hub = branchHubs.get(branchId);
  if (hub) {
    hub.unsubscribe();
    branchHubs.delete(branchId);
    inventoryCache.delete(`branch_${branchId}`);
  }
}

/**
 * Unsubscribe from all real-time updates
 * @returns {void}
 */
export function unsubscribeFromAllInventory() {
  branchHubs.forEach((hub) => hub.unsubscribe());
  branchHubs.clear();
  inventoryCache.clear();
}

/**
 * Get inventory from cache
 * @param {string} key - Product ID or branch key
 * @returns {Array} Cached inventory data
 */
export function getInventoryFromCache(key) {
  return inventoryCache.get(key) || [];
}

export default {
  initializeInventorySyncService,
  getInventory,
  getBranchInventory,
  updateInventory,
  subscribeToProductInventory,
  subscribeToBranchInventory,
  getLowStockItems,
  transferInventory,
  unsubscribeFromInventory,
  unsubscribeFromAllInventory,
  getInventoryFromCache,
};
