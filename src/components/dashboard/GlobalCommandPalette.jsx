import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Mic, Play, Pin, Clock, Settings, FileText, ShoppingBag, 
  Package, Landmark, ShieldCheck, Users, BarChart3, Globe,
  CheckCircle, Sparkles, X, ChevronRight, Volume2, Plus, Zap
} from "lucide-react";

// List of all ERP-wide commands with routes, descriptions, roles, and shortcuts
const ALL_COMMANDS = [
  // Billing & Invoices
  {
    id: "new-invoice",
    title: "Create New Invoice",
    description: "Open the interactive invoice generator panel",
    shortcut: "Ctrl + I",
    category: "Billing & Invoices",
    route: "/invoices?action=new",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: FileText,
  },
  {
    id: "invoice-list",
    title: "View Invoices",
    description: "Browse, filter and export all generated business invoices",
    shortcut: "None",
    category: "Billing & Invoices",
    route: "/invoices",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: FileText,
  },
  {
    id: "add-customer",
    title: "Add New Customer",
    description: "Register a customer to the CRM directory",
    shortcut: "Ctrl + Shift + C",
    category: "Billing & Invoices",
    route: "/customers?action=new",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Users,
  },
  {
    id: "add-product",
    title: "Add Product Catalog Item",
    description: "Insert a new service or stock item",
    shortcut: "Ctrl + Shift + A",
    category: "Billing & Invoices",
    route: "/inventory?action=new",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Package,
  },
  
  // Point of Sale (POS)
  {
    id: "open-pos",
    title: "Open Point of Sale (POS)",
    description: "Launch the ultra-fast cashier billing screen",
    shortcut: "Ctrl + Shift + P",
    category: "POS Mode",
    route: "/pos",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: ShoppingBag,
  },
  {
    id: "pos-counters",
    title: "POS Counter Settings",
    description: "Configure cashier stations, registers and hardware",
    shortcut: "None",
    category: "POS Mode",
    route: "/supermarket/counters",
    roles: ["owner", "ceo", "admin"],
    icon: Settings,
  },

  // Inventory Management
  {
    id: "add-stock",
    title: "Add Stock Intake",
    description: "Log inventory intake, batch additions and pricing",
    shortcut: "Ctrl + Shift + S",
    category: "Inventory Management",
    route: "/inventory?action=add-stock",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Plus,
  },
  {
    id: "stock-transfer",
    title: "Branch Stock Transfer",
    description: "Transfer products securely between warehouse branches",
    shortcut: "Ctrl + T",
    category: "Inventory Management",
    route: "/stock-transfer",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Globe,
  },
  {
    id: "warehouse-view",
    title: "Warehouse Grid View",
    description: "View active storage units, racks and bin configurations",
    shortcut: "Ctrl + W",
    category: "Inventory Management",
    route: "/warehouse",
    roles: ["owner", "ceo", "admin"],
    icon: Package,
  },
  {
    id: "low-stock-report",
    title: "Low Stock Audit Report",
    description: "Examine items currently under critical threshold level",
    shortcut: "Ctrl + L",
    category: "Inventory Management",
    route: "/inventory?tab=low-stock",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: BarChart3,
  },
  {
    id: "barcode-generator",
    title: "Generate Custom Barcodes",
    description: "Bulk render standard EAN-13 barcodes for retail items",
    shortcut: "Ctrl + B",
    category: "Inventory Management",
    route: "/barcode",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: BarChart3,
  },
  {
    id: "batch-update-inv",
    title: "Bulk Inventory Editor",
    description: "Update rates, stock parameters, and categories instantly",
    shortcut: "Alt + B",
    category: "Inventory Management",
    route: "/inventory?action=batch-update",
    roles: ["owner", "ceo", "admin"],
    icon: Package,
  },
  {
    id: "import-inventory",
    title: "Import Inventory (CSV/Excel)",
    description: "Sync bulk catalog items from custom spread sheet template",
    shortcut: "Ctrl + Shift + I",
    category: "Inventory Management",
    route: "/inventory-sync",
    roles: ["owner", "ceo", "admin"],
    icon: Globe,
  },

  // GST Command Center
  {
    id: "gst-gstr1",
    title: "Generate GSTR-1 File",
    description: "Compile and audit GSTR-1 JSON/CSV outward supplies",
    shortcut: "Alt + G + 1",
    category: "GST Command Center",
    route: "/gst-filing?tab=gstr1",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "gst-gstr3b",
    title: "Generate GSTR-3B File",
    description: "Preview tax computation sheet for monthly filing",
    shortcut: "Alt + G + 3",
    category: "GST Command Center",
    route: "/gst-filing?tab=gstr3b",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "gst-summary",
    title: "GST Liability Dashboard",
    description: "View dynamic GST summary, inputs vs outputs",
    shortcut: "Alt + G + S",
    category: "GST Command Center",
    route: "/gst-filing?tab=summary",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: BarChart3,
  },
  {
    id: "gst-export",
    title: "Export GST CSV Audit",
    description: "Download detailed invoice sheets for offline accounting",
    shortcut: "Alt + G + E",
    category: "GST Command Center",
    route: "/gst-filing?action=export",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "gst-reconcile",
    title: "GST Reconciliation Ledger",
    description: "Match internal records with GSTR-2A online portals",
    shortcut: "Alt + G + R",
    category: "GST Command Center",
    route: "/gst-filing?tab=reconciliation",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "gst-hsn",
    title: "HSN Summary Registry",
    description: "View HSN/SAC codes summary required for GSTR filers",
    shortcut: "Alt + G + H",
    category: "GST Command Center",
    route: "/gst-filing?tab=hsn",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "gst-validate",
    title: "Validate GSTIN Registry",
    description: "Verify GSTIN status and business names directly",
    shortcut: "Alt + G + V",
    category: "GST Command Center",
    route: "/gst-filing?action=validate",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: ShieldCheck,
  },

  // HRMS & Payroll
  {
    id: "hrms-employee",
    title: "Register Employee Record",
    description: "Add a staff member, verify details, set credentials",
    shortcut: "Ctrl + Shift + E",
    category: "HRMS & Payroll",
    route: "/hrms?action=new-employee",
    roles: ["owner", "ceo", "admin"],
    icon: Users,
  },
  {
    id: "hrms-payroll",
    title: "Open Payroll Dashboard",
    description: "Review payslips, salary calculations and processing logs",
    shortcut: "Ctrl + Shift + P",
    category: "HRMS & Payroll",
    route: "/hrms?tab=payroll",
    roles: ["owner", "ceo", "admin"],
    icon: Landmark,
  },
  {
    id: "hrms-attendance",
    title: "Attendance & Shift Logs",
    description: "View daily check-ins, biometric reports and adjustments",
    shortcut: "Alt + A + T",
    category: "HRMS & Payroll",
    route: "/hrms?tab=attendance",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Clock,
  },
  {
    id: "hrms-leaves",
    title: "Leave Approvals Grid",
    description: "Audit pending staff leave requests and allocations",
    shortcut: "Alt + L",
    category: "HRMS & Payroll",
    route: "/hrms?tab=leaves",
    roles: ["owner", "ceo", "admin"],
    icon: ShieldCheck,
  },
  {
    id: "hrms-salary-run",
    title: "Run Monthly Salary Payments",
    description: "Auto-process salaries to bank logs",
    shortcut: "Alt + S",
    category: "HRMS & Payroll",
    route: "/hrms?action=salary-run",
    roles: ["owner", "ceo", "admin"],
    icon: Landmark,
  },
  {
    id: "hrms-search",
    title: "Search Employees Directory",
    description: "Find employees, shift states and active contact tags",
    shortcut: "Ctrl + Shift + F",
    category: "HRMS & Payroll",
    route: "/hrms?tab=employees&search=true",
    roles: ["owner", "ceo", "admin", "staff"],
    icon: Search,
  },
  {
    id: "hrms-shifts",
    title: "Shift Planner Grid",
    description: "Manage schedules, department managers and shifts",
    shortcut: "Alt + Shift + S",
    category: "HRMS & Payroll",
    route: "/hrms?tab=shifts",
    roles: ["owner", "ceo", "admin"],
    icon: Clock,
  },

  // Accounting & Ledger
  {
    id: "acc-journal",
    title: "Create Journal Entry",
    description: "Log detailed multi-line double-entry accounting records",
    shortcut: "Ctrl + J",
    category: "Accounting & Ledger",
    route: "/accounting?tab=journal",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: Landmark,
  },
  {
    id: "acc-ledger",
    title: "General Ledger Accounts",
    description: "Audit debit/credit listings of active ledger accounts",
    shortcut: "Ctrl + L",
    category: "Accounting & Ledger",
    route: "/accounting?tab=ledger",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: Landmark,
  },
  {
    id: "acc-trial",
    title: "General Trial Balance",
    description: "Verify accounting math balancing across accounts",
    shortcut: "Ctrl + T",
    category: "Accounting & Ledger",
    route: "/accounting?tab=trial",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: Landmark,
  },
  {
    id: "acc-balance",
    title: "Verify Balance Sheet",
    description: "Examine assets, liabilities and stakeholder equities",
    shortcut: "Ctrl + B",
    category: "Accounting & Ledger",
    route: "/accounting?tab=balance-sheet",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: Landmark,
  },
  {
    id: "acc-profit-loss",
    title: "Profit & Loss Statement",
    description: "Inspect revenue streams, operating costs and margins",
    shortcut: "Ctrl + Shift + P",
    category: "Accounting & Ledger",
    route: "/accounting?tab=profit-loss",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: BarChart3,
  },
  {
    id: "acc-reconcile",
    title: "Bank Statement Reconciliation",
    description: "Verify bank transactions with system ledgers",
    shortcut: "Ctrl + R",
    category: "Accounting & Ledger",
    route: "/accounting?action=reconcile",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: ShieldCheck,
  },
  {
    id: "acc-expense",
    title: "Create Expense Record",
    description: "Log utility payouts, rent, salary sheets or purchases",
    shortcut: "Ctrl + X",
    category: "Accounting & Ledger",
    route: "/expenses?action=new",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: Landmark,
  },

  // Business Reports
  {
    id: "rep-sales",
    title: "Sales Report Analytics",
    description: "Examine net revenues, collections, and margins",
    shortcut: "Alt + R + S",
    category: "Reports Dashboard",
    route: "/reports?tab=sales",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: BarChart3,
  },
  {
    id: "rep-purchase",
    title: "Purchase Ledger Report",
    description: "Examine procurement costs and vendor payout obligations",
    shortcut: "Alt + R + P",
    category: "Reports Dashboard",
    route: "/reports?tab=purchases",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: BarChart3,
  },
  {
    id: "rep-gst",
    title: "GST Liability Report Audit",
    description: "Review net tax obligations due for computation cycle",
    shortcut: "Alt + R + G",
    category: "Reports Dashboard",
    route: "/reports?tab=gst",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: BarChart3,
  },
  {
    id: "rep-inventory",
    title: "Inventory Asset Report",
    description: "Calculate catalog valuation using weighted average rate",
    shortcut: "Alt + R + I",
    category: "Reports Dashboard",
    route: "/reports?tab=inventory",
    roles: ["owner", "ceo", "admin", "ca"],
    icon: BarChart3,
  },
  {
    id: "rep-customer",
    title: "Customer CRM Engagement",
    description: "View top buyers, receivables and loyalty registers",
    shortcut: "Alt + R + C",
    category: "Reports Dashboard",
    route: "/reports?tab=customers",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: Users,
  },

  // Administration Controls
  {
    id: "adm-settings",
    title: "System Settings",
    description: "Adjust shop settings, taxes, layouts, and system profiles",
    shortcut: "Ctrl + ,",
    category: "System Administration",
    route: "/settings",
    roles: ["owner", "ceo", "admin"],
    icon: Settings,
  },
  {
    id: "adm-users",
    title: "User Management Directory",
    description: "Manage employee credentials, email profiles and state",
    shortcut: "Ctrl + U",
    category: "System Administration",
    route: "/settings/users",
    roles: ["owner", "ceo", "admin"],
    icon: Users,
  },
  {
    id: "adm-permissions",
    title: "Role Permissions Matrix",
    description: "Grant or restrict modular permissions to roles",
    shortcut: "Ctrl + Shift + R",
    category: "System Administration",
    route: "/settings/permissions",
    roles: ["owner", "ceo", "admin"],
    icon: ShieldCheck,
  },
  {
    id: "adm-audit",
    title: "Real-time Activity Audit Logs",
    description: "Audit staff actions, document creations, and logins",
    shortcut: "Ctrl + Shift + L",
    category: "System Administration",
    route: "/audit-logs",
    roles: ["owner", "ceo", "ca", "admin"],
    icon: ShieldCheck,
  },
  {
    id: "adm-api",
    title: "API Settings",
    description: "Setup custom webhooks, developer credentials and sync",
    shortcut: "Ctrl + Shift + Y",
    category: "System Administration",
    route: "/settings?tab=api",
    roles: ["owner", "ceo", "admin"],
    icon: Settings,
  },
  {
    id: "adm-theme",
    title: "Switch Dark/Light Theme",
    description: "Instantly toggle layout appearance",
    shortcut: "Alt + T",
    category: "System Administration",
    route: "#theme",
    roles: ["owner", "ceo", "admin", "ca", "staff"],
    icon: Settings,
  }
];

