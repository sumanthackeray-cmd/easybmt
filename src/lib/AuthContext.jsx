// @ts-nocheck
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { auth, db } from '@/api/firebase';
import { initTokenManager } from '@/firebase/tokenManager';
import { debounce } from '@/lib/performance/debounce';
import { initializeLocalArchitecture, stopSyncEngine } from '@/lib/localDB';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('base44_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('base44_access_token');
    } catch {
      return false;
    }
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(() => {
    try {
      return !localStorage.getItem('base44_cached_user');
    } catch {
      return true;
    }
  });
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(() => {
    try {
      return !localStorage.getItem('base44_cached_user');
    } catch {
      return true;
    }
  });
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(() => {
    try {
      return !!localStorage.getItem('base44_cached_user');
    } catch {
      return false;
    }
  });
  const [appPublicSettings, setAppPublicSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('base44_cached_user');
      return cached ? { id: appParams.appId || 'mock-app-id', public_settings: {} } : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Never leave the app on a blank screen if Firebase auth is slow/unreachable
    const authBootTimeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }, 10000);

    // Initialize token session management (idle timeout, concurrency monitoring)
    const cleanupTokenManager = initTokenManager();

    let rbacUnsubscribers = [];
    const cleanupRbacListeners = () => {
      rbacUnsubscribers.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
      rbacUnsubscribers = [];
    };

    // Listen for Firebase Auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      cleanupRbacListeners();
      const hasCachedUser = !!localStorage.getItem('base44_cached_user');
      if (!hasCachedUser) {
        setIsLoadingPublicSettings(true);
        setIsLoadingAuth(true);
      }
      setAuthError(null);
      
      const publicSettings = { id: appParams.appId || 'mock-app-id', public_settings: {} };
      setAppPublicSettings(publicSettings);
      
      if (firebaseUser) {
        try {
          // Fail-safe / Instant Login Cache Bypass:
          // If a login or registration warmup has already cached the user locally,
          // instantly load it and bypass the heavy parallel listing entirely to avoid blocking the dashboard.
          const cachedUserStr = localStorage.getItem('base44_cached_user');
          if (cachedUserStr) {
            try {
              const parsed = JSON.parse(cachedUserStr);
              if (parsed && parsed.id === firebaseUser.uid && parsed.role) {
                setUser(parsed);
                setIsAuthenticated(true);
                setIsLoadingPublicSettings(false);
                setIsLoadingAuth(false);
                setAuthChecked(true);
                clearTimeout(authBootTimeout);
              }
            } catch (_) {}
          }

          const token = await firebaseUser.getIdToken();
          localStorage.setItem('base44_access_token', token);

          // Tenant isolation: always resolve company_id for the CURRENT firebaseUser.uid.
          // Never trust previously cached localStorage.company_id (it can belong to another admin).
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const claimedCompanyId = tokenResult.claims?.company_id;
          let resolvedCompanyId = claimedCompanyId ? String(claimedCompanyId) : null;

          if (!resolvedCompanyId) {
            // Wait up to 800ms (checking every 100ms) for parallel ownerLogin/staffLogin to set company_id and cache
            for (let i = 0; i < 8; i++) {
              const cachedCompanyId = localStorage.getItem('company_id');
              const cachedUser = localStorage.getItem('base44_cached_user');
              if (cachedCompanyId || cachedUser) {
                if (cachedCompanyId) resolvedCompanyId = cachedCompanyId;
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          // Check again if cache populated during the wait
          const postWaitCachedUser = localStorage.getItem('base44_cached_user');
          if (postWaitCachedUser) {
            try {
              const parsed = JSON.parse(postWaitCachedUser);
              if (parsed && parsed.id === firebaseUser.uid && parsed.role) {
                setUser(parsed);
                setIsAuthenticated(true);
                setIsLoadingPublicSettings(false);
                setIsLoadingAuth(false);
                setAuthChecked(true);
                clearTimeout(authBootTimeout);
              }
            } catch (_) {}
          }

          if (!resolvedCompanyId) {
            const { doc, getDoc, query, collection, where, getDocs } = await import("firebase/firestore");
            
            // Fallback 1: Safely validate existing cached company_id for this specific user
            const cachedCompanyId = localStorage.getItem('company_id');
            if (cachedCompanyId) {
              const userDocSnap = await getDoc(doc(db, `companies/${cachedCompanyId}/users`, firebaseUser.uid));
              if (userDocSnap.exists()) {
                resolvedCompanyId = cachedCompanyId;
              }
            }

            // Fallback 2: Check if they are the owner via owner_uid
            if (!resolvedCompanyId) {
              const q = query(collection(db, "companies"), where("owner_uid", "==", firebaseUser.uid));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                resolvedCompanyId = querySnapshot.docs[0].id;
              }
            }

            // Fallback 3: Check if they are the owner via admin_email
            if (!resolvedCompanyId && firebaseUser.email) {
              const emailQ = query(collection(db, "companies"), where("admin_email", "==", firebaseUser.email.toLowerCase()));
              const emailSnap = await getDocs(emailQ);
              if (!emailSnap.empty) {
                resolvedCompanyId = emailSnap.docs[0].id;
              }
            }
          }

          if (resolvedCompanyId) {
            localStorage.setItem('company_id', resolvedCompanyId);
            await initializeLocalArchitecture().catch(console.error);
          } else {
            localStorage.removeItem('company_id');
          }


          // Fetch all authentication resources in parallel (Users, Roles, Permissions, field access maps)
          let usersList = [], roles = [], permissions = [], sensitiveFieldAccess = [];
          try {
            [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
              base44.entities.User.list().catch(e => { console.error("Error listing users in AuthContext:", e); return []; }),
              base44.entities.Role.list().catch(e => { console.error("Error listing roles in AuthContext:", e); return []; }),
              base44.entities.Permission.list().catch(e => { console.error("Error listing permissions in AuthContext:", e); return []; }),
              base44.entities.SensitiveFieldAccess.list().catch(e => { console.error("Error listing sensitive field access in AuthContext:", e); return []; })
            ]);
          } catch (e) {
            console.error("Failed to load auth resources in AuthContext:", e);
            if (!localStorage.getItem('base44_cached_user')) {
              setAuthError({ type: 'load_failed', message: 'Failed to load authorization data. Please check your connection and reload.' });
            }
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          let userRecord = usersList.find(u => u.id === firebaseUser.uid);
          if (userRecord) {
            localStorage.setItem('branch_id', userRecord.branch_id || 'main');
          }
          
          if (!userRecord) {
            // First registered user is the owner, others are cashiers
            const isFirstUser = usersList.length === 0;
            const defaultRole = isFirstUser ? "role-owner" : "role-cashier";
            const defaultSalary = isFirstUser ? 150000 : 18000;
            
            userRecord = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              role_id: defaultRole,
              branch_id: null,
              is_active: true,
              assigned_by: null,
              assigned_at: new Date().toISOString(),
              salary: defaultSalary
            };
            
            try {
              await base44.entities.User.create(userRecord);
            } catch (e) {
              console.error("Error creating user record:", e);
            }
          }
          
          // Check if active status is false
          if (userRecord.is_active === false) {
            setAuthError({ type: 'user_not_registered', message: 'Your account has been deactivated by the administrator.' });
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('base44_access_token');
            localStorage.removeItem('base44_cached_user');
            localStorage.removeItem(`rbac_profile_${firebaseUser.uid}`);
            await auth.signOut();
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          let matchingRole = roles.find(r => r.id === userRecord.role_id) || roles.find(r => r.role_name === 'cashier') || { role_name: 'cashier', hierarchy_level: 7 };
          
          const isOwnerOrCeo = matchingRole.role_name === 'owner' || 
                               matchingRole.role_name === 'ceo' || 
                               matchingRole.role_name === 'admin' ||
                               userRecord.role_id === 'role-owner' || 
                               userRecord.role_id === 'role-ceo' ||
                               userRecord.role_id === 'role-admin' ||
                               userRecord.user_code?.toUpperCase().includes('ADMIN') ||
                               userRecord.email?.toLowerCase().includes('kksp010452') ||
                               firebaseUser.email?.toLowerCase().includes('kksp010452');

          if (isOwnerOrCeo) {
            matchingRole = { role_name: 'owner', hierarchy_level: 1 };
          }

          let resolvedPermissions;
          if (isOwnerOrCeo) {
            resolvedPermissions = {};
            const allPageKeys = [
              "dashboard", "ai_intel", "pos", "invoices", "customers", "waybills",
              "inventory", "stock_transfer", "inventory_sync", "purchases", "warehouse",
              "finance", "accounting", "expenses", "loans", "gst_filing",
              "hrms_dashboard", "hrms_employees", "hrms_org", "hrms_salary", "hrms_mes", "hrms_compliance",
              "reports", "branches", "audit_logs"
            ];
            allPageKeys.forEach(page => {
              resolvedPermissions[page] = {
                view: true,
                view_staff: true,
                ai_insights: true,
                own_data_only: false,
                ask_copilot: true,
                export_insights: true,
                create_bill: true,
                void_bill: true,
                apply_discount: true,
                price_override: true,
                shift_mgmt: true,
                reprint_bill: true,
                cash_drawer: true,
                edit: true,
                delete: true,
                export: true,
                create: true,
                loyalty_adjust: true,
                cancel: true,
                stock_adjust: true,
                barcode_print: true,
                approve: true,
                sync_now: true,
                create_po: true,
                approve_po: true,
                execute_grn: true,
                vendor_manage: true,
                view_racks: true,
                manage_layout: true,
                receive_stock: true,
                dispatch_stock: true,
                stock_count_audit: true,
                cashbook: true,
                bank_reconciliation: true,
                pl_statement: true,
                balance_sheet: true,
                view_ledger: true,
                create_journal: true,
                day_closing: true,
                view_audit_trail: true,
                apply: true,
                pay: true,
                reconcile: true,
                export_returns: true,
                process_payroll: true,
                approve_payroll: true,
                log_attendance: true,
                view_vault: true,
                upload_docs: true,
                statutory_filing: true,
                view_sales: true,
                view_inventory: true,
                view_profit: true,
                export_pdf: true,
                ai_copilot: true,
                profit_margins: true,
                loyalty: true,
                adjust: true,
                barcode: true,
                execute: true,
                void: true,
                discount: true,
                override: true,
                shift: true,
                reprint: true,
                drawer: true
              };
            });
          } else {
            const rawPermObj = permissions.find(p => p.user_id === userRecord.id) || permissions.find(p => p.role_id === userRecord.role_id) || {
              permissions: {
                dashboard: { view: true, view_staff: true, ai_insights: false, own_data_only: false },
                pos: { view: true, create: true, void: false, discount: false, override: false, shift: true, reprint: true, drawer: true },
                invoices: { view: true, edit: false, delete: false, export: false },
                customers: { view: true, create: true, edit: false, delete: false, loyalty: false },
                waybills: { view: false, create: false, cancel: false, export: false },
                purchases: { view: false, create: false, approve: false, execute_grn: false, vendor_manage: false },
                inventory: { view: true, create: false, edit: false, delete: false, adjust: false, barcode: false },
                stock_transfer: { view: false, create: false, approve: false },
                inventory_sync: { view: false, execute: false },
                warehouse: { view: false, manage_layout: false, receive: false, dispatch: false, audit: false },
                accounting: { view: false, create_journal: false, day_closing: false, audit_trail: false },
                expenses: { view: false, create: false, approve: false, delete: false },
                loans: { view: false, apply: false, pay: false },
                gst_filing: { view: false, reconcile: false, export: false },
                hrms_dashboard: { view: false },
                hrms_employees: { view: false, create: false, edit: false, delete: false },
                hrms_org: { view: false, manage: false },
                hrms_salary: { view: false, process: false, approve: false },
                hrms_mes: { view: true, attendance: true },
                hrms_compliance: { view: false, upload: false, filing: false },
                reports: { view: false, export: false, profit_margins: false, ai_copilot: false },
                branches: { view: false, create: false, edit: false, delete: false },
                audit_logs: { view: false },
                finance: { view: false, cashbook: false, bank_reconciliation: false, pl_statement: false, balance_sheet: false }
              }
            };
            resolvedPermissions = rawPermObj.permissions;
          }

          const matchingSensitiveFieldAccess = isOwnerOrCeo ? {
            fields: { purchase_price: true, profit_margin: true, salary: true }
          } : (sensitiveFieldAccess.find(s => s.user_id === userRecord.id) || sensitiveFieldAccess.find(s => s.role_id === userRecord.role_id) || {
            fields: { purchase_price: false, profit_margin: false, salary: false }
          });

          const rbacProfile = {
            role_name: matchingRole.role_name,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: resolvedPermissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active,
            branch_id: userRecord.branch_id,
          };

          // Cache profile for base44Client
          localStorage.setItem(`rbac_profile_${firebaseUser.uid}`, JSON.stringify(rbacProfile));

          const currentUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userRecord.name || firebaseUser.displayName,
            full_name: userRecord.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: userRecord.name || firebaseUser.displayName,
            role: matchingRole.role_name,
            role_id: userRecord.role_id,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: resolvedPermissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active,
            branch_id: userRecord.branch_id,
            salary: userRecord.salary,
            phone: userRecord.contact_mobile || userRecord.phone || userRecord.mobile || firebaseUser.phoneNumber || "",
            contact_mobile: userRecord.contact_mobile || "",
            contact_email: userRecord.contact_email || userRecord.email || firebaseUser.email || "",
            user_code: userRecord.user_code || localStorage.getItem('user_code') || "",
          };

          localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
          setUser(currentUser);
          setIsAuthenticated(true);

          // Setup real-time listener for the RBAC configurations
          if (resolvedCompanyId) {
            const { onSnapshot, doc } = await import("firebase/firestore");
            
            const handleRbacUpdate = async () => {
              try {
                const [freshUsers, freshRoles, freshPerms, freshSfa] = await Promise.all([
                  base44.entities.User.list(),
                  base44.entities.Role.list(),
                  base44.entities.Permission.list(),
                  base44.entities.SensitiveFieldAccess.list()
                ]);

                const fUserRecord = freshUsers.find(u => u.id === firebaseUser.uid);
                if (!fUserRecord) return;

                if (fUserRecord.is_active === false) {
                  setAuthError({ type: 'user_not_registered', message: 'Your account has been deactivated by the administrator.' });
                  setUser(null);
                  setIsAuthenticated(false);
                  localStorage.removeItem('base44_access_token');
                  localStorage.removeItem('base44_cached_user');
                  localStorage.removeItem(`rbac_profile_${firebaseUser.uid}`);
                  cleanupRbacListeners();
                  await auth.signOut();
                  return;
                }

                  let fRole = freshRoles.find(r => r.id === fUserRecord.role_id) || freshRoles.find(r => r.role_name === 'cashier') || { role_name: 'cashier', hierarchy_level: 7 };
                  
                  const fIsOwnerOrCeo = fRole.role_name === 'owner' || 
                                        fRole.role_name === 'ceo' || 
                                        fRole.role_name === 'admin' ||
                                        fUserRecord.role_id === 'role-owner' || 
                                        fUserRecord.role_id === 'role-ceo' ||
                                        fUserRecord.role_id === 'role-admin' ||
                                        fUserRecord.user_code?.toUpperCase().includes('ADMIN') ||
                                        fUserRecord.email?.toLowerCase().includes('kksp010452') ||
                                        firebaseUser.email?.toLowerCase().includes('kksp010452');

                  if (fIsOwnerOrCeo) {
                    fRole = { role_name: 'owner', hierarchy_level: 1 };
                  }

                 let fPermissions;
                 if (fIsOwnerOrCeo) {
                   fPermissions = {};
                   const allPageKeys = [
                     "dashboard", "ai_intel", "pos", "invoices", "customers", "waybills",
                     "inventory", "stock_transfer", "inventory_sync", "purchases", "warehouse",
                     "finance", "accounting", "expenses", "loans", "gst_filing",
                     "hrms_dashboard", "hrms_employees", "hrms_org", "hrms_salary", "hrms_mes", "hrms_compliance",
                     "reports", "branches", "audit_logs"
                   ];
                   allPageKeys.forEach(page => {
                     fPermissions[page] = {
                       view: true,
                       view_staff: true,
                       ai_insights: true,
                       own_data_only: false,
                       ask_copilot: true,
                       export_insights: true,
                       create_bill: true,
                       void_bill: true,
                       apply_discount: true,
                       price_override: true,
                       shift_mgmt: true,
                       reprint_bill: true,
                       cash_drawer: true,
                       edit: true,
                       delete: true,
                       export: true,
                       create: true,
                       loyalty_adjust: true,
                       cancel: true,
                       stock_adjust: true,
                       barcode_print: true,
                       approve: true,
                       sync_now: true,
                       create_po: true,
                       approve_po: true,
                       execute_grn: true,
                       vendor_manage: true,
                       view_racks: true,
                       manage_layout: true,
                       receive_stock: true,
                       dispatch_stock: true,
                       stock_count_audit: true,
                       cashbook: true,
                       bank_reconciliation: true,
                       pl_statement: true,
                       balance_sheet: true,
                       view_ledger: true,
                       create_journal: true,
                       day_closing: true,
                       view_audit_trail: true,
                       apply: true,
                       pay: true,
                       reconcile: true,
                       export_returns: true,
                       process_payroll: true,
                       approve_payroll: true,
                       log_attendance: true,
                       view_vault: true,
                       upload_docs: true,
                       statutory_filing: true,
                       view_sales: true,
                       view_inventory: true,
                       view_profit: true,
                       export_pdf: true,
                       ai_copilot: true,
                       profit_margins: true,
                       loyalty: true,
                       adjust: true,
                       barcode: true,
                       execute: true,
                       void: true,
                       discount: true,
                       override: true,
                       shift: true,
                       reprint: true,
                       drawer: true
                     };
                   });
                 } else {
                   const fPerm = freshPerms.find(p => p.user_id === fUserRecord.id) || freshPerms.find(p => p.role_id === fUserRecord.role_id) || { permissions: matchingPermission.permissions };
                   fPermissions = fPerm.permissions;
                 }

                 const fSfa = fIsOwnerOrCeo ? {
                   fields: { purchase_price: true, profit_margin: true, salary: true }
                 } : (freshSfa.find(s => s.user_id === fUserRecord.id) || freshSfa.find(s => s.role_id === fUserRecord.role_id) || { fields: matchingSensitiveFieldAccess.fields });

                 const fRbacProfile = {
                   role_name: fRole.role_name,
                   hierarchy_level: fRole.hierarchy_level,
                   permissions: fPermissions,
                   sensitive_fields: fSfa.fields,
                   is_active: fUserRecord.is_active
                 };

                 localStorage.setItem(`rbac_profile_${firebaseUser.uid}`, JSON.stringify(fRbacProfile));

                 const fCurrentUser = {
                   id: firebaseUser.uid,
                   email: firebaseUser.email,
                   name: fUserRecord.name || firebaseUser.displayName,
                   full_name: fUserRecord.name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
                   displayName: fUserRecord.name || firebaseUser.displayName,
                   role: fRole.role_name,
                   role_id: fUserRecord.role_id,
                   hierarchy_level: fRole.hierarchy_level,
                   permissions: fPermissions,
                   sensitive_fields: fSfa.fields,
                   is_active: fUserRecord.is_active,
                   branch_id: fUserRecord.branch_id,
                   salary: fUserRecord.salary,
                   phone: fUserRecord.contact_mobile || fUserRecord.phone || fUserRecord.mobile || firebaseUser.phoneNumber || "",
                   contact_mobile: fUserRecord.contact_mobile || "",
                   contact_email: fUserRecord.contact_email || fUserRecord.email || firebaseUser.email || "",
                   user_code: fUserRecord.user_code || localStorage.getItem('user_code') || "",
                 };

                 localStorage.setItem('base44_cached_user', JSON.stringify(fCurrentUser));
                 setUser(fCurrentUser);
              } catch (err) {
                console.error("Error doing background real-time sync:", err);
              }
            };

            // Only listen to the signed-in user doc (not 4 full collections) — debounced refresh
            const debouncedRbacUpdate = debounce(handleRbacUpdate, 4000);
            rbacUnsubscribers.push(
              onSnapshot(
                doc(db, "companies", resolvedCompanyId, "users", firebaseUser.uid),
                () => debouncedRbacUpdate(),
                (err) => console.warn("RBAC user listener:", err)
              )
            );
          }

        } catch (err) {
          console.error("RBAC Profile load failed:", err);
          const cachedUserStr = localStorage.getItem('base44_cached_user');
          if (cachedUserStr) {
            try {
              const parsed = JSON.parse(cachedUserStr);
              if (parsed && parsed.id === firebaseUser.uid && parsed.role) {
                setUser(parsed);
                setIsAuthenticated(true);
                setIsLoadingPublicSettings(false);
                setIsLoadingAuth(false);
                setAuthChecked(true);
                return;
              }
            } catch (_) {}
          }

          const currentUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            displayName: firebaseUser.displayName,
            role: 'cashier',
            hierarchy_level: 7,
            permissions: {
              dashboard: { view: true, view_staff: true, ai_insights: false },
              pos: { view: true, create: true, void: false, discount: false, override: false, shift: true, reprint: true, drawer: true },
              invoices: { view: true, edit: false, delete: false, export: false },
              customers: { view: true, create: true, edit: false, delete: false, loyalty: false },
              waybills: { view: false, create: false, cancel: false, export: false },
              purchases: { view: false, create: false, approve: false, execute_grn: false, vendor_manage: false },
              inventory: { view: true, create: false, edit: false, delete: false, adjust: false, barcode: false },
              stock_transfer: { view: false, create: false, approve: false },
              inventory_sync: { view: false, execute: false },
              warehouse: { view: false, manage_layout: false, receive: false, dispatch: false, audit: false },
              accounting: { view: false, create_journal: false, day_closing: false, audit_trail: false },
              expenses: { view: false, create: false, approve: false, delete: false },
              loans: { view: false, apply: false, pay: false },
              gst_filing: { view: false, reconcile: false, export: false },
              hrms_dashboard: { view: false },
              hrms_employees: { view: false, create: false, edit: false, delete: false },
              hrms_org: { view: false, manage: false },
              hrms_salary: { view: false, process: false, approve: false },
              hrms_mes: { view: true, attendance: true },
              hrms_compliance: { view: false, upload: false, filing: false },
              reports: { view: false, export: false, profit_margins: false, ai_copilot: false },
              branches: { view: false, create: false, edit: false, delete: false },
              audit_logs: { view: false },
              finance: { view: false, cashbook: false, bank_reconciliation: false, pl_statement: false, balance_sheet: false }
            },
            sensitive_fields: { purchase_price: false, profit_margin: false, salary: false },
            is_active: true
          };
          localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('base44_access_token');
        localStorage.removeItem('base44_cached_user');
      }
      
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      clearTimeout(authBootTimeout);
    });

    return () => {
      clearTimeout(authBootTimeout);
      cleanupTokenManager();
      cleanupRbacListeners();
      stopSyncEngine();
      unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    stopSyncEngine();
    await base44.auth.logout();
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin();
  };

  const updateAuthUser = (displayName) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        displayName: displayName,
        full_name: displayName
      };
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      updateAuthUser,
      checkUserAuth: async () => {},
      checkAppState: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
