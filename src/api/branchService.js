/**
 * Branch Management Service
 * Handles all branch CRUD operations with strict tenant data isolation
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
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db as firebaseDb } from './firebase';

let db = firebaseDb;

export function initializeBranchService(injectedDb) {
  if (injectedDb) db = injectedDb;
}

function getUserId() {
  return auth.currentUser?.uid || null;
}

function getCompanyId() {
  return localStorage.getItem("company_id") || null;
}

function getBranchCollectionRef() {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Data Isolation Policy Violation: Company ID not found");
  return collection(db, 'companies', companyId, 'branches');
}

function getBranchDocRef(branchId) {
  const companyId = getCompanyId();
  if (!companyId) throw new Error("Data Isolation Policy Violation: Company ID not found");
  return doc(db, 'companies', companyId, 'branches', branchId);
}

/**
 * Create a new branch (scoped to current user's company)
 */
export async function createBranch(branchData) {
  if (!db) throw new Error('Database not initialized');
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const companyId = getCompanyId();
  if (!companyId) throw new Error('Data Isolation Policy Violation: Company ID not found');

  try {
    const branch = {
      ...branchData,
      userId: uid,
      companyId: companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
    };
    const docRef = await addDoc(getBranchCollectionRef(), branch);
    return docRef.id;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
}

/**
 * Get branch by ID
 */
export async function getBranch(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = getBranchDocRef(branchId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    console.error('Error fetching branch:', error);
    throw error;
  }
}

/**
 * Get all active branches for the current user's company
 * Falls back to localStorage cache for instant load
 */
export async function getAllBranches() {
  if (!db) throw new Error('Database not initialized');
  const companyId = getCompanyId();
  if (!companyId) return [];

  const cacheKey = `branches_cache_${companyId}`;

  // Serve from cache immediately
  let cached = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch {}

  try {
    const q = query(
      getBranchCollectionRef(),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const branches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Update cache
    localStorage.setItem(cacheKey, JSON.stringify(branches));
    return branches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    // Return cache as fallback
    return cached;
  }
}

/**
 * Get cached branches synchronously (for instant sidebar render)
 */
export function getCachedBranches() {
  const companyId = getCompanyId();
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(`branches_cache_${companyId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Update branch details
 */
export async function updateBranch(branchId, updates) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = getBranchDocRef(branchId);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    // Bust cache
    const companyId = getCompanyId();
    if (companyId) localStorage.removeItem(`branches_cache_${companyId}`);
  } catch (error) {
    console.error('Error updating branch:', error);
    throw error;
  }
}

/**
 * Deactivate a branch (soft delete)
 */
export async function deactivateBranch(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = getBranchDocRef(branchId);
    await updateDoc(docRef, { isActive: false, updatedAt: serverTimestamp() });
    // Bust cache
    const companyId = getCompanyId();
    if (companyId) localStorage.removeItem(`branches_cache_${companyId}`);
  } catch (error) {
    console.error('Error deactivating branch:', error);
    throw error;
  }
}

export async function getBranchSettings(branchId) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = getBranchDocRef(branchId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data().settings : null;
  } catch (error) {
    console.error('Error fetching branch settings:', error);
    throw error;
  }
}

export async function updateBranchSettings(branchId, settings) {
  if (!db) throw new Error('Database not initialized');
  try {
    const docRef = getBranchDocRef(branchId);
    await updateDoc(docRef, { settings, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error('Error updating branch settings:', error);
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