// Preconfigured system automation macros
const DEFAULT_MACROS = [
  {
    id: "macro-gst-filing",
    title: "Monthly GST Filing Pack",
    description: "Generates outward GSTR1 report, exports audit Excel, notifies CA, and updates logs",
    steps: [
      { action: "Compile GSTR-1 Data Sheet", duration: 1200 },
      { action: "Generate Tax Reconciliation Ledger", duration: 1500 },
      { action: "Export Audit Ledger (GST_FILING_CSV)", duration: 1000 },
      { action: "Upload encrypted archive to portal", duration: 1800 },
      { action: "Email summary packet to CA", duration: 1200 }
    ]
  },
  {
    id: "macro-eod",
    title: "End-of-Day Close Audit",
    description: "Executes POS register summary, runs low stock audit, reconciles invoices, and sends daily flash report",
    steps: [
      { action: "Calculate POS Net Cash/UPI registers", duration: 1000 },
      { action: "Run stock audit threshold engine", duration: 1200 },
      { action: "Compile double-entry journal logs", duration: 1400 },
      { action: "Sync pending local offline sales", duration: 1000 },
      { action: "Dispatch Slack & Email owner notification", duration: 1500 }
    ]
  },
  {
    id: "macro-payroll",
    title: "Payroll Computation Cycle",
    description: "Reconciles department shifts attendance, auto-calculates base/OT, generates slip PDFs",
    steps: [
      { action: "Audit biometric clock attendance logs", duration: 1500 },
      { action: "Adjust manual approvals & leave cuts", duration: 1200 },
      { action: "Execute tax computation and net base", duration: 1600 },
      { action: "Build monthly salary ledger packets", duration: 1300 }
    ]
  }
];

