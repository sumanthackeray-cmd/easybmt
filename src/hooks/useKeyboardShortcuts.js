import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/lib/toast";

/**
 * Enterprise Keyboard Shortcut Manager Hook
 * Listens globally for ERP hotkeys, manages navigation, context-awareness,
 * multi-key sequences (e.g. Alt+G+1), and dispatches standard CustomEvents
 * for page-level overrides.
 */
export default function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const sequenceTimer = useRef(null);
  const sequenceState = useRef({ prefix: null, timestamp: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const path = location.pathname;
      const isPOS = path === "/pos";

      // Helper to check active element (don't trigger global navigation keys if typing in input/textarea)
      const isTyping = 
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.isContentEditable;

      // Reset sequence prefix if too much time has passed (1.5 seconds)
      const now = Date.now();
      if (now - sequenceState.current.timestamp > 1500) {
        sequenceState.current = { prefix: null, timestamp: 0 };
      }

      // ----------------------------------------------------
      // SPECIAL ENTERPRISE NAVIGATION CONTROLS (Form fields)
      // ----------------------------------------------------
      if (e.key === "Escape") {
        // Broadcast globally to close any active modal
        window.dispatchEvent(new CustomEvent("erp-shortcut-escape", { detail: e }));
      }

      if (e.key === "Enter" && e.ctrlKey) {
        // Ctrl + Enter: Save form globally
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-save-form", { detail: e }));
        return;
      }

      // Global Command Palette (Ctrl + K) is handled in the palette component directly, 
      // but let's register / search everywhere key
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-search-everywhere"));
        return;
      }

      // ----------------------------------------------------
      // MULTI-KEY SEQUENCE DETECTOR (Alt + G + key, Alt + R + key, Alt + A + key)
      // ----------------------------------------------------
      if (e.altKey && e.code === "KeyG") {
        sequenceState.current = { prefix: "ALT_G", timestamp: now };
        toast.info("GST command sequence started... Press 1, 3, S, E, R, H, or V", { duration: 1500 });
        return;
      }
      if (e.altKey && e.code === "KeyR") {
        sequenceState.current = { prefix: "ALT_R", timestamp: now };
        toast.info("Report command sequence started... Press S, P, G, I, or C", { duration: 1500 });
        return;
      }
      if (e.altKey && e.code === "KeyA") {
        sequenceState.current = { prefix: "ALT_A", timestamp: now };
        toast.info("HRMS Attendance sequence started... Press T", { duration: 1500 });
        return;
      }

      // If sequence prefix is active, check the key
      if (sequenceState.current.prefix) {
        const prefix = sequenceState.current.prefix;
        const key = e.key.toUpperCase();
        sequenceState.current = { prefix: null, timestamp: 0 }; // Consume sequence

        if (prefix === "ALT_G") {
          e.preventDefault();
          switch (key) {
            case "1":
              navigate("/gst-filing?tab=gstr1");
              toast.success("Navigating to GSTR-1 Generator");
              return;
            case "3":
              navigate("/gst-filing?tab=gstr3b");
              toast.success("Navigating to GSTR-3B Generator");
              return;
            case "S":
              navigate("/gst-filing?tab=summary");
              toast.success("Navigating to GST Summary");
              return;
            case "E":
              navigate("/gst-filing?action=export");
              window.dispatchEvent(new CustomEvent("erp-gst-export"));
              toast.success("Triggering GST CSV Export");
              return;
            case "R":
              navigate("/gst-filing?tab=reconciliation");
              toast.success("Navigating to GST Reconciliation");
              return;
            case "H":
              navigate("/gst-filing?tab=hsn");
              toast.success("Navigating to HSN Summary");
              return;
            case "V":
              navigate("/gst-filing?action=validate");
              toast.success("Navigating to Validate GSTIN");
              return;
            default:
              toast.error(`Unknown GST action: Alt + G + ${key}`);
              break;
          }
        }

        if (prefix === "ALT_R") {
          e.preventDefault();
          switch (key) {
            case "S":
              navigate("/reports?tab=sales");
              toast.success("Navigating to Sales Report");
              return;
            case "P":
              navigate("/reports?tab=purchases");
              toast.success("Navigating to Purchase Report");
              return;
            case "G":
              navigate("/reports?tab=gst");
              toast.success("Navigating to GST Report");
              return;
            case "I":
              navigate("/reports?tab=inventory");
              toast.success("Navigating to Inventory Report");
              return;
            case "C":
              navigate("/reports?tab=customers");
              toast.success("Navigating to Customer Report");
              return;
            default:
              toast.error(`Unknown Report action: Alt + R + ${key}`);
              break;
          }
        }

        if (prefix === "ALT_A") {
          if (key === "T") {
            e.preventDefault();
            navigate("/hrms?tab=attendance");
            toast.success("Navigating to HRMS Attendance Panel");
            return;
          }
        }
      }

      // ----------------------------------------------------
      // CONTEXT-AWARE & CONFLICT-AWARE DEFAULTS
      // ----------------------------------------------------
      
      // If we are on POS page, bypass all global overrides that are handled locally by POS
      // (F1-F10, Enter, Ctrl+Enter, Delete)
      if (isPOS) {
        // Allow F1-F10, Enter, Delete, Escape, space to pass through
        const posSpecificKeys = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "Enter", "Delete"];
        if (posSpecificKeys.includes(e.key) || (e.key === "Enter" && e.ctrlKey)) {
          // Let the POS component handle it natively
          return;
        }
      }

      // Global Navigation / Action Hotkeys (Works directly anywhere!)
      // Removed isTyping restriction so shortcuts work universally as requested
      if (true) {
        // Theme Switch (Alt + T)
        if (e.altKey && e.code === "KeyT") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("erp-shortcut-theme"));
          toast.success("Switching Theme...");
          return;
        }

        // Add Customer: Ctrl + Shift + C
        if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
          e.preventDefault();
          navigate("/customers?action=new");
          toast.success("Opening New Customer Wizard");
          return;
        }

        // Add Product: Ctrl + Shift + A
        if (e.ctrlKey && e.shiftKey && e.code === "KeyA") {
          e.preventDefault();
          navigate("/inventory?action=new");
          toast.success("Opening Add Product Panel");
          return;
        }

        // Add Stock: Ctrl + Shift + S
        if (e.ctrlKey && e.shiftKey && e.code === "KeyS") {
          e.preventDefault();
          navigate("/inventory?action=add-stock");
          toast.success("Opening Stock Intake Form");
          return;
        }

        // Import Inventory: Ctrl + Shift + I
        if (e.ctrlKey && e.shiftKey && e.code === "KeyI") {
          e.preventDefault();
          navigate("/inventory-sync");
          toast.success("Opening Import Inventory Panel");
          return;
        }

        // Add Employee: Ctrl + Shift + E
        if (e.ctrlKey && e.shiftKey && e.code === "KeyE") {
          e.preventDefault();
          navigate("/hrms?action=new-employee");
          toast.success("Opening Add Employee Panel");
          return;
        }

        // Employee Search: Ctrl + Shift + F
        if (e.ctrlKey && e.shiftKey && e.code === "KeyF") {
          e.preventDefault();
          navigate("/hrms?tab=employees&search=true");
          toast.success("Opening Employee Search Directory");
          return;
        }

        // Open POS / Open Payroll / Profit & Loss: Ctrl + Shift + P (Contextual)
        if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
          e.preventDefault();
          if (path.startsWith("/hrms")) {
            navigate("/hrms?tab=payroll");
            toast.success("Opening Payroll Panel");
          } else if (path.startsWith("/accounting")) {
            navigate("/accounting?tab=profit-loss");
            toast.success("Opening Profit & Loss Statement");
          } else {
            navigate("/pos");
            toast.success("Opening Point of Sale (POS)");
          }
          return;
        }

        // New Invoice (Ctrl + I)
        if (e.ctrlKey && e.code === "KeyI") {
          e.preventDefault();
          navigate("/invoices?action=new");
          toast.success("Creating New Invoice");
          return;
        }

        // Stock Transfer: Ctrl + T
        if (e.ctrlKey && e.code === "KeyT") {
          e.preventDefault();
          navigate("/stock-transfer");
          toast.success("Opening Stock Transfer Panel");
          return;
        }

        // Warehouse View: Ctrl + W
        if (e.ctrlKey && e.code === "KeyW") {
          e.preventDefault();
          navigate("/warehouse");
          toast.success("Opening Warehouse View");
          return;
        }

        // Low Stock Report: Ctrl + L (in Inventory context, Ledger View inside Accounting)
        if (e.ctrlKey && e.code === "KeyL") {
          e.preventDefault();
          if (path.startsWith("/accounting")) {
            navigate("/accounting?tab=ledger");
            toast.success("Opening Accounting General Ledger");
          } else {
            navigate("/inventory?tab=low-stock");
            toast.success("Opening Low Stock Audit");
          }
          return;
        }

        // Barcode Generator: Ctrl + B
        if (e.ctrlKey && e.code === "KeyB") {
          e.preventDefault();
          if (path.startsWith("/accounting")) {
            navigate("/accounting?tab=balance-sheet");
            toast.success("Opening Balance Sheet");
          } else {
            navigate("/barcode");
            toast.success("Opening Barcode Generator");
          }
          return;
        }

        // Batch Update: Alt + B
        if (e.altKey && e.code === "KeyB") {
          e.preventDefault();
          navigate("/inventory?action=batch-update");
          toast.success("Opening Batch Inventory Updates");
          return;
        }

        // Leave Approval: Alt + L
        if (e.altKey && e.code === "KeyL") {
          e.preventDefault();
          navigate("/hrms?tab=leaves");
          toast.success("Opening Leave Approvals Dashboard");
          return;
        }

        // Salary Run / Salary Panel: Alt + S
        if (e.altKey && e.code === "KeyS") {
          e.preventDefault();
          navigate("/hrms?action=salary-run");
          toast.success("Opening Payroll Run");
          return;
        }

        // Shift Planner: Alt + Shift + S
        if (e.altKey && e.shiftKey && e.code === "KeyS") {
          e.preventDefault();
          navigate("/hrms?tab=shifts");
          toast.success("Opening Employee Shift Planner");
          return;
        }

        // Journal Entry: Ctrl + J
        if (e.ctrlKey && e.code === "KeyJ") {
          e.preventDefault();
          navigate("/accounting?tab=journal");
          toast.success("Opening Double Entry Journal");
          return;
        }

        // Trial Balance: Ctrl + T
        if (e.ctrlKey && e.code === "KeyT" && !e.shiftKey) {
          e.preventDefault();
          navigate("/accounting?tab=trial");
          toast.success("Opening Trial Balance");
          return;
        }

        // Reconcile Bank: Ctrl + R
        if (e.ctrlKey && e.code === "KeyR" && !e.shiftKey) {
          e.preventDefault();
          navigate("/accounting?action=reconcile");
          toast.success("Opening Bank Reconciliation Center");
          return;
        }

        // Expense Entry: Ctrl + X
        if (e.ctrlKey && e.code === "KeyX") {
          e.preventDefault();
          navigate("/expenses?action=new");
          toast.success("Opening Add Expense Modal");
          return;
        }

        // Export Excel: Ctrl + Shift + E
        if (e.ctrlKey && e.shiftKey && e.code === "KeyE") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("erp-shortcut-export-excel"));
          toast.success("Initiating General Excel Export");
          return;
        }

        // Open Settings: Ctrl + ,
        if (e.ctrlKey && e.code === "Comma") {
          e.preventDefault();
          navigate("/settings");
          toast.success("Opening General Settings");
          return;
        }

        // User Management: Ctrl + U
        if (e.ctrlKey && e.code === "KeyU") {
          e.preventDefault();
          navigate("/settings/users");
          toast.success("Opening User Management Panel");
          return;
        }

        // Role Permissions: Ctrl + Shift + R
        if (e.ctrlKey && e.shiftKey && e.code === "KeyR") {
          e.preventDefault();
          navigate("/settings/permissions");
          toast.success("Opening Role Permissions Matrix");
          return;
        }

        // Audit Logs: Ctrl + Shift + L
        if (e.ctrlKey && e.shiftKey && e.code === "KeyL") {
          e.preventDefault();
          navigate("/audit-logs");
          toast.success("Opening Audit & Activity Logs");
          return;
        }

        // API Settings: Ctrl + Shift + Y
        if (e.ctrlKey && e.shiftKey && e.code === "KeyY") {
          e.preventDefault();
          navigate("/settings?tab=api");
          toast.success("Opening API Configurations");
          return;
        }
      }

      // ----------------------------------------------------
      // PAGE-LEVEL EVENT BROADCASTS (Ctrl+S, Ctrl+P, Alt+D, Delete, Ctrl+D, Ctrl+F, Ctrl+E, Ctrl+Shift+M)
      // These run always when targeted, but let the page intercept them via listeners.
      // ----------------------------------------------------
      
      // Save Form / Invoice (Ctrl + S)
      if (e.ctrlKey && e.code === "KeyS" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-save", { detail: e }));
        return;
      }

      // Print Invoice / Bill (Ctrl + P)
      if (e.ctrlKey && e.code === "KeyP" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-print", { detail: e }));
        return;
      }

      // Apply Discount (Alt + D)
      if (e.altKey && e.code === "KeyD") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-discount", { detail: e }));
        return;
      }

      // Delete Selected Item (Delete)
      if (e.code === "Delete") {
        window.dispatchEvent(new CustomEvent("erp-shortcut-delete", { detail: e }));
        return;
      }

      // Duplicate Document / Invoice (Ctrl + D)
      if (e.ctrlKey && e.code === "KeyD" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-duplicate", { detail: e }));
        return;
      }

      // Search inside Invoice / Contextual (Ctrl + F)
      if (e.ctrlKey && e.code === "KeyF" && !e.shiftKey) {
        // Only override if active element is not an input (to allow standard browser search in basic text pages,
        // or let ERP pages capture it)
        if (!isTyping || isPOS) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("erp-shortcut-search", { detail: e }));
        }
        return;
      }

      // Export Document as PDF (Ctrl + E)
      if (e.ctrlKey && e.code === "KeyE" && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-export-pdf", { detail: e }));
        return;
      }

      // Add Payment (Ctrl + Shift + M)
      if (e.ctrlKey && e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-add-payment", { detail: e }));
        return;
      }

      // Generate Credit Note (Ctrl + Shift + R)
      if (e.ctrlKey && e.shiftKey && e.code === "KeyR") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("erp-shortcut-credit-note", { detail: e }));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
    };
  }, [navigate, location]);
}
