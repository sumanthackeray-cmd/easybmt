/**
 * Real-Time Inventory Synchronization Service - Supabase Edition
 * Handles instant stock updates across all branches
 * Uses Supabase real-time subscriptions for sync
 */

import { supabase } from './supabase';

let client = null;
const syncListeners = new Map();
const inventoryCache = new Map();

export function initializeInventorySyncService(supabaseClient) {
  client = supabaseClient;
}

/**
 * Get inventory for a specific product in a branch
 * @param {string} productId - Product ID
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Inventory data
 */
export async function getInventory(productId, branchId) {
  if (!client) throw new Error('Supabase client not initialized');

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('branch_id', branchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('[v0] Error fetching inventory:', error);
    throw error;
  }
}

/**
 * Get all inventory for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of inventory items
 */
export async function getBranchInventory(branchId) {
  if (!client) throw new Error('Supabase client not initialized');

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching branch inventory:', error);
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
  if (!client) throw new Error('Supabase client not initialized');

  try {
    const inventory = await getInventory(productId, branchId);
    
    if (!inventory) {
      // Auto-create/initialize the branch inventory if it doesn't exist
      const { data, error } = await supabase
        .from('inventory')
        .insert([{
          product_id: productId,
          branch_id: branchId,
          quantity: Math.max(0, quantityDelta),
          reorder_point: 10,
          reorder_quantity: 50,
          last_restock_date: quantityDelta > 0 ? new Date().toISOString() : null,
          last_update_reason: reason || 'stock_initialization',
          last_update_quantity: quantityDelta,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const newQuantity = Math.max(0, inventory.quantity + quantityDelta);
    const { data, error } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        last_restock_date: quantityDelta > 0 ? new Date().toISOString() : inventory.last_restock_date,
        updated_at: new Date().toISOString(),
        last_update_reason: reason,
        last_update_quantity: quantityDelta,
      })
      .eq('id', inventory.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[v0] Error updating inventory:', error);
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
  if (!client) {
    console.error('[v0] Supabase client not initialized');
    return () => {};
  }

  try {
    const subscription = supabase
      .channel(`inventory_product_${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `product_id=eq.${productId}`,
        },
        async () => {
          // Fetch updated inventory
          const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_id', productId);

          if (!error && data) {
            inventoryCache.set(productId, data);
            callback(data);
          }
        }
      )
      .subscribe();

    // Store unsubscribe function
    if (!syncListeners.has(productId)) {
      syncListeners.set(productId, []);
    }
    syncListeners.get(productId).push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('[v0] Error subscribing to product inventory:', error);
    return () => {};
  }
}

/**
 * Subscribe to real-time inventory changes for a branch
 * @param {string} branchId - Branch ID
 * @param {Function} callback - Callback function when inventory changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBranchInventory(branchId, callback) {
  if (!client) {
    console.error('[v0] Supabase client not initialized');
    return () => {};
  }

  try {
    const cacheKey = `branch_${branchId}`;
    const subscription = supabase
      .channel(`inventory_branch_${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `branch_id=eq.${branchId}`,
        },
        async () => {
          // Fetch updated inventory
          const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('branch_id', branchId);

          if (!error && data) {
            inventoryCache.set(cacheKey, data);
            callback(data);
          }
        }
      )
      .subscribe();

    // Store unsubscribe function
    if (!syncListeners.has(cacheKey)) {
      syncListeners.set(cacheKey, []);
    }
    syncListeners.get(cacheKey).push(subscription);

    return () => {
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('[v0] Error subscribing to branch inventory:', error);
    return () => {};
  }
}

/**
 * Get low stock items for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of low stock items
 */
export async function getLowStockItems(branchId) {
  if (!client) throw new Error('Supabase client not initialized');

  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId)
      .lte('quantity', supabase.raw('reorder_point'));

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching low stock items:', error);
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
  if (!client) throw new Error('Supabase client not initialized');

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
    console.error('[v0] Error transferring inventory:', error);
    throw error;
  }
}

/**
 * Unsubscribe from real-time updates
 * @param {string} key - Product ID or branch key
 * @returns {void}
 */
export function unsubscribeFromInventory(key) {
  if (syncListeners.has(key)) {
    const listeners = syncListeners.get(key);
    listeners.forEach(subscription => {
      if (subscription?.unsubscribe) subscription.unsubscribe();
    });
    syncListeners.delete(key);
  }
}

/**
 * Unsubscribe from all real-time updates
 * @returns {void}
 */
export function unsubscribeFromAllInventory() {
  syncListeners.forEach(listeners => {
    listeners.forEach(subscription => {
      if (subscription?.unsubscribe) subscription.unsubscribe();
    });
  });
  syncListeners.clear();
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
