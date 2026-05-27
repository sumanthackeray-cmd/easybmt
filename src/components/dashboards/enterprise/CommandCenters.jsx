import React, { useState } from "react";
import { Package, ShieldCheck, Users, Banknote } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function CommandCenters({ data }) {
  const { user } = useAuth();
  const isAdm = user?.role === 'admin' || user?.role === 'owner';

  const tabs = [
    { id: "inventory", label: "Inventory Intelligence", icon: Package, permission: isAdm || user?.permissions?.inventory?.view },
    { id: "gst", label: "GST Command", icon: ShieldCheck, permission: isAdm || user?.permissions?.gst_filing?.view },
    { id: "finance", label: "Finance Core", icon: Banknote, permission: isAdm || user?.permissions?.reports?.view || user?.permissions?.reports?.profit_margins },
    { id: "hr", label: "HR & Approvals", icon: Users, permission: isAdm || user?.permissions?.hrms_dashboard?.view || user?.permissions?.hrms_employees?.view },
  ].filter(tab => tab.permission);

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || "inventory");

  if (tabs.length === 0) return null;

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-sm min-h-[350px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-border/50 pb-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">Enterprise Command Centers</h3>
          <p className="text-xs text-muted-foreground mt-1">Deep drill-down operational metrics.</p>
        </div>
        
        <div className="flex bg-secondary/50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Content based on Active Tab */}
      <div className="mt-4">
        {activeTab === "inventory" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Low Stock Alerts</p>
              <h4 className="text-2xl font-black mt-2 text-orange-500">12 Items</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Auto-reorder suggested</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Expiring Soon</p>
              <h4 className="text-2xl font-black mt-2 text-red-500">4 Batches</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Requires immediate liquidation</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Fast Moving</p>
              <h4 className="text-2xl font-black mt-2 text-green-500">Class A</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Generating 80% of revenue</p>
            </div>
          </div>
        )}

        {activeTab === "gst" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">GSTR-1 Liability</p>
                  <h4 className="text-2xl font-black mt-2">₹{(data.totalTax).toLocaleString('en-IN')}</h4>
                </div>
                <div className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded text-[10px] font-bold">Unfiled</div>
              </div>
            </div>
            <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">ITC Available (Est)</p>
                  <h4 className="text-2xl font-black mt-2">₹{(data.totalTax * 0.3).toLocaleString('en-IN')}</h4>
                </div>
                <div className="px-2 py-1 bg-green-500/10 text-green-600 rounded text-[10px] font-bold">Synced</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Bank Balance</p>
              <h4 className="text-2xl font-black mt-2 text-foreground">Syncing...</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Connect Plaid / Banking API</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Vendor Dues</p>
              <h4 className="text-2xl font-black mt-2 text-rose-500">₹{(data.totalExpenses * 0.2).toLocaleString('en-IN')}</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Payable within 15 days</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border/30">
              <p className="text-xs font-bold text-muted-foreground uppercase">Credit Score</p>
              <h4 className="text-2xl font-black mt-2 text-emerald-500">780</h4>
              <p className="text-[10px] mt-1 text-muted-foreground">Excellent borrowing capacity</p>
            </div>
          </div>
        )}

        {activeTab === "hr" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h4 className="text-sm font-bold text-foreground">Employee Command Center</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Biometric sync and payroll analytics are operating normally. 4 pending leave approvals detected.
            </p>
            <button className="mt-4 px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition-colors">
              Review Approvals
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
