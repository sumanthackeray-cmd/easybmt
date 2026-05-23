// @ts-nocheck
import { supabase } from './supabase';
import { logAuditAction } from './auditLogging';
import { queryClientInstance } from '../lib/query-client';

const getSecureUserClaims = () => {
  try {
    const token = localStorage.getItem('base44_access_token');
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    }
  } catch (e) {
    console.warn("[v0] Failed to parse secure user claims from JWT:", e);
  }
  return null;
};

const getUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User must be authenticated to perform this operation.");
  }
  return user.id;
};

const getTableName = (entityName) => {
  const mapping = {
    Invoice: 'invoices',
    Product: 'products',
    Customer: 'customers',
    Purchase: 'purchases',
    Loan: 'loans',
    Expense: 'expenses',
    ShopSettings: 'shop_settings',
    UserSubscription: 'user_subscriptions',
    Role: 'roles',
    User: 'users',
    Permission: 'permissions',
    SensitiveFieldAccess: 'sensitive_field_access',
    AuditLog: 'audit_logs',
    Employee: 'employees',
    SalaryStructure: 'salary_structures',
    MonthlyPayroll: 'monthly_payroll',
    AttendanceLog: 'attendance_logs',
    LeaveManagement: 'leave_management',
    PerformanceReview: 'performance_reviews',
    EmployeeDocument: 'employee_documents',
    EmployeeLoan: 'employee_loans',
    Department: 'departments',
    Designation: 'designations',
    Shift: 'shifts',
    Holiday: 'holidays'
  };
  return mapping[entityName] || entityName.toLowerCase();
};

