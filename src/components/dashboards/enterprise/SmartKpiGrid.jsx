import React from "react";
import { 
  TrendingUp, TrendingDown, IndianRupee, PieChart, Users, 
  Package, Receipt, Wallet, Banknote, Sparkles 
} from "lucide-react";
import { fmtINR } from "@/lib/gst-utils";
import { useAuth } from "@/lib/AuthContext";

function KpiCard({ title, value, icon: Icon, trend, trendLabel, insight, isPositive, colorClass }) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-between h-full">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 pointer-events-none -translate-y-1/2 translate-x-1/2 ${colorClass}`}></div>
      
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2 rounded-xl ${colorClass.replace("bg-", "bg-opacity-20 bg-").replace("to-", "text-")}`}>
          <Icon className={`w-5 h-5 ${colorClass.replace("bg-", "text-")}`} />
        </div>
      </div>

      <div className="space-y-2 mt-auto relative z-10">
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
          <span className="text-[10px] text-muted-foreground">{trendLabel}</span>
        </div>
        
        {insight && (
          <div className="flex items-start gap-1.5 pt-2 border-t border-border/50">
            <Sparkles className="w-3 h-3 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-400">
              {insight}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SmartKpiGrid({ data }) {
  const { user } = useAuth();
  const salesTrend = parseFloat(data.salesTrend) || 0;
  const isAdm = user?.role === 'admin' || user?.role === 'owner';
  
  const cards = [
    {
      title: "Gross Revenue",
      value: fmtINR(data.totalSales),
      icon: IndianRupee,
      trend: `${Math.abs(salesTrend).toFixed(1)}%`,
      trendLabel: "vs last month",
      isPositive: salesTrend >= 0,
      insight: salesTrend > 0 ? "Revenue trajectory remains strong." : "Focus on conversion rates.",
      colorClass: "bg-blue-500 text-blue-500",
      permission: isAdm || user?.permissions?.invoices?.view
    },
    {
      title: "Net Profit",
      value: fmtINR(data.netProfit),
      icon: PieChart,
      trend: "Calculated",
      trendLabel: "from raw data",
      isPositive: data.netProfit >= 0,
      insight: "Optimized operational costs impacting bottom line.",
      colorClass: "bg-green-500 text-green-500",
      permission: isAdm || user?.permissions?.reports?.profit_margins
    },
    {
      title: "Cashflow (Est)",
      value: fmtINR(data.totalSales - data.totalExpenses),
      icon: Banknote,
      trend: "Active",
      trendLabel: "current cycle",
      isPositive: (data.totalSales - data.totalExpenses) > 0,
      insight: "Sufficient liquidity for short-term liabilities.",
      colorClass: "bg-emerald-500 text-emerald-500",
      permission: isAdm || user?.permissions?.reports?.view || user?.permissions?.reports?.profit_margins
    },
    {
      title: "GST Liability",
      value: fmtINR(data.totalTax),
      icon: Receipt,
      trend: "Pending",
      trendLabel: "unfiled returns",
      isPositive: false,
      insight: "Ensure GSTR-1 and 3B filing before 11th.",
      colorClass: "bg-orange-500 text-orange-500",
      permission: isAdm || user?.permissions?.gst_filing?.view
    },
    {
      title: "A/R Outstanding",
      value: fmtINR(data.outstanding),
      icon: Wallet,
      trend: "Risk alert",
      trendLabel: "uncollected",
      isPositive: data.outstanding < 10000,
      insight: "Automate reminders for overdue clients.",
      colorClass: "bg-red-500 text-red-500",
      permission: isAdm || user?.permissions?.invoices?.view
    },
    {
      title: "Total Expenses",
      value: fmtINR(data.totalExpenses),
      icon: TrendingDown,
      trend: "Monitored",
      trendLabel: "overhead cost",
      isPositive: data.totalExpenses < (data.totalSales * 0.4),
      insight: data.totalExpenses > (data.totalSales * 0.4) ? "Expenses exceeding 40% threshold." : "Expenses are within limits.",
      colorClass: "bg-rose-500 text-rose-500",
      permission: isAdm || user?.permissions?.expenses?.view
    },
    {
      title: "Inventory Value",
      value: "Auto-sync",
      icon: Package,
      trend: "Live",
      trendLabel: "warehouse link",
      isPositive: true,
      insight: "Turnover ratio indicates healthy stock movement.",
      colorClass: "bg-amber-500 text-amber-500",
      permission: isAdm || user?.permissions?.inventory?.view
    },
    {
      title: "Active Customers",
      value: "Growing",
      icon: Users,
      trend: "Acquisition",
      trendLabel: "market share",
      isPositive: true,
      insight: "Repeat purchase rate is stabilizing.",
      colorClass: "bg-purple-500 text-purple-500",
      permission: isAdm || user?.permissions?.customers?.view
    }
  ].filter(c => c.permission);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <KpiCard key={i} {...c} />
      ))}
    </div>
  );
}
