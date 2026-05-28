import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import {
  LayoutDashboard, FileText, ShoppingCart, Truck, Package,
  Users, BarChart3, Settings, Sparkles, ScanBarcode, LogOut, Crown,
  Receipt, BookOpen, Landmark, Building2, Zap, GitBranch, RefreshCw, Warehouse, TrendingUp, Shield, Scissors,
  Monitor, Tag, Award, Calendar, Search, ChevronLeft, ChevronRight, Factory, X
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { useFashionMode } from "@/hooks/useFashionMode";
import { useSupermarketMode } from "@/hooks/useSupermarketMode";
import { useShopSettings } from "@/hooks/useShopSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/LanguageContext";
import { useState, useEffect, useMemo } from "react";
import { getAllBranches, getCachedBranches, createBranch } from "@/api/branchService";
import { prefetchRoute } from "@/lib/performance/prefetch-manager";
import { AVAILABLE_ROLES } from "@/config/accessConfig";
// Helper: extract avatar initial from full name, skipping titles
const _TITLES = ["mr", "mr.", "mrs", "mrs.", "ms", "ms.", "dr", "dr.", "prof", "prof.", "shri", "smt"];
const getAvatarLetter = (fullName) => {
  if (!fullName) return "U";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  const first = (parts.length > 1 && _TITLES.includes(parts[0].toLowerCase())) ? parts[1] : parts[0];
  return first.charAt(0).toUpperCase() || "U";
};

const getPageKeyForPath = (path) => {
  if (path === "/pos" || path === "/alterations" || path === "/supermarket/counters" || path === "/supermarket/offers") return "pos";
  if (path === "/invoices") return "invoices";
  if (path === "/customers" || path === "/profiles" || path === "/supermarket/loyalty") return "customers";
  if (path === "/waybills") return "waybills";
  if (path === "/purchases") return "purchases";
  if (path === "/inventory" || path === "/barcode" || path === "/supermarket/expiry") return "inventory";
  if (path === "/stock-transfer") return "stock_transfer";
  if (path === "/warehouse") return "warehouse";
  if (path === "/inventory-sync") return "inventory_sync";
  if (path === "/accounting") return "accounting";
  if (path === "/finance") return "finance";
  if (path === "/expenses") return "expenses";
  if (path === "/loans") return "loans";
  if (path === "/gst-filing") return "gst_filing";
  if (path === "/hrms") return "hrms_dashboard";
  if (path === "/reports" || path === "/supermarket/reports" || path === "/ai-insights") return "reports";
  if (path === "/branches") return "branches";
  if (path === "/enterprise-intel") return "ai_intel";
  if (path === "/audit-logs") return "audit_logs";
  if (path === "/manufacturing") return "manufacturing";
  return null;
};

const NAV_ITEMS = [
  // 🏠 Core
  { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
  { path: "/pos", icon: Zap, label: "Quick POS", badge: "FAST", tKey: "nav.pos" },
  
  // 🛒 Sales & Customers
  { path: "/customers", icon: Users, label: "Customers", tKey: "nav.customers" },
  { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
  { path: "/waybills", icon: Truck, label: "E-Waybills", tKey: "nav.waybills" },
  
  // 🏭 Purchase & Inventory
  { path: "/purchases", icon: ShoppingCart, label: "Purchases", tKey: "nav.purchases" },
  { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
  { path: "/stock-transfer", icon: Truck, label: "Stock Transfer", tKey: "nav.stocktransfer" },
  { path: "/warehouse", icon: Warehouse, label: "Warehouse Hub", badge: "SAP", tKey: "nav.warehouse" },
  { path: "/inventory-sync", icon: RefreshCw, label: "Inventory Sync", badge: "LIVE", tKey: "nav.invsync" },
  { path: "/barcode", icon: ScanBarcode, label: "Barcode", tKey: "nav.barcode" },
  
  // 💰 Finance & Accounting
  { path: "/accounting", icon: BookOpen, label: "Accounting", tKey: "nav.accounting" },
  { path: "/expenses", icon: Receipt, label: "Expenses", tKey: "nav.expenses" },
  { path: "/loans", icon: Landmark, label: "Loans", tKey: "nav.loans" },
  { path: "/finance", icon: Landmark, label: "Finance Hub", badge: "ERP", tKey: "nav.finance" },
  { path: "/gst-filing", icon: Building2, label: "GST Filing", badge: "NEW", tKey: "nav.gstfiling" },
  
  // 👥 HR & Workforce
  { path: "/hrms", icon: Users, label: "HRMS & Payroll", badge: "SAP", tKey: "nav.hrms" },
  
  // ⚙️ Manufacturing ERP (locked to manufacturer business type)
  { path: "/manufacturing", icon: Factory, label: "Manufacturing ERP", badge: "PRO", tKey: "nav.manufacturing" },
  
  // 📊 Analytics & Admin
  { path: "/reports", icon: BarChart3, label: "Reports", tKey: "nav.reports" },
  { path: "/branches", icon: GitBranch, label: "Branches", tKey: "nav.branches" },
  { path: "/enterprise-intel", icon: TrendingUp, label: "Enterprise Intel", badge: "AI", tKey: "nav.enterprise_intel" },
  { path: "/ai-insights", icon: Sparkles, label: "AI Insights", badge: "AI", tKey: "nav.aiinsights" },
  { path: "/audit-logs", icon: Shield, label: "Audit Logs", tKey: "nav.auditLogs" },
  
  // ⚙️ System
  { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
  { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
];

export default function Sidebar({ mobile = false, onClose, defaultCollapsed = false, fullHeight = false }) {
  const location = useLocation();
  const { user } = useAuth();
  const { language, setLanguage, voiceEnabled, setVoiceEnabled, t, speak } = useLanguage();

  // Load branches from cache instantly, refresh from Firestore in background
  const [branches, setBranches] = useState(() => getCachedBranches());
  const [activeBranchId, setActiveBranchId] = useState(localStorage.getItem('selectedBranch') || '');
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Fetch shop settings
  const { shopSettings } = useShopSettings();

  const { isFashion } = useFashionMode();
  const { isSupermarket } = useSupermarketMode();

  const activeNavItems = useMemo(() => {
    let items = NAV_ITEMS;
    if (isFashion) {
      items = [
        { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
        { path: "/pos", icon: Zap, label: "Fashion POS", badge: "FAST", tKey: "nav.pos" },
        { path: "/invoices", icon: FileText, label: "Invoices", tKey: "nav.invoices" },
        { path: "/profiles", icon: Users, label: "Style Profiles", badge: "CRM", tKey: "nav.profiles" },
        { path: "/alterations", icon: Scissors, label: "Alterations", badge: "LIVE", tKey: "nav.alterations" },
        { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
        { path: "/purchases", icon: ShoppingCart, label: "Purchases", tKey: "nav.purchases" },
        { path: "/hrms", icon: Users, label: "HRMS & Payroll", badge: "SAP", tKey: "nav.hrms" },
        { path: "/reports", icon: BarChart3, label: "Reports", tKey: "nav.reports" },
        { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
        { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
      ];
    } else if (isSupermarket) {
      items = [
        { path: "/", icon: LayoutDashboard, label: "Dashboard", tKey: "nav.dashboard" },
        { path: "/pos", icon: Zap, label: "Supermarket POS", badge: "FAST", tKey: "nav.pos" },
        { path: "/supermarket/counters", icon: Monitor, label: "Counter Mgmt", badge: "LIVE", tKey: "nav.supermarket_counters" },
        { path: "/supermarket/offers", icon: Tag, label: "Offers Engine", badge: "PROMO", tKey: "nav.supermarket_offers" },
        { path: "/supermarket/loyalty", icon: Award, label: "Loyalty Program", badge: "CRM", tKey: "nav.supermarket_loyalty" },
        { path: "/supermarket/expiry", icon: Calendar, label: "Expiry Mgmt", badge: "FEFO", tKey: "nav.supermarket_expiry" },
        { path: "/supermarket/reports", icon: BarChart3, label: "Dept Reports", badge: "P&L", tKey: "nav.supermarket_reports" },
        { path: "/inventory", icon: Package, label: "Inventory", tKey: "nav.inventory" },
        { path: "/hrms", icon: Users, label: "HRMS & Payroll", badge: "SAP", tKey: "nav.hrms" },
        { path: "/settings", icon: Settings, label: "Settings", tKey: "nav.settings" },
        { path: "/subscription", icon: Crown, label: "Upgrade", badge: "PRO", isPro: true, tKey: "nav.upgrade" },
      ];
    }

    const businessType = shopSettings?.business_type || "retail";
    const isOwnerOrAdmin = user?.email?.toLowerCase().includes("kksp010452") || 
                           user?.user_code?.toUpperCase().includes("ADMIN") || 
                           localStorage.getItem("user_code")?.toUpperCase().includes("ADMIN") ||
                           user?.role === 'owner' || 
                           user?.role === 'admin';
                           
    if (businessType !== "manufacturer" && !isOwnerOrAdmin) {
      items = items.filter(item => item.path !== "/manufacturing");
    }

    const enabled = shopSettings?.enabled_pages;
    if (enabled && Array.isArray(enabled) && enabled.length > 0) {
      items = items.filter(item => {
        if (["/", "/settings", "/subscription"].includes(item.path)) return true;
        if (item.path.startsWith("/settings/")) return true;
        
        const mappedKey = getPageKeyForPath(item.path);
        if (mappedKey && !enabled.includes(mappedKey)) {
          // Special fallback cases because some keys share intent
          if (mappedKey === 'hrms_dashboard' && enabled.some(e => e.startsWith('hrms_'))) return true;
          return false;
        }
        return true;
      });
    }

    return items;
  }, [isFashion, isSupermarket, shopSettings?.enabled_pages, shopSettings?.business_type]);

  // Refresh branches from Firestore after login
  useEffect(() => {
    if (!user) return;
    getAllBranches().then(async (list) => {
      let activeList = list;
      if (list.length === 0) {
        try {
          const defaultBranch = {
            name: 'Main Outlet',
            code: 'MAIN',
            type: 'Store',
            address: { street: 'Main Street', city: '', state: '', zipcode: '', country: 'India' },
            contact: { phone: '', email: '', manager: 'Owner' },
            gst: { gstNumber: '', registrationType: 'Regular' },
            settings: { currency: 'INR', timezone: 'Asia/Kolkata', billPrefix: 'VR-', enableOfflineBilling: true, enableLoyalty: true },
          };
          const newId = await createBranch(defaultBranch);
          activeList = [{ id: newId, ...defaultBranch }];
        } catch (err) {
          console.error("Failed to seed default branch:", err);
        }
      }
      
      setBranches(activeList);
      
      if (activeList.length > 0) {
        const currentSelected = localStorage.getItem('selectedBranch');
        const exists = activeList.some(b => b.id === currentSelected);
        if (!currentSelected || !exists) {
          localStorage.setItem('selectedBranch', activeList[0].id);
          setActiveBranchId(activeList[0].id);
          window.dispatchEvent(new Event('branchChanged'));
        }
      }
    }).catch(err => console.error("Error loading branches:", err));
  }, [user]);

  // Listen for branch list changes (after create/delete in BranchManagement)
  useEffect(() => {
    const handleRefresh = () => {
      getAllBranches().then(list => {
        setBranches(list);
        if (list.length > 0) {
          const currentSelected = localStorage.getItem('selectedBranch');
          const exists = list.some(b => b.id === currentSelected);
          if (!currentSelected || !exists) {
            localStorage.setItem('selectedBranch', list[0].id);
            setActiveBranchId(list[0].id);
            window.dispatchEvent(new Event('branchChanged'));
          }
        } else {
          localStorage.removeItem('selectedBranch');
          setActiveBranchId('');
          window.dispatchEvent(new Event('branchChanged'));
        }
      }).catch((err) => {
        console.error("Failed to refresh branches:", err);
        toast.error("Failed to load branches");
      });
    };
    window.addEventListener('branchListChanged', handleRefresh);
    return () => window.removeEventListener('branchListChanged', handleRefresh);
  }, []);

  const handleBranchChange = (e) => {
    const id = e.target.value;
    localStorage.setItem('selectedBranch', id);
    setActiveBranchId(id);
    window.dispatchEvent(new Event('branchChanged'));
  };

  const handleNavClick = () => {
    if (mobile && onClose) onClose();
  };

  // Dynamically filter navigation items based on user's SAP permissions
  const filteredNavItems = activeNavItems.filter((item) => {
    if (searchQuery && !t(item.tKey).toLowerCase().includes(searchQuery.toLowerCase()) && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (!user) return true;
    
    // Essential core pages
    if (item.path === "/" || item.path === "/subscription" || item.path === "/settings" || item.path.startsWith("/settings/")) {
      return true;
    }
    
    // High-level Admins (Owner, CEO, CA) have complete clearance by default
    const roleObj = AVAILABLE_ROLES.find(r => r.role_name === user.role) || { hierarchy_level: 7 };
    if (user.role === 'admin' || user.role === 'administrator' || roleObj.hierarchy_level <= 3) return true;
    
    // Map paths to expanded granular permission keys
    let pageKey = getPageKeyForPath(item.path);
    let actionKey = "view";

    // Set specialized action keys for certain pages
    if (item.path === "/warehouse") {
      actionKey = "view_racks";
    } else if (item.path === "/accounting" || item.path === "/finance") {
      actionKey = "view_ledger";
    } else if (item.path === "/reports" || item.path === "/supermarket/reports") {
      actionKey = "view_sales";
    }

    if (pageKey) {
      const pagePerms = user.permissions?.[pageKey];
      return !!(pagePerms?.[actionKey] || pagePerms?.view);
    }
    
    return true;
  });

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "flex flex-col shrink-0 overflow-visible transition-all duration-300 ease-in-out relative group/sidebar z-50",
        mobile 
          ? "w-full h-full bg-sidebar border-r border-sidebar-border" 
          : fullHeight
            ? collapsed
              ? "hidden lg:flex w-[76px] h-screen rounded-none border-r border-sidebar-border bg-white dark:bg-slate-900 shadow-sm"
              : "hidden lg:flex w-[200px] h-screen rounded-none border-r border-sidebar-border bg-white dark:bg-slate-900 shadow-sm"
            : collapsed 
              ? "hidden lg:flex w-[76px] h-[calc(100vh-2rem)] lg:my-4 lg:ml-4 rounded-2xl border border-sidebar-border glass-panel shadow-xl" 
              : "hidden lg:flex w-[200px] h-[calc(100vh-2rem)] lg:my-4 lg:ml-4 rounded-2xl border border-sidebar-border glass-panel shadow-xl"
      )}>
        
        {/* Toggle Button */}
        {mobile && onClose && (
          <button
            onClick={onClose}
            className="absolute top-[calc(var(--safe-top,12px)+8px)] right-3 p-1.5 rounded-full hover:bg-secondary/80 bg-background border border-border/50 shadow-md z-[60]"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "absolute -right-3 bg-background text-foreground hover:bg-secondary border border-border/50 p-1 rounded-full shadow-md z-[60] transition-transform active:scale-95",
              fullHeight ? "top-[23px]" : "top-7"
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronLeft className="w-4 h-4 text-primary" />}
          </button>
        )}
 
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-transparent relative z-40">
          {/* Logo & Brand */}
          <div className={cn(
            "px-5 pb-[1px] border-b border-sidebar-border/30 shrink-0 transition-all duration-300",
            mobile ? "pt-[calc(var(--safe-top,12px)+16px)]" : fullHeight ? "pt-4" : "pt-[5px]",
            collapsed ? "px-2 flex flex-col items-center" : "px-5"
          )}>
            <div className={cn("flex items-center gap-2 mb-2", collapsed && "justify-center mt-3")}>
              <span className={cn("font-black gold-text transition-all", collapsed ? "text-xl" : "text-2xl")}>{collapsed ? "EB" : "EasyBMT"}</span>
              {!collapsed && (
                <span className={cn(
                  "w-2 h-2 rounded-full border border-white dark:border-slate-900 shadow-[0_0_6px_var(--color)] shrink-0",
                  isOnline 
                    ? "bg-emerald-500 shadow-emerald-500/50" 
                    : "bg-amber-500 shadow-amber-500/50 animate-pulse"
                )} 
                title={isOnline ? "Cloud Connected" : "Local Offline Cache Enabled"}
                />
              )}
            </div>
            
            {!collapsed && (
              <div className="flex flex-col gap-0.5 mb-2 animate-in fade-in duration-300">
          <p className="text-[12px] text-foreground font-extrabold uppercase tracking-wider truncate">
            🏢 {shopSettings.shop_name || user?.business_name || "Business Outlet"}
          </p>
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 truncate">
            <span className="truncate">{user?.full_name || user?.name || "Kamlesh Kkumar"}</span>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-[8px] font-bold border border-border/50">
              ID: {(user?.user_code === 'ADMIN-001' || localStorage.getItem('user_code') === 'ADMIN-001' ? `${(localStorage.getItem('company_id') || 'COMP').split('-')[0].substring(0, 6).toUpperCase()}-ADMIN-001` : user?.user_code || user?.id?.substring(0, 6) || "STF-01")}
            </span>
              </div>
              </div>
            )}

            {/* Dynamic Branch Dropdown Switcher */}
            {!collapsed && branches.length > 0 && (
              <div className="mt-2 space-y-1 animate-in fade-in duration-300">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-extrabold flex items-center gap-1">
              <GitBranch className="w-2.5 h-2.5 text-amber-500" /> {t("branches.active_outlet")}
            </label>
            <select
              value={activeBranchId}
              onChange={handleBranchChange}
              className="w-full bg-secondary/40 border border-border/40 rounded-md py-1 px-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-background text-foreground font-bold">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {!collapsed && (
          <div className="mt-3 mb-2 relative flex items-center animate-in fade-in duration-300">
            <Search className="absolute left-2 w-3 h-3 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Smart Search..." 
            className="w-full h-[30px] bg-secondary/50 border border-border/50 rounded text-[10px] pl-6 pr-2 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 pt-2 pb-2 overflow-y-auto no-scrollbar", collapsed ? "px-2 space-y-2 mt-2" : "px-3 space-y-0.5 mt-0")}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
            
          const navLink = (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              onMouseEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              className={cn(
                "flex items-center rounded-lg font-medium transition-all duration-200 group relative",
                collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-2.5 px-2 py-[5px] text-[13px]",
                item.isPro
                  ? "bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 mt-1"
                  : isActive
                    ? "bg-primary/15 text-primary shadow-sm border border-primary/30"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
              )}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md gold-gradient shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-in slide-in-from-left-1 duration-200" />
              )}
              <item.icon className={cn("shrink-0 transition-transform group-hover:scale-110", collapsed ? "w-5 h-5" : "w-4.5 h-4.5", isActive || item.isPro ? "text-primary" : item.badge && !item.isPro ? "text-purple" : "")} />
              {!collapsed && <span className="truncate">{t(item.tKey)}</span>}
              {!collapsed && item.badge && (
                <span className={cn("ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                  item.isPro ? "gold-gradient text-black" :
                    item.badge === "NEW" ? "bg-emerald-500 text-white" :
                      "bg-purple text-white"
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                {navLink}
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="font-bold text-xs bg-sidebar border-sidebar-border text-sidebar-foreground">
                {t(item.tKey)} {item.badge && `(${item.badge})`}
              </TooltipContent>
            </Tooltip>
          ) : navLink;
        })}
      </nav>

      {/* Language & Voice Assistant Controls */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-300">
          <div className="flex items-center gap-1 bg-secondary/35 rounded-lg p-0.5 border border-border/40">
          <button
            onClick={() => {
              setLanguage("en");
              setTimeout(() => speak("voice.welcome"), 50);
            }}
            className={cn(
              "px-2 py-1 text-[10px] font-bold rounded-md transition-colors",
              language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => {
              setLanguage("hi");
              setTimeout(() => speak("voice.welcome"), 50);
            }}
            className={cn(
              "px-2 py-1 text-[10px] font-bold rounded-md transition-colors",
              language === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            हिंदी
          </button>
        </div>
        <button
          onClick={() => {
            const nextVoice = !voiceEnabled;
            setVoiceEnabled(nextVoice);
            if (nextVoice) {
              setTimeout(() => speak(language === "hi" ? "आवाज़ गाइडेंस चालू है।" : "Voice assistant enabled.", true), 50);
            }
          }}
          className={cn(
            "p-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all duration-200 shrink-0",
            voiceEnabled 
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" 
              : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
          )}
          title={voiceEnabled ? "Mute Voice Guidance" : "Unmute Voice Guidance"}
        >
          {voiceEnabled ? "🔈 Voice ON" : "🔇 Voice OFF"}
        </button>
      </div>
      )}

      {/* User */}
      <div className={cn("border-t border-sidebar-border shrink-0 transition-all", collapsed ? "p-2 flex flex-col items-center gap-3 py-4" : "p-3")}>
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-[14px] font-bold text-black shrink-0 cursor-pointer shadow-md hover:scale-105 transition-transform">
                  {getAvatarLetter(user?.full_name || user?.name || "User")}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="font-bold">{user?.full_name || user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => base44.auth.logout()}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mt-2"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>Logout</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-[13px] font-bold text-black shrink-0">
            {getAvatarLetter(user?.full_name || user?.name || "User")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold truncate">{user?.full_name || user?.name || "User"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
            <button
              onClick={() => base44.auth.logout()}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title={t("nav.logout")}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      </div>
      </aside>
    </TooltipProvider>
  );
}