const createSupabaseEntityRepository = (entityName) => {
  return {
    list: async (orderByStr, limitNum) => {
      try {
        const uid = await getUserId();
        const tableName = getTableName(entityName);
        const cacheKey = `base44_cache_${uid}_${tableName}`;
        
        let cachedItems = null;
        
        // Try local cache first
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            cachedItems = JSON.parse(cached);
          }
        } catch (e) {
          console.warn("[v0] Error reading cache:", e);
        }

        // Background fetch function
        const fetchFreshData = async () => {
          try {
            const companyId = localStorage.getItem("company_id");
            if (!companyId) {
              console.warn("[v0] No company_id found");
              return [];
            }
            
            let query = supabase
              .from(tableName)
              .select('*')
              .eq('company_id', companyId);
            
            // Apply ordering
            if (orderByStr) {
              const isDesc = orderByStr.startsWith('-');
              const field = isDesc ? orderByStr.substring(1) : orderByStr;
              query = query.order(field, { ascending: !isDesc });
            }
            
            // Apply limit
            if (limitNum) {
              query = query.limit(limitNum);
            }
            
            const { data, error } = await query;
            
            if (error) {
              console.error(`[v0] Supabase fetch failed for ${entityName}:`, error);
              return [];
            }

            let freshItems = data || [];
            
            // Secure field masking layer
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (user && !userError) {
                let userRole = 'cashier';
                const secureClaims = getSecureUserClaims();
                if (secureClaims && secureClaims.role) {
                  userRole = secureClaims.role;
                } else {
                  const cachedProfileStr = localStorage.getItem(`rbac_profile_${user.id}`);
                  if (cachedProfileStr) {
                    const cachedProfile = JSON.parse(cachedProfileStr);
                    userRole = cachedProfile.role_name;
                  }
                }
                
                if (entityName === 'Product') {
                  if (userRole === 'cashier' || userRole === 'warehouse_manager') {
                    freshItems = freshItems.map(item => {
                      const copy = { ...item };
                      delete copy.purchase_price;
                      delete copy.profit_margin;
                      return copy;
                    });
                  }
                } else if (entityName === 'User') {
                  if (userRole !== 'owner' && userRole !== 'ceo' && userRole !== 'ca' && userRole !== 'accountant') {
                    freshItems = freshItems.map(item => {
                      const copy = { ...item };
                      if (item.id !== user.id) {
                        delete copy.salary;
                        delete copy.salary_details;
                      }
                      return copy;
                    });
                  }
                }
              }
            } catch (err) {
              console.error("[v0] Masking error:", err);
            }

            // Update local cache
            try {
              localStorage.setItem(cacheKey, JSON.stringify(freshItems));
            } catch (e) {
              console.warn("[v0] Error writing cache:", e);
            }

            // Update React Query cache
            try {
              if (queryClientInstance && typeof queryClientInstance.getQueryCache === 'function') {
                const queries = queryClientInstance.getQueryCache().getAll();
                queries.forEach(q => {
                  if (Array.isArray(q.queryKey) && q.queryKey[0] === tableName) {
                    queryClientInstance.setQueryData(q.queryKey, freshItems);
                  }
                });
              }
            } catch (e) {
              console.warn("[v0] Error updating React Query on sync:", e);
            }

            return freshItems;
          } catch (error) {
            console.error(`[v0] Supabase fetch failed for ${entityName}:`, error);
            return [];
          }
        };

        if (cachedItems) {
          fetchFreshData();
          return cachedItems;
        }
        
        return await fetchFreshData();
      } catch (error) {
        console.error(`[v0] List operation failed for ${entityName}:`, error);
        return [];
      }
    },

    create: async (data) => {
      try {
        const uid = await getUserId();
        const tableName = getTableName(entityName);
        const cacheKey = `base44_cache_${uid}_${tableName}`;
        
        // Security check
        try {
          const cachedProfileStr = localStorage.getItem(`rbac_profile_${uid}`);
          if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            if (cachedProfile && cachedProfile.is_active === false) {
              throw new Error("403 Forbidden: User account is deactivated.");
            }
          }
        } catch (e) {
          if (e.message?.includes("403 Forbidden")) throw e;
          console.warn("[v0] Error parsing rbac_profile from localStorage:", e);
        }

        const companyId = localStorage.getItem("company_id");
        if (!companyId) {
          throw new Error(`Data Isolation Policy Violation: Attempted to create ${entityName} without a valid company assignment.`);
        }
        
        const docData = {
          ...data,
          company_id: companyId,
          user_id: uid,
          created_date: data?.created_date || new Date().toISOString(),
          updated_date: new Date().toISOString()
        };
        
        const cleanedData = {};
        Object.keys(docData).forEach(key => {
          if (docData[key] !== undefined) {
            cleanedData[key] = docData[key];
          }
        });

        const { data: newItem, error } = await supabase
          .from(tableName)
          .insert([cleanedData])
          .select()
          .single();
        
        if (error) {
          throw error;
        }

        // Update local cache immediately
        try {
          const cached = localStorage.getItem(cacheKey);
          const cachedItems = cached ? JSON.parse(cached) : [];
          cachedItems.push(newItem);
          localStorage.setItem(cacheKey, JSON.stringify(cachedItems));

          if (queryClientInstance && typeof queryClientInstance.getQueryCache === 'function') {
            const queries = queryClientInstance.getQueryCache().getAll();
            queries.forEach(q => {
              if (Array.isArray(q.queryKey) && q.queryKey[0] === tableName) {
                queryClientInstance.setQueryData(q.queryKey, cachedItems);
              }
            });
          }
        } catch (e) {
          console.warn("[v0] Error updating cache on create:", e);
        }
        
        // Audit log
        try {
          await logAuditAction({
            action: `${entityName.toUpperCase()}_CREATE`,
            userId: uid,
            entityType: entityName,
            entityId: newItem.id,
            description: `Immutable audit log: ${entityName} created successfully.`,
            changes: { after: newItem }
          });
        } catch (err) {
          console.error("[v0] Audit log creation error:", err);
        }

        return newItem;
      } catch (error) {
        console.error(`[v0] Create operation failed for ${entityName}:`, error);
        throw error;
      }
    },

    update: async (id, data) => {
      try {
        const uid = await getUserId();
        const tableName = getTableName(entityName);
        const cacheKey = `base44_cache_${uid}_${tableName}`;
        
        // Security check
        try {
          const cachedProfileStr = localStorage.getItem(`rbac_profile_${uid}`);
          if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            if (cachedProfile && cachedProfile.is_active === false) {
              throw new Error("403 Forbidden: User account is deactivated.");
            }
          }
        } catch (e) {
          if (e.message?.includes("403 Forbidden")) throw e;
          console.warn("[v0] Error parsing rbac_profile from localStorage:", e);
        }

        const companyId = localStorage.getItem("company_id");
        if (!companyId) {
          throw new Error(`Data Isolation Policy Violation: Attempted to update ${entityName} without a valid company assignment.`);
        }

        const docData = {
          ...data,
          updated_date: new Date().toISOString()
        };

        const cleanedData = {};
        Object.keys(docData).forEach(key => {
          if (docData[key] !== undefined) {
            cleanedData[key] = docData[key];
          }
        });

        const { data: updatedItem, error } = await supabase
          .from(tableName)
          .update(cleanedData)
          .eq('id', id)
          .eq('company_id', companyId)
          .select()
          .single();
        
        if (error) {
          throw error;
        }

        // Update local cache
        try {
          const cached = localStorage.getItem(cacheKey);
          const cachedItems = cached ? JSON.parse(cached) : [];
          const itemIndex = cachedItems.findIndex(item => item.id === id);
          if (itemIndex >= 0) {
            cachedItems[itemIndex] = updatedItem;
          }
          localStorage.setItem(cacheKey, JSON.stringify(cachedItems));

          if (queryClientInstance && typeof queryClientInstance.getQueryCache === 'function') {
            const queries = queryClientInstance.getQueryCache().getAll();
            queries.forEach(q => {
              if (Array.isArray(q.queryKey) && q.queryKey[0] === tableName) {
                queryClientInstance.setQueryData(q.queryKey, cachedItems);
              }
            });
          }
        } catch (e) {
          console.warn("[v0] Error updating cache on update:", e);
        }

        // Audit log
        try {
          await logAuditAction({
            action: `${entityName.toUpperCase()}_UPDATE`,
            userId: uid,
            entityType: entityName,
            entityId: id,
            description: `Immutable audit log: ${entityName} updated successfully.`,
            changes: { before: data, after: updatedItem }
          });
        } catch (err) {
          console.error("[v0] Audit log update error:", err);
        }

        return updatedItem;
      } catch (error) {
        console.error(`[v0] Update operation failed for ${entityName}:`, error);
        throw error;
      }
    },

    delete: async (id) => {
      try {
        const uid = await getUserId();
        const tableName = getTableName(entityName);
        const cacheKey = `base44_cache_${uid}_${tableName}`;
        
        // Security check
        try {
          const cachedProfileStr = localStorage.getItem(`rbac_profile_${uid}`);
          if (cachedProfileStr) {
            const cachedProfile = JSON.parse(cachedProfileStr);
            if (cachedProfile && cachedProfile.is_active === false) {
              throw new Error("403 Forbidden: User account is deactivated.");
            }
          }
        } catch (e) {
          if (e.message?.includes("403 Forbidden")) throw e;
          console.warn("[v0] Error parsing rbac_profile from localStorage:", e);
        }

        const companyId = localStorage.getItem("company_id");
        if (!companyId) {
          throw new Error(`Data Isolation Policy Violation: Attempted to delete ${entityName} without a valid company assignment.`);
        }

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id)
          .eq('company_id', companyId);
        
        if (error) {
          throw error;
        }

        // Update local cache
        try {
          const cached = localStorage.getItem(cacheKey);
          const cachedItems = cached ? JSON.parse(cached) : [];
          const filtered = cachedItems.filter(item => item.id !== id);
          localStorage.setItem(cacheKey, JSON.stringify(filtered));

          if (queryClientInstance && typeof queryClientInstance.getQueryCache === 'function') {
            const queries = queryClientInstance.getQueryCache().getAll();
            queries.forEach(q => {
              if (Array.isArray(q.queryKey) && q.queryKey[0] === tableName) {
                queryClientInstance.setQueryData(q.queryKey, filtered);
              }
            });
          }
        } catch (e) {
          console.warn("[v0] Error updating cache on delete:", e);
        }

        // Audit log
        try {
          await logAuditAction({
            action: `${entityName.toUpperCase()}_DELETE`,
            userId: uid,
            entityType: entityName,
            entityId: id,
            description: `Immutable audit log: ${entityName} deleted successfully.`,
            changes: {}
          });
        } catch (err) {
          console.error("[v0] Audit log delete error:", err);
        }

        return { success: true };
      } catch (error) {
        console.error(`[v0] Delete operation failed for ${entityName}:`, error);
        throw error;
      }
    }
  };
};

