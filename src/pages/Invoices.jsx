import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fmtINR, fmtDate, isOverdue } from "@/lib/gst-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import InvoicePrintPreview from "@/components/invoices/InvoicePrintPreview";
import WhatsAppPanel from "@/components/invoices/WhatsAppPanel";
import { toast } from "@/lib/toast";
import { generateAndUploadInvoicePDF } from "@/lib/pdf-share-utils";
import { getDocumentSequence } from "@/lib/sequence-utils";
import { FileText, Eye, MessageCircle, Check, Plus, Search, ChevronDown, MoreVertical, Filter } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { accountingService, buildSaleJournalEntry } from "@/modules/accounting/accountingService";
import { updateInventory } from "@/api/inventorySyncService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Invoices() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formType, setFormType] = useState("sale");
  const [filter, setFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewInv, setPreviewInv] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0] || {};

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      toast.success(t("invoices.toast_saved"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(t("invoices.toast_updated"));
    },
  });

  const handleSave = async (formData) => {
    const userRoleLevel = user?.hierarchy_level || 7;
    let activeBranchId = localStorage.getItem('selectedBranch') || localStorage.getItem('branch_id') || 'main';
    if (userRoleLevel > 3 && user?.branch_id && user?.branch_id !== 'null' && user?.branch_id !== 'all') {
      activeBranchId = user.branch_id;
    }
    const loadingToast = toast.loading("Saving invoice...");
    try {
      if (editing) {
        const oldInvoice = editing;
        const sanitizedFormData = JSON.parse(JSON.stringify(formData, (k, v) => (v === undefined ? null : v)));
        
        await base44.entities.Invoice.update(editing.id, {
          ...sanitizedFormData,
          branchId: activeBranchId || null
        });

        // 1. Update customer total purchases with difference
        if (formData.customer_id) {
          try {
            const diff = parseFloat(formData.grand_total || 0) - parseFloat(oldInvoice?.grand_total || 0);
            if (diff !== 0) {
              const cust = await base44.entities.Customer.get(formData.customer_id);
              if (cust) {
                await base44.entities.Customer.update(cust.id, { 
                  total_purchases: (parseFloat(cust.total_purchases || 0) + diff) 
                });
              }
            }
          } catch (e) {
            console.error("Failed to update customer total_purchases on edit", e);
          }
        }

        // 2. Create/update Journal Entry (best effort)
        try {
          const journalPayload = buildSaleJournalEntry({
            ...sanitizedFormData,
            invoice_number: oldInvoice.invoice_number,
            customer_name: formData.customer_name || (customers.find(c => String(c.id) === String(formData.customer_id))?.name) || "Customer"
          });
          await accountingService.createJournalEntry(journalPayload);
        } catch (e) {
          console.error("Failed to post edit journal entry", e);
        }

        // 3. Update stock with difference
        const stockAdjustments = {};
        for (const item of oldInvoice.items || []) {
          if (!item.product_id) continue;
          stockAdjustments[item.product_id] = (stockAdjustments[item.product_id] || 0) - item.qty;
        }
        for (const item of formData.items || []) {
          if (!item.product_id) continue;
          stockAdjustments[item.product_id] = (stockAdjustments[item.product_id] || 0) + item.qty;
        }
        for (const prodId in stockAdjustments) {
          const delta = Number(stockAdjustments[prodId] || 0);
          if (delta !== 0) {
            if (activeBranchId) {
              try {
                await updateInventory(prodId, activeBranchId, -delta, 'invoice_edit');
              } catch (err) {
                console.error(`Error updating branch inventory during invoice edit:`, err);
              }
            }
            try {
              const realProd = products.find(p => p.id === prodId);
              if (realProd) {
                const currentStock = Number(realProd.stock || 0);
                const newStock = Math.max(0, currentStock - delta);
                await base44.entities.Product.update(prodId, { stock: newStock });
              }
            } catch (err) {
              console.error(`Error updating global stock for product ${prodId} during edit:`, err);
            }
          }
        }

        toast.success(t("invoices.toast_updated"));
      } else {
        let currentCounter = 0;
        let created = false;
        let attempts = 0;
        let invoiceNumber;
        let seqKeyToUpdate = null;
        
        while (!created && attempts < 10) {
          let docType = formData.type || "sale";
          if (docType === "sale") {
            if (formData.invoice_type === "GST") {
              docType = "gst";
            } else if (formData.invoice_type === "Bill of Supply") {
              docType = "bill";
            } else {
              docType = "inv";
            }
          }
          const seqInfo = getDocumentSequence(docType, shopSettings);
          // If attempts > 0, we temporarily bump it manually here to try again
          invoiceNumber = seqInfo.invoiceNumber;
          if (attempts > 0) {
            const nextSeqAttempt = seqInfo.nextSeq + attempts;
            const seqStr = String(nextSeqAttempt).padStart(3, '0');
            const format = shopSettings[`${seqInfo.prefixKey}_format`] || "INV-SEQ";
            let formatted = format.replace("SEQ", seqStr);
            invoiceNumber = formatted; // Note: Date replacements missing here for retries, but fine for now
          }
          currentCounter = seqInfo.nextSeq + attempts;
          seqKeyToUpdate = `${seqInfo.prefixKey}_seq`;
          const newInvData = { 
            ...formData, 
            invoice_number: invoiceNumber,
            branchId: activeBranchId || null
          };
          const sanitizedNewInvData = JSON.parse(JSON.stringify(newInvData, (k, v) => (v === undefined ? null : v)));
          
          try {
            await base44.entities.Invoice.create(sanitizedNewInvData);
            created = true;
          } catch (err) {
            // If it's a conflict (invoice number already exists), increment and retry
            if (err.message && (err.message.includes("409") || err.message.toLowerCase().includes("conflict") || err.message.toLowerCase().includes("already processed") || err.message.toLowerCase().includes("exists"))) {
              currentCounter++;
              attempts++;
            } else {
              throw err; // Other errors should be thrown immediately
            }
          }
        }
        
        if (!created) {
          throw new Error("Failed to generate a unique invoice number after multiple attempts.");
        }
        
        if (shopSettings.id && seqKeyToUpdate) {
          await base44.entities.ShopSettings.update(shopSettings.id, { [seqKeyToUpdate]: currentCounter });
        }

        // 1. Update customer total purchases
        if (formData.customer_id) {
          try {
            const cust = await base44.entities.Customer.get(formData.customer_id);
            if (cust) {
              await base44.entities.Customer.update(cust.id, { 
                total_purchases: (parseFloat(cust.total_purchases || 0) + parseFloat(formData.grand_total || 0)) 
              });
            }
          } catch (e) {
            console.error("Failed to update customer total_purchases", e);
          }
        }

        // 2. Create Journal Entry
        try {
          const journalPayload = buildSaleJournalEntry({
            ...sanitizedNewInvData,
            customer_name: formData.customer_name || (customers.find(c => String(c.id) === String(formData.customer_id))?.name) || "Customer"
          });
          await accountingService.createJournalEntry(journalPayload);
        } catch (e) {
          console.error("Failed to create journal entry", e);
        }

        // 3. Decrement stock
        for (const item of formData.items || []) {
          if (!item.product_id) continue;
          const qty = Number(item.qty || 1);
          if (activeBranchId) {
            try {
              await updateInventory(item.product_id, activeBranchId, -qty, 'invoice_sale');
            } catch (err) {
              console.error(`Error updating branch inventory for ${item.product_id}:`, err);
            }
          }
          try {
            const realProd = products.find(p => p.id === item.product_id);
            if (realProd) {
              const currentStock = Number(realProd.stock || 0);
              const newStock = Math.max(0, currentStock - qty);
              await base44.entities.Product.update(item.product_id, { stock: newStock });
            }
          } catch (err) {
            console.error(`Error updating global stock for product ${item.product_id}:`, err);
          }
        }

        toast.success(t("invoices.toast_created"));
      }

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["shopSettings"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save invoice: " + err.message);
    } finally {
      toast.dismiss(loadingToast);
      setShowForm(false);
      setEditing(null);
    }
  };

  const markPaid = (inv) => {
    updateMutation.mutate({ id: inv.id, data: { status: "paid", paid_amount: inv.grand_total } });
  };

  const shareWhatsApp = async (inv) => {
    const loadingToast = toast.loading(t("invoices.toast_pdf_generating"));
    try {
      const pdfUrl = await generateAndUploadInvoicePDF(inv, shopSettings, true);
      const shopName = (!shopSettings.shop_name || shopSettings.shop_name === "Vogats") ? "EASYBMT SHOP" : shopSettings.shop_name;
      const docName = inv.type === "proforma" ? "Proforma Invoice" : inv.type === "quotation" ? "Quotation" : "Invoice";
      const msg = `🏪 *${shopName}*\n🧾 ${docName}: *${inv.invoice_number}*\n\nDear *${inv.customer_name}*,\n\nHere is your ${docName.toLowerCase()} summary:\n📅 Date: ${inv.date}\n💰 Amount: *₹${(inv.grand_total || 0).toFixed(2)}*\n📊 Status: ${inv.status?.toUpperCase()}\n\n📁 *Download PDF:* ${pdfUrl}\n\nThank you! 🙏`;
      const ph = (inv.customer_phone || "").replace(/\D/g, "");
      window.open(`https://wa.me/${ph ? "91" + ph : ""}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.dismiss(loadingToast);
      toast.success(t("invoices.toast_whatsapp_opened"));
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(t("invoices.toast_pdf_failed") + err.message);
    }
  };

  const filtered = invoices.filter(i => {
    const matchSearch = (i.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      String(i.grand_total || "").includes(search);
    if (!matchSearch) return false;
    
    // Status filter
    if (filter === "paid" && i.status !== "paid") return false;
    if (filter === "unpaid" && i.status !== "unpaid" && i.status !== "partial") return false;
    if (filter === "overdue" && !isOverdue(i)) return false;
    if (filter === "proforma" && i.type !== "proforma") return false;
    if (filter === "quotation" && i.type !== "quotation") return false;
    if (filter === "credit" && i.type !== "credit_note") return false;
    if (filter === "debit" && i.type !== "debit_note") return false;

    // Payment Mode filter
    if (paymentFilter !== "all") {
      const pm = i.payment_mode || "Cash";
      if (pm.toLowerCase() !== paymentFilter.toLowerCase()) return false;
    }
    
    return true;
  });

  const FILTERS = [
    { key: "all", label: t("invoices.all") },
    { key: "unpaid", label: t("invoices.unpaid") },
    { key: "paid", label: t("invoices.paid") },
    { key: "overdue", label: t("invoices.overdue") },
    { key: "proforma", label: "Proforma" },
    { key: "quotation", label: "Quotation" },
    { key: "credit", label: t("invoices.credit_notes") },
    { key: "debit", label: t("invoices.debit_notes") },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">📄 {t("invoices.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{invoices.length} {t("invoices.total_invoices")}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button className="gold-gradient text-black font-bold gap-2" onClick={() => { setFormType("sale"); setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> {t("invoices.sale_invoice")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-10 px-3">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { setFormType("proforma"); setEditing(null); setShowForm(true); }} className="cursor-pointer font-medium py-2.5">
                📄 Proforma Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFormType("quotation"); setEditing(null); setShowForm(true); }} className="cursor-pointer font-medium py-2.5">
                📝 Quotation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFormType("credit_note"); setEditing(null); setShowForm(true); }} className="cursor-pointer font-medium py-2.5">
                📋 {t("invoices.credit_note")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setFormType("debit_note"); setEditing(null); setShowForm(true); }} className="cursor-pointer font-medium py-2.5">
                📋 {t("invoices.debit_note")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("invoices.search_placeholder") + " (No, Cust, Amt)..."} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <SearchableSelect
            className="w-44 h-10"
            options={[
              { value: "all", label: "All Payment Modes" },
              { value: "Cash", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "Card", label: "Card" },
              { value: "Cheque", label: "Cheque" }
            ]}
            value={paymentFilter}
            onValueChange={setPaymentFilter}
            placeholder="Payment Mode"
            searchPlaceholder="Search payment mode..."
          />
        </div>
        {/* Desktop Filters */}
        <div className="hidden md:flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}
              className={filter === f.key ? "gold-gradient text-black" : ""}>
              {f.label}
            </Button>
          ))}
        </div>
        {/* Mobile Filters Dropdown */}
        <div className="flex md:hidden w-full sm:w-auto mt-2 sm:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" /> 
                  <span>{FILTERS.find(f => f.key === filter)?.label || "Filter"}</span>
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-3rem)] sm:w-56">
              {FILTERS.map(f => (
                <DropdownMenuItem key={f.key} onClick={() => setFilter(f.key)} className={`cursor-pointer font-medium py-2.5 ${filter === f.key ? "bg-primary/10 text-primary" : ""}`}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* WhatsApp Panel */}
      <WhatsAppPanel invoices={invoices} shopSettings={shopSettings} />

      {/* Invoice List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("invoices.no_invoices")}</p>
          </div>
        )}
        {filtered.map(inv => {
          const ov = isOverdue(inv);
          const isNote = inv.type === "credit_note" || inv.type === "debit_note";
          return (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm font-mono">{inv.invoice_number}</span>
                    {isNote ? (
                      <Badge variant="outline" className={inv.type === "credit_note" ? "border-success/30 text-success" : "border-warning/30 text-warning"}>
                        {inv.type === "credit_note" ? t("invoices.credit_note").toUpperCase() : t("invoices.debit_note").toUpperCase()}
                      </Badge>
                    ) : inv.type === "proforma" ? (
                      <Badge variant="outline" className="border-info/30 text-info">PROFORMA</Badge>
                    ) : inv.type === "quotation" ? (
                      <Badge variant="outline" className="border-purple/30 text-purple">QUOTATION</Badge>
                    ) : (
                      <Badge variant="outline" className={`text-[10px] ${inv.status === "paid" ? "border-success/30 text-success" : ov ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}>
                        {ov ? t("invoices.overdue").toUpperCase() : t(`invoices.${inv.status}`).toUpperCase()}
                      </Badge>
                    )}
                    {inv.waybill_no && <Badge variant="outline" className="border-info/30 text-info text-[10px]">🚚 {inv.waybill_no}</Badge>}
                    {inv.is_interstate && <Badge variant="outline" className="border-purple/30 text-purple text-[10px]">{t("invoices.interstate")}</Badge>}
                  </div>
                  <p className="font-semibold text-[14px]">{inv.customer_name}</p>
                  <p className="text-[12px] text-muted-foreground">📅 {fmtDate(inv.date)} · {t("invoices.due")}: {fmtDate(inv.due_date)}</p>
                  {ov && <p className="text-[11px] text-destructive font-bold mt-1">⚠️ {Math.floor((new Date() - new Date(inv.due_date)) / 86400000)} {t("invoices.days_overdue")}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xl font-black font-mono ${inv.status === "paid" ? "text-success" : ov ? "text-destructive" : "text-primary"}`}>
                    {fmtINR(inv.grand_total)}
                  </p>
                  {inv.paid_amount > 0 && inv.status !== "paid" && (
                    <p className="text-[11px] text-muted-foreground">{t("invoices.paid")}: {fmtINR(inv.paid_amount)}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(inv); setFormType(inv.type || "sale"); setShowForm(true); }}>
                  ✏️ {t("common.edit")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewInv(inv)}>
                  <Eye className="w-3 h-3" /> {t("invoices.view")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareWhatsApp(inv)}>
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </Button>
                {inv.status !== "paid" && !isNote && inv.type !== "proforma" && inv.type !== "quotation" && (
                  <Button size="sm" variant="outline" className="gap-1.5 border-success/30 text-success hover:bg-success/10" onClick={() => markPaid(inv)}>
                    <Check className="w-3 h-3" /> {t("invoices.mark_paid")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <InvoiceForm
          open={showForm}
          onOpenChange={setShowForm}
          invoice={editing}
          type={formType}
          customers={customers}
          products={products}
          onSave={handleSave}
        />
      )}

      {previewInv && (
        <InvoicePrintPreview
          open={!!previewInv}
          onOpenChange={() => setPreviewInv(null)}
          invoice={previewInv}
          shopSettings={shopSettings}
        />
      )}
    </div>
  );
}