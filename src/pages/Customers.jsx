import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, INDIAN_STATES } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Users, Edit, Trash2, Phone, Mail, Filter, X, FileText, Calendar, DollarSign, CheckCircle2, BookOpen, Eye, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLanguage } from "@/lib/LanguageContext";
import { accountingService } from "@/modules/accounting/accountingService";
import InvoicePrintPreview from "@/components/invoices/InvoicePrintPreview";

function CustomerForm({ open, onOpenChange, customer, onSave }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: customer?.name || "",
    contact_person: customer?.contact_person || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    gstin: customer?.gstin || "",
    address: customer?.address || "",
    city: customer?.city || "",
    state: customer?.state || "",
    pincode: customer?.pincode || "",
    credit_limit: customer?.credit_limit || 0,
    category: customer?.category || "Retail",
    status: customer?.status || "Active",
    notes: customer?.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader><DialogTitle className="font-black">{customer ? t("customers.edit") : t("customers.add")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-[11px]">{t("customers.business_name")} *</Label><Input placeholder={t("customers.business_name")} value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label className="text-[11px]">{t("customers.contact_person")}</Label><Input placeholder="Mr. Ramesh Kumar" value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">{t("common.phone")}</Label><Input placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div><Label className="text-[11px]">{t("common.email")}</Label><Input placeholder="email@example.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div><Label className="text-[11px]">{t("customers.gstin")}</Label><Input placeholder="15-char GSTIN" value={form.gstin} onChange={e => set("gstin", e.target.value)} /></div>
          <div><Label className="text-[11px]">{t("customers.address")}</Label><Input placeholder="Shop No, Street" value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px]">{t("customers.city")}</Label><Input placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} /></div>
            <div>
              <Label className="text-[11px]">{t("customers.state")}</Label>
              <SearchableSelect
                options={INDIAN_STATES}
                value={form.state}
                onValueChange={v => set("state", v)}
                placeholder={t("customers.state")}
                searchPlaceholder={t("common.search")}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-[11px]">{t("customers.pincode")}</Label><Input placeholder="110001" value={form.pincode} onChange={e => set("pincode", e.target.value)} /></div>
            <div><Label className="text-[11px]">{t("customers.credit_limit")} ₹</Label><Input type="number" value={form.credit_limit} onChange={e => set("credit_limit", Number(e.target.value))} /></div>
            <div>
              <Label className="text-[11px]">{t("customers.category")}</Label>
              <SearchableSelect
                options={["Retail", "Wholesale", "Distributor", "Other"]}
                value={form.category}
                onValueChange={v => set("category", v)}
                placeholder={t("customers.category")}
                searchPlaceholder={t("common.search")}
              />
            </div>
          </div>
          {/* Status field */}
          <div>
            <Label className="text-[11px]">Status</Label>
            <div className="flex gap-2 mt-1">
              {["Active", "Inactive"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                    form.status === s
                      ? s === "Active"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                        : "bg-destructive/15 text-destructive border-destructive/40"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {s === "Active" ? "🟢 Active" : "🔴 Inactive"}
                </button>
              ))}
            </div>
          </div>
          <div><Label className="text-[11px]">{t("customers.notes")}</Label><Input placeholder="..." value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button className="gold-gradient text-black font-bold" onClick={() => onSave(form)} disabled={!form.name}>💾 {t("common.save")}</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};

  // Derive unique cities from data
  const uniqueCities = useMemo(() => {
    const cities = [...new Set(customers.map(c => c.city).filter(Boolean))].sort();
    return cities;
  }, [customers]);

  const handleSave = async (formData) => {
    if (editing) {
      await base44.entities.Customer.update(editing.id, formData);
      toast.success(t("customers.toast_updated"));
    } else {
      await base44.entities.Customer.create(formData);
      toast.success(t("customers.toast_added"));
    }
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("customers.delete_confirm"))) return;
    await base44.entities.Customer.delete(id);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    toast.success(t("customers.toast_deleted"));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return customers.filter(c => {
      const matchesSearch = !q ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q);
      const matchesCity = cityFilter === "all" || c.city === cityFilter;
      const matchesStatus = statusFilter === "all" || (c.status || "Active") === statusFilter;
      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [customers, search, cityFilter, statusFilter]);

  const hasActiveFilters = search.trim() || cityFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setCityFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">👥 {t("customers.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} {t("customers.title").toLowerCase()}</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {t("customers.add")}
        </Button>
      </div>

      {/* Smart Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by Name, Phone, GST No..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* City filter */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 min-w-[150px]">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full bg-transparent text-xs font-bold h-10 focus:outline-none cursor-pointer text-foreground"
          >
            <option value="all" className="bg-card">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city} className="bg-card">{city}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 min-w-[140px]">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-xs font-bold h-10 focus:outline-none cursor-pointer text-foreground"
          >
            <option value="all" className="bg-card">All Status</option>
            <option value="Active" className="bg-card">🟢 Active</option>
            <option value="Inactive" className="bg-card">🔴 Inactive</option>
          </select>
        </div>
      </div>

      {/* Results summary + clear */}
      <div className="flex items-center justify-between gap-3 text-[12px] flex-wrap">
        <span className="text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {customers.length} customers
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition font-semibold uppercase tracking-wide"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">
              {customers.length === 0 ? t("customers.no_customers") : "No customers match your filters"}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition font-semibold">
                Clear filters
              </button>
            )}
          </div>
        )}
        {filtered.map(c => {
          const isActive = (c.status || "Active") === "Active";
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-sm font-bold text-black shrink-0">
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[14px]">{c.name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{c.category || "Retail"}</Badge>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      }`}>
                        {isActive ? "● Active" : "● Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setSelectedLedgerCustomer(c)} className="p-1.5 rounded hover:bg-accent text-indigo-400" title="Ledger & Billing History">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-[12px] text-muted-foreground mt-3">
                {c.contact_person && <p className="flex items-center gap-1.5 text-foreground font-semibold">👤 {c.contact_person}</p>}
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
                {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {c.email}</p>}
                {c.city && <p>📍 {c.city}{c.state ? `, ${c.state}` : ""}</p>}
                {c.gstin && <p className="font-mono text-[11px]">{t("customers.gstin")}: {c.gstin}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex justify-between text-[12px]">
                <span className="text-muted-foreground">{t("reports.total_purchases")}</span>
                <span className="font-bold text-primary font-mono">{fmtINR(c.total_purchases || 0)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <CustomerForm open={showForm} onOpenChange={setShowForm} customer={editing} onSave={handleSave} />}
      {selectedLedgerCustomer && (
        <CustomerLedgerModal 
          open={!!selectedLedgerCustomer}
          onOpenChange={() => setSelectedLedgerCustomer(null)}
          customer={selectedLedgerCustomer}
          invoices={invoices}
          queryClient={queryClient}
          shopSettings={shopSettings}
        />
      )}
    </div>
  );
}

function CustomerLedgerModal({ open, onOpenChange, customer, invoices, queryClient, shopSettings }) {
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [recording, setRecording] = useState(false);
  const [previewInv, setPreviewInv] = useState(null);

  if (!customer) return null;

  // Filter invoices for this specific customer
  const customerInvoices = invoices.filter(inv => 
    inv.customer_id === customer.id || 
    (inv.customer_phone && inv.customer_phone === customer.phone)
  );

  // Math helper
  const getPaidAmount = (inv) => {
    if (inv.paid_amount !== undefined && inv.paid_amount !== null) return Number(inv.paid_amount);
    if (inv.status === "paid") return Number(inv.grand_total || 0);
    return 0;
  };

  const totalPurchases = customerInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + getPaidAmount(inv), 0);
  const outstandingDue = Math.max(0, totalPurchases - totalPaid);

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment || !paymentAmount || Number(paymentAmount) <= 0) return;
    
    const amt = Number(paymentAmount);
    const inv = selectedInvoiceForPayment;
    const currentPaid = getPaidAmount(inv);
    const newPaid = Number((currentPaid + amt).toFixed(2));
    const grandTotal = Number((inv.grand_total || 0).toFixed(2));
    const newStatus = newPaid >= grandTotal ? "paid" : "partial";

    setRecording(true);
    const loadingToast = toast.loading("Recording customer payment...");
    try {
      // 1. Update invoice in Firestore
      await base44.entities.Invoice.update(inv.id, {
        paid_amount: newPaid,
        status: newStatus
      });

      // 2. Post Journal Entry to Accounting ledger (Double Entry)
      const paymentPayload = {
        date: new Date().toISOString().split("T")[0],
        reference_no: `PAY-${inv.invoice_number}`,
        description: `Payment received from customer ${customer.name} for Invoice ${inv.invoice_number}`,
        lines: [
          {
            accountName: paymentMode === "Cash" ? "Cash in Hand" : "HDFC Bank A/c",
            debit: amt,
            credit: 0,
            narration: `Payment received`
          },
          {
            accountName: "Accounts Receivable (Sundry Debtors)",
            debit: 0,
            credit: amt,
            narration: `Credit for invoice payment`
          }
        ]
      };
      await accountingService.createJournalEntry(paymentPayload);

      toast.success("Payment recorded successfully!");
      setSelectedInvoiceForPayment(null);
      setPaymentAmount("");
      
      // Invalidate queries so all totals on the page recalculate instantly
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to record payment: " + err.message);
    } finally {
      toast.dismiss(loadingToast);
      setRecording(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[95vw] md:w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-sidebar-border bg-card shrink-0 sticky top-0 z-20 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              🧾 {customer.name} - Billing History & Ledger
            </DialogTitle>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Clearance: Customer profile summary and double-entry payments alignment ledger.
            </p>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 min-h-0 scrollbar-thin">
          
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-secondary/40 border border-border rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Total Sales Invoiced</span>
              <span className="text-xl font-mono font-black text-foreground mt-2">{fmtINR(totalPurchases)}</span>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Total Amount Paid</span>
              <span className="text-xl font-mono font-black text-emerald-400 mt-2">{fmtINR(totalPaid)}</span>
            </div>
            <div className={`border rounded-xl p-4 flex flex-col justify-between ${outstandingDue > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-secondary/40 border-border"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Outstanding Dues</span>
                {outstandingDue > 0 ? (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[9px] px-1.5 py-0">⚠️ UNPAID BALANCE</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px] px-1.5 py-0">✅ FULLY PAID</Badge>
                )}
              </div>
              <span className={`text-xl font-mono font-black mt-2 ${outstandingDue > 0 ? "text-amber-500" : "text-foreground"}`}>{fmtINR(outstandingDue)}</span>
            </div>
          </div>

          {/* Record payment card if active */}
          {selectedInvoiceForPayment && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3 animate-fade-down">
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                <span className="font-extrabold text-[12px] text-indigo-400">💳 Record Customer Payment for {selectedInvoiceForPayment.invoice_number}</span>
                <button onClick={() => { setSelectedInvoiceForPayment(null); setPaymentAmount(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleRecordPaymentSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <Label className="text-[10px] font-bold text-slate-400">Payment Amount (₹)</Label>
                  <Input 
                    type="number" 
                    step="any"
                    min={0.01} 
                    max={Number((selectedInvoiceForPayment.grand_total - getPaidAmount(selectedInvoiceForPayment)).toFixed(2))}
                    placeholder="Enter amount" 
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)} 
                    required 
                    className="h-9 mt-1" 
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                    Max Due: {fmtINR(selectedInvoiceForPayment.grand_total - getPaidAmount(selectedInvoiceForPayment))}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-400">Payment Method</Label>
                  <select 
                    value={paymentMode} 
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg text-xs h-9 px-3 mt-1 focus:outline-none cursor-pointer text-foreground"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="UPI">UPI/Digital</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={recording} className="gold-gradient text-black font-extrabold h-9 flex-1 text-xs">
                    Confirm Payment
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setSelectedInvoiceForPayment(null); setPaymentAmount(""); }} className="h-9 text-xs">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Ledger Invoice List Table */}
          <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-black text-[13px] text-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Complete Transaction History
            </h3>
            
            {customerInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-1">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-35" />
                <p className="text-sm font-semibold">No invoices generated yet</p>
                <p className="text-[11px] opacity-60">Transactions will appear here when POS or standard billing documents are logged.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="px-2 py-2.5 text-left font-bold whitespace-nowrap">Invoice #</th>
                      <th className="px-2 py-2.5 text-left font-bold whitespace-nowrap">Date</th>
                      <th className="px-2 py-2.5 text-right font-bold whitespace-nowrap">Total Bill</th>
                      <th className="px-2 py-2.5 text-right font-bold whitespace-nowrap">Paid</th>
                      <th className="px-2 py-2.5 text-right font-bold whitespace-nowrap">Due Balance</th>
                      <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap">Status</th>
                      <th className="px-2 py-2.5 text-center font-bold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date)).map(inv => {
                      const paid = getPaidAmount(inv);
                      const due = Math.max(0, inv.grand_total - paid);
                      const isFullyPaid = due === 0;
                      
                      return (
                        <tr key={inv.id} className="border-b border-border/30 hover:bg-slate-500/5 transition-colors">
                          <td className="px-2 py-3 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                          <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{inv.date || inv.created_date?.split("T")[0] || "N/A"}</td>
                          <td className="px-2 py-3 text-right font-bold text-foreground">{fmtINR(inv.grand_total)}</td>
                          <td className="px-2 py-3 text-right font-bold text-emerald-400">{fmtINR(paid)}</td>
                          <td className={`px-2 py-3 text-right font-bold ${due > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{fmtINR(due)}</td>
                          <td className="px-2 py-3 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isFullyPaid 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {isFullyPaid ? "PAID" : "DUE"}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center shrink-0 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button size="xs" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setPreviewInv(inv)}>
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>
                              {!isFullyPaid && (
                                <Button 
                                  size="xs" 
                                  className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold" 
                                  onClick={() => { 
                                    setSelectedInvoiceForPayment(inv); 
                                    setPaymentAmount(due.toFixed(2)); 
                                  }}
                                >
                                  💳 Pay Dues
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-card shrink-0 sticky bottom-0 z-20 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10 rounded-lg text-xs font-bold">
            Close Ledger
          </Button>
        </div>
      </DialogContent>

      {previewInv && (
        <InvoicePrintPreview
          open={!!previewInv}
          onOpenChange={() => setPreviewInv(null)}
          invoice={previewInv}
          shopSettings={shopSettings}
        />
      )}
    </Dialog>
  );
}
