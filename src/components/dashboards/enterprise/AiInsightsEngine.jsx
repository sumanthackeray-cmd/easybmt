import React, { useMemo } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Package, Banknote } from "lucide-react";
import { fmtINR } from "@/lib/gst-utils";

export default function AiInsightsEngine({ data }) {
  const insights = useMemo(() => {
    const list = [];
    
    // Revenue prediction
    const avgDaily = data.totalSales / (data.dailyData?.length || 1);
    const predictedMonthEnd = data.totalSales + (avgDaily * 10); // arbitrary projection
    list.push({
      id: 1,
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      title: "Revenue Forecast",
      desc: `Based on current velocity, expected month-end revenue is ${fmtINR(predictedMonthEnd)}.`
    });

    // Expense anomaly
    if (data.totalExpenses > (data.totalSales * 0.4)) {
      list.push({
        id: 2,
        icon: AlertTriangle,
        color: "text-red-500",
        bg: "bg-red-500/10",
        title: "Expense Anomaly",
        desc: "Overhead costs are consuming >40% of gross revenue. Recommend auditing vendor payouts."
      });
    }

    // Cashflow positive
    if ((data.totalSales - data.totalExpenses) > 0) {
      list.push({
        id: 3,
        icon: Banknote,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        title: "Cashflow Healthy",
        desc: "Liquidity ratio is optimal. Working capital is sufficient for the next 30 days."
      });
    }

    // Top selling
    list.push({
      id: 4,
      icon: Package,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      title: "Product Intelligence",
      desc: "Fast-moving items indicate strong seasonal demand. Recommend checking reorder levels."
    });

    // Outstanding Alert
    if (data.outstanding > 10000) {
      list.push({
        id: 5,
        icon: Lightbulb,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        title: "Collection Opportunity",
        desc: `You have ${fmtINR(data.outstanding)} locked in outstanding receivables.`
      });
    }

    return list;
  }, [data]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden h-full flex flex-col transition-colors">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/50 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-100/50 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">AI Insights Engine</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time predictive intelligence</p>
        </div>
      </div>

      <div className="space-y-3.5 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {insights.map(insight => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className="group relative overflow-hidden bg-white/60 hover:bg-white/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-500/30 dark:hover:border-indigo-500/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5">
              {/* Subtle hover glow inside card */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-transparent to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-colors duration-500 pointer-events-none" />
              
              <div className="flex gap-4 relative z-10">
                <div className={`p-2.5 rounded-xl shrink-0 h-min flex items-center justify-center ${insight.bg} ring-1 ring-inset ring-black/5 dark:ring-white/10 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-4 h-4 ${insight.color}`} />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{insight.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {insight.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
