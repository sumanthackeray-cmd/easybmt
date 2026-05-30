import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, getMonth } from "@/lib/gst-utils";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useShopSettings } from "@/hooks/useShopSettings";
import { getAllBranches } from '@/api/branchService';
import { toast } from "@/lib/toast";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { TrendingUp, DollarSign, BarChart2, Receipt, CreditCard, Search, Download, Calendar, Building2 } from "lucide-react";

export default function Accounting() {
  const { t } = useLanguage();
  const { shopSettings } = useShopSettings();
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Smart filters state
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [datePeriod, setDatePeriod] = useState("year"); // year | q1 | q2 | q3 | q4 | h1 | h2 | custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: () => base44.entities.Loan.list() });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: getAllBranches });

  // Resolve start/end boundaries based on selected date period
  const dateBoundaries = useMemo(() => {
    let start = `${year}-01-01`;
    let end = `${year}-12-31`;

    if (datePeriod === "q1") {
      start = `${year}-01-01`;
      end = `${year}-03-31`;
    } else if (datePeriod === "q2") {
      start = `${year}-04-01`;
      end = `${year}-06-30`;
    } else if (datePeriod === "q3") {
      start = `${year}-07-01`;
      end = `${year}-09-30`;
    } else if (datePeriod === "q4") {
      start = `${year}-10-01`;
      end = `${year}-12-31`;
    } else if (datePeriod === "h1") {
      start = `${year}-01-01`;
      end = `${year}-06-30`;
    } else if (datePeriod === "h2") {
      start = `${year}-07-01`;
      end = `${year}-12-31`;
    } else if (datePeriod === "custom") {
      start = customStart || `${year}-01-01`;
      end = customEnd || `${year}-12-31`;
    }

    return { start, end };
  }, [year, datePeriod, customStart, customEnd]);

  // Live filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // 1. Date boundaries
      if (inv.date < dateBoundaries.start || inv.date > dateBoundaries.end) return false;
      // 2. Branch filtering
      if (selectedBranch !== "all" && inv.branchId !== selectedBranch) return false;
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNo = (inv.invoice_number || "").toLowerCase().includes(query);
        const matchesCust = (inv.customer_name || "").toLowerCase().includes(query);
        const matchesAmt = String(inv.grand_total || "").includes(query);
        if (!matchesNo && !matchesCust && !matchesAmt) return false;
      }
      return true;
    });
  }, [invoices, dateBoundaries, selectedBranch, searchQuery]);

  // Live filter purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      // 1. Date boundaries
      if (p.date < dateBoundaries.start || p.date > dateBoundaries.end) return false;
      // 2. Branch filtering
      if (selectedBranch !== "all" && p.branchId && p.branchId !== selectedBranch) return false;
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNo = (p.purchase_number || "").toLowerCase().includes(query);
        const matchesVendor = (p.vendor_name || "").toLowerCase().includes(query);
        const matchesAmt = String(p.grand_total || "").includes(query);
        if (!matchesNo && !matchesVendor && !matchesAmt) return false;
      }
      return true;
    });
  }, [purchases, dateBoundaries, selectedBranch, searchQuery]);

  // Live filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // 1. Date boundaries
      if (e.date < dateBoundaries.start || e.date > dateBoundaries.end) return false;
      // 2. Branch filtering
      if (selectedBranch !== "all" && e.branchId && e.branchId !== selectedBranch) return false;
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCategory = (e.category || "").toLowerCase().includes(query);
        const matchesRemarks = (e.notes || e.remarks || "").toLowerCase().includes(query);
        const matchesAmt = String(e.amount || "").includes(query);
        if (!matchesCategory && !matchesRemarks && !matchesAmt) return false;
      }
      return true;
    });
  }, [expenses, dateBoundaries, selectedBranch, searchQuery]);

  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, "0")}`;
    const label = new Date(year, i, 1).toLocaleString("en-IN", { month: "short" });
    const sales = filteredInvoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, i) => s + (i.grand_total || 0), 0);
    const tax = filteredInvoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, i) => s + (i.tax_amount || 0), 0);
    const purch = filteredPurchases.filter(p => getMonth(p.date) === mk).reduce((s, p) => s + (p.grand_total || 0), 0);
    const exp = filteredExpenses.filter(e => getMonth(e.date) === mk).reduce((s, e) => s + (e.amount || 0), 0);
    const gross = sales - purch;
    const net = gross - exp;
    return { month: label, mk, Sales: sales, Purchases: purch, Expenses: exp, "Gross Profit": gross, "Net Profit": net, Tax: tax };
  });

  const totalSales = yearMonths.reduce((s, m) => s + m.Sales, 0);
  const totalPurchases = yearMonths.reduce((s, m) => s + m.Purchases, 0);
  const totalExpenses = yearMonths.reduce((s, m) => s + m.Expenses, 0);
  const totalTax = yearMonths.reduce((s, m) => s + m.Tax, 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;
  const totalLoanDebt = loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);

  const formatYAxis = (v) => {
    const absV = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (absV >= 10000000) { // 1 Crore
      return `${sign}₹${(absV / 10000000).toFixed(1)}Cr`;
    }
    if (absV >= 100000) { // 1 Lakh
      return `${sign}₹${(absV / 100000).toFixed(1)}L`;
    }
    if (absV >= 1000) {
      return `${sign}₹${(absV / 1000).toFixed(0)}k`;
    }
    return `${sign}₹${absV}`;
  };

  const formatTableCell = (val) => {
    if (!val || val === 0) return "—";
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    
    if (absVal >= 10000000) { // 1 Crore
      return `${sign}₹${(absVal / 10000000).toFixed(2)}Cr`;
    }
    if (absVal >= 100000) { // 1 Lakh
      return `${sign}₹${(absVal / 100000).toFixed(2)}L`;
    }
    if (absVal >= 1000) {
      return `${sign}₹${(absVal / 1000).toFixed(1)}k`;
    }
    return `${sign}₹${absVal.toFixed(2)}`;
  };

  const formatTotalValue = (val) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    return `${sign}₹` + Number(absVal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const summaryCards = [
    { label: t("accounting.total_revenue"), value: formatTotalValue(totalSales), icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20 dark:border-amber-500/10", bg: "bg-amber-500/10 dark:bg-amber-500/5" },
    { label: t("accounting.total_purchases"), value: formatTotalValue(totalPurchases), icon: Receipt, color: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20 dark:border-purple-500/10", bg: "bg-purple-500/10 dark:bg-purple-500/5" },
    { label: t("accounting.total_expenses"), value: formatTotalValue(totalExpenses), icon: CreditCard, color: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20 dark:border-rose-500/10", bg: "bg-rose-500/10 dark:bg-rose-500/5" },
    { 
      label: t("accounting.gross_profit"), 
      value: formatTotalValue(grossProfit), 
      icon: DollarSign, 
      color: grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400", 
      border: grossProfit >= 0 ? "border-emerald-500/20 dark:border-emerald-500/10" : "border-rose-500/20 dark:border-rose-500/10", 
      bg: grossProfit >= 0 ? "bg-emerald-500/10 dark:bg-emerald-500/5" : "bg-rose-500/10 dark:bg-rose-500/5" 
    },
    { 
      label: t("accounting.net_profit"), 
      value: formatTotalValue(netProfit), 
      icon: BarChart2, 
      color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400", 
      border: netProfit >= 0 ? "border-emerald-500/20 dark:border-emerald-500/10" : "border-rose-500/20 dark:border-rose-500/10", 
      bg: netProfit >= 0 ? "bg-emerald-500/10 dark:bg-emerald-500/5" : "bg-rose-500/10 dark:bg-rose-500/5" 
    },
    { label: t("accounting.gst_collected"), value: formatTotalValue(totalTax), icon: BarChart2, color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20 dark:border-blue-500/10", bg: "bg-blue-500/10 dark:bg-blue-500/5" },
    { 
      label: t("accounting.profit_margin"), 
      value: `${profitMargin}%`, 
      icon: TrendingUp, 
      color: Number(profitMargin) >= 0 ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400", 
      border: Number(profitMargin) >= 0 ? "border-teal-500/20 dark:border-teal-500/10" : "border-rose-500/20 dark:border-rose-500/10", 
      bg: Number(profitMargin) >= 0 ? "bg-teal-500/10 dark:bg-teal-500/5" : "bg-rose-500/10 dark:bg-rose-500/5" 
    },
    { label: t("accounting.loan_liability"), value: formatTotalValue(totalLoanDebt), icon: CreditCard, color: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20 dark:border-orange-500/10", bg: "bg-orange-500/10 dark:bg-orange-500/5" },
  ];

  const handleExportPL = () => {
    const companyName = shopSettings?.shop_name || shopSettings?.business_name || "EasyBMT Merchant";
    const branchName = selectedBranch === "all" 
      ? "All Outlets" 
      : (branches.find(b => b.id === selectedBranch)?.name || selectedBranch);

    let periodLabel = "Full Year";
    if (datePeriod === "q1") periodLabel = "Q1 (Jan - Mar)";
    else if (datePeriod === "q2") periodLabel = "Q2 (Apr - Jun)";
    else if (datePeriod === "q3") periodLabel = "Q3 (Jul - Sep)";
    else if (datePeriod === "q4") periodLabel = "Q4 (Oct - Dec)";
    else if (datePeriod === "h1") periodLabel = "H1 (First Half)";
    else if (datePeriod === "h2") periodLabel = "H2 (Second Half)";
    else if (datePeriod === "custom") periodLabel = `Custom Range (${dateBoundaries.start} to ${dateBoundaries.end})`;

    const generatedOn = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    const csvRows = [
      ["Profit & Loss (P&L) Statement"],
      ["Company / Merchant Name:", companyName],
      ["Fiscal Year:", year],
      ["Filter Period:", periodLabel],
      ["Outlet / Branch Name:", branchName],
      ["Generated On:", generatedOn],
      [], // Spacer row
      ["Month", "Sales (INR)", "Cost of Goods (INR)", "Gross Profit (INR)", "Expenses (INR)", "Net Profit (INR)"],
      ...yearMonths.map(m => [
        m.month,
        m.Sales.toFixed(2),
        m.Purchases.toFixed(2),
        m["Gross Profit"].toFixed(2),
        m.Expenses.toFixed(2),
        m["Net Profit"].toFixed(2)
      ]),
      ["TOTAL", totalSales.toFixed(2), totalPurchases.toFixed(2), grossProfit.toFixed(2), totalExpenses.toFixed(2), netProfit.toFixed(2)],
      ["Profit Margin", profitMargin + "%", "", "", "", ""]
    ];

    const csvContent = csvRows
      .map(row => row.map(val => {
        if (val === undefined || val === null) return '""';
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PL_Statement_${year}_${datePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("P&L statement exported to CSV successfully!");
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/80 rounded-xl px-4 py-2.5 shadow-2xl text-[11px] min-w-[140px] space-y-1.5 z-50">
        <p className="text-foreground font-extrabold border-b border-border/50 pb-1 mb-1 tracking-wider uppercase text-[9px]">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between items-center gap-4">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}:
            </span>
            <span style={{ color: p.color }} className="font-mono font-black">{fmtINR(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">📒 {t("accounting.title_page")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("accounting.subtitle_page")}</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="bg-card border border-border text-foreground rounded-lg px-3 py-2 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/40 transition-all"
        >
          {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Smart Search & Filter Control Bar */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Smart Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="pl-9 h-10 w-full bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
            placeholder="Smart Search (invoice, purchase no, customer, vendor, amount)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-background border border-border text-foreground rounded-xl h-10 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/40 transition-all"
            >
              <option value="all">All Outlets</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Date Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={datePeriod}
              onChange={e => setDatePeriod(e.target.value)}
              className="bg-background border border-border text-foreground rounded-xl h-10 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary/40 transition-all"
            >
              <option value="year">Full Year</option>
              <option value="q1">Q1 (Jan - Mar)</option>
              <option value="q2">Q2 (Apr - Jun)</option>
              <option value="q3">Q3 (Jul - Sep)</option>
              <option value="q4">Q4 (Oct - Dec)</option>
              <option value="h1">First Half (H1)</option>
              <option value="h2">Second Half (H2)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {datePeriod === "custom" && (
            <div className="flex items-center gap-2 animate-fade-in">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-background border border-border text-foreground rounded-xl h-10 px-3 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-background border border-border text-foreground rounded-xl h-10 px-3 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportPL}
            className="flex items-center gap-1.5 h-10 px-4 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-black transition-all"
            title="Export P&L Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`bg-card/60 backdrop-blur-sm border ${c.border || "border-border"} rounded-2xl p-4 flex items-center justify-between hover:scale-[1.02] transition-all hover:border-primary/20 shadow-sm`}>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <h3 className={`text-base sm:text-lg font-black font-mono tracking-tight ${c.color}`}>{c.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl ${c.bg || "bg-secondary"} ${c.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* P&L Chart */}
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          📊 {t("accounting.monthly_chart_title")} — {year}
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearMonths} barSize={10} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(36,90%,55%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(36,90%,35%)" stopOpacity={0.25}/>
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(263,70%,65%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(263,70%,45%)" stopOpacity={0.25}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="hsl(0,84%,40%)" stopOpacity={0.25}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis width={55} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={formatYAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Sales" name={t("accounting.table_sales")} fill="url(#colorSales)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Purchases" name={t("accounting.table_cost")} fill="url(#colorPurchases)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" name={t("accounting.total_expenses")} fill="url(#colorExpenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            📈 {t("accounting.profit_trend")} — {year}
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearMonths} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis width={55} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={formatYAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="Gross Profit" name={t("accounting.gross_profit")} stroke="hsl(36,90%,55%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "hsl(222,25%,10%)" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Net Profit" name={t("accounting.net_profit")} stroke="hsl(160,72%,39%)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "hsl(222,25%,10%)" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly P&L Table */}
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-sm text-foreground/95 mb-5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            📋 {t("accounting.summary_table")}
          </h3>
          <div className="overflow-x-auto -mx-1 pr-1">
            <table className="w-full text-[11px] min-w-[500px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/35 text-[9px] uppercase tracking-wider text-muted-foreground font-black">
                  {[
                    t("accounting.table_month"),
                    t("accounting.table_sales"),
                    t("accounting.table_cost"),
                    t("accounting.table_gross"),
                    t("accounting.table_net")
                  ].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-extrabold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearMonths.map(m => (
                  <tr key={m.mk} className="border-b border-border/30 hover:bg-secondary/15 transition-colors font-semibold">
                    <td className="py-2.5 px-3 font-bold text-foreground">{m.month}</td>
                    <td className="py-2.5 px-3 text-amber-500 font-mono">{formatTableCell(m.Sales)}</td>
                    <td className="py-2.5 px-3 text-purple-400 font-mono">{formatTableCell(m.Purchases)}</td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${m["Gross Profit"] >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {formatTableCell(m["Gross Profit"])}
                    </td>
                    <td className={`py-2.5 px-3 font-mono font-bold ${m["Net Profit"] >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                      {formatTableCell(m["Net Profit"])}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/80 bg-secondary/20 font-black">
                  <td className="py-3 px-3 font-black text-foreground uppercase tracking-wider text-[10px]">{t("accounting.total")}</td>
                  <td className="py-3 px-3 font-black text-amber-500 font-mono text-[12px]">{formatTotalValue(totalSales)}</td>
                  <td className="py-3 px-3 font-black text-purple-400 font-mono text-[12px]">{formatTotalValue(totalPurchases)}</td>
                  <td className={`py-3 px-3 font-black font-mono text-[12px] ${grossProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{formatTotalValue(grossProfit)}</td>
                  <td className={`py-3 px-3 font-black font-mono text-[12px] ${netProfit >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>{formatTotalValue(netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}