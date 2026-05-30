import { lazy, Suspense, useEffect, useState } from "react";
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import PremiumPermissionOnboarding from "@/components/PremiumPermissionOnboarding";
import { ToastContainer } from "@/components/ui/ToastContainer";
import SyncStatusIndicator from "@/components/SyncStatusIndicator";
import { toast } from "@/lib/toast";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageRouteGuard from "@/components/PageRouteGuard";
import { warmCriticalCaches, resetPrefetchState } from "@/lib/performance/prefetch-manager";
import { registerPopState } from "@/hooks/useBackButton";
import AppInstallPrompt from "@/components/AppInstallPrompt";
import { ThemeSync } from "@/components/ThemeSync";
import { HelmetProvider } from "react-helmet-async";

// Critical / Initial Routes
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import AppLayout from "@/components/layout/AppLayout";
import OnboardingWizard from "@/modules/registration/OnboardingWizard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsConditions from "@/pages/TermsConditions";
import Pricing from "@/pages/Pricing";
import Landing from "@/pages/Landing";
import Contact from "@/pages/Contact";
import About from "@/pages/About";

// Lazy Loaded Routes (Code Split for sub-100ms loading)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const Waybills = lazy(() => import("@/pages/Waybills"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Customers = lazy(() => import("@/pages/Customers"));
const Barcode = lazy(() => import("@/pages/Barcode"));
const Reports = lazy(() => import("@/pages/Reports"));
const AIInsights = lazy(() => import("@/pages/AllInsights"));
const Settings = lazy(() => import("@/pages/Settings"));
const UsersSettings = lazy(() => import("@/pages/settings/Users"));
const PermissionsSettings = lazy(() => import("@/pages/settings/Permissions"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Accounting = lazy(() => import("@/pages/Accounting"));
const Loans = lazy(() => import("@/pages/Loans"));
const GSTFiling = lazy(() => import("@/pages/GSTFiling"));
const POS = lazy(() => import("@/pages/POS"));
const BranchManagement = lazy(() => import("@/pages/BranchManagement"));
const Alterations = lazy(() => import("@/pages/Alterations"));
const CustomerStyleProfiles = lazy(() => import("@/pages/CustomerStyleProfiles"));
const InventorySync = lazy(() => import("@/pages/InventorySync"));
const StockTransfer = lazy(() => import("@/pages/StockTransfer"));
const WarehouseManagement = lazy(() => import("@/pages/WarehouseManagement"));
const HRMS = lazy(() => import("@/pages/HRMS"));
const Manufacturing = lazy(() => import("@/pages/Manufacturing"));
const EnterpriseIntelligence = lazy(() => import("@/pages/EnterpriseIntelligence"));
const FinanceModule = lazy(() => import("@/modules/accounting/FinanceModule"));
const AuditLogPage = lazy(() => import("@/modules/audit/AuditLogPage"));
const CounterManagement = lazy(() => import("@/modules/supermarket/CounterManagement"));
const PriceEngineDashboard = lazy(() => import("@/modules/supermarket/PriceEngine.jsx"));
const LoyaltyProgram = lazy(() => import("@/modules/supermarket/LoyaltyProgram"));
const ExpiryManager = lazy(() => import("@/modules/supermarket/ExpiryManager"));
const DepartmentReports = lazy(() => import("@/modules/supermarket/reports/DepartmentReports"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { user, companyId, authChecked, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (user && authChecked && companyId) {
      warmCriticalCaches();
    } else {
      resetPrefetchState();
    }
  }, [user, authChecked, companyId]);

  const isPublicRoute = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/unauthorized', '/onboarding', '/privacy', '/terms', '/pricing', '/contact', '/about'].includes(window.location.pathname.replace(/\/$/, '')) || window.location.pathname === '/';

  if ((isLoadingPublicSettings || isLoadingAuth) && !isPublicRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xl font-black gold-text">EasyBMT</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />

        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/pos" element={<PageRouteGuard pageKey="pos"><POS /></PageRouteGuard>} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<PageRouteGuard pageKey="invoices"><Invoices /></PageRouteGuard>} />
            <Route path="/purchases" element={<PageRouteGuard pageKey="purchases"><Purchases /></PageRouteGuard>} />
            <Route path="/waybills" element={<PageRouteGuard pageKey="waybills"><Waybills /></PageRouteGuard>} />
            <Route path="/inventory" element={<PageRouteGuard pageKey="inventory"><Inventory /></PageRouteGuard>} />
            <Route path="/customers" element={<PageRouteGuard pageKey="customers"><Customers /></PageRouteGuard>} />
            <Route path="/barcode" element={<PageRouteGuard pageKey="inventory" actionKey="barcode_print"><Barcode /></PageRouteGuard>} />
            <Route path="/reports" element={<PageRouteGuard pageKey="reports" actionKey="view_sales"><Reports /></PageRouteGuard>} />
            <Route path="/ai-insights" element={<PageRouteGuard pageKey="reports" actionKey="view_sales"><AIInsights /></PageRouteGuard>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/users" element={<UsersSettings />} />
            <Route path="/settings/permissions" element={<PermissionsSettings />} />
            <Route path="/expenses" element={<PageRouteGuard pageKey="expenses"><Expenses /></PageRouteGuard>} />
            <Route path="/accounting" element={<PageRouteGuard pageKey="accounting" actionKey="view_ledger"><Accounting /></PageRouteGuard>} />
            <Route path="/loans" element={<PageRouteGuard pageKey="loans"><Loans /></PageRouteGuard>} />
            <Route path="/gst-filing" element={<PageRouteGuard pageKey="gst_filing"><GSTFiling /></PageRouteGuard>} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/branches" element={<PageRouteGuard pageKey="branches"><BranchManagement /></PageRouteGuard>} />
            <Route path="/inventory-sync" element={<PageRouteGuard pageKey="inventory_sync"><InventorySync /></PageRouteGuard>} />
            <Route path="/stock-transfer" element={<PageRouteGuard pageKey="stock_transfer"><StockTransfer /></PageRouteGuard>} />
            <Route path="/warehouse" element={<PageRouteGuard pageKey="warehouse" actionKey="view_racks"><WarehouseManagement /></PageRouteGuard>} />
            <Route path="/hrms" element={<PageRouteGuard pageKey="hrms_dashboard"><HRMS /></PageRouteGuard>} />
            <Route path="/manufacturing" element={<PageRouteGuard pageKey="manufacturing"><Manufacturing /></PageRouteGuard>} />
            <Route path="/alterations" element={<PageRouteGuard pageKey="pos"><Alterations /></PageRouteGuard>} />
            <Route path="/profiles" element={<PageRouteGuard pageKey="customers"><CustomerStyleProfiles /></PageRouteGuard>} />

            {/* Supermarket Module Routes */}
            <Route path="/supermarket/counters" element={<PageRouteGuard pageKey="pos"><CounterManagement /></PageRouteGuard>} />
            <Route path="/supermarket/offers" element={<PageRouteGuard pageKey="pos"><PriceEngineDashboard /></PageRouteGuard>} />
            <Route path="/supermarket/loyalty" element={<PageRouteGuard pageKey="customers"><LoyaltyProgram /></PageRouteGuard>} />
            <Route path="/supermarket/expiry" element={<PageRouteGuard pageKey="inventory"><ExpiryManager /></PageRouteGuard>} />
            <Route path="/supermarket/reports" element={<PageRouteGuard pageKey="reports" actionKey="view_sales"><DepartmentReports /></PageRouteGuard>} />

            <Route path="/enterprise-intel" element={<PageRouteGuard pageKey="ai_intel"><EnterpriseIntelligence /></PageRouteGuard>} />
            <Route path="/finance" element={<PageRouteGuard pageKey="accounting" actionKey="view_ledger"><FinanceModule /></PageRouteGuard>} />
            <Route path="/audit-logs" element={<PageRouteGuard pageKey="audit_logs"><AuditLogPage /></PageRouteGuard>} />
          </Route>
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  const [showPermissionsOnboarding, setShowPermissionsOnboarding] = useState(false);

  useEffect(() => {
    const handleSyncError = (e) => {
      const { entityName, action, error } = e.detail;
      toast.error(`Background sync failed for ${entityName} (${action}): ${error}`);
    };
    window.addEventListener("easybmt-sync-error", handleSyncError);
    return () => window.removeEventListener("easybmt-sync-error", handleSyncError);
  }, []);

  useEffect(() => {
    registerPopState();

    // Conditionally trigger onboarding on native mobile devices for first-time launch
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      const completed = localStorage.getItem("easybmt_permissions_setup_completed");
      if (completed !== "true") {
        setShowPermissionsOnboarding(true);
      }
      
      // Hide splash screen after successful mount
      setTimeout(() => {
        SplashScreen.hide().catch(console.warn);
      }, 500);
    }

    // Ultimate safety failsafe: always attempt to hide splash screen on mount to prevent any indefinite white-screen freezes
    setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 1200);
  }, []);

  if (showPermissionsOnboarding) {
    return (
      <PremiumPermissionOnboarding
        onComplete={() => setShowPermissionsOnboarding(false)}
      />
    );
  }

  return (
    <HelmetProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthenticatedApp />
          </Router>
          <ThemeSync />
          <AppInstallPrompt />
          <ToastContainer />
          <SyncStatusIndicator />
        </QueryClientProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;