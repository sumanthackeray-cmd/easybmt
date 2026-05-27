import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import AiAlertStrip from "./enterprise/AiAlertStrip";
import SmartKpiGrid from "./enterprise/SmartKpiGrid";
import AiInsightsEngine from "./enterprise/AiInsightsEngine";
import EnterpriseAnalytics from "./enterprise/EnterpriseAnalytics";
import CommandCenters from "./enterprise/CommandCenters";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1 } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function EnterpriseDashboard({ data }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Ensure data defaults are safe
  const safeData = useMemo(() => ({
    totalSales: data?.totalSales || 0,
    grossProfit: data?.grossProfit || 0,
    netProfit: data?.netProfit || 0,
    totalTax: data?.totalTax || 0,
    outstanding: data?.outstanding || 0,
    totalExpenses: data?.totalExpenses || 0,
    invoices: data?.invoices || [],
    expenses: data?.expenses || [],
    filteredInvoices: data?.filteredInvoices || [],
    dailyData: data?.dailyData || []
  }), [data]);

  const canViewAi = user?.permissions?.reports?.ai_copilot || user?.permissions?.dashboard?.ai_insights || user?.role === 'admin' || user?.role === 'owner';
  const canViewAnalytics = user?.permissions?.invoices?.view || user?.permissions?.reports?.profit_margins || user?.role === 'admin' || user?.role === 'owner';

  return (
    <motion.div 
      className="space-y-6 max-w-[1600px] mx-auto pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top AI Alert Strip - Auto Scrolling Issues/Alerts */}
      {canViewAi && (
        <motion.div variants={itemVariants} className="w-full">
          <AiAlertStrip data={safeData} />
        </motion.div>
      )}

      {/* Ultra Smart KPI Grid - Top level metrics */}
      <motion.div variants={itemVariants}>
        <SmartKpiGrid data={safeData} />
      </motion.div>

      <div className={canViewAi ? "grid grid-cols-1 xl:grid-cols-3 gap-6" : "space-y-6"}>
        {/* Left Column: Analytics & Reports */}
        <div className={canViewAi ? "xl:col-span-2 space-y-6" : "space-y-6"}>
          {canViewAnalytics && (
            <motion.div variants={itemVariants}>
              <EnterpriseAnalytics data={safeData} />
            </motion.div>
          )}
          <motion.div variants={itemVariants}>
            <CommandCenters data={safeData} />
          </motion.div>
        </div>

        {/* Right Column: AI Insights & Copilot */}
        {canViewAi && (
          <div className="space-y-6">
            <motion.div variants={itemVariants} className="h-full">
              <AiInsightsEngine data={safeData} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
