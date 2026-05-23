// @ts-nocheck
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44ClientSupabase';
import { appParams } from '@/lib/app-params';
import { supabase } from '@/api/supabase';


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
    // Never leave the app on a blank screen if Supabase auth is slow/unreachable
    const authBootTimeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }, 10000);

    try {
      // Listen for Supabase Auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hasCachedUser = !!localStorage.getItem('base44_cached_user');
      if (!hasCachedUser) {
        setIsLoadingPublicSettings(true);
        setIsLoadingAuth(true);
      }
      setAuthError(null);
      
      const publicSettings = { id: appParams.appId || 'mock-app-id', public_settings: {} };
      setAppPublicSettings(publicSettings);
      
      if (session?.user) {
        try {
          const supabaseUser = session.user;
          localStorage.setItem('base44_access_token', session.access_token);

          // Get or resolve company_id from user metadata
          let resolvedCompanyId = supabaseUser.user_metadata?.company_id ? String(supabaseUser.user_metadata.company_id) : null;

          if (!resolvedCompanyId) {
            // Fallback 1: Check cached company_id
            const cachedCompanyId = localStorage.getItem('company_id');
            if (cachedCompanyId) {
              resolvedCompanyId = cachedCompanyId;
            }
            
            // Fallback 2: Query users table for company_id
            if (!resolvedCompanyId) {
              try {
                const { data: userRecord, error } = await supabase
                  .from('users')
                  .select('company_id')
                  .eq('id', supabaseUser.id)
                  .single();
                
                if (userRecord && userRecord.company_id) {
                  resolvedCompanyId = userRecord.company_id;
                }
              } catch (e) {
                console.warn("[v0] Error fetching user company_id:", e);
              }
            }
          }

          if (resolvedCompanyId) {
            localStorage.setItem('company_id', resolvedCompanyId);
          } else {
            localStorage.removeItem('company_id');
          }


          // Fetch all authentication resources in parallel (Users, Roles, Permissions, field access maps)
          let usersList = [], roles = [], permissions = [], sensitiveFieldAccess = [];
          try {
            [usersList, roles, permissions, sensitiveFieldAccess] = await Promise.all([
              base44.entities.User.list(),
              base44.entities.Role.list(),
              base44.entities.Permission.list(),
              base44.entities.SensitiveFieldAccess.list()
            ]);
          } catch (e) {
            console.error("[v0] Failed to load auth resources:", e);
            setAuthError({ type: 'load_failed', message: 'Failed to load authorization data. Please check your connection and reload.' });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          let userRecord = usersList.find(u => u.id === supabaseUser.id);
          
          if (!userRecord) {
            // First registered user is the owner, others are cashiers
            const isFirstUser = usersList.length === 0;
            const defaultRole = isFirstUser ? "role-owner" : "role-cashier";
            const defaultSalary = isFirstUser ? 150000 : 18000;
            
            userRecord = {
              id: supabaseUser.id,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
              email: supabaseUser.email,
              role_id: defaultRole,
              branch_id: null,
              is_active: true,
              assigned_by: null,
              assigned_at: new Date().toISOString(),
              salary: defaultSalary,
              company_id: resolvedCompanyId
            };
            
            try {
              await base44.entities.User.create(userRecord);
            } catch (e) {
              console.error("[v0] Error creating user record:", e);
            }
          }
          
          // Check if active status is false
          if (userRecord.is_active === false) {
            setAuthError({ type: 'user_not_registered', message: 'Your account has been deactivated by the administrator.' });
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('base44_access_token');
            localStorage.removeItem('base44_cached_user');
            localStorage.removeItem(`rbac_profile_${supabaseUser.id}`);
            await supabase.auth.signOut();
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            setAuthChecked(true);
            return;
          }

          const matchingRole = roles.find(r => r.id === userRecord.role_id) || roles.find(r => r.role_name === 'cashier') || { role_name: 'cashier', hierarchy_level: 7 };
          const matchingPermission = permissions.find(p => p.role_id === userRecord.role_id) || {
            permissions: {
              pos: { view: true, create: true, edit: false, delete: false, export: false },
              inventory: { view: false, create: false, edit: false, delete: false, export: false },
              accounting: { view: false, create: false, edit: false, delete: false, export: false },
              warehouse: { view: false, create: false, edit: false, delete: false, export: false },
              hr: { view: false, create: false, edit: false, delete: false, export: false, attendance: true, payslip: true },
              reports: { view: false, create: false, edit: false, delete: false, export: false }
            }
          };
          const matchingSensitiveFieldAccess = sensitiveFieldAccess.find(s => s.role_id === userRecord.role_id) || {
            fields: { purchase_price: false, profit_margin: false, salary: false }
          };

          const rbacProfile = {
            role_name: matchingRole.role_name,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: matchingPermission.permissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active
          };

          // Cache profile for base44Client
          localStorage.setItem(`rbac_profile_${firebaseUser.uid}`, JSON.stringify(rbacProfile));

          const currentUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: userRecord.name || supabaseUser.user_metadata?.full_name,
            full_name: userRecord.name || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
            displayName: userRecord.name || supabaseUser.user_metadata?.full_name,
            role: matchingRole.role_name,
            role_id: userRecord.role_id,
            hierarchy_level: matchingRole.hierarchy_level,
            permissions: matchingPermission.permissions,
            sensitive_fields: matchingSensitiveFieldAccess.fields,
            is_active: userRecord.is_active,
            branch_id: userRecord.branch_id,
            salary: userRecord.salary,
            phone: userRecord.contact_mobile || userRecord.phone || userRecord.mobile || "",
            contact_mobile: userRecord.contact_mobile || "",
            contact_email: userRecord.contact_email || userRecord.email || supabaseUser.email || "",
            user_code: userRecord.user_code || localStorage.getItem('user_code') || "",
          };

          localStorage.setItem('base44_cached_user', JSON.stringify(currentUser));
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("[v0] RBAC Profile load failed:", err);
          const currentUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
            displayName: supabaseUser.user_metadata?.full_name,
            role: 'cashier',
            hierarchy_level: 7,
            permissions: {
              pos: { view: true, create: true },
              inventory: { view: false },
              accounting: { view: false },
              warehouse: { view: false },
              hr: { view: false },
              reports: { view: false }
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
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('[v0] Auth initialization error:', error);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      clearTimeout(authBootTimeout);
      
      return () => {
        clearTimeout(authBootTimeout);
      };
    }
  }, []);

  const logout = async (shouldRedirect = true) => {
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
