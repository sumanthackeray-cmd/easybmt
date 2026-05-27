import { useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts";
import { fmtINR } from "@/lib/gst-utils";
import { Download, Calendar, CalendarRange } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  const sales = payload.find(p => p.dataKey === "Sales")?.value || 0;
  const expenses = payload.find(p => p.dataKey === "Expenses")?.value || 0;
  const diff = sales - expenses;
  const isProfit = diff >= 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-xl text-sm min-w-[160px]">
      <p className="text-muted-foreground font-bold mb-2 pb-2 border-b border-border">{label}</p>
      
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
              {p.name}
            </span>
            <span className="font-bold text-foreground">{fmtINR(p.value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between gap-4">
        <span className="text-muted-foreground font-medium">Net P/L</span>
        <span className={`font-black ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
          {isProfit ? '+' : ''}{fmtINR(diff)}
        </span>
      </div>
    </div>
  );
};

export default function SalesBarChart({ data, monthlyData, title }) {
  const [viewMode, setViewMode] = useState("daily"); // daily, monthly

  const chartData = viewMode === "daily" ? data : monthlyData;
  const dataKeyX = viewMode === "daily" ? "day" : "month";

  const handleDownload = () => {
    // Basic CSV download
    if (!chartData || chartData.length === 0) return;
    
    const headers = [dataKeyX, "Sales", "Expenses"];
    const rows = chartData.map(d => [d[dataKeyX], d.Sales || 0, d.Expenses || 0]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_vs_expenses_${viewMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="font-bold text-lg text-foreground">{title}</h3>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border">
            <button 
              onClick={() => setViewMode("daily")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "daily" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Calendar className="w-3.5 h-3.5" /> Daily
            </button>
            <button 
              onClick={() => setViewMode("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "monthly" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarRange className="w-3.5 h-3.5" /> Monthly
            </button>
          </div>
          
          <button 
            onClick={handleDownload}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey={dataKeyX} 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false} 
              dy={10}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={v => v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }} />
            <Legend 
              wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: '20px' }} 
              iconType="circle"
            />
            
            {/* Sales as Bars */}
            <Bar dataKey="Sales" name="Total Sales" fill="hsl(36, 90%, 55%)" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="hsl(36, 90%, 55%)" />
              ))}
            </Bar>
            
            {/* Expenses as Line */}
            <Line 
              type="monotone" 
              dataKey="Expenses" 
              name="Total Expenses"
              stroke="#ef4444" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2, fill: "#card" }} 
              activeDot={{ r: 6, strokeWidth: 0, fill: "#ef4444" }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
