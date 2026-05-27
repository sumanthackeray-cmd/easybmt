import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Zap,
  Users,
  FileText,
  Truck,
  ShoppingCart,
  Package,
  Warehouse,
  RefreshCw,
  ScanBarcode,
  BookOpen,
  Receipt,
  Landmark,
  Building2,
  GitBranch,
  TrendingUp,
  Sparkles,
  Shield,
  Settings,
  Crown,
  Search,
  PlusCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  React.useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Floating K trigger button on bottom-right for mouse users to discover */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden md:flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 border border-primary/20"
        title="Open Command Palette (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-primary-foreground/15 px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-[9px]">Ctrl</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="bg-popover/90 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList className="max-h-[350px]">
            <CommandEmpty>No results found.</CommandEmpty>
            
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => runCommand(() => navigate("/pos"))}>
                <PlusCircle className="mr-2 h-4 w-4 text-emerald-500" />
                <span>Create New Invoice (POS)</span>
                <CommandShortcut>⚡</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/customers?action=new"))}>
                <PlusCircle className="mr-2 h-4 w-4 text-blue-500" />
                <span>Add New Customer</span>
                <CommandShortcut>👥</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/inventory?action=new"))}>
                <PlusCircle className="mr-2 h-4 w-4 text-purple-500" />
                <span>Add New Product</span>
                <CommandShortcut>📦</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/expenses?action=new"))}>
                <PlusCircle className="mr-2 h-4 w-4 text-red-500" />
                <span>Record New Expense</span>
                <CommandShortcut>💰</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Pages & Modules">
              <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/customers"))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Customers Directory</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/invoices"))}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Invoices List</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/inventory"))}>
                <Package className="mr-2 h-4 w-4" />
                <span>Inventory & Stock</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/purchases"))}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>Purchase Orders</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/expenses"))}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Expenses Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/accounting"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Double-Entry Accounting</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/finance"))}>
                <Landmark className="mr-2 h-4 w-4" />
                <span>Finance Hub</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/gst-filing"))}>
                <Building2 className="mr-2 h-4 w-4" />
                <span>GST Filing & Tax</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/hrms"))}>
                <Users className="mr-2 h-4 w-4 text-purple" />
                <span>HRMS & Payroll</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/branches"))}>
                <GitBranch className="mr-2 h-4 w-4 text-amber-500" />
                <span>Branch Management</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Intelligence & Settings">
              <CommandItem onSelect={() => runCommand(() => navigate("/enterprise-intel"))}>
                <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                <span>Enterprise Intelligence (AI)</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/ai-insights"))}>
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                <span>AI Core Insights</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/audit-logs"))}>
                <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Security Audit Logs</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/subscription"))}>
                <Crown className="mr-2 h-4 w-4 text-amber-500" />
                <span>Manage Subscription / Upgrade</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
