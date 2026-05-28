import React, { Suspense, useState, useEffect } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useDashboardData } from "@/hooks/useDashboardData";
import ProfileCompletionBanner from '../modules/registration/ProfileCompletionBanner';

import { useSupermarketMode } from "@/hooks/useSupermarketMode";
import { useAuth } from "@/lib/AuthContext";

const EnterpriseDashboard = React.lazy(() => import("@/components/dashboards/EnterpriseDashboard"));
const StaffDashboard = React.lazy(() => import("@/components/dashboards/StaffDashboard"));

export default function DashboardRouter() {
  const { user, companyId, authChecked } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const dashboardData = useDashboardData(startDate, endDate);
  const { businessType, refetchAll } = dashboardData;
  const { isSupermarket } = useSupermarketMode();

  useEffect(() => {
    if (!authChecked || !user || !companyId) return;
    refetchAll();
  }, [startDate, endDate, authChecked, user, companyId, refetchAll]);

  const renderDashboard = () => {
    return <EnterpriseDashboard data={dashboardData} />;
  };

  return (
    <DashboardShell 
      startDate={startDate} 
      endDate={endDate} 
      onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
      onRefresh={refetchAll}
      isRefreshing={dashboardData.isLoading}
    >
      <div className="space-y-6">
        <ProfileCompletionBanner />
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Loading Smart Dashboard Experience...</div>}>
          {renderDashboard()}
        </Suspense>
      </div>
    </DashboardShell>
  );
}