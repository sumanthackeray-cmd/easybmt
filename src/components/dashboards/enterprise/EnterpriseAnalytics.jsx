import React from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { fmtINR } from "@/lib/gst-utils";
import { useAuth } from "@/lib/AuthContext";

export default function EnterpriseAnalytics({ data }) {
  const { user } = useAuth();
  const chartData = data.dailyData || [];
  const isAdm = user?.role === 'admin' || user?.role === 'owner';
  
  const canViewSales = isAdm || user?.permissions?.invoices?.view;
  const canViewProfit = isAdm || user?.permissions?.reports?.profit_margins;

  const gridCols = canViewSales && canViewProfit ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "grid grid-cols-1 gap-8";

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black tracking-tight">Revenue & Cashflow Analytics</h3>
          <p className="text-xs text-muted-foreground mt-1">Real-time prediction and historical comparison.</p>
        </div>
      </div>

      <div className={gridCols}>
        {/* Revenue Area Chart */}
        {canViewSales && (
          <div className="h-[300px] w-full">
            <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-widest">Revenue Trajectory</p>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" }}
                  formatter={(val) => [fmtINR(val), "Sales"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Profit vs Expense Bar Chart */}
        {canViewProfit && (
          <div className="h-[300px] w-full">
            <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-widest">Margin Analysis</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" }}
                  formatter={(val, name) => [fmtINR(val), name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "10px" }} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
