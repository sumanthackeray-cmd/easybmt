import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { 
  Shield, Lock, Eye, Save, Sliders, ArrowLeft, ToggleLeft, ToggleRight, Sparkles, Server,
  Plus, Edit, Trash2, Download, Percent, Play, Printer, Award, CheckCircle2,
  Building2, Warehouse, Truck, ClipboardCheck, BookOpen, Calendar, History,
  Send, DollarSign, CheckSquare, Cpu, Fingerprint, Upload, Package, TrendingUp,
  ShoppingCart, Users, ChevronRight, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVAILABLE_ROLES } from "@/config/accessConfig";

export default function PermissionsSettings() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState("");

  // Grid permissions state
  const [permissionsMap, setPermissionsMap] = useState({});
  // Sensitive field access state
  const [sensitiveFieldsMap, setSensitiveFieldsMap] = useState({});

  // Fetch collections
  const { data: rolesData = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles_rbac"],
    queryFn: () => base44.entities.Role.list(),
    enabled: !!currentUser,
  });

  const roles = rolesData && rolesData.length > 0 ? rolesData : AVAILABLE_ROLES;

  const { data: permissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions_rbac"],
    queryFn: () => base44.entities.Permission.list(),
    enabled: !!currentUser,
  });

  const { data: sensitiveFieldAccess = [], isLoading: isLoadingSfa } = useQuery({
    queryKey: ["sensitive_field_rbac"],
    queryFn: () => base44.entities.SensitiveFieldAccess.list(),
    enabled: !!currentUser,
  });

  // Check if current user is authorized (Level <= 2: Owner, CEO, Admin)
  const isAuthorized = currentUser && (currentUser.hierarchy_level <= 2 || currentUser.role === 'admin' || currentUser.role_id === 'role-admin');

  // Set default active tab
  useEffect(() => {
    if (roles.length > 0 && currentUser && !activeRoleId) {
      const sortedRoles = [...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);
      const editableRole = sortedRoles.find(r => r.hierarchy_level > currentUser.hierarchy_level) || sortedRoles[0];
      if (editableRole) {
        setActiveRoleId(editableRole.id);
      }
    }
  }, [roles, currentUser, activeRoleId]);

  // Load configuration into state when activeRoleId changes
  useEffect(() => {
    if (!activeRoleId) return;

    const rolePerm = permissions.find(p => p.role_id === activeRoleId);
    if (rolePerm) {
      setPermissionsMap(rolePerm.permissions || {});
    } else {
      setPermissionsMap({});
    }

    const roleSfa = sensitiveFieldAccess.find(s => s.role_id === activeRoleId);
    if (roleSfa) {
      setSensitiveFieldsMap(roleSfa.fields || {});
    } else {
      setSensitiveFieldsMap({});
    }
  }, [activeRoleId, permissions, sensitiveFieldAccess]);

  const formatRoleName = (name) => {
    if (!name) return "";
    return name.toUpperCase().replace("_", " ");
  };

  const getRoleLevel = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.hierarchy_level : 7;
  };

  const categories = [
    {
      name: "Core & AI Intelligence",
      icon: Sparkles,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      pages: [
        { key: "dashboard", name: "Core Business Dashboard", actions: ["view", "view_staff", "ai_insights"] },
        { key: "ai_intel", name: "AI Intelligence Hub & Copilot", actions: ["view", "ask_copilot", "export_insights"] }
      ]
    },
    {
      name: "Sales & POS Operations",
      icon: ShoppingCart,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      pages: [
        { key: "pos", name: "Quick POS Billing Terminal", actions: ["view", "create_bill", "void_bill", "apply_discount", "price_override", "shift_mgmt", "reprint_bill", "cash_drawer"] },
        { key: "invoices", name: "Sales Invoices History Ledger", actions: ["view", "edit", "delete", "export"] },
        { key: "customers", name: "Customer Directory & CRM Loyalty", actions: ["view", "create", "edit", "delete", "loyalty_adjust"] },
        { key: "waybills", name: "Government E-Waybill Portal", actions: ["view", "create", "cancel", "export"] }
      ]
    },
    {
      name: "Inventory & Supply Chain ERP",
      icon: Package,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      pages: [
        { key: "inventory", name: "Product Registry & Catalog", actions: ["view", "create", "edit", "delete", "stock_adjust", "barcode_print"] },
        { key: "stock_transfer", name: "Inter-Branch Stock Transfer", actions: ["view", "create", "approve"] },
        { key: "inventory_sync", name: "Real-time Multi-Branch Sync", actions: ["view", "sync_now"] },
        { key: "purchases", name: "Vendor Procurement POs", actions: ["view", "create_po", "approve_po", "execute_grn", "vendor_manage"] },
        { key: "warehouse", name: "Warehouse Storage & Racking", actions: ["view_racks", "manage_layout", "receive_stock", "dispatch_stock", "stock_count_audit"] }
      ]
    },
    {
      name: "Finance, Ledger & Tax Compliance",
      icon: BookOpen,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      pages: [
        { key: "accounting", name: "Double-Entry General Ledger", actions: ["view_ledger", "create_journal", "day_closing", "view_audit_trail"] },
        { key: "expenses", name: "Corporate Expenses Registry", actions: ["view", "create", "approve", "delete"] },
        { key: "loans", name: "Employee Cash Advance Loans", actions: ["view", "apply", "pay"] },
        { key: "gst_filing", name: "GST Tax Return Compliance", actions: ["view", "reconcile", "export_returns"] }
      ]
    },
    {
      name: "Workforce & HRMS Suite",
      icon: Users,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
      pages: [
        { key: "hrms_dashboard", name: "HRMS Executive Dashboard", actions: ["view"] },
        { key: "hrms_employees", name: "Employee Directory Master", actions: ["view", "create", "edit", "delete"] },
        { key: "hrms_org", name: "Departments & Org Structures", actions: ["view", "manage"] },
        { key: "hrms_salary", name: "Salary Structure & Payroll Engine", actions: ["view", "process_payroll", "approve_payroll"] },
        { key: "hrms_mes", name: "Factory Floor Biometric MES", actions: ["view", "log_attendance"] },
        { key: "hrms_compliance", name: "Regulatory Compliance Vault", actions: ["view_vault", "upload_docs", "statutory_filing"] }
      ]
    },
    {
      name: "Audit & Global Controls",
      icon: Shield,
      color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
      pages: [
        { key: "reports", name: "Executive P&L Analytics Reports", actions: ["view_sales", "view_inventory", "view_profit", "export_pdf"] },
        { key: "branches", name: "Enterprise Multi-Branch Config", actions: ["view", "create", "edit", "delete"] },
        { key: "audit_logs", name: "System Operations Audit Logs", actions: ["view"] }
      ]
    }
  ];

  const sensitiveFields = [
    { key: "purchase_price", name: "Product Purchase Price", desc: "Strip item-level procurement costs from all listing queries" },
    { key: "profit_margin", name: "Profit Margin Ratios", desc: "Hide target profit percentages and overall markup rates" },
    { key: "salary", name: "Employee Salaries", desc: "Restrict salary and payout details from other users" }
  ];

  const getActionIcon = (act) => {
    switch (act) {
      case "view":
      case "view_ledger":
      case "view_racks":
      case "view_sales":
      case "view_vault":
        return Eye;
      case "view_staff":
        return Eye;
      case "create":
      case "create_bill":
      case "create_po":
      case "create_journal":
        return Plus;
      case "edit":
      case "manage_layout":
      case "manage":
        return Edit;
      case "delete":
      case "void_bill":
      case "cancel":
        return Trash2;
      case "export":
      case "export_pdf":
      case "export_insights":
      case "export_returns":
        return Download;
      case "apply_discount":
        return Percent;
      case "price_override":
        return Lock;
      case "shift_mgmt":
        return Play;
      case "reprint_bill":
        return Printer;
      case "cash_drawer":
        return Server;
      case "loyalty_adjust":
        return Award;
      case "approve_po":
      case "approve":
      case "approve_payroll":
        return CheckCircle2;
      case "execute_grn":
      case "receive_stock":
        return Warehouse;
      case "vendor_manage":
        return Building2;
      case "stock_adjust":
        return Sliders;
      case "barcode_print":
        return TagIcon;
      case "sync_now":
        return RefreshCw;
      case "dispatch_stock":
        return Truck;
      case "stock_count_audit":
        return ClipboardCheck;
      case "day_closing":
        return Calendar;
      case "view_audit_trail":
        return History;
      case "apply":
        return Send;
      case "pay":
        return DollarSign;
      case "reconcile":
        return CheckSquare;
      case "process_payroll":
        return Cpu;
      case "log_attendance":
        return Fingerprint;
      case "upload_docs":
        return Upload;
      case "statutory_filing":
        return Shield;
      case "view_inventory":
        return Package;
      case "view_profit":
        return TrendingUp;
      case "ai_insights":
      case "ask_copilot":
        return Sparkles;
      default:
        return Eye;
    }
  };

  const getActionLabel = (act) => {
    return act
      .replace("_", " ")
      .replace("mgmt", "management")
      .toUpperCase();
  };

  // Helper to toggle a matrix permission
  const handleTogglePermission = (moduleKey, actionKey) => {
    const activeRoleLevel = getRoleLevel(activeRoleId);
    
    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify permissions of an equal or higher authority level.");
    }
    if (activeRoleLevel === 1) {
      return toast.error("SAP Rule: Owner permissions are immutable and locked.");
    }

    setPermissionsMap(prev => {
      const moduleData = prev[moduleKey] || {};
      const updatedModule = {
        ...moduleData,
        [actionKey]: !moduleData[actionKey]
      };
      return {
        ...prev,
        [moduleKey]: updatedModule
      };
    });
  };

  // Helper to toggle a sensitive field
  const handleToggleSensitiveField = (fieldKey) => {
    const activeRoleLevel = getRoleLevel(activeRoleId);

    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify field configurations of an equal or higher authority level.");
    }
    if (activeRoleLevel === 1) {
      return toast.error("SAP Rule: Owner sensitive field guards are immutable.");
    }

    setSensitiveFieldsMap(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    const activeRoleLevel = getRoleLevel(activeRoleId);
    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify permissions of an equal or higher authority level.");
    }
    if (activeRoleLevel === 1) {
      return toast.error("Owner permissions are protected and cannot be changed.");
    }

    setSaving(true);
    try {
      const activePermDoc = permissions.find(p => p.role_id === activeRoleId);
      if (activePermDoc) {
        await base44.entities.Permission.update(activePermDoc.id, {
          permissions: permissionsMap
        });
      }

      const activeSfaDoc = sensitiveFieldAccess.find(s => s.role_id === activeRoleId);
      if (activeSfaDoc) {
        await base44.entities.SensitiveFieldAccess.update(activeSfaDoc.id, {
          fields: sensitiveFieldsMap
        });
      }

      toast.success(`SAP security matrix saved for ${formatRoleName(roles.find(r => r.id === activeRoleId)?.role_name)}!`);
      queryClient.invalidateQueries({ queryKey: ["permissions_rbac"] });
      queryClient.invalidateQueries({ queryKey: ["sensitive_field_rbac"] });
    } catch (err) {
      toast.error("Failed to update SAP permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser || isLoadingRoles || isLoadingPerms || isLoadingSfa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Syncing security grids...</p>
      </div>
    );
  }

  // ACCESS DENIED VIEW
  if (!isAuthorized) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto mt-10">
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 backdrop-blur-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto text-destructive animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-destructive">SAP Permissions Lock Active</h1>
            <p className="text-muted-foreground text-sm">
              Your profile level <strong>({currentUser.role.toUpperCase()} - Level {currentUser.hierarchy_level})</strong> is locked out of the corporate permission control plane. Only Owners and CEOs are authorized to adjust the SAP grid.
            </p>
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

  const activeRoleLevel = getRoleLevel(activeRoleId);
  const isEditable = activeRoleLevel > currentUser.hierarchy_level && activeRoleLevel !== 1;

  // Custom TagIcon for barcode fallback
  function TagIcon(props) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l5.58-5.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M6 8h.01" />
      </svg>
    );
  }

  return (
    <div className="animate-fade-up space-y-6 text-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Sliders className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">SAP Permission Grid Control Matrix</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Toggle corporate capabilities and configure column field-level protection guards.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="outline" className="gap-2 border-border/50 bg-background/50 text-xs">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Button>
          </Link>
          <Button 
            className="gold-gradient text-black font-bold gap-2 text-xs" 
            onClick={handleSaveChanges} 
            disabled={saving || !isEditable}
          >
            <Save className="w-4 h-4" /> {saving ? "Saving Matrix..." : "Save Security Matrix"}
          </Button>
        </div>
      </div>

      {/* TABS FOR ROLES */}
      <Tabs value={activeRoleId} onValueChange={setActiveRoleId} className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1">
          {roles
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level)
            .map((role) => (
              <TabsTrigger 
                key={role.id} 
                value={role.id} 
                className="gap-1.5 py-2 px-3 text-xs"
              >
                <Shield className={`w-3.5 h-3.5 ${role.hierarchy_level === 1 ? "text-amber-500" : "text-indigo-400"}`} /> 
                {formatRoleName(role.role_name)} 
                <span className="text-[10px] opacity-65 font-mono">(L{role.hierarchy_level})</span>
              </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value={activeRoleId} className="space-y-6">
          
          {/* MATRIX HEADER CARD */}
          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-bold text-[14px]">Editing Role Profile: {formatRoleName(roles.find(r => r.id === activeRoleId)?.role_name)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Clearance Hierarchy Level: {activeRoleLevel} of 7</p>
              </div>
            </div>
            
            {activeRoleLevel === 1 ? (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-full font-black flex items-center gap-1.5 animate-pulse">
                👑 Owner Account clearance is absolute and immutable
              </span>
            ) : !isEditable ? (
              <span className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-full font-black flex items-center gap-1.5">
                🔒 You cannot configure roles higher than or equal to yours
              </span>
            ) : (
              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full font-black flex items-center gap-1.5">
                🟢 Write clearance active for this matrix node
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* COLUMN DATA SHIELD & FIELD GUARDS */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-[13px] uppercase tracking-wide">Sensitive Field Guards</h3>
                </div>
                
                <p className="text-xs text-muted-foreground leading-normal">
                  Enforces strict data restriction at the query proxy level. If checked, the keys are completely stripped from lists returned to the front-end.
                </p>

                <div className="space-y-4">
                  {sensitiveFields.map((field) => {
                    const isChecked = !!sensitiveFieldsMap[field.key];
                    return (
                      <div 
                        key={field.key} 
                        className={`flex flex-col border p-3.5 rounded-xl transition-all duration-300 ${
                          isChecked 
                            ? "bg-slate-500/5 border-emerald-500/30" 
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs tracking-tight">{field.name}</span>
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleToggleSensitiveField(field.key)}
                            className={`transition-colors duration-200 outline-none focus:outline-none ${
                              !isEditable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {isChecked ? (
                              <div className="flex items-center gap-1 text-[11px] font-black text-emerald-500">
                                Visible <ToggleRight className="w-8 h-8 text-emerald-500 fill-emerald-500/20" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                                Masked <ToggleLeft className="w-8 h-8 text-destructive fill-destructive/20" />
                              </div>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">{field.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTION MATRICES */}
            <div className="xl:col-span-3 space-y-6">
              {categories.map((cat, catIdx) => {
                const CatIcon = cat.icon;
                return (
                  <div key={catIdx} className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/30 pb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-[14px] tracking-wide text-foreground">{cat.name}</h3>
                    </div>

                    <div className="space-y-4">
                      {cat.pages.map((mod) => (
                        <div key={mod.key} className="border border-border/40 rounded-xl p-4 bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                          <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3">
                            <span className="font-extrabold text-[13px] text-indigo-400 flex items-center gap-1.5">
                              <ChevronRight className="w-3.5 h-3.5 text-indigo-500/70" />
                              {mod.name}
                            </span>
                            <span className="text-[9px] font-mono uppercase bg-slate-500/10 text-slate-400 px-2.5 py-0.5 rounded-full border border-border/30">
                              page: {mod.key}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                            {mod.actions.map((act) => {
                              const isAllowed = !!permissionsMap[mod.key]?.[act];
                              const ActIcon = getActionIcon(act);
                              return (
                                <button
                                  key={act}
                                  type="button"
                                  disabled={!isEditable}
                                  onClick={() => handleTogglePermission(mod.key, act)}
                                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all select-none min-h-[64px] ${
                                    isAllowed
                                      ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-500 shadow-sm"
                                      : "bg-transparent border-border/50 text-muted-foreground hover:bg-muted/30"
                                  } ${!isEditable ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
                                >
                                  <ActIcon className={`w-4 h-4 mb-1.5 ${isAllowed ? "opacity-100 animate-pulse text-indigo-500" : "opacity-45"}`} />
                                  <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight">
                                    {getActionLabel(act)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}
