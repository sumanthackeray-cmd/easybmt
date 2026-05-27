import React, { useMemo } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { isOverdue } from "@/lib/gst-utils";

export default function AiAlertStrip({ data }) {
  const alerts = useMemo(() => {
    const list = [];
    
    // Check cashflow warning
    if (data.netProfit < 0) {
      list.push({ type: "critical", msg: "Critical: Negative cashflow detected this period. Immediate review recommended." });
    } else if (data.netProfit > 0 && data.netProfit < 5000) {
      list.push({ type: "warning", msg: "Warning: Low profit margin detected. Review expenses." });
    }

    // Check overdue invoices
    const overdue = data.invoices.filter(i => i.status !== "paid" && isOverdue(i));
    if (overdue.length > 0) {
      list.push({ type: "critical", msg: `Action Required: ${overdue.length} invoices are overdue for collection.` });
    }

    // Check pending GST (mocked logic based on tax collected)
    if (data.totalTax > 50000) {
      list.push({ type: "info", msg: `GST Alert: Estimated liability is ₹${data.totalTax.toLocaleString('en-IN')}. Prepare GSTR-3B.` });
    }

    // General success if everything is fine
    if (list.length === 0) {
      list.push({ type: "success", msg: "System Normal: No critical anomalies detected in business operations." });
    }

    return list;
  }, [data]);

  const getIcon = (type) => {
    switch (type) {
      case "critical": return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case "info": return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
      case "success": return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
      default: return null;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case "critical": return "bg-red-500/10 border-red-500/20";
      case "warning": return "bg-amber-500/10 border-amber-500/20";
      case "info": return "bg-blue-500/10 border-blue-500/20";
      case "success": return "bg-green-500/10 border-green-500/20";
      default: return "bg-card border-border";
    }
  };

  return (
    <div className="w-full overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 rounded-xl shadow-sm flex items-center p-2 relative h-12">
      <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 w-8 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
      
      {/* CSS Marquee animation */}
      <div className="animate-ticker flex items-center gap-6 whitespace-nowrap pl-full">
        {alerts.map((a, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getBg(a.type)}`}>
            {getIcon(a.type)}
            <span className="text-xs font-bold tracking-tight">{a.msg}</span>
          </div>
        ))}
        {/* Duplicate for infinite loop illusion */}
        {alerts.map((a, i) => (
          <div key={`dup-${i}`} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getBg(a.type)}`}>
            {getIcon(a.type)}
            <span className="text-xs font-bold tracking-tight">{a.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
