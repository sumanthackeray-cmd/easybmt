import React from "react";
import { Link } from "react-router-dom";
import MetricCard from "@/components/dashboard/MetricCard";
import SalesBarChart from "@/components/dashboard/widgets/SalesBarChart";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { fmtINR } from "@/lib/gst-utils";
import { 
  ReceiptText, TrendingUp, PiggyBank, BarChart2, Wallet, 
  ShoppingCart, Users, Package, Activity, Plus, ChevronRight, Bell
} from "lucide-react";

export default function GeneralDashboard({ data }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isRestrictedRole = user?.hierarchy_level >= 5;

  const profitColor = data.netProfit >= 0 ? "green" : "red";

  // --- Compute Widget Data ---
  
  // 1. Top Selling Products
  const topProducts = React.useMemo(() => {
    const productMap = {};
    let totalSalesVal = 0;
    data.filteredInvoices.forEach(inv => {
      if (inv.type !== 'sale') return;
      inv.items?.forEach(item => {
        if (!item.id || !item.name) return;
        if (!productMap[item.id]) {
          productMap[item.id] = { id: item.id, name: item.name, quantity: 0, revenue: 0 };
        }
        productMap[item.id].quantity += (Number(item.quantity) || 0);
        const rev = (Number(item.total) || 0);
        productMap[item.id].revenue += rev;
        totalSalesVal += rev;
      });
    });
    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({ ...p, percentage: totalSalesVal ? (p.revenue / totalSalesVal) * 100 : 0 }));
  }, [data.filteredInvoices]);

  // 2. Recent Activity (mocked from invoices and expenses)
  const recentActivity = React.useMemo(() => {
    const activities = [];
    data.filteredInvoices.slice(0, 10).forEach(inv => {
      activities.push({
        id: inv.id,
        type: 'invoice',
        title: `Invoice #${inv.invoice_number}`,
        desc: `Generated for ${inv.customer_name}`,
        date: new Date(inv.created_at || inv.date),
        color: 'border-l-orange-500'
      });
    });
    data.filteredExpenses?.slice(0, 5).forEach(exp => {
      activities.push({
        id: exp.id,
        type: 'expense',
        title: `Expense Recorded`,
        desc: `₹${exp.amount} for ${exp.category}`,
        date: new Date(exp.created_at || exp.date),
        color: 'border-l-red-500'
      });
    });
    return activities.sort((a, b) => b.date - a.date).slice(0, 8);
  }, [data.filteredInvoices, data.filteredExpenses]);

  // 3. Outstanding Invoices
  const outstandingInvoices = React.useMemo(() => {
    return data.invoices
      .filter(i => i.status !== "paid" && i.type === "sale")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [data.invoices]);


  return (
    <div className="space-y-6">
      
      {/* --- QUICK ACTIONS BAR --- */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x">
        <Link to="/invoices" className="snap-start shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-sm transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </div>
        </Link>
        <Link to="/customers" className="snap-start shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-sm transition-all shadow-sm">
            <Users className="w-4 h-4" /> Add Customer
          </div>
        </Link>
        <Link to="/inventory" className="snap-start shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-sm transition-all shadow-sm">
            <Package className="w-4 h-4" /> Add Product
          </div>
        </Link>
        <Link to="/pos" className="snap-start shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-sm transition-all shadow-sm">
            <ShoppingCart className="w-4 h-4" /> Open POS
          </div>
        </Link>
        <Link to="/reports" className="snap-start shrink-0">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-sm transition-all shadow-sm">
            <BarChart2 className="w-4 h-4" /> View Reports
          </div>
        </Link>
      </div>

      {/* --- MAIN DASHBOARD GRID --- */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* LEFT COLUMN - Stats and Charts */}
        <div className="flex-1 space-y-6 min-w-0">
          
          {/* STATS ROW 1 */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isRestrictedRole ? 'xl:grid-cols-2' : 'xl:grid-cols-4'} gap-4`}>
            <MetricCard label={t("metric.total_sales")} value={fmtINR(data.totalSales)} icon={ReceiptText} color="gold"
              trend={data.salesTrend} trendLabel={language === "hi" ? "पिछले अवधि की तुलना में" : "vs previous period"} 
              sub={`${data.filteredInvoices.length} ${language === "hi" ? "इनवॉइस" : "invoices"}`} 
              sparklineData={data.dailyData?.map(d => ({ value: d.sales }))} />
            
            {!isRestrictedRole && (
              <>
                <MetricCard label={t("metric.gross_profit")} value={fmtINR(data.grossProfit)} icon={TrendingUp} color={data.grossProfit >= 0 ? "green" : "red"}
                  sub={`${language === "hi" ? "मार्जिन" : "Margin"}: ${data.totalSales > 0 ? ((data.grossProfit / data.totalSales) * 100).toFixed(1) : 0}%`}
                  sparklineData={data.dailyData?.map(d => ({ value: d.profit }))} />
                
                <MetricCard label={t("metric.net_profit")} value={fmtINR(data.netProfit)} icon={PiggyBank} color={profitColor}
                  sub={language === "hi" ? `₹${(data.totalExpenses / 1000).toFixed(1)}k खर्चों के बाद` : `After ₹${(data.totalExpenses / 1000).toFixed(1)}k expenses`} />
                
                <MetricCard label={t("metric.gst_collected")} value={fmtINR(data.totalTax)} icon={BarChart2} color="blue"
                  sub={language === "hi" ? "कुल जीएसटी राशि" : "Total tax amount"} />
              </>
            )}
          </div>

          {/* STATS ROW 2 */}
          <div className={`grid grid-cols-2 md:grid-cols-3 ${isRestrictedRole ? 'xl:grid-cols-3' : 'xl:grid-cols-6'} gap-4`}>
            <MetricCard label={t("metric.outstanding")} value={fmtINR(data.outstanding)} icon={Wallet} color="orange"
              sub={`${data.invoices.filter(i => i.status !== "paid" && i.type === "sale").length} pending`} 
              onClickAction={() => {}} />
            
            {!isRestrictedRole && (
              <MetricCard label={t("metric.purchases")} value={fmtINR(data.totalPurchases)} icon={ShoppingCart} color="purple"
                sub={`${data.filteredPurchases.length} bills`} />
            )}
            
            {!isRestrictedRole && (
              <MetricCard label={t("metric.expenses")} value={fmtINR(data.totalExpenses)} icon="💸" color="red"
                sub={`${data.filteredExpenses.length} entries`} />
            )}
            
            <MetricCard label={t("metric.customers")} value={data.customers.length.toString()} icon={Users} color="teal"
              sub={`Total customers`} />
            
            <MetricCard label={t("metric.products")} value={data.products.length.toString()} icon={Package} color="blue"
              sub={
                data.outStock.length > 0 
                  ? <span className="text-red-500 font-bold">{data.outStock.length} out of stock</span>
                  : "All in stock"
              } />
            
            {!isRestrictedRole && (
              <MetricCard label={t("metric.loan_debt")} value={fmtINR(data.totalLoanOutstanding)} icon={Activity} color="orange"
                sub={
                  data.totalLoanOutstanding === 0 
                    ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Debt Free ✓</span>
                    : `${data.loans.filter(l => l.status === "Active").length} active loans`
                } />
            )}
          </div>

          {/* CHART AREA */}
          {!isRestrictedRole && (
            <div className="w-full overflow-hidden">
              <SalesBarChart data={data.dailyData} title={t("metric.sales_vs_expenses")} />
            </div>
          )}
          
          {/* WIDGETS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Top Selling Products</h3>
                <Link to="/inventory" className="text-xs font-bold text-primary hover:underline flex items-center">
                  View All <ChevronRight className="w-3 h-3 ml-0.5" />
                </Link>
              </div>
              <div className="space-y-4">
                {topProducts.length > 0 ? topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex-1 pr-4">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-foreground line-clamp-1">{p.name}</span>
                        <span className="font-bold text-foreground">{fmtINR(p.revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.percentage}%` }}></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium w-12 text-right">{p.quantity} units</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">No sales data for this period</div>
                )}
              </div>
            </div>

            {/* Outstanding Invoices */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Outstanding Invoices</h3>
                <Link to="/invoices?status=pending" className="text-xs font-bold text-primary hover:underline flex items-center">
                  View All <ChevronRight className="w-3 h-3 ml-0.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="pb-2 font-semibold">Invoice #</th>
                      <th className="pb-2 font-semibold">Customer</th>
                      <th className="pb-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {outstandingInvoices.length > 0 ? outstandingInvoices.map((inv, i) => (
                      <tr key={i} className="hover:bg-accent/50 transition-colors">
                        <td className="py-2.5 font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="py-2.5 text-muted-foreground line-clamp-1">{inv.customer_name}</td>
                        <td className="py-2.5 font-bold text-foreground text-right">{fmtINR(inv.total)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="text-center py-6 text-muted-foreground">No outstanding invoices</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN - Recent Activity (Desktop only, responsive below) */}
        <div className="w-full xl:w-[30%] shrink-0">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-full max-h-[800px] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-card z-10 pb-2 border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Recent Activity
              </h3>
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((act, i) => (
                <div key={i} className={`pl-3 border-l-4 ${act.color} py-1`}>
                  <p className="text-sm font-semibold text-foreground">{act.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{act.desc}</p>
                  <p className="text-[10px] font-medium text-muted-foreground/70 mt-1 uppercase tracking-wider">
                    {act.date.toLocaleDateString()} {act.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              )) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No recent activity</div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-border">
              <button className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors">
                View All Activity
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