export const base44 = {
  auth: {
    logout: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        localStorage.removeItem('base44_access_token');
        localStorage.removeItem('base44_cached_user');
        localStorage.removeItem('company_id');
        
        // Clear all RBAC profiles
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('rbac_profile_')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear all entity caches
        keys.forEach(key => {
          if (key.startsWith('base44_cache_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error("[v0] Logout error:", error);
        throw error;
      }
    },
    redirectToLogin: () => {
      window.location.href = '/login';
    }
  },
  entities: {
    Invoice: createSupabaseEntityRepository('Invoice'),
    Product: createSupabaseEntityRepository('Product'),
    Customer: createSupabaseEntityRepository('Customer'),
    Purchase: createSupabaseEntityRepository('Purchase'),
    Loan: createSupabaseEntityRepository('Loan'),
    Expense: createSupabaseEntityRepository('Expense'),
    ShopSettings: createSupabaseEntityRepository('ShopSettings'),
    UserSubscription: createSupabaseEntityRepository('UserSubscription'),
    Role: createSupabaseEntityRepository('Role'),
    User: createSupabaseEntityRepository('User'),
    Permission: createSupabaseEntityRepository('Permission'),
    SensitiveFieldAccess: createSupabaseEntityRepository('SensitiveFieldAccess'),
    AuditLog: createSupabaseEntityRepository('AuditLog'),
    Employee: createSupabaseEntityRepository('Employee'),
    SalaryStructure: createSupabaseEntityRepository('SalaryStructure'),
    MonthlyPayroll: createSupabaseEntityRepository('MonthlyPayroll'),
    AttendanceLog: createSupabaseEntityRepository('AttendanceLog'),
    LeaveManagement: createSupabaseEntityRepository('LeaveManagement'),
    PerformanceReview: createSupabaseEntityRepository('PerformanceReview'),
    EmployeeDocument: createSupabaseEntityRepository('EmployeeDocument'),
    EmployeeLoan: createSupabaseEntityRepository('EmployeeLoan'),
    Department: createSupabaseEntityRepository('Department'),
    Designation: createSupabaseEntityRepository('Designation'),
    Shift: createSupabaseEntityRepository('Shift'),
    Holiday: createSupabaseEntityRepository('Holiday')
  }
};
