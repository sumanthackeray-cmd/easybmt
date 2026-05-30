import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/hooks/useAuth";
import { useShopSettings } from "@/hooks/useShopSettings";
const CRYPTO_KEY = "EasyBMT_Secure_Crypto_Key";

const decryptPassword = (enc) => {
  if (!enc) return "";
  if (enc.startsWith("enc:xor:")) {
    try {
      const decoded = atob(enc.substring(8));
      let decrypted = "";
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch (e) {
      return enc;
    }
  } else if (enc.startsWith("enc:")) {
    try {
      return atob(enc.substring(4));
    } catch (e) {
      return enc;
    }
  }
  return enc;
};
import { manageStaffUser } from "@/firebase/functions";
import { db as dexieDb, putLocal, broadcastMutation } from "@/lib/localDB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { Shield, Users, Plus, UserCheck, UserX, Crown, Landmark, User, ArrowLeft, Eye, EyeOff, Trash2, Edit, AlertCircle, Key } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import FieldGuard from "@/components/guards/FieldGuard";
import React from "react";
import { AVAILABLE_ROLES, ACCESS_CATEGORIES } from "@/config/accessConfig";


export default function UsersSettings() {
  const { role: currentUserRole, companyId, user: currentUser } = useAuth();
  const { shopSettings } = useShopSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userCode: "",
    name: "",
    contact_email: "",
    contact_mobile: "",
    staff_id: "",
    role_id: "role-cashier",
    salary: "",
    branch_id: "MAIN",
    password: ""
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  React.useEffect(() => {
    if (companyId && (currentUserRole === "admin" || currentUserRole === "owner" || currentUser?.role_id === "role-owner")) {
      import("firebase/firestore").then(({ collection, getDocs }) => {
        import("@/api/firebase").then(({ db: firestoreDb }) => {
          getDocs(collection(firestoreDb, "companies", companyId, "users")).then((snap) => {
            snap.forEach(docSnap => {
              const data = docSnap.data();
              dexieDb.users.put({ ...data, companyId, isDeleted: false, version: 1 }).catch(() => {});
            });
            queryClient.invalidateQueries({ queryKey: ["users"] });
          });
        });
      });
    }
  }, [companyId, currentUserRole]);

  // Query users list
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  // Query custom permissions list
  const { data: permissionsList = [], refetch: refetchPermissions } = useQuery({
    queryKey: ["permissions_rbac"],
    queryFn: () => base44.entities.Permission.list(),
    enabled: !!currentUser,
  });

  // Query sensitive field access list
  const { data: sensitiveFieldAccessList = [], refetch: refetchSfa } = useQuery({
    queryKey: ["sensitive_field_rbac"],
    queryFn: () => base44.entities.SensitiveFieldAccess.list(),
    enabled: !!currentUser,
  });

  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);
  const [accessPermissionsMap, setAccessPermissionsMap] = useState({});
  const [accessSensitiveFieldsMap, setAccessSensitiveFieldsMap] = useState({});
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const handleOpenAccessModal = (staff) => {
    setSelectedUserForAccess(staff);
    
    // Find or fallback to role permissions
    const existingPerm = permissionsList.find(p => p.user_id === staff.id) || permissionsList.find(p => p.role_id === staff.role_id);
    if (existingPerm) {
      setAccessPermissionsMap(existingPerm.permissions || {});
    } else {
      setAccessPermissionsMap({});
    }

    const existingSfa = sensitiveFieldAccessList.find(s => s.user_id === staff.id) || sensitiveFieldAccessList.find(s => s.role_id === staff.role_id);
    if (existingSfa) {
      setAccessSensitiveFieldsMap(existingSfa.fields || {});
    } else {
      setAccessSensitiveFieldsMap({});
    }

    setIsAccessModalOpen(true);
  };

  const handleSaveAccessPermissions = async () => {
    if (!selectedUserForAccess) return;
    setSaving(true);
    try {
      const existingPerm = permissionsList.find(p => p.user_id === selectedUserForAccess.id);
      if (existingPerm) {
        await base44.entities.Permission.update(existingPerm.id, {
          permissions: accessPermissionsMap
        });
      } else {
        await base44.entities.Permission.create({
          user_id: selectedUserForAccess.id,
          role_id: selectedUserForAccess.role_id,
          permissions: accessPermissionsMap
        });
      }

      const existingSfa = sensitiveFieldAccessList.find(s => s.user_id === selectedUserForAccess.id);
      if (existingSfa) {
        await base44.entities.SensitiveFieldAccess.update(existingSfa.id, {
          fields: accessSensitiveFieldsMap
        });
      } else {
        await base44.entities.SensitiveFieldAccess.create({
          user_id: selectedUserForAccess.id,
          role_id: selectedUserForAccess.role_id,
          fields: accessSensitiveFieldsMap
        });
      }

      toast.success(`User access configuration saved successfully for ${selectedUserForAccess.name}!`);
      setIsAccessModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["permissions_rbac"] });
      queryClient.invalidateQueries({ queryKey: ["sensitive_field_rbac"] });
    } catch (err) {
      toast.error("Failed to save custom permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Query employees list from HRMS
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!currentUser,
  });

  const isRosterEmpty = !isLoadingEmployees && (!employees || employees.length === 0);

  const filteredEmployees = (employees || []).filter(emp => {
    const s = employeeSearch.toLowerCase();
    const name = (emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`).toLowerCase();
    const code = (emp.employee_code || emp.employeeId || emp.id || "").toLowerCase();
    const phone = (emp.personal_phone || emp.work_phone || "").toLowerCase();
    const email = (emp.personal_email || emp.work_email || "").toLowerCase();
    return name.includes(s) || code.includes(s) || phone.includes(s) || email.includes(s);
  });

  const currentRoleObj = AVAILABLE_ROLES.find(r => r.role_name === currentUserRole) || { hierarchy_level: 7 };
  const currentHierarchy = (currentUserRole === 'admin' || currentUser?.role_id === 'role-admin' || currentUser?.user_code?.includes('ADMIN')) ? 1 : currentRoleObj.hierarchy_level;

  // Enforce administrative clearance (hierarchy_level <= 3: Owner, CEO, CA)
  const isAuthorized = currentHierarchy <= 3 || currentUserRole === 'admin' || currentUser?.role_id === 'role-admin' || currentUser?.user_code?.includes('ADMIN');

  // Filter roles that the current user can assign (roles with hierarchy level strictly higher than current user)
  const assignableRoles = AVAILABLE_ROLES.filter(r => r.hierarchy_level > currentHierarchy);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const trimmedCode = form.userCode.trim();
    if (!trimmedCode) return toast.error("Please enter user code (e.g., CASHIER-01)");
    if (!selectedEmployee) return toast.error("Please select an employee from the HR roster");
    if (!form.role_id) return toast.error("Please assign a role");
    if (!form.password.trim()) return toast.error("Please enter password");

    setSaving(true);
    try {
      const selectedRole = AVAILABLE_ROLES.find(r => r.id === form.role_id);
      const isPrimaryOwner = currentUser?.role_id === 'role-owner' || currentUserRole === 'admin';
      if (!isPrimaryOwner && (!selectedRole || selectedRole.hierarchy_level <= currentHierarchy)) {
        throw new Error("403 Forbidden: You cannot assign a role equal to or higher than your own.");
      }

      const newUserCode = form.userCode.trim().toUpperCase();
      const internalEmail = `${newUserCode}@${companyId.replace("-", "")}.easybmt.app`;

      const empName = selectedEmployee.full_name || selectedEmployee.name || `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`;
      const empContactEmail = selectedEmployee.personal_email || selectedEmployee.work_email || selectedEmployee.email || "";
      const empContactMobile = selectedEmployee.personal_phone || selectedEmployee.work_phone || selectedEmployee.phone || "";
      const empSalary = Number(selectedEmployee.basicSalary || 0) + Number(selectedEmployee.hra || 0);

      if (editingUser) {
        // Edit Mode: Call Cloud Function or fallback to update User profile and Auth password securely
        const updateParams = {
          action: "UPDATE",
          companyId,
          uid: editingUser.id,
          name: empName.trim(),
          email: internalEmail,
          contact_email: empContactEmail.trim().toLowerCase(),
          contact_mobile: empContactMobile.trim(),
          salary: empSalary || 0,
          userCode: newUserCode,
          roleId: form.role_id,
          branchId: form.branch_id,
          staff_id: form.staff_id
        };

        if (form.password && form.password.trim() !== decryptPassword(editingUser.profile_password)) {
          updateParams.password = form.password.trim();
        }

        await manageStaffUser(updateParams);

        try {
          await dexieDb.users.update(editingUser.id, {
            name: empName.trim(),
            email: internalEmail,
            contact_email: empContactEmail.trim().toLowerCase(),
            contact_mobile: empContactMobile.trim(),
            salary: empSalary || 0,
            user_code: newUserCode,
            role_id: form.role_id,
            branch_id: form.branch_id,
            staff_id: form.staff_id,
            updated_date: new Date().toISOString()
          });
        } catch (dexieErr) {
          console.warn("Failed to inject user update into local cache", dexieErr);
        }

        const oldEmpId = editingUser.id;
        const newEmpId = selectedEmployee.id;

        if (newEmpId !== oldEmpId) {
          // Reassigning employee!
          // 1. Back up the old employee under a new ID so they are not deleted
          const oldEmp = employees.find(e => e.id === oldEmpId);
          if (oldEmp) {
            const backupId = `EMP-${Date.now()}`;
            await base44.entities.Employee.create({
              ...oldEmp,
              id: backupId,
              employee_code: `UNASSIGNED-${oldEmp.employee_code || ""}`,
              employeeId: `UNASSIGNED-${oldEmp.employeeId || ""}`,
              updated_at: new Date().toISOString()
            });

            // Sync/migration of the old salary structure to backup ID
            try {
              const structures = await base44.entities.SalaryStructure.list();
              const oldStruct = structures.find(s => s && s.employeeId === oldEmpId);
              if (oldStruct) {
                await base44.entities.SalaryStructure.create({
                  ...oldStruct,
                  id: undefined,
                  employeeId: backupId
                });
                await base44.entities.SalaryStructure.delete(oldStruct.id);
              }
            } catch (err) {
              console.warn("Old salary structure backup skipped:", err);
            }
          }

          // 2. Clone the selected new employee to oldEmpId (the user's UID)
          const updatedEmployeeData = {
            ...selectedEmployee,
            id: oldEmpId,
            employee_code: form.staff_id,
            employeeId: form.staff_id,
            work_location: form.branch_id,
            updated_at: new Date().toISOString()
          };
          await base44.entities.Employee.create(updatedEmployeeData);

          // Move the new employee's salary structure under user ID (oldEmpId)
          try {
            const structures = await base44.entities.SalaryStructure.list();
            const newStruct = structures.find(s => s && s.employeeId === newEmpId);
            if (newStruct) {
              await base44.entities.SalaryStructure.create({
                ...newStruct,
                id: undefined,
                employeeId: oldEmpId
              });
              await base44.entities.SalaryStructure.delete(newStruct.id);
            }
          } catch (err) {
            console.warn("New salary structure reassignment skipped:", err);
          }

          // 3. Delete the original document of the new employee
          await base44.entities.Employee.delete(newEmpId);
        } else {
          // Same employee, just update their details
          await base44.entities.Employee.update(oldEmpId, {
            employee_code: form.staff_id,
            employeeId: form.staff_id,
            work_location: form.branch_id,
            updated_at: new Date().toISOString()
          });
        }

        toast.success("User account and employee mapping updated successfully!");
      } else {
        // Create Mode: Call Cloud Function to provision user auth and database profile
        const result = await manageStaffUser({
          action: "CREATE",
          companyId,
          userCode: newUserCode,
          email: internalEmail,
          contact_email: empContactEmail,
          contact_mobile: empContactMobile,
          staff_id: form.staff_id,
          name: empName.trim(),
          password: form.password,
          roleId: form.role_id,
          salary: empSalary || 0,
          branchId: form.branch_id,
          is_active: true
        });

        if (result.success) {
          const newUid = result.uid || result.user?.uid || result.user?.id;
          const oldEmpId = selectedEmployee.id;

          const updatedEmployeeData = {
            ...selectedEmployee,
            id: newUid,
            employee_code: form.staff_id,
            employeeId: form.staff_id,
            work_location: form.branch_id,
            updated_at: new Date().toISOString()
          };

          // Create new employee
          await base44.entities.Employee.create(updatedEmployeeData);

          // Fetch salary structure and copy if any
          try {
            const structures = await base44.entities.SalaryStructure.list();
            const matchStruct = structures.find(s => s && s.employeeId === oldEmpId);
            if (matchStruct) {
              await base44.entities.SalaryStructure.create({
                ...matchStruct,
                id: undefined,
                employeeId: newUid,
                company_id: companyId
              });
              await base44.entities.SalaryStructure.delete(matchStruct.id);
            }
          } catch (err) {
            console.warn("Salary structure sync skipped:", err);
          }

          // Delete old employee record if UID changed
          if (newUid !== oldEmpId) {
            await base44.entities.Employee.delete(oldEmpId);
            // Delete old user account if any
            try {
              await manageStaffUser({
                action: "DELETE",
                companyId,
                uid: oldEmpId
              });
            } catch (err) {
              console.warn("Cleanup of old auth user skipped:", err);
            }
          }

          try {
            await putLocal("users", {
              id: newUid,
              name: empName.trim(),
              email: internalEmail,
              contact_email: empContactEmail,
              contact_mobile: empContactMobile,
              staff_id: form.staff_id,
              role_id: form.role_id,
              branch_id: form.branch_id,
              is_active: true,
              user_code: newUserCode,
              salary: empSalary || 0,
              isDeleted: false
            });
          } catch (dexieErr) {
            console.warn("Failed to inject new user into local cache", dexieErr);
          }

          toast.success(`Staff user ${newUserCode} created and synchronized with HR module successfully!`);
        } else {
          throw new Error(result.message || "Failed to create user.");
        }
      }

      setForm({
        userCode: "",
        name: "",
        contact_email: "",
        contact_mobile: "",
        staff_id: "",
        role_id: "role-cashier",
        salary: "",
        branch_id: "MAIN",
        password: ""
      });
      setSelectedEmployee(null);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      refetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    const targetRoleObj = AVAILABLE_ROLES.find(r => r.id === targetUser.role_id) || { hierarchy_level: 7 };
    const isPrimaryOwner = currentUser?.role_id === 'role-owner' || currentUserRole === 'admin';
    const isTargetPrimaryOwner = targetUser.role_id === 'role-owner' && targetUser.user_code?.toUpperCase() === 'ADMIN-001';

    if (isTargetPrimaryOwner) {
      return toast.error("Access Denied: The primary owner account is protected and cannot be modified.");
    }

    if (!isPrimaryOwner && targetRoleObj.hierarchy_level <= currentHierarchy) {
      return toast.error("Access Denied: You cannot modify a user with an equal or higher authority level.");
    }

    try {
      const nextStatus = !targetUser.is_active;
      const result = await manageStaffUser({
        action: "UPDATE",
        companyId,
        uid: targetUser.id,
        is_active: nextStatus
      });

      if (result.success) {
        toast.success(`${targetUser.name} has been ${nextStatus ? "Activated" : "Deactivated"}!`);
        try {
          await dexieDb.users.update(targetUser.id, {
            is_active: nextStatus,
            updated_date: new Date().toISOString()
          });
          broadcastMutation("LOCAL_PUT", { storeName: "users", id: targetUser.id });
        } catch (dexieErr) {}
        queryClient.invalidateQueries({ queryKey: ["users"] });
        refetchUsers();
      } else {
        toast.error(result.message || "Failed to update staff status");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update staff status");
    }
  };

  const handleDeleteStaff = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${targetUser.name}? This action cannot be undone.`)) return;

    const targetRoleObj = AVAILABLE_ROLES.find(r => r.id === targetUser.role_id) || { hierarchy_level: 7 };
    const isPrimaryOwner = currentUser?.role_id === 'role-owner' || currentUserRole === 'admin';
    const isTargetPrimaryOwner = targetUser.role_id === 'role-owner' && targetUser.user_code?.toUpperCase() === 'ADMIN-001';

    if (isTargetPrimaryOwner) {
      return toast.error("Access Denied: The primary owner account is protected and cannot be modified.");
    }

    if (!isPrimaryOwner && targetRoleObj.hierarchy_level <= currentHierarchy) {
      return toast.error("Access Denied: You cannot delete a user with an equal or higher authority level.");
    }

    try {
      const result = await manageStaffUser({
        action: "DELETE",
        companyId,
        uid: targetUser.id
      });

      if (result.success) {
        toast.success(`${targetUser.name} has been deleted successfully!`);
        try {
          await dexieDb.users.where("id").equals(targetUser.id).delete();
          broadcastMutation("LOCAL_PUT", { storeName: "users", id: targetUser.id });
        } catch (dexieErr) {}
        queryClient.invalidateQueries({ queryKey: ["users"] });
        refetchUsers();
      } else {
        toast.error(result.message || "Failed to delete user.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete staff member");
    }
  };

  if (!currentUser || isLoadingUsers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading SAP authority framework...</p>
      </div>
    );
  }

  // ACCESS DENIED VIEW
  if (!isAuthorized) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto mt-10">
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 backdrop-blur-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto text-destructive animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-destructive">SAP Security Access Denied</h1>
            <p className="text-muted-foreground text-sm">
              Your current profile level <strong>({currentUserRole.toUpperCase()} - Level {currentHierarchy})</strong> lacks the required administrative clearance to manage user accounts.
            </p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-xl p-4 text-left text-xs space-y-3 font-mono">
            <p className="text-amber-500 font-bold uppercase">👑 SAP Hierarchy pyramid clearance metrics:</p>
            <div className="space-y-1 text-muted-foreground">
              <p className="text-primary font-bold">1. OWNER (Level 1) - Full Clearance</p>
              <p className="text-primary font-bold">2. CEO (Level 2) - Full Clearance</p>
              <p className="text-primary font-bold">3. CA (Level 3) - Staff Admin Clearance</p>
              <p className="opacity-50">4. Accountant (Level 4) - Restricted</p>
              <p className="opacity-50">5. Store Manager (Level 5) - Restricted</p>
              <p className="opacity-50">6. Warehouse Manager (Level 6) - Restricted</p>
              <p className="opacity-50">7. Cashier (Level 7) - Blocked</p>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/settings">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Return to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredAccessCategories = ACCESS_CATEGORIES.map(cat => {
    const enabled = shopSettings?.enabled_pages;
    if (!enabled || !Array.isArray(enabled) || enabled.length === 0) return cat; // All enabled by default
    
    // Core transactional modules should always be listed and customizable regardless of premium features
    const CORE_PAGES = [
      "dashboard", "ai_intel", "pos", "invoices", "customers", "waybills",
      "inventory", "stock_transfer", "inventory_sync", "purchases", "warehouse",
      "finance", "accounting", "expenses", "loans", "gst_filing"
    ];
    
    return {
      ...cat,
      pages: cat.pages.filter(p => CORE_PAGES.includes(p.key) || enabled.includes(p.key))
    };
  }).filter(cat => cat.pages.length > 0);

  return (
    <div className="animate-fade-up space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Users className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SU01 - Staff &amp; Role Assignments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enforce enterprise SAP authority models, add staff, and toggle active user nodes.</p>
          </div>
        </div>
        <div>
          <Link to="/settings">
            <Button variant="outline" className="gap-2 border-border/50 bg-background/50 hover:bg-muted">
              <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ADD NEW USER FORM */}
        <div className="lg:col-span-1">
          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border/30 pb-3">
              <Plus className="w-5 h-5 text-indigo-500" />
              <h2 className="font-black text-md">Onboard New Staff</h2>
            </div>
            
            <form onSubmit={handleCreateStaff} className="space-y-4">
              {isRosterEmpty && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-500 font-bold space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse text-amber-500" />
                    <div className="space-y-1 text-left">
                      <p className="uppercase tracking-wider text-[9px] font-black text-amber-500">Compliance Guard: HRMS Roster Required</p>
                      <p className="text-muted-foreground font-medium text-[11px] leading-relaxed">
                        To provision a user login or assign a billing cashier, you must first register the staff member in the HRMS Employee Master. Dummy profiles and mock bypassing are strictly prohibited by active SaaS security modules.
                      </p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/hrms")} 
                    className="w-full font-bold border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 gap-1.5 h-8 text-[11px] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Register Employee in HRMS
                  </Button>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">🔑 USER CODE (e.g. CASHIER-01) *</Label>
                <Input 
                  value={form.userCode}
                  onChange={e => setForm(f => ({ ...f, userCode: e.target.value.replace(/[@\s]/g, '') }))}
                  placeholder="CASHIER-01"
                  className="bg-background/50"
                  required
                  disabled={isRosterEmpty}
                />
              </div>

              <div className="space-y-1.5 relative w-full text-xs text-left">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase">👤 SELECT EMPLOYEE FROM HR *</Label>
                <div 
                  onClick={() => !isRosterEmpty && setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)} 
                  className={`w-full bg-background border border-border/60 rounded-xl py-2.5 px-3 h-10 text-xs font-bold flex items-center justify-between transition bg-background/50 ${
                    isRosterEmpty 
                      ? "opacity-50 cursor-not-allowed bg-secondary/30" 
                      : "cursor-pointer hover:border-indigo-500/50"
                  }`}
                >
                  <span className="text-foreground">
                    {selectedEmployee 
                      ? `${selectedEmployee.full_name || selectedEmployee.name || `${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`} [ID: ${selectedEmployee.employee_code || selectedEmployee.employeeId || "No ID"}]`
                      : "Select Employee..."}
                  </span>
                  <span className="text-muted-foreground text-[8px]">▼</span>
                </div>

                {!isRosterEmpty && isEmployeeDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEmployeeDropdownOpen(false);
                        setEmployeeSearch("");
                      }} 
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto flex flex-col gap-1 scrollbar-thin bg-card/95 backdrop-blur-md">
                      <Input 
                        type="text" 
                        placeholder="Search Name, ID, Phone, Email..." 
                        value={employeeSearch} 
                        onChange={e => setEmployeeSearch(e.target.value)} 
                        onClick={e => e.stopPropagation()} 
                        className="text-[11px] bg-background/50 h-8 border-border/40 mb-1 shrink-0"
                        autoFocus
                      />
                      <div className="overflow-y-auto flex flex-col gap-0.5 max-h-48">
                        {isLoadingEmployees ? (
                          <div className="p-2 text-center text-muted-foreground text-[10px]">Loading employees...</div>
                        ) : filteredEmployees.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground text-[10px]">No results found.</div>
                        ) : (
                          filteredEmployees.map((emp) => {
                             const empName = emp.full_name || emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`;
                             const empCode = emp.employee_code || emp.employeeId || "No ID";
                             const empPhone = emp.personal_phone || emp.work_phone || "No Phone";
                             const empEmail = emp.personal_email || emp.work_email || "No Email";
                             return (
                               <div 
                                 key={emp.id}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedEmployee(emp);
                                   setForm(f => ({
                                     ...f,
                                     name: empName,
                                     staff_id: empCode,
                                     branch_id: emp.work_location || "MAIN"
                                   }));
                                   setIsEmployeeDropdownOpen(false);
                                   setEmployeeSearch("");
                                 }}
                                 className={`p-2 rounded-lg cursor-pointer hover:bg-slate-500/10 transition text-left flex flex-col gap-0.5 border border-transparent hover:border-border/30 ${
                                   selectedEmployee?.id === emp.id ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "text-foreground"
                                 }`}
                               >
                                 <div className="flex items-center justify-between font-bold text-xs">
                                   <span>{empName}</span>
                                   <span className="text-[9px] px-1.5 py-0.2 bg-slate-500/10 rounded font-mono text-muted-foreground">{empCode}</span>
                                 </div>
                                 <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                   <span>📞 {empPhone}</span>
                                   <span>📧 {empEmail}</span>
                                 </div>
                               </div>
                             );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">👑 SAP ROLE ASSIGNMENT *</Label>
                <Select 
                  value={form.role_id}
                  onValueChange={v => setForm(f => ({ ...f, role_id: v }))}
                  disabled={isRosterEmpty}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select SAP Role Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.label} (Level {role.hierarchy_level})
                      </SelectItem>
                    ))}
                    {assignableRoles.length === 0 && (
                      <SelectItem disabled value="none">No assignable roles available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground font-medium italic mt-1">
                  * Authority Rule: You can only assign roles with a hierarchy level strictly BELOW your level ({currentHierarchy}).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">🏢 BRANCH ID</Label>
                  <Input 
                    value={form.branch_id}
                    onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                    placeholder="MAIN"
                    className="bg-background/50"
                    disabled={isRosterEmpty}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">🆔 STAFF ID</Label>
                  <Input 
                    value={form.staff_id}
                    onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                    placeholder="STF-001"
                    className="bg-background/50"
                    disabled={isRosterEmpty}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground">🔒 INITIAL PASSWORD *</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    className="bg-background/50 pr-10"
                    required
                    disabled={isRosterEmpty}
                  />
                  <button
                    type="button"
                    onClick={() => !isRosterEmpty && setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                    disabled={isRosterEmpty}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 mt-2"
                disabled={isRosterEmpty || saving || assignableRoles.length === 0}
              >
                {saving ? (editingUser ? "Saving..." : "Provisioning...") : editingUser ? "Update Staff Member" : "Provision Staff Member"}
              </Button>
              {editingUser && (
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full font-bold border-border hover:bg-muted mt-1.5"
                  disabled={isRosterEmpty}
                  onClick={() => {
                    setForm({
                      userCode: "",
                      name: "",
                      contact_email: "",
                      contact_mobile: "",
                      staff_id: "",
                      role_id: "role-cashier",
                      salary: "",
                      branch_id: "MAIN",
                      password: ""
                    });
                    setSelectedEmployee(null);
                    setEditingUser(null);
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </form>
          </div>
        </div>

        {/* ACTIVE STAFF DIRECTORY */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h2 className="font-black text-md">Enterprise User Directory</h2>
              </div>
              <span className="text-xs bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2.5 py-1 rounded-full font-black">
                {users.length} Workspace Accounts
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {users.map((staff) => {
                const staffRoleObj = AVAILABLE_ROLES.find(r => r.id === staff.role_id) || { hierarchy_level: 7, label: "Cashier" };
                const staffLevel = staffRoleObj.hierarchy_level;
                const isProtected = staff.role_id === 'role-owner' && staff.user_code?.toUpperCase() === 'ADMIN-001';
                
                const currentEmp = employees.find(e => e.id === staff.id);
                const displayDesignation = currentEmp?.designation || currentEmp?.designation_id || staffRoleObj.label;

                return (
                  <div 
                    key={staff.id} 
                    className={`flex items-center justify-between border p-4 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                      staff.is_active 
                        ? "bg-slate-500/5 hover:bg-slate-500/10 border-border/50" 
                        : "bg-destructive/5 hover:bg-destructive/10 border-destructive/20 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center border border-border/50 relative">
                        {staffLevel === 1 ? (
                          <Crown className="w-5 h-5 text-amber-500" />
                        ) : staffLevel <= 3 ? (
                          <Landmark className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                        {staff.is_active ? (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                        ) : (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-card animate-pulse" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm tracking-tight">{staff.name}</span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            staffLevel === 1
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/25"
                              : staffLevel <= 3
                              ? "bg-indigo-500/15 text-indigo-500 border border-indigo-500/25"
                              : "bg-slate-500/15 text-slate-500 border border-slate-500/25"
                          }`}>
                            {displayDesignation}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium font-mono">{staff.email}</p>
                        <FieldGuard fieldName="salary" fallback="₹***">
                          <span className="text-xs font-black text-emerald-500">
                            ₹{Number(staff.salary || 0).toLocaleString('en-IN')}/mo
                          </span>
                        </FieldGuard>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isProtected ? (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          🛡️ Protected
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 font-bold transition-all border-amber-200 dark:border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 mr-1"
                            onClick={() => handleOpenAccessModal(staff)}
                          >
                            <Key className="w-3.5 h-3.5" /> Access
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 font-bold transition-all border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-500"
                            onClick={() => {
                              setEditingUser(staff);
                              const currentEmp = employees.find(e => e.id === staff.id);
                              setSelectedEmployee(currentEmp || null);
                              setForm({
                                userCode: staff.user_code || "",
                                name: staff.name || "",
                                contact_email: staff.contact_email || "",
                                contact_mobile: staff.contact_mobile || "",
                                staff_id: staff.staff_id || "",
                                role_id: staff.role_id || "role-cashier",
                                salary: staff.salary || "",
                                branch_id: staff.branch_id || "MAIN",
                                password: decryptPassword(staff.profile_password) || ""
                              });
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant={staff.is_active ? "destructive" : "outline"}
                            size="sm"
                            className="h-8 gap-1.5 font-bold transition-all"
                            onClick={() => handleToggleActive(staff)}
                          >
                            {staff.is_active ? (
                              <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                            ) : (
                              <><UserCheck className="w-3.5 h-3.5" /> Activate</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-red-200 dark:border-red-500/20"
                            onClick={() => handleDeleteStaff(staff)}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );

              })}

              {users.length === 0 && (
                <div className="text-center py-10 border border-dashed rounded-xl">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No staff user accounts found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAccessModalOpen && selectedUserForAccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/30">
              <div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" />
                  Customize User Access: <span className="text-primary">{selectedUserForAccess.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Configure granular page and tab-level overrides for this specific user account.
                </p>
              </div>
              <button 
                onClick={() => setIsAccessModalOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Sensitive field guards */}
              <div className="bg-muted/20 border border-border/40 rounded-2xl p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-1.5">
                  🛡️ Sensitive Field Guards
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/50 hover:bg-muted/40 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={!!accessSensitiveFieldsMap.purchase_price}
                      onChange={() => setAccessSensitiveFieldsMap(prev => ({ ...prev, purchase_price: !prev.purchase_price }))}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">Purchase Price</p>
                      <p className="text-[10px] text-muted-foreground">Hide item cost prices</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/50 hover:bg-muted/40 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={!!accessSensitiveFieldsMap.profit_margin}
                      onChange={() => setAccessSensitiveFieldsMap(prev => ({ ...prev, profit_margin: !prev.profit_margin }))}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">Profit Margin</p>
                      <p className="text-[10px] text-muted-foreground">Hide profit markup ratios</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 bg-card rounded-xl border border-border/50 hover:bg-muted/40 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={!!accessSensitiveFieldsMap.salary}
                      onChange={() => setAccessSensitiveFieldsMap(prev => ({ ...prev, salary: !prev.salary }))}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold">Employee Salaries</p>
                      <p className="text-[10px] text-muted-foreground">Hide salary information</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table representing Page List and corresponding tab details */}
              <div className="border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="p-4 w-1/3">Module / Page Name</th>
                      <th className="p-4 w-2/3">Granular Action & Tab Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {filteredAccessCategories.map(category => (
                      <React.Fragment key={category.name}>
                        <tr className="bg-muted/20 font-black text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-wider">
                          <td colSpan="2" className="px-4 py-2 border-b border-border/30">
                            {category.name}
                          </td>
                        </tr>
                        {category.pages.map(page => (
                          <tr key={page.key} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4 font-bold border-r border-border/30 align-top">
                              <p className="text-foreground">{page.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono font-medium">/{page.key}</p>
                            </td>
                            <td className="p-4 align-top">
                              <div className="flex flex-wrap gap-3">
                                {page.actions.map(act => {
                                  const moduleData = accessPermissionsMap[page.key] || {};
                                  const isChecked = !!moduleData[act];
                                  return (
                                    <label 
                                      key={act} 
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                                        isChecked 
                                          ? "bg-primary/10 border-primary/40 text-primary" 
                                          : "bg-background border-border/50 text-muted-foreground hover:bg-muted/40"
                                      }`}
                                    >
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setAccessPermissionsMap(prev => {
                                            const mod = prev[page.key] || {};
                                            return {
                                              ...prev,
                                              [page.key]: {
                                                ...mod,
                                                [act]: !mod[act]
                                              }
                                            };
                                          });
                                        }}
                                        className="rounded border-border focus:ring-primary h-3.5 w-3.5"
                                      />
                                      <span>
                                        {act === "own_data_only" ? "Isolate (Own Counter Only)" : act.replace("_", " ").toUpperCase()}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-muted/30">
              <Button 
                variant="outline"
                className="font-bold border-border"
                onClick={() => setIsAccessModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                className="font-bold bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 shadow-lg shadow-primary/15"
                onClick={handleSaveAccessPermissions}
                disabled={saving}
              >
                {saving ? "Saving Configuration..." : "Save Custom Access Rules"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