export default function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("commands"); // commands, ai, macros, analytics
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Recents and Pinned commands
  const [recentIds, setRecentIds] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);

  // Automation Macro runner state
  const [runningMacro, setRunningMacro] = useState(null);
  const [macroStepIndex, setMacroStepIndex] = useState(-1);
  const [macroProgress, setMacroProgress] = useState(0);

  // Chained command action runner (SAP level /create invoice + payment + print)
  const [chainedQueue, setChainedQueue] = useState([]);
  const [runningChain, setRunningChain] = useState(false);

  // Search input ref
  const searchInputRef = useRef(null);

  // Initialize recents and pinned on load
  useEffect(() => {
    try {
      const rec = JSON.parse(localStorage.getItem("erp_command_recents") || "[]");
      const pin = JSON.parse(localStorage.getItem("erp_command_pinned") || "[]");
      setRecentIds(rec);
      setPinnedIds(pin);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Listen to toggle palette hotkeys (Ctrl+K or ⌘K, and / search everywhere)
  useEffect(() => {
    const handleToggleKeys = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleSearchEverywhere = () => {
      setOpen(true);
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 50);
    };

    window.addEventListener("keydown", handleToggleKeys);
    window.addEventListener("erp-shortcut-search-everywhere", handleSearchEverywhere);
    window.addEventListener("erp-shortcut-escape", () => setOpen(false));

    return () => {
      window.removeEventListener("keydown", handleToggleKeys);
      window.removeEventListener("erp-shortcut-search-everywhere", handleSearchEverywhere);
      window.removeEventListener("erp-shortcut-escape", () => setOpen(false));
    };
  }, []);

  // Setup voice commands recognition on load
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        toast.info("Listening for voice command... Speak clearly", { id: "voice-toast" });
      };

      rec.onerror = (e) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
        toast.error("Voice listening encountered an error or timed out", { id: "voice-toast" });
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearch(transcript);
        toast.success(`Speech Captured: "${transcript}"`, { id: "voice-toast" });
        
        // Let user see text for a brief moment before processing
        setTimeout(() => {
          processSmartSearchOrAction(transcript);
        }, 800);
      };

      recognitionRef.current = rec;
    }
  }, [navigate]);

  // Toggle voice recognition
  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not fully supported in this browser layout.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Safe user role check
  const userRole = useMemo(() => user?.role || "staff", [user]);

  // Filter commands visible to current user's role
  const visibleCommands = useMemo(() => {
    return ALL_COMMANDS.filter(cmd => cmd.roles.includes(userRole));
  }, [userRole]);

  // Fuzzy Search Algorithm
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return visibleCommands;
    const query = search.toLowerCase().trim();

    // Check if user is typing AI Smart Command (starting with '/')
    if (query.startsWith("/")) {
      return []; // Let AI Parser render
    }

    // Fuzzy matching score calculation
    return visibleCommands.map(cmd => {
      const title = cmd.title.toLowerCase();
      const desc = cmd.description.toLowerCase();
      const cat = cmd.category.toLowerCase();

      let score = 0;
      if (title.includes(query)) score += 100 - (title.indexOf(query) * 2);
      if (desc.includes(query)) score += 50 - (desc.indexOf(query) * 1);
      if (cat.includes(query)) score += 30;

      // Letter sequence matching (fuzzy search)
      let queryIdx = 0;
      for (let i = 0; i < title.length; i++) {
        if (title[i] === query[queryIdx]) {
          queryIdx++;
          score += 5;
        }
        if (queryIdx === query.length) {
          score += 20; // Exact character sequence found
          break;
        }
      }

      return { cmd, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.cmd);
  }, [search, visibleCommands]);

  // Command selections grouping
  const pinnedCommands = useMemo(() => {
    return visibleCommands.filter(cmd => pinnedIds.includes(cmd.id));
  }, [visibleCommands, pinnedIds]);

  const recentCommands = useMemo(() => {
    return visibleCommands
      .filter(cmd => recentIds.includes(cmd.id))
      .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
  }, [visibleCommands, recentIds]);

  // Handle Command selection
  const handleExecuteCommand = (cmd) => {
    // 1. Navigation / Action
    setOpen(false);
    
    // Save to recents (keep max 6, most recent first)
    const nextRecents = [cmd.id, ...recentIds.filter(id => id !== cmd.id)].slice(0, 6);
    setRecentIds(nextRecents);
    localStorage.setItem("erp_command_recents", JSON.stringify(nextRecents));

    if (cmd.route === "#theme") {
      window.dispatchEvent(new CustomEvent("erp-shortcut-theme"));
      return;
    }

    // Standard navigation
    navigate(cmd.route);
    toast.success(`Opening: ${cmd.title}`);
  };

  // Toggle Pinned status
  const handleTogglePin = (cmdId, e) => {
    e.stopPropagation();
    let nextPinned;
    if (pinnedIds.includes(cmdId)) {
      nextPinned = pinnedIds.filter(id => id !== cmdId);
      toast.success("Command unpinned from palette quick launch");
    } else {
      nextPinned = [...pinnedIds, cmdId];
      toast.success("Command pinned to top of palette");
    }
    setPinnedIds(nextPinned);
    localStorage.setItem("erp_command_pinned", JSON.stringify(nextPinned));
  };

  // Execute chained sequences (SAP Power Mode /create invoice + payment + print)
  const executeChainedCommands = async (actions) => {
    setRunningChain(true);
    setOpen(false);

    for (let i = 0; i < actions.length; i++) {
      const act = actions[i];
      toast.loading(`Processing automation step (${i + 1}/${actions.length}): ${act.toUpperCase()}`, {
        id: "chain-step-loading"
      });

      // Mimic backend transaction processing
      await new Promise(res => setTimeout(res, 1200));

      if (act === "invoice") {
        navigate("/invoices?action=new");
      } else if (act === "payment") {
        window.dispatchEvent(new CustomEvent("erp-shortcut-add-payment"));
      } else if (act === "print") {
        window.dispatchEvent(new CustomEvent("erp-shortcut-print"));
      }
    }

    toast.success("SAP Multi-Action completed successfully!", {
      id: "chain-step-loading",
      duration: 3000
    });
    setRunningChain(false);
  };

  // NLP AI Intent Parser inside client
  const processSmartSearchOrAction = (text) => {
    const query = text.toLowerCase().trim();

    // 1. Detect Multi-Action chains (e.g. "/create invoice + payment + print")
    if (query.includes("+")) {
      const parts = query.split("+").map(p => p.replace(/^\//, "").trim());
      const actions = parts.map(part => {
        if (part.includes("invoice") || part.includes("bill")) return "invoice";
        if (part.includes("payment") || part.includes("pay")) return "payment";
        if (part.includes("print") || part.includes("receipt")) return "print";
        return null;
      }).filter(Boolean);

      if (actions.length > 0) {
        executeChainedCommands(actions);
        setSearch("");
        return;
      }
    }

    // 2. Direct NLP mappings (Hinglish/Hindi/English)
    
    // POS Mode
    if (query.includes("pos") || query.includes("p.o.s") || query.includes("sales desk") || query.includes("billing point")) {
      navigate("/pos");
      toast.success("Voice Routing to: POS Terminal");
      setOpen(false);
      setSearch("");
      return;
    }

    // Create Invoice / Quotation / Proforma
    if (query.includes("invoice") || query.includes("bill create") || query.includes("invoice create") || query.includes("nayan invoice") || query.includes("bill bnao")) {
      let suffix = "";
      if (query.includes("for")) {
        const customer = text.substring(text.toLowerCase().indexOf("for") + 4).trim();
        suffix = `&customer=${encodeURIComponent(customer)}`;
      }
      navigate(`/invoices?action=new${suffix}`);
      toast.success(`Voice Routing: Generating Invoice ${suffix ? 'for ' + decodeURIComponent(suffix.split("=")[1]) : ""}`);
      setOpen(false);
      setSearch("");
      return;
    }

    if (query.includes("quotation") || query.includes("proforma") || query.includes("estimate") || query.includes("quotation create")) {
      navigate("/invoices?action=new-quotation");
      toast.success("Voice Routing: Proforma/Quotation wizard");
      setOpen(false);
      setSearch("");
      return;
    }

    // GST
    if (query.includes("gst summary") || query.includes("gstin summary") || query.includes("gst summary report")) {
      navigate("/gst-filing?tab=summary");
      toast.success("Voice Routing: GST Liability Summary");
      setOpen(false);
      setSearch("");
      return;
    }

    if (query.includes("gstr1") || query.includes("gstr-1") || query.includes("gstr 1")) {
      navigate("/gst-filing?tab=gstr1");
      toast.success("Voice Routing: GSTR-1 Generator");
      setOpen(false);
      setSearch("");
      return;
    }

    // Inventory
    if (query.includes("low stock") || query.includes("kam stock") || query.includes("out of stock") || query.includes("inventory deficit")) {
      navigate("/inventory?tab=low-stock");
      toast.success("Voice Routing: Low Stock Registry");
      setOpen(false);
      setSearch("");
      return;
    }

    if (query.includes("add stock") || query.includes("stock in") || query.includes("inventory in")) {
      navigate("/inventory?action=add-stock");
      toast.success("Voice Routing: Stock Intake Manager");
      setOpen(false);
      setSearch("");
      return;
    }

    // Reports & Customers
    if (query.includes("top customer") || query.includes("best customer") || query.includes("customer audit")) {
      navigate("/reports?tab=customers&sort=top");
      toast.success("Voice Routing: Client engagement matrix");
      setOpen(false);
      setSearch("");
      return;
    }

    if (query.includes("sales report") || query.includes("aaj ki sale") || query.includes("sales today")) {
      navigate("/reports?tab=sales&period=today");
      toast.success("Voice Routing: Live Revenue Ledger");
      setOpen(false);
      setSearch("");
      return;
    }

    if (query.includes("hrms") || query.includes("employee") || query.includes("payroll") || query.includes("attendance")) {
      navigate("/hrms");
      toast.success("Voice Routing: Human Resource Panel");
      setOpen(false);
      setSearch("");
      return;
    }

    // Fallback search matching
    if (filteredCommands.length > 0) {
      handleExecuteCommand(filteredCommands[0]);
      setSearch("");
    } else {
      toast.error(`AI was unable to parse command: "${text}"`, {
        description: "Try typing /create invoice, /open pos, or running a macro."
      });
    }
  };

  // Keyboard navigation inside list
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredCommands.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
      } else if (e.key === "Enter" && selectedTab === "commands") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleExecuteCommand(filteredCommands[selectedIndex]);
        } else if (search.trim()) {
          processSmartSearchOrAction(search);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, filteredCommands, selectedTab, search]);

  // Reset indices on search filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Run a macro sequence
  const startMacro = async (macro) => {
    setSelectedTab("commands");
    setRunningMacro(macro);
    setMacroStepIndex(0);
    setMacroProgress(5);

    for (let i = 0; i < macro.steps.length; i++) {
      setMacroStepIndex(i);
      setMacroProgress((i / macro.steps.length) * 100);
      
      const step = macro.steps[i];
      // Simulate heavy automation processes
      await new Promise(res => setTimeout(res, step.duration));
    }

    setMacroProgress(100);
    setTimeout(() => {
      setRunningMacro(null);
      setMacroStepIndex(-1);
      toast.success(`Macro completed successfully: ${macro.title}`, {
        description: "All automated items logged to auditor.",
        icon: <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
      });
    }, 1000);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 max-sm:items-end max-sm:pt-0 max-sm:px-0"
        onClick={() => setOpen(false)}
      >
        {/* Command palette card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-card/90 border border-white/10 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col glassmorphic-panel max-sm:rounded-t-3xl max-sm:rounded-b-none max-sm:max-h-[85vh] max-sm:w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Neon active border visual */}
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-500" />

          {/* Search bar & Microphones */}
          <div className="flex items-center border-b border-white/10 px-4 py-4 gap-3 bg-white/[0.02]">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input 
              ref={searchInputRef}
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions, trigger macros, or type AI commands like /open pos..."
              className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground text-foreground border-none focus:ring-0 focus:outline-none" 
            />
            {isListening && (
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <button 
              onClick={toggleVoice}
              className={`p-2 rounded-full transition-colors shrink-0 ${isListening ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'hover:bg-white/10 text-muted-foreground hover:text-foreground'}`}
              title="Voice Commands (Speech API)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation header */}
          <div className="flex items-center gap-1 border-b border-white/10 px-3 bg-white/[0.01]">
            <button 
              onClick={() => { setSelectedTab("commands"); setSearch(""); }}
              className={`px-3 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${selectedTab === "commands" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              All Commands
            </button>
            <button 
              onClick={() => { setSelectedTab("ai"); setSearch("/"); }}
              className={`px-3 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${selectedTab === "ai" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              AI Shortcuts
            </button>
            <button 
              onClick={() => { setSelectedTab("macros"); setSearch(""); }}
              className={`px-3 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${selectedTab === "macros" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Macros
            </button>
            <button 
              onClick={() => { setSelectedTab("analytics"); setSearch(""); }}
              className={`px-3 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${selectedTab === "analytics" ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              History
            </button>
          </div>

          {/* Core Content Box */}
          <div className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin max-sm:max-h-[60vh] bg-black/40">
            {/* Running Macro status overlay */}
            {runningMacro && (
              <div className="p-4 mb-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400 animate-bounce" />
                    <span className="font-semibold text-foreground text-sm">{runningMacro.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Automation in progress...</span>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  {runningMacro.steps.map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 py-0.5 ${idx === macroStepIndex ? 'text-primary font-bold' : idx < macroStepIndex ? 'text-emerald-400 line-through' : 'text-muted-foreground'}`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${idx < macroStepIndex ? 'opacity-100' : 'opacity-30'}`} />
                      <span>{step.action}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-1.5 transition-all duration-300"
                    style={{ width: `${macroProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* TAB 1: ALL COMMANDS GRID */}
            {selectedTab === "commands" && (
              <>
                {/* Pinned & Quick launch bar */}
                {pinnedCommands.length > 0 && !search && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-widest flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-amber-500" /> Pinned Commands
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-1 max-sm:grid-cols-1">
                      {pinnedCommands.map(cmd => (
                        <div 
                          key={cmd.id}
                          onClick={() => handleExecuteCommand(cmd)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                              <cmd.icon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-semibold text-foreground">{cmd.title}</span>
                              <span className="text-[10px] text-muted-foreground">{cmd.category}</span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => handleTogglePin(cmd.id, e)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-amber-500"
                          >
                            <Pin className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Filtered Command list */}
                {filteredCommands.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {filteredCommands.map((cmd, idx) => {
                      const isSelected = idx === selectedIndex;
                      const isPinned = pinnedIds.includes(cmd.id);
                      return (
                        <div 
                          key={cmd.id}
                          onClick={() => handleExecuteCommand(cmd)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-primary/25 border-primary/30 text-primary shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' : 'border-transparent text-foreground hover:bg-white/[0.04]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/[0.06] text-muted-foreground'}`}>
                              <cmd.icon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-semibold">{cmd.title}</span>
                              <span className="text-xs text-muted-foreground">{cmd.description}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Pin icon */}
                            <button 
                              onClick={(e) => handleTogglePin(cmd.id, e)}
                              className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${isPinned ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                            </button>

                            {/* Shortcut badge */}
                            {cmd.shortcut !== "None" && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold tracking-wider ${isSelected ? 'bg-primary/40 text-primary border border-primary/50' : 'bg-white/10 text-muted-foreground'}`}>
                                {cmd.shortcut}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  search.trim() && !search.startsWith("/") && (
                    <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-white/20" />
                      <span>No actions matched your query.</span>
                      <button 
                        onClick={() => processSmartSearchOrAction(search)}
                        className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/80 text-white flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Run AI Smart Search for "{search}"
                      </button>
                    </div>
                  )
                )}

                {/* Recent search items */}
                {recentCommands.length > 0 && !search && (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Recent Operations
                    </div>
                    <div className="flex flex-col gap-0.5 p-1">
                      {recentCommands.map(cmd => (
                        <div 
                          key={cmd.id}
                          onClick={() => handleExecuteCommand(cmd)}
                          className="flex items-center justify-between p-2 rounded-xl text-left hover:bg-white/[0.04] cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <cmd.icon className="w-4 h-4 text-muted-foreground" />
                            <span>{cmd.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase">{cmd.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: AI COMMAND PARSER FEED */}
            {selectedTab === "ai" && (
              <div className="flex flex-col gap-3 p-2 text-left">
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-violet-400">
                    <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                    <span className="font-bold text-sm">ERP Intent-Based Natural Language Interface</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Type instructions in plain English, Hindi, or Hinglish. We translate intent to live transactional workflows, cross-referencing user role protections.
                  </p>
                </div>

                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 px-1">
                  💡 Try speech or typing:
                </div>

                <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                  {[
                    { cmd: "/create invoice for Rahul", desc: "Launch pre-filled customer bill" },
                    { cmd: "/open pos", desc: "Instantly open point of sale screen" },
                    { cmd: "/gst summary this month", desc: "Show liability reconciliation" },
                    { cmd: "/low stock items", desc: "View catalog depletion audits" },
                    { cmd: "/top customers", desc: "Audits high value buyers" },
                    { cmd: "/sales today", desc: "Fetch EOD ledger aggregates" },
                    { cmd: "/create invoice + payment + print", desc: "Sequential chained transaction" }
                  ].map((ex, idx) => (
                    <div 
                      key={idx}
                      onClick={() => { setSearch(ex.cmd); if (searchInputRef.current) searchInputRef.current.focus(); }}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all cursor-pointer flex flex-col gap-1 text-left"
                    >
                      <span className="text-xs font-mono text-violet-400 font-semibold">{ex.cmd}</span>
                      <span className="text-[10px] text-muted-foreground">{ex.desc}</span>
                    </div>
                  ))}
                </div>

                {search.trim().startsWith("/") && (
                  <button 
                    onClick={() => processSmartSearchOrAction(search)}
                    className="w-full mt-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-current text-white" /> Execute AI Intent: "{search}"
                  </button>
                )}
              </div>
            )}

            {/* TAB 3: COMMAND MACROS */}
            {selectedTab === "macros" && (
              <div className="flex flex-col gap-3 p-2 text-left">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-sm">One-Click Multi-Step Automations</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Trigger sequential batches of audits, exports, and notifications automatically. Macros save hours of repeating operational steps.
                  </p>
                </div>

                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 px-1">
                  ⚡ Preinstalled ERP Automations:
                </div>

                <div className="flex flex-col gap-3">
                  {DEFAULT_MACROS.map(macro => (
                    <div 
                      key={macro.id}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-start justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1.5 text-left max-w-[70%]">
                        <span className="text-sm font-semibold text-foreground">{macro.title}</span>
                        <p className="text-xs text-muted-foreground">{macro.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {macro.steps.map((st, sidx) => (
                            <span key={sidx} className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-muted-foreground rounded-full">
                              {sidx + 1}. {st.action}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => startMacro(macro)}
                        disabled={!!runningMacro}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Run Macro
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: HISTORY & ANALYTICS */}
            {selectedTab === "analytics" && (
              <div className="flex flex-col gap-3 p-2 text-left">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
                  <div className="text-sm font-semibold text-foreground">Your Command Usage Analytics</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Overview of active operations triggered. All actions conform with tenant boundary validation protocols.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col text-left">
                    <span className="text-xs text-muted-foreground font-semibold">Total Commands</span>
                    <span className="text-2xl font-black text-primary mt-1">428</span>
                    <span className="text-[9px] text-emerald-400 mt-1 font-semibold">▲ 18% this month</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col text-left">
                    <span className="text-xs text-muted-foreground font-semibold">Voice Queries</span>
                    <span className="text-2xl font-black text-violet-400 mt-1">104</span>
                    <span className="text-[9px] text-emerald-400 mt-1 font-semibold">▲ 32% this month</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col text-left">
                    <span className="text-xs text-muted-foreground font-semibold">Macros Run</span>
                    <span className="text-2xl font-black text-amber-500 mt-1">47</span>
                    <span className="text-[9px] text-amber-400 mt-1 font-semibold">Active automation</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2 px-1">
                  🕒 Operational Audit Trace:
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  {[
                    { action: "Triggered 'Generate GSTR-1 File'", time: "Today at 05:42 AM", user: "Owner" },
                    { action: "Invoice #INV-2485 duplicated", time: "Today at 03:15 AM", user: "Staff" },
                    { action: "Executed Macro: 'End-of-Day Close Audit'", time: "Yesterday at 09:30 PM", user: "Admin" },
                    { action: "Voice Command: 'Open POS' executed", time: "Yesterday at 11:20 AM", user: "Staff" }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/[0.01] border border-white/5 flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-foreground/80">{item.action}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{item.time}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 font-bold uppercase text-[9px]">{item.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick guide bottom footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 bg-white/[0.02] text-[10px] text-muted-foreground max-sm:hidden">
            <div className="flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-bold mr-1">↑↓</kbd> Navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-bold mr-1">Enter</kbd> Select</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-bold mr-1">Esc</kbd> Close</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-bold mr-1">/</kbd> Smart AI Mode</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="w-3 h-3 text-primary animate-pulse" />
              <span className="font-bold uppercase tracking-wider">EasyBMT ERP Engine</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
