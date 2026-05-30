import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoicePrintPreview from "./InvoicePrintPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES, GST_RATES, calcItems, numToWords, fmtINR, today, addDays } from "@/lib/gst-utils";
import { X, Search, Eye, Plus, Printer, Check, Download } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/lib/toast";
import { downloadInvoicePDF } from "@/lib/pdf-share-utils";
import { fetchGSTDetailsFromPortal } from "@/services/gst/gst-lookup";
import { getDocumentSequence } from "@/lib/sequence-utils";

export default function InvoiceForm({ open, onOpenChange, invoice, customers = [], products = [], onSave, type = "sale" }) {
  const queryClient = useQueryClient();
  const activeBranchId = localStorage.getItem('selectedBranch') || localStorage.getItem('branch_id') || 'main';
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Layout selection / states matching the ERP Screenshot
  const [billToType, setBillToType] = useState("Cash A/c"); // Cash A/c or Customer A/c
  const [invoiceType, setInvoiceType] = useState("GST"); // GST, Non-GST, Bill of Supply
  const [selectedParticular, setSelectedParticular] = useState({
    serial_no: "",
    product_id: "",
    name: "",
    desc: "",
    hsn: "",
    unit: "PCS",
    qty: 1,
    rate: 0,
    mrp: 0,
    discount_pct: 0,
    gst_rate: 18,
    cess_pct: 0,
    tag_type: "Item Tag", // Item Tag or Item Code
  });
  
  // Custom Checkboxes
  const [showAddlDiscount, setShowAddlDiscount] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [createPackingList, setCreatePackingList] = useState(false);
  const [createDeliveryChallan, setCreateDeliveryChallan] = useState(false);

  const [form, setForm] = useState({
    date: invoice?.date || today(),
    due_date: invoice?.due_date || addDays(today(), 15),
    customer_id: invoice?.customer_id || "",
    customer_name: invoice?.customer_name || "CASH",
    customer_phone: invoice?.customer_phone || "",
    customer_gstin: invoice?.customer_gstin || "",
    bill_address: invoice?.bill_address || "",
    bill_city: invoice?.bill_city || "",
    bill_pincode: invoice?.bill_pincode || "",
    ship_address: invoice?.ship_address || "",
    ship_city: invoice?.ship_city || "",
    ship_pincode: invoice?.ship_pincode || "",
    place_of_supply: invoice?.place_of_supply || "05-Uttarakhand", // default supply
    po_number: invoice?.po_number || "",
    status: invoice?.status || "unpaid",
    payment_mode: invoice?.payment_mode || "Cash",
    items: invoice?.items || [],
    discount: invoice?.discount || 0,
    paid_amount: invoice?.paid_amount || 0,
    notes: invoice?.notes || "",
    transport_mode: invoice?.transport_mode || "Road",
    transporter: invoice?.transporter || "",
    vehicle_no: invoice?.vehicle_no || "",
    lr_no: invoice?.lr_no || "",
    type: invoice?.type || type,
    
    // Extended ERP Fields
    sold_by: invoice?.sold_by || "",
    delivery_terms: invoice?.delivery_terms || "",
    remarks_private: invoice?.remarks_private || "",
    reference_no: invoice?.reference_no || "",
    shipping_charges: invoice?.shipping_charges || 0,
    additional_discount_amt: invoice?.additional_discount_amt || 0,

    // Dual Payment Slots
    payment1_date: invoice?.payment1_date || today(),
    payment1_mode: invoice?.payment1_mode || "Cash",
    payment1_txn_id: invoice?.payment1_txn_id || "",
    payment1_amount: invoice?.payment1_amount || 0,
    
    payment2_date: invoice?.payment2_date || today(),
    payment2_mode: invoice?.payment2_mode || "Cash",
    payment2_txn_id: invoice?.payment2_txn_id || "",
    payment2_amount: invoice?.payment2_amount || 0,
  });

  const [productSearch, setProductSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
  });
  const shopSettings = settings[0];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Preset default Cash customer when "Cash A/c" is toggled
  useEffect(() => {
    if (billToType === "Cash A/c") {
      setForm(f => ({
        ...f,
        customer_id: "walk-in",
        customer_name: "CASH",
        customer_phone: "",
        customer_gstin: "",
        bill_address: "",
        bill_city: "",
        bill_pincode: "",
        ship_address: "",
        ship_city: "",
        ship_pincode: "",
        place_of_supply: "05-Uttarakhand"
      }));
    } else {
      setForm(f => ({
        ...f,
        customer_id: "",
        customer_name: "",
        customer_phone: "",
        customer_gstin: "",
        bill_address: "",
        bill_city: "",
        bill_pincode: "",
        ship_address: "",
        ship_city: "",
        ship_pincode: "",
      }));
    }
  }, [billToType]);

  const selectCustomer = (cid) => {
    try {
      if (!customers || !Array.isArray(customers)) return;
      const c = customers.find(x => String(x.id) === String(cid));
      if (!c) return;
      setForm(f => ({
        ...f,
        customer_id: cid,
        customer_name: c.name || "",
        customer_phone: c.phone || "",
        customer_gstin: c.gstin || "",
        bill_address: c.address || "",
        bill_city: c.city || "",
        bill_pincode: c.pincode || "",
        ship_address: c.address || "",
        ship_city: c.city || "",
        ship_pincode: c.pincode || "",
        place_of_supply: c.state || "05-Uttarakhand"
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGSTINLookup = async (gstin) => {
    set("customer_gstin", gstin);
    if (gstin.length === 15) {
      try {
        const data = await fetchGSTDetailsFromPortal(gstin);
        setForm(f => ({
          ...f,
          customer_name: data.businessName,
          bill_address: data.address,
          bill_city: data.city,
          bill_pincode: data.pincode,
          ship_address: data.address,
          ship_city: data.city,
          ship_pincode: data.pincode,
          place_of_supply: data.state,
        }));
      } catch (err) {
        console.warn("GST API Warning: " + err.message);
      }
    }
  };

  const handleQuickAddCustomer = async (custData) => {
    try {
      const created = await base44.entities.Customer.create(custData);
      toast.success("Customer added successfully!");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      selectCustomer(created.id);
      setShowAddCustomerModal(false);
    } catch (err) {
      toast.error("Failed to add customer: " + err.message);
    }
  };

  const handleQuickAddProduct = async (prodData) => {
    try {
      const created = await base44.entities.Product.create(prodData);
      toast.success("Product added successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      selectProductForParticulars(created);
      setShowAddProductModal(false);
    } catch (err) {
      toast.error("Failed to add product: " + err.message);
    }
  };

  const selectProductForParticulars = (p) => {
    setForm(f => {
      const existingIdx = f.items.findIndex(i => i.product_id === p.id);
      
      const newGridItem = {
        product_id: p.id,
        name: p.name,
        desc: "",
        hsn: p.hsn || "",
        unit: p.unit || "PCS",
        qty: 1,
        rate: Number(p.rate) || 0,
        mrp: Number(p.mrp) || Number(p.rate) || 0,
        discount_pct: 0,
        gst_rate: Number(p.gst_rate) || 18,
        cess_pct: 0,
        tag_type: "Item Tag",
      };

      if (existingIdx > -1) {
        return {
          ...f,
          items: f.items.map((item, idx) => idx === existingIdx ? {
            ...item,
            qty: item.qty + 1
          } : item)
        };
      }
      
      return {
        ...f,
        items: [...f.items, newGridItem]
      };
    });

    setProductSearch("");
    toast.success(`${p.name} added to grid!`);
  };

  // Add Item from the ERP Particulars input panel
  const addParticularToGrid = () => {
    if (!selectedParticular.product_id && !selectedParticular.name) {
      toast.error("Please select or enter an Item Name");
      return;
    }
    
    setForm(f => {
      const existingIdx = f.items.findIndex(i => i.product_id === selectedParticular.product_id);
      
      const newGridItem = {
        product_id: selectedParticular.product_id || "custom-" + Date.now(),
        name: selectedParticular.name,
        desc: selectedParticular.desc,
        hsn: selectedParticular.hsn,
        unit: selectedParticular.unit,
        qty: Number(selectedParticular.qty) || 1,
        rate: Number(selectedParticular.rate) || 0,
        mrp: Number(selectedParticular.mrp) || 0,
        discount_pct: Number(selectedParticular.discount_pct) || 0,
        gst_rate: Number(selectedParticular.gst_rate) || 0,
        cess_pct: Number(selectedParticular.cess_pct) || 0,
        tag_type: selectedParticular.tag_type,
      };

      if (existingIdx > -1) {
        // Update existing item
        return {
          ...f,
          items: f.items.map((item, idx) => idx === existingIdx ? {
            ...item,
            qty: item.qty + newGridItem.qty,
            rate: newGridItem.rate,
            mrp: newGridItem.mrp,
            discount_pct: newGridItem.discount_pct,
            gst_rate: newGridItem.gst_rate,
            cess_pct: newGridItem.cess_pct,
          } : item)
        };
      }
      
      return {
        ...f,
        items: [...f.items, newGridItem]
      };
    });

    // Reset particulars input fields
    setSelectedParticular({
      serial_no: "",
      product_id: "",
      name: "",
      desc: "",
      hsn: "",
      unit: "PCS",
      qty: 1,
      rate: 0,
      mrp: 0,
      discount_pct: 0,
      gst_rate: 18,
      cess_pct: 0,
      tag_type: "Item Tag",
    });
    toast.success("Item added to grid!");
  };

  const updateItemInGrid = (idx, key, val) => {
    setForm(f => ({
      ...f,
      items: f.items.map((it, i) => i === idx ? {
        ...it,
        [key]: ["qty", "rate", "mrp", "discount_pct", "gst_rate", "cess_pct"].includes(key) ? Number(val) : val
      } : it)
    }));
  };

  const removeItemFromGrid = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  // ERP calculation formulas
  const calculateERPGridTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let cgstSplit = 0;
    let sgstSplit = 0;
    let igstSplit = 0;
    let cessTotal = 0;
    let totalQty = 0;

    const itemsCalculated = form.items.map(item => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const discPct = Number(item.discount_pct) || 0;
      const gstPct = Number(item.gst_rate) || 0;
      const cessPct = Number(item.cess_pct) || 0;

      const basicAmount = qty * rate;
      const discountAmt = basicAmount * (discPct / 100);
      const taxable = basicAmount - discountAmt;
      const gstAmt = taxable * (gstPct / 100);
      const cessAmt = taxable * (cessPct / 100);
      const itemTotal = taxable + gstAmt + cessAmt;

      subtotal += basicAmount;
      totalDiscount += discountAmt;
      cessTotal += cessAmt;
      totalQty += qty;

      const isInter = form.place_of_supply && form.place_of_supply.split("-")[0] !== "05"; // 05 = Uttarakhand (Local branch)
      if (isInter) {
        igstSplit += gstAmt;
      } else {
        cgstSplit += gstAmt / 2;
        sgstSplit += gstAmt / 2;
      }

      return {
        ...item,
        taxable,
        gstAmt,
        itemTotal
      };
    });

    const totalTaxable = subtotal - totalDiscount;
    const totalGst = cgstSplit + sgstSplit + igstSplit;
    let grandTotal = totalTaxable + totalGst + cessTotal + (Number(form.shipping_charges) || 0) - (Number(form.additional_discount_amt) || 0);
    
    if (shopSettings?.roundoff_total !== false) {
      grandTotal = Math.round(grandTotal);
    }

    return {
      itemsCalculated,
      subtotal,
      totalDiscount,
      totalTaxable,
      cgst: cgstSplit,
      sgst: sgstSplit,
      igst: igstSplit,
      cess: cessTotal,
      totalQty,
      grandTotal
    };
  };

  const erpTotals = calculateERPGridTotals();

  const filteredProducts = products
    .filter(p => (p.name + (p.sku || "") + (p.barcode || "")).toLowerCase().includes(productSearch.toLowerCase()))
    .slice(0, 6);

  const handleSave = () => {
    // Combined dual-payment values
    const paidAmountSum = (Number(form.payment1_amount) || 0) + (Number(form.payment2_amount) || 0);
    const finalPaidAmount = paidAmountSum || Number(form.paid_amount) || 0;
    
    let dynamicStatus = form.status;
    if (finalPaidAmount >= erpTotals.grandTotal) {
      dynamicStatus = "paid";
    } else if (finalPaidAmount > 0) {
      dynamicStatus = "partial";
    } else {
      dynamicStatus = "unpaid";
    }

    onSave({
      ...form,
      invoice_type: invoiceType,
      bill_to_type: billToType,
      grand_total: erpTotals.grandTotal,
      subtotal: erpTotals.subtotal,
      tax_amount: erpTotals.cgst + erpTotals.sgst + erpTotals.igst,
      is_interstate: form.place_of_supply && form.place_of_supply.split("-")[0] !== "05",
      paid_amount: finalPaidAmount,
      status: dynamicStatus,
      create_packing_list: createPackingList,
      create_delivery_challan: createDeliveryChallan
    });
  };

  const typeLabel = 
    form.type === "credit_note" ? "Credit Note" : 
    form.type === "debit_note" ? "Debit Note" : 
    form.type === "proforma" ? "Proforma Invoice" : 
    form.type === "quotation" ? "Quotation" : 
    "Invoice";

  const handlePreview = () => {
    const isInter = form.place_of_supply && form.place_of_supply.split("-")[0] !== "05";
    const paidAmountSum = (Number(form.payment1_amount) || 0) + (Number(form.payment2_amount) || 0);
    const finalPaidAmount = paidAmountSum || Number(form.paid_amount) || 0;
    
    let dynamicStatus = form.status;
    if (finalPaidAmount >= erpTotals.grandTotal) {
      dynamicStatus = "paid";
    } else if (finalPaidAmount > 0) {
      dynamicStatus = "partial";
    } else {
      dynamicStatus = "unpaid";
    }

    const data = {
      ...form,
      invoice_type: invoiceType,
      bill_to_type: billToType,
      grand_total: erpTotals.grandTotal,
      subtotal: erpTotals.subtotal,
      tax_amount: erpTotals.cgst + erpTotals.sgst + erpTotals.igst,
      is_interstate: isInter,
      paid_amount: finalPaidAmount,
      status: dynamicStatus,
      invoice_number: invoice?.invoice_number || "PREVIEW",
      source: "general"
    };
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleDownload = async () => {
    const isInter = form.place_of_supply && form.place_of_supply.split("-")[0] !== "05";
    const paidAmountSum = (Number(form.payment1_amount) || 0) + (Number(form.payment2_amount) || 0);
    const finalPaidAmount = paidAmountSum || Number(form.paid_amount) || 0;
    
    let dynamicStatus = form.status;
    if (finalPaidAmount >= erpTotals.grandTotal) {
      dynamicStatus = "paid";
    } else if (finalPaidAmount > 0) {
      dynamicStatus = "partial";
    } else {
      dynamicStatus = "unpaid";
    }

    const data = {
      ...form,
      invoice_type: invoiceType,
      bill_to_type: billToType,
      grand_total: erpTotals.grandTotal,
      subtotal: erpTotals.subtotal,
      tax_amount: erpTotals.cgst + erpTotals.sgst + erpTotals.igst,
      is_interstate: isInter,
      paid_amount: finalPaidAmount,
      status: dynamicStatus,
      invoice_number: invoice?.invoice_number || "DRAFT",
      source: "general",
      create_packing_list: createPackingList,
      create_delivery_challan: createDeliveryChallan
    };

    try {
      toast.loading("Generating PDF...", { id: "inv-pdf" });
      await downloadInvoicePDF(data, shopSettings, false);
      toast.success("PDF downloaded!", { id: "inv-pdf" });
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message, { id: "inv-pdf" });
    }
  };

  // Derive Particular item preview amount
  const calculatedParticularAmount = (() => {
    const qty = Number(selectedParticular.qty) || 0;
    const rate = Number(selectedParticular.rate) || 0;
    const disc = Number(selectedParticular.discount_pct) || 0;
    const gst = Number(selectedParticular.gst_rate) || 0;
    const cess = Number(selectedParticular.cess_pct) || 0;

    const base = qty * rate;
    const tax = base - (base * (disc / 100));
    return tax + (tax * (gst / 100)) + (tax * (cess / 100));
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden bg-background border border-border text-foreground rounded-2xl shadow-2xl">
        
        {/* Sticky ERP Header */}
        <DialogHeader className="p-4 border-b border-border bg-card flex flex-row items-center justify-between shrink-0 sticky top-0 z-20">
          <DialogTitle className="text-md font-black text-foreground">
            {invoice ? `Edit ${invoice.invoice_number}` : `New ${typeLabel}`}
          </DialogTitle>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border bg-background text-muted-foreground hover:bg-accent h-8 rounded-lg text-xs ml-auto">
            <X className="w-4 h-4" /> <span className="hidden sm:inline ml-1">Cancel</span>
          </Button>
        </DialogHeader>

        {/* Dense Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-background/50">
          
          {/* Section 1: Invoice Information */}
          <div className="border border-border bg-card rounded-xl p-4 space-y-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-blue-500 uppercase">1. Invoice Information</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Invoice Type</Label>
                <SearchableSelect
                  options={[
                    { label: "GST", value: "GST" },
                    { label: "Non-GST", value: "Non-GST" },
                    { label: "Bill of Supply", value: "Bill of Supply" },
                  ]}
                  value={invoiceType}
                  onValueChange={setInvoiceType}
                  placeholder="Select Type"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Invoice No. <span className="text-destructive">*</span></Label>
                <Input 
                  value={
                    invoice?.invoice_number || 
                    getDocumentSequence(
                      form.type === "sale" 
                        ? (invoiceType === "GST" ? "gst" : invoiceType === "Bill of Supply" ? "bill" : "inv") 
                        : (form.type || "sale"), 
                      shopSettings || {},
                      activeBranchId
                    ).invoiceNumber
                  } 
                  disabled 
                  className="h-9 bg-background border-input text-foreground text-xs font-mono font-bold" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Date</Label>
                <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Place of Supply <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={INDIAN_STATES}
                  value={form.place_of_supply}
                  onValueChange={v => set("place_of_supply", v)}
                  placeholder="State"
                  searchPlaceholder="Search state..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>
            </div>

            {/* Bill To Customer A/c Details block */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground">Bill To</Label>
                <div className="flex gap-4 items-center h-9">
                  <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                    <input type="radio" checked={billToType === "Cash A/c"} onChange={() => setBillToType("Cash A/c")} className="accent-blue-600 scale-105" />
                    <span>Cash A/c</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                    <input type="radio" checked={billToType === "Customer A/c"} onChange={() => setBillToType("Customer A/c")} className="accent-blue-600 scale-105" />
                    <span>Customer A/c</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Contact No.</Label>
                <Input placeholder="98765xxxxx" value={form.customer_phone} onChange={e => set("customer_phone", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] text-muted-foreground">Customer Name / Account <span className="text-destructive">*</span></Label>
                {billToType === "Cash A/c" ? (
                  <Input value="CASH" disabled className="h-9 bg-background border-input text-muted-foreground text-xs font-bold" />
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={customers?.map(c => ({ value: c.id, label: `${c.name}${c.phone ? ' · ' + c.phone : ''}` })) || []}
                        value={form.customer_id}
                        onValueChange={selectCustomer}
                        placeholder="Select Account"
                        searchPlaceholder="Search customer account..."
                      />
                    </div>
                    <Button type="button" onClick={() => setShowAddCustomerModal(true)} className="bg-secondary hover:bg-secondary/80 text-foreground w-9 h-9 flex items-center justify-center shrink-0 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground font-mono">Customer GSTIN</Label>
                <Input value={form.customer_gstin} onChange={e => handleGSTINLookup(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" className="h-9 bg-background border-input text-foreground text-xs font-mono" />
              </div>
            </div>

            {/* Billing Address Sub-Row */}
            {billToType === "Customer A/c" && form.customer_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Billing Address</Label>
                  <Input placeholder="Address Details" value={form.bill_address} onChange={e => set("bill_address", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="City" value={form.bill_city} onChange={e => set("bill_city", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                    <Input placeholder="Pincode" value={form.bill_pincode} onChange={e => set("bill_pincode", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Shipping Address (Optional)</Label>
                  <Input placeholder="Shipping Details" value={form.ship_address} onChange={e => set("ship_address", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="City" value={form.ship_city} onChange={e => set("ship_city", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                    <Input placeholder="Pincode" value={form.ship_pincode} onChange={e => set("ship_pincode", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Particulars Input Area (The ERP Entry Row) */}
          <div className="border border-border bg-card rounded-xl p-4 space-y-3.5 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-emerald-500 uppercase">2. Particulars Add Panel</p>
            
            <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
              
              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Serial No.</Label>
                <Input placeholder="Auto" value={selectedParticular.serial_no} onChange={e => setSelectedParticular({...selectedParticular, serial_no: e.target.value})} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label className="text-[9px] text-muted-foreground flex justify-between">
                  <span>Item Name *</span>
                  <span onClick={() => setShowAddProductModal(true)} className="text-[9px] text-emerald-500 hover:underline cursor-pointer">+ Quick Add</span>
                </Label>
                <div className="relative">
                  <Input placeholder="Search item..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="h-9 bg-background border-input text-foreground text-xs" />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-popover border border-border rounded-lg shadow-2xl z-50 max-h-40 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => selectProductForParticulars(p)} className="flex justify-between px-3 py-2 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-0 text-xs">
                          <span className="text-foreground">{p.name}</span>
                          <span className="text-emerald-500 font-bold">{fmtINR(p.rate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedParticular.name && !productSearch && (
                    <p className="absolute bottom-[-14px] left-1 text-[8px] text-emerald-500 font-semibold truncate max-w-full">Selected: {selectedParticular.name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Unit *</Label>
                <SearchableSelect
                  options={[
                    { label: "PCS", value: "PCS" },
                    { label: "BOX", value: "BOX" },
                    { label: "KGS", value: "KGS" },
                    { label: "LTR", value: "LTR" },
                    { label: "MTR", value: "MTR" },
                  ]}
                  value={selectedParticular.unit}
                  onValueChange={v => setSelectedParticular({...selectedParticular, unit: v})}
                  placeholder="Unit"
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Quantity *</Label>
                <Input type="number" min={1} value={selectedParticular.qty} onChange={e => setSelectedParticular({...selectedParticular, qty: Number(e.target.value)})} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Sale Price (₹) *</Label>
                <Input type="number" step="any" value={selectedParticular.rate || ""} onChange={e => setSelectedParticular({...selectedParticular, rate: Number(e.target.value)})} className="h-9 bg-background border-input text-foreground text-xs font-mono font-bold" />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">M.R.P. (₹)</Label>
                <Input type="number" step="any" value={selectedParticular.mrp || ""} onChange={e => setSelectedParticular({...selectedParticular, mrp: Number(e.target.value)})} className="h-9 bg-background border-input text-foreground text-xs font-mono" />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Disc (%)</Label>
                <Input type="number" min={0} max={100} value={selectedParticular.discount_pct || ""} onChange={e => setSelectedParticular({...selectedParticular, discount_pct: Number(e.target.value)})} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Tax (%)</Label>
                <SearchableSelect
                  options={GST_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                  value={String(selectedParticular.gst_rate)}
                  onValueChange={v => setSelectedParticular({...selectedParticular, gst_rate: Number(v)})}
                  placeholder="GST"
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Label className="text-[9px] text-muted-foreground">Cess (%)</Label>
                <Input type="number" min={0} value={selectedParticular.cess_pct || ""} onChange={e => setSelectedParticular({...selectedParticular, cess_pct: Number(e.target.value)})} className="h-9 bg-background border-input text-foreground text-xs" />
              </div>

              <div className="space-y-1 md:col-span-1">
                <Button type="button" onClick={addParticularToGrid} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1 shadow-md rounded-lg text-xs">
                  <Plus className="w-4 h-4" /> <span>Add</span>
                </Button>
              </div>
            </div>

            {/* Row Extra Details: Description, Item Tag radio, derived amount */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center pt-2.5 border-t border-border/40">
              <div className="md:col-span-2">
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                    <input type="radio" checked={selectedParticular.tag_type === "Item Tag"} onChange={() => setSelectedParticular({...selectedParticular, tag_type: "Item Tag"})} className="accent-emerald-600 scale-95" />
                    <span>Item Tag</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                    <input type="radio" checked={selectedParticular.tag_type === "Item Code"} onChange={() => setSelectedParticular({...selectedParticular, tag_type: "Item Code"})} className="accent-emerald-600 scale-95" />
                    <span>Item Code</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-7">
                <Input placeholder="Enter specific item description / details (optional)..." value={selectedParticular.desc} onChange={e => setSelectedParticular({...selectedParticular, desc: e.target.value})} className="h-8 bg-background border-input text-foreground text-[11px]" />
              </div>

              <div className="md:col-span-3 text-right">
                <p className="text-[10px] text-muted-foreground">
                  Estimated Line Amount: <span className="font-mono text-emerald-500 font-bold text-xs">{fmtINR(calculatedParticularAmount)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Particulars Table */}
          <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted px-4 py-2.5 border-b border-border flex justify-between items-center">
              <p className="text-[11px] font-bold tracking-wider text-foreground uppercase">3. Particulars Billing Items Grid</p>
              <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono font-semibold">{form.items.length} items loaded</span>
            </div>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-foreground text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <th className="p-3 pl-4 w-12">S.No</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Tag / Desc</th>
                    <th className="p-3 w-16">Quantity</th>
                    <th className="p-3 w-20">Unit</th>
                    <th className="p-3 w-24">Unit Price</th>
                    <th className="p-3 w-16">Disc (%)</th>
                    <th className="p-3 w-20">Tax (%)</th>
                    <th className="p-3 w-16">Cess (%)</th>
                    <th className="p-3 text-right pr-4">Total (₹)</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {erpTotals.itemsCalculated.map((it, idx) => (
                    <tr key={it.product_id + idx} className="hover:bg-muted/45 transition-colors">
                      <td className="p-3 pl-4 font-mono font-semibold text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-semibold text-foreground">{it.name}</td>
                      <td className="p-3 text-muted-foreground font-mono text-[10px] max-w-[200px] truncate">{it.desc || "—"}</td>
                      <td className="p-2">
                        <Input type="number" min={1} value={it.qty} onChange={e => updateItemInGrid(idx, "qty", e.target.value)} className="h-7 w-16 bg-background border-input text-foreground font-semibold p-1.5 text-center text-xs" />
                      </td>
                      <td className="p-2">
                        <Input value={it.unit} onChange={e => updateItemInGrid(idx, "unit", e.target.value)} className="h-7 w-16 bg-background border-input text-foreground p-1.5 text-xs" />
                      </td>
                      <td className="p-2">
                        <Input type="number" step="any" value={it.rate} onChange={e => updateItemInGrid(idx, "rate", e.target.value)} className="h-7 w-20 bg-background border-input text-foreground font-mono p-1.5 text-xs font-semibold" />
                      </td>
                      <td className="p-2">
                        <Input type="number" min={0} max={100} value={it.discount_pct || 0} onChange={e => updateItemInGrid(idx, "discount_pct", e.target.value)} className="h-7 w-14 bg-background border-input text-foreground p-1.5 text-center text-xs" />
                      </td>
                      <td className="p-2">
                        <SearchableSelect
                          className="h-7 w-20 text-[11px]"
                          options={GST_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                          value={String(it.gst_rate)}
                          onValueChange={v => updateItemInGrid(idx, "gst_rate", v)}
                          placeholder="GST"
                        />
                      </td>
                      <td className="p-2">
                        <Input type="number" min={0} value={it.cess_pct || 0} onChange={e => updateItemInGrid(idx, "cess_pct", e.target.value)} className="h-7 w-14 bg-background border-input text-foreground p-1.5 text-center text-xs" />
                      </td>
                      <td className="p-3 text-right pr-4 font-mono font-bold text-emerald-600">{fmtINR(it.itemTotal)}</td>
                      <td className="p-2">
                        <button onClick={() => removeItemFromGrid(idx)} className="w-6 h-6 rounded bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {form.items.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-muted-foreground font-semibold">
                        🛍️ Particulars billing grid is empty. Search & add items using the panel above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Bottom Controls & Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left side: Notes, Deliveries, and Payments tabs */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Sold by & checkboxes */}
              <div className="border border-border bg-card rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-center">
                  
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Sold By</Label>
                    <SearchableSelect
                      options={[
                        { label: "Rahul Sharma (Sales)", value: "Rahul Sharma" },
                        { label: "Priya Singh (Counter)", value: "Priya Singh" },
                        { label: "Amit Patel (Floor)", value: "Amit Patel" },
                      ]}
                      value={form.sold_by}
                      onValueChange={v => set("sold_by", v)}
                      placeholder="Select Salesman"
                    />
                  </div>

                  {/* ERP checkboxes */}
                  <div className="md:col-span-3 flex flex-wrap gap-4 items-center h-9">
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input type="checkbox" checked={showAddlDiscount} onChange={e => setShowAddlDiscount(e.target.checked)} className="accent-blue-600 rounded" />
                      <span>Add'l discount</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input type="checkbox" checked={showReference} onChange={e => setShowReference(e.target.checked)} className="accent-blue-600 rounded" />
                      <span>Add reference</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                      <input type="checkbox" checked={showShipping} onChange={e => setShowShipping(e.target.checked)} className="accent-blue-600 rounded" />
                      <span>Add shipping</span>
                    </label>
                    <span className="text-muted-foreground/30 text-xs hidden md:inline">|</span>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                      <input type="checkbox" checked={createPackingList} onChange={e => setCreatePackingList(e.target.checked)} className="accent-indigo-600 rounded scale-105" />
                      <span>📦 Generate Packing List</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                      <input type="checkbox" checked={createDeliveryChallan} onChange={e => setCreateDeliveryChallan(e.target.checked)} className="accent-emerald-600 rounded scale-105" />
                      <span>🚚 Generate Delivery Challan</span>
                    </label>
                  </div>
                </div>

                {/* Conditional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 empty:hidden">
                  {showAddlDiscount && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-[10px] text-muted-foreground">Additional Discount Amount (₹)</Label>
                      <Input type="number" value={form.additional_discount_amt} onChange={e => set("additional_discount_amt", Number(e.target.value))} className="h-9 bg-background border-input text-foreground text-xs" />
                    </div>
                  )}
                  {showReference && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-[10px] text-muted-foreground">PO / Reference No.</Label>
                      <Input value={form.reference_no} onChange={e => set("reference_no", e.target.value)} placeholder="e.g. PO-892" className="h-9 bg-background border-input text-foreground text-xs" />
                    </div>
                  )}
                  {showShipping && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-[10px] text-muted-foreground">Shipping & Delivery Charges (₹)</Label>
                      <Input type="number" value={form.shipping_charges} onChange={e => set("shipping_charges", Number(e.target.value))} className="h-9 bg-background border-input text-foreground text-xs" />
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Terms & Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="border border-border bg-card rounded-xl p-4 space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Delivery Terms</Label>
                  <Textarea placeholder="Enter freight/logistics terms here..." value={form.delivery_terms} onChange={e => set("delivery_terms", e.target.value)} className="h-16 bg-background border-input text-foreground text-xs" />
                </div>
                <div className="border border-border bg-card rounded-xl p-4 space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Remarks (Private Use)</Label>
                  <Textarea placeholder="Internal staff comments/follow-ups..." value={form.remarks_private} onChange={e => set("remarks_private", e.target.value)} className="h-16 bg-background border-input text-foreground text-xs" />
                </div>
              </div>

              {/* POS-like Split Payment Logic */}
              <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-3 bg-muted border-b border-border font-bold text-xs flex justify-between items-center">
                  <span>💰 Payment Receipt</span>
                  {erpTotals.grandTotal - (Number(form.payment1_amount) || 0) - (Number(form.payment2_amount) || 0) > 0 && (
                     <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Balance: {fmtINR(erpTotals.grandTotal - (Number(form.payment1_amount) || 0) - (Number(form.payment2_amount) || 0))}</span>
                  )}
                </div>
                
                <div className="p-4 bg-card/60 space-y-4">
                  {/* Payment 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground">Date</Label>
                      <Input type="date" value={form.payment1_date} onChange={e => set("payment1_date", e.target.value)} className="h-8 bg-background border-input text-foreground text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground">Mode</Label>
                      <SearchableSelect
                        options={[
                          { label: "Cash", value: "Cash" },
                          { label: "UPI", value: "UPI" },
                          { label: "Card", value: "Card" },
                          { label: "Net Banking", value: "Net Banking" },
                          { label: "Cheque", value: "Cheque" },
                        ]}
                        value={form.payment1_mode}
                        onValueChange={v => set("payment1_mode", v)}
                        placeholder="Mode"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground font-mono">Transaction ID</Label>
                      <Input placeholder="Optional reference" value={form.payment1_txn_id} onChange={e => set("payment1_txn_id", e.target.value)} className="h-8 bg-background border-input text-foreground text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground">Amount Paid (₹) *</Label>
                      <Input type="number" value={form.payment1_amount === 0 ? "" : form.payment1_amount} onChange={e => {
                        const val = Number(e.target.value);
                        setForm(f => {
                          const newState = { ...f, payment1_amount: val };
                          if (val > 0 && val < erpTotals.grandTotal && !f.payment2_amount) {
                            newState.payment2_amount = erpTotals.grandTotal - val;
                            newState.payment2_mode = f.payment1_mode === "Cash" ? "UPI" : "Cash";
                          } else if (val >= erpTotals.grandTotal) {
                            newState.payment2_amount = 0;
                          }
                          return newState;
                        });
                      }} className="h-8 bg-background border-input text-foreground text-xs font-mono font-bold text-blue-600" />
                    </div>
                  </div>

                  {/* Payment 2 (Auto reveals if there is a split) */}
                  {(Number(form.payment2_amount) > 0 || (Number(form.payment1_amount) > 0 && Number(form.payment1_amount) < erpTotals.grandTotal)) && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Split Date</Label>
                        <Input type="date" value={form.payment2_date} onChange={e => set("payment2_date", e.target.value)} className="h-8 bg-background border-input text-foreground text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Split Mode</Label>
                        <SearchableSelect
                          options={[
                            { label: "Cash", value: "Cash" },
                            { label: "UPI", value: "UPI" },
                            { label: "Card", value: "Card" },
                            { label: "Net Banking", value: "Net Banking" },
                            { label: "Cheque", value: "Cheque" },
                          ]}
                          value={form.payment2_mode}
                          onValueChange={v => set("payment2_mode", v)}
                          placeholder="Mode"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground font-mono">Transaction ID</Label>
                        <Input placeholder="Optional reference" value={form.payment2_txn_id} onChange={e => set("payment2_txn_id", e.target.value)} className="h-8 bg-background border-input text-foreground text-xs font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground">Split Amount (₹)</Label>
                        <Input type="number" value={form.payment2_amount === 0 ? "" : form.payment2_amount} onChange={e => set("payment2_amount", Number(e.target.value))} className="h-8 bg-background border-input text-foreground text-xs font-mono font-bold text-emerald-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Detailed calculation Sidebar */}
            <div className="lg:col-span-4 border border-border bg-card rounded-xl p-4 space-y-4 shadow-sm flex flex-col justify-between">
              
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">4. Ledger Calculations</p>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Particular Discounts</span>
                    <span className="font-semibold text-red-500 font-mono">−{fmtINR(erpTotals.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                    <span className="text-muted-foreground">Taxable Value</span>
                    <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.totalTaxable)}</span>
                  </div>
                  
                  {erpTotals.igst > 0 ? (
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">IGST Output Tax</span>
                      <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.igst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                        <span className="text-muted-foreground">CGST output Tax</span>
                        <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                        <span className="text-muted-foreground">SGST output Tax</span>
                        <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.sgst)}</span>
                      </div>
                    </>
                  )}
                  {erpTotals.cess > 0 && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Cess output Tax</span>
                      <span className="font-semibold text-foreground font-mono">{fmtINR(erpTotals.cess)}</span>
                    </div>
                  )}
                  {showShipping && (Number(form.shipping_charges) > 0) && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Shipping Fees</span>
                      <span className="font-semibold text-foreground font-mono">+{fmtINR(form.shipping_charges)}</span>
                    </div>
                  )}
                  {showAddlDiscount && (Number(form.additional_discount_amt) > 0) && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Extra discount</span>
                      <span className="font-semibold text-red-500 font-mono">−{fmtINR(form.additional_discount_amt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground text-[11px] font-semibold">
                  <span>Total Quantity</span>
                  <span className="font-mono text-foreground font-bold">{erpTotals.totalQty}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 text-foreground font-black">
                  <span className="text-sm">TOTAL AMOUNT</span>
                  <span className="text-2xl text-blue-600 font-mono">{fmtINR(erpTotals.grandTotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed lowercase bg-muted p-2 border border-border/80 rounded-lg max-h-16 overflow-y-auto">
                  {numToWords(erpTotals.grandTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Notes Bottom Row */}
          <div className="border border-border bg-card rounded-xl p-4">
            <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Public Notes (appears on PDF invoice)</Label>
            <Input placeholder="Thank you for your business! Payment should be cleared within credit terms." value={form.notes} onChange={e => set("notes", e.target.value)} className="h-9 bg-background border-input text-foreground text-xs mt-1.5" />
          </div>
        </div>

        {/* Sticky ERP Footer Actions */}
        <div className="p-4 border-t border-border bg-card shrink-0 sticky bottom-0 z-20 flex gap-3 items-center justify-between">
          <div className="flex gap-2.5 w-full justify-end sm:justify-start">
            <Button
              onClick={handleSave}
              disabled={erpTotals.itemsCalculated.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 px-3 sm:px-5 h-10 shadow-lg rounded-lg text-xs"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Save and Print</span>
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={erpTotals.itemsCalculated.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 px-3 sm:px-5 h-10 shadow-lg rounded-lg text-xs"
            >
              <Check className="w-4 h-4" /> <span className="hidden sm:inline">Save</span>
            </Button>

            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={erpTotals.itemsCalculated.length === 0}
              className="border-border bg-background text-foreground hover:bg-accent gap-1.5 px-3 sm:px-4 h-10 rounded-lg text-xs"
            >
              <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview Draft</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={erpTotals.itemsCalculated.length === 0}
              className="border-border bg-background text-foreground hover:bg-accent gap-1.5 px-3 sm:px-4 h-10 rounded-lg text-xs"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Popups & Modals */}
      {showPreview && previewData && (
        <InvoicePrintPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          invoice={previewData}
          shopSettings={shopSettings}
        />
      )}

      {showAddCustomerModal && (
        <QuickAddCustomerModal
          open={showAddCustomerModal}
          onOpenChange={setShowAddCustomerModal}
          onSave={handleQuickAddCustomer}
        />
      )}

      {showAddProductModal && (
        <QuickAddProductModal
          open={showAddProductModal}
          onOpenChange={setShowAddProductModal}
          onSave={handleQuickAddProduct}
        />
      )}
    </Dialog>
  );
}

function QuickAddCustomerModal({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gstin: "",
    address: "",
    city: "",
    state: "",
    category: "Retail",
    status: "Active",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto bg-card p-5 rounded-2xl border border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-1.5 text-foreground">
            👥 Quick Add Customer
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground">Business / Customer Name *</Label>
            <Input placeholder="Ramesh Kumar / ABC Corp" value={form.name} onChange={e => set("name", e.target.value)} required className="h-10 bg-background border-input text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">Phone Number</Label>
              <Input placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} className="h-10 bg-background border-input text-foreground" />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground font-mono">GSTIN</Label>
              <Input placeholder="15-char GSTIN" value={form.gstin} onChange={e => set("gstin", e.target.value)} className="h-10 bg-background border-input text-foreground font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground font-mono">Billing Address</Label>
            <Input placeholder="Shop No, Street" value={form.address} onChange={e => set("address", e.target.value)} className="h-10 bg-background border-input text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">City</Label>
              <Input placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} className="h-10 bg-background border-input text-foreground" />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">State</Label>
              <SearchableSelect
                options={INDIAN_STATES}
                value={form.state}
                onValueChange={v => set("state", v)}
                placeholder="Select State"
                searchPlaceholder="Search state..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={!form.name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1 h-10 rounded-lg shadow-sm text-xs">
              💾 Save Customer
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border bg-background text-muted-foreground h-10 rounded-lg text-xs">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddProductModal({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: "",
    rate: 0,
    gst_rate: 18,
    hsn: "",
    stock: 0,
    unit: "PCS",
    category: "General",
    brand: "Generic",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.rate <= 0) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto bg-card p-5 rounded-2xl border border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-1.5 text-foreground">
            📦 Quick Add Product
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground font-mono">Product Name *</Label>
            <Input placeholder="e.g. LED Bulb 9W" value={form.name} onChange={e => set("name", e.target.value)} required className="h-10 bg-background border-input text-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground font-mono">Selling Price (₹) *</Label>
              <Input type="number" step="any" placeholder="₹0" value={form.rate || ""} onChange={e => set("rate", Number(e.target.value))} required className="h-10 bg-background border-input text-foreground" />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">GST Rate (%)</Label>
              <SearchableSelect
                options={[0, 5, 12, 18, 28].map(r => ({ value: String(r), label: `${r}%` }))}
                value={String(form.gst_rate)}
                onValueChange={v => set("gst_rate", Number(v))}
                placeholder="GST Rate"
                searchPlaceholder="Search GST..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">HSN Code</Label>
              <Input placeholder="8539" value={form.hsn} onChange={e => set("hsn", e.target.value)} className="h-10 bg-background border-input text-foreground" />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground">Initial Stock</Label>
              <Input type="number" placeholder="0" value={form.stock || ""} onChange={e => set("stock", Number(e.target.value))} className="h-10 bg-background border-input text-foreground" />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button type="submit" disabled={!form.name.trim() || form.rate <= 0} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 h-10 rounded-lg shadow-sm text-xs">
              💾 Save Product
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border bg-background text-muted-foreground h-10 rounded-lg text-xs">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}