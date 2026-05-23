/**
 * Branch Management Service - Supabase Edition
 * Handles all branch CRUD operations with per-user data isolation
 */

import { supabase } from './supabase';

let client = null;

export function initializeBranchService(supabaseClient) {
  client = supabaseClient;
}

async function getUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Create a new branch (scoped to current user)
 */
export async function createBranch(branchData) {
  if (!client) throw new Error('Supabase client not initialized');
  const uid = await getUserId();
  if (!uid) throw new Error('User not authenticated');

  try {
    const branch = {
      ...branchData,
      user_id: uid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };
    const { data, error } = await supabase
      .from('branches')
      .insert([branch])
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('[v0] Error creating branch:', error);
    throw error;
  }
}

/**
 * Get branch by ID
 */
export async function getBranch(branchId) {
  if (!client) throw new Error('Supabase client not initialized');
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('[v0] Error fetching branch:', error);
    throw error;
  }
}

/**
 * Get all active branches for the current user
 * Falls back to localStorage cache for instant load
 */
export async function getAllBranches() {
  if (!client) throw new Error('Supabase client not initialized');
  const uid = await getUserId();
  if (!uid) return [];

  const cacheKey = `branches_cache_${uid}`;

  // Serve from cache immediately
  let cached = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // Update cache
    localStorage.setItem(cacheKey, JSON.stringify(data || []));
    return data || [];
  } catch (error) {
    console.error('[v0] Error fetching branches:', error);
    // Return cache as fallback
    return cached;
  }
}

/**
 * Get cached branches synchronously (for instant sidebar render)
 */
export async function getCachedBranches() {
  const uid = await getUserId();
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`branches_cache_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Update branch details
 */
export async function updateBranch(branchId, updates) {
  if (!client) throw new Error('Supabase client not initialized');
  try {
    const { error } = await supabase
      .from('branches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', branchId);
    
    if (error) throw error;
    // Bust cache
    const uid = await getUserId();
    if (uid) localStorage.removeItem(`branches_cache_${uid}`);
  } catch (error) {
    console.error('[v0] Error updating branch:', error);
    throw error;
  }
}

/**
 * Deactivate a branch (soft delete)
 */
export async function deactivateBranch(branchId) {
  if (!client) throw new Error('Supabase client not initialized');
  try {
    const { error } = await supabase
      .from('branches')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', branchId);
    
    if (error) throw error;
    // Bust cache
    const uid = await getUserId();
    if (uid) localStorage.removeItem(`branches_cache_${uid}`);
  } catch (error) {
    console.error('[v0] Error deactivating branch:', error);
    throw error;
  }
}

export async function getBranchSettings(branchId) {
  if (!client) throw new Error('Supabase client not initialized');
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('settings')
      .eq('id', branchId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data?.settings || null;
  } catch (error) {
    console.error('[v0] Error fetching branch settings:', error);
    throw error;
  }
}

export async function updateBranchSettings(branchId, settings) {
  if (!client) throw new Error('Supabase client not initialized');
  try {
    const { error } = await supabase
      .from('branches')
      .update({ settings, updated_at: new Date().toISOString() })
      .eq('id', branchId);
    
    if (error) throw error;
  } catch (error) {
    console.error('[v0] Error updating branch settings:', error);
    throw error;
  }
}

export default {
  initializeBranchService,
  createBranch,
  getBranch,
  getAllBranches,
  getCachedBranches,
  updateBranch,
  deactivateBranch,
  getBranchSettings,
  updateBranchSettings,
};
