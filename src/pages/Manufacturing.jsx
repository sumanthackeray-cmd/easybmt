import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useShopSettings } from "@/hooks/useShopSettings";
import { 
  Factory, Package, Wrench, FileSpreadsheet, CalendarRange, ClipboardList, ClipboardCheck, 
  Cpu, Users, ShieldCheck, Truck, Sliders, Printer, Archive, Trash2, BarChart3, Settings, PlayCircle, Layers
} from "lucide-react";

// Import modular manufacturing components
// Import modular manufacturing components disabled due to missing files
// import RawMaterialsStore from "./manufacturing/RawMaterialsStore";
// import ConsumablesStore from "./manufacturing/ConsumablesStore";
// import BOMManager from "./manufacturing/BOMManager";
// import ProductionPlanning from "./manufacturing/ProductionPlanning";
// import ProductionOrders from "./manufacturing/ProductionOrders";
// import MaterialIssues from "./manufacturing/MaterialIssues";
// import ProductionExecution from "./manufacturing/ProductionExecution";
// import BatchManager from "./manufacturing/BatchManager";
// import FinishedGoods from "./manufacturing/FinishedGoods";
// import MachineManagement from "./manufacturing/MachineManagement";
// import OperatorManagement from "./manufacturing/OperatorManagement";
// import QualityControl from "./manufacturing/QualityControl";
// import DispatchManagement from "./manufacturing/DispatchManagement";
// import SerialTracking from "./manufacturing/SerialTracking";
// import BarcodeDesigner from "./manufacturing/BarcodeDesigner";
// import ScrapWastage from "./manufacturing/ScrapWastage";
// import AnalyticsSuite from "./manufacturing/AnalyticsSuite";

export default function Manufacturing() {
  const { user } = useAuth();
  const { shopSettings } = useShopSettings();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Resolve active branch ID
  const activeBranchId = localStorage.getItem("selectedBranch") || "MAIN";

  // List of all 15 enterprise manufacturing modules
  const modules = [
    { id: "dashboard", label: "Analytics Dashboard", icon: BarChart3, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "raw_materials", label: "Raw Materials", icon: Package, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { id: "consumables", label: "Consumables Store", icon: Wrench, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { id: "bom", label: "BOM structural Designer", icon: FileSpreadsheet, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    { id: "planning", label: "Production Planning", icon: CalendarRange, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    { id: "orders", label: "Production Orders", icon: ClipboardList, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    { id: "material_issues", label: "Material Issue Slips", icon: ClipboardCheck, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { id: "execution", label: "Production Execution", icon: PlayCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { id: "batch", label: "Batch Management", icon: Layers, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { id: "machines", label: "Machine Management", icon: Cpu, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { id: "operators", label: "Operator Registry", icon: Users, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "qc", label: "Quality Checks", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "dispatch", label: "Dispatch Logistics", icon: Truck, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { id: "serial_tracking", label: "Traceability map", icon: Sliders, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { id: "barcode", label: "Barcode Printing", icon: Printer, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    { id: "finished_goods", label: "Finished Goods", icon: Archive, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "scrap", label: "Scrap & Wastage", icon: Trash2, color: "text-red-500 bg-red-500/10 border-red-500/20" }
  ];

  return (
    <div className="space-y-6 text-xs text-foreground animate-fade-up">
      {/* Premium Unified Header */}
      <div className="bg-card border border-border/60 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5 shrink-0">
            <Factory className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-foreground flex items-center gap-2">
              Enterprise Manufacturing &amp; WIP ERP Workspace
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1 leading-normal max-w-2xl">
              Unified SAP-grade manufacturing operations: manage raw stores, BOM consumption formulas, active lines OEE, biometrics, compliance checking, and traceability.
            </p>
          </div>
        </div>
        <span className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-3.5 py-1.5 rounded-full font-black flex items-center gap-1.5 shadow-sm text-[10px] shrink-0">
          🟢 Local-First ERP Active
        </span>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border/60 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="font-black text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-left px-1.5 mb-2 flex items-center gap-1.5">
              ⚙️ Industrial Modules ({modules.length})
            </h3>
            
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {modules.map((mod) => {
                const isActive = activeTab === mod.id;
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveTab(mod.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-[11px] font-bold text-left transition duration-200 ${
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10" 
                        : "bg-background border-border/50 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                      isActive ? "bg-white/20 border-white/20" : mod.color
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
                    </div>
                    <span className="truncate">{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Display Panel */}
        <div className="xl:col-span-3 min-h-[500px]">
          {/* Components disabled due to missing files
          {activeTab === "dashboard" && <AnalyticsSuite activeBranchId={activeBranchId} />}
          {activeTab === "raw_materials" && <RawMaterialsStore activeBranchId={activeBranchId} />}
          {activeTab === "consumables" && <ConsumablesStore activeBranchId={activeBranchId} />}
          {activeTab === "bom" && <BOMManager activeBranchId={activeBranchId} />}
          {activeTab === "planning" && <ProductionPlanning activeBranchId={activeBranchId} />}
          {activeTab === "orders" && <ProductionOrders activeBranchId={activeBranchId} />}
          {activeTab === "material_issues" && <MaterialIssues activeBranchId={activeBranchId} />}
          {activeTab === "execution" && <ProductionExecution activeBranchId={activeBranchId} />}
          {activeTab === "batch" && <BatchManager activeBranchId={activeBranchId} />}
          {activeTab === "finished_goods" && <FinishedGoods activeBranchId={activeBranchId} />}
          {activeTab === "machines" && <MachineManagement activeBranchId={activeBranchId} />}
          {activeTab === "operators" && <OperatorManagement activeBranchId={activeBranchId} />}
          {activeTab === "qc" && <QualityControl activeBranchId={activeBranchId} />}
          {activeTab === "dispatch" && <DispatchManagement activeBranchId={activeBranchId} />}
          {activeTab === "serial_tracking" && <SerialTracking activeBranchId={activeBranchId} />}
          {activeTab === "barcode" && <BarcodeDesigner activeBranchId={activeBranchId} />}
          {activeTab === "finished_goods" && <FinishedGoods activeBranchId={activeBranchId} />}
          {activeTab === "scrap" && <ScrapWastage activeBranchId={activeBranchId} />}
          */}
          <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed rounded-3xl">Module under construction</div>
        </div>
      </div>
    </div>
  );
}
