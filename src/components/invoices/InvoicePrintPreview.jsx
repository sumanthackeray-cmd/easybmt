import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { numToWords } from "@/lib/gst-utils";
import html2canvas from "html2canvas";
import { toast } from "@/lib/toast";
import { downloadInvoicePDF, generateThermalHTML } from "@/lib/pdf-share-utils";

window.html2canvas = html2canvas;

// Helper to append cache-buster timestamp for CORS requests
const getCORSImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  // Use weserv.nl image proxy to bypass any CORS restrictions on external storage/Firebase buckets
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

export function generateInvoiceHTML(inv, shop, documentType = null, templateId = null) {
  const isInterstate = inv.is_interstate;
  const items = inv.items || [];
  
  // Resolve active document type
  const docType = documentType || inv.type || "invoice";
  
  // Resolve active template
  const activeTemplate = templateId || (
    docType === "packing_list" ? shop?.packing_list_template :
    docType === "delivery_challan" ? shop?.delivery_challan_template :
    shop?.b2b_invoice_template
  ) || "template_1";

  // Dynamic Theme Styling Variables
  let accentColor = "#E8870A";
  let fontStyles = "Arial, sans-serif";
  let tableHeaderStyle = "background:#E8870A; color:white; font-weight:800;";
  let tableRowStyle = "background:#fafafa;";
  let tableAlternateRowBg = "#fafafa";
  let headerBorderColor = "#E8870A";
  let headerGradient = "";
  let partyBoxStyle = "background:#f9f9f9; border:1px solid #eee; border-radius:6px;";
  let totalLineGrandStyle = "background:#E8870A; color:white;";
  let secondaryColor = "#f9f9f9";

  if (activeTemplate === "template_2") { // Modern Royal Blue
    accentColor = "#1E40AF";
    fontStyles = "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
    tableHeaderStyle = "background:#1E40AF; color:white; font-weight:bold;";
    tableRowStyle = "background:#ffffff; border-bottom:1px solid #e2e8f0;";
    tableAlternateRowBg = "#f8fafc";
    headerBorderColor = "#1E40AF";
    partyBoxStyle = "background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;";
    totalLineGrandStyle = "background:#1E40AF; color:white; border-radius:6px;";
  } else if (activeTemplate === "template_3") { // Minimalist Slate
    accentColor = "#374151";
    fontStyles = "Arial, sans-serif";
    tableHeaderStyle = "background:transparent; color:#374151; font-weight:bold; border-bottom:2px solid #374151; border-top:2px solid #374151;";
    tableRowStyle = "background:transparent; border-bottom:1px solid #e5e7eb;";
    tableAlternateRowBg = "transparent";
    headerBorderColor = "#374151";
    partyBoxStyle = "background:transparent; border:none; border-bottom:1px dashed #d1d5db; padding:5px 0;";
    totalLineGrandStyle = "background:transparent; color:#374151; border-top:2px double #374151; font-weight:bold;";
  } else if (activeTemplate === "template_4") { // Premium Emerald
    accentColor = "#047857";
    fontStyles = "'Roboto', sans-serif";
    tableHeaderStyle = "background:#047857; color:white; font-weight:bold;";
    tableRowStyle = "background:#f0fdf4;";
    tableAlternateRowBg = "#f0fdf4";
    headerBorderColor = "#047857";
    partyBoxStyle = "background:#ecfdf5; border:1.5px solid #047857; border-radius:10px;";
    totalLineGrandStyle = "background:#047857; color:white; border-radius:8px;";
  } else if (activeTemplate === "template_5") { // Creative Tech Purple
    accentColor = "#6366F1";
    fontStyles = "'Inter', -apple-system, sans-serif";
    tableHeaderStyle = "background:#4f46e5; color:white; font-weight:bold;";
    tableRowStyle = "background:#ffffff; border-bottom:1px solid #f3e8ff;";
    tableAlternateRowBg = "#faf5ff";
    headerBorderColor = "#6366F1";
    headerGradient = "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)";
    partyBoxStyle = "background:#faf5ff; border:1px solid #e9d5ff; border-radius:12px;";
    totalLineGrandStyle = "background:linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color:white; border-radius:8px;";
  }

  // Document Title & Text Config
  let documentTitle = "TAX INVOICE";
  let footerDeclaration = shop?.invoice_declaration || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
  if (docType === "packing_list") {
    documentTitle = "PACKING LIST";
    footerDeclaration = "We declare that this packing list contains a true description of the goods packed.";
  } else if (docType === "delivery_challan") {
    documentTitle = "DELIVERY CHALLAN";
    footerDeclaration = "Received the above described goods in good condition.";
  } else if (inv.type === "credit_note") {
    documentTitle = "CREDIT NOTE";
  } else if (inv.type === "debit_note") {
    documentTitle = "DEBIT NOTE";
  } else if (inv.type === "proforma") {
    documentTitle = "PROFORMA INVOICE";
  } else if (inv.type === "quotation") {
    documentTitle = "QUOTATION";
  }

  const isPackingList = docType === "packing_list";
  const isDeliveryChallan = docType === "delivery_challan";

  // Build items rows HTML
  const itemRows = items.map((it, i) => {
    const taxable = it.qty * it.rate;
    const taxAmt = taxable * (it.gst_rate / 100);
    const rowClass = (i % 2 === 0) ? "" : `style="${tableRowStyle}"`;

    if (isPackingList) {
      return `
        <tr ${rowClass}>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;"><b>${it.name}</b>${it.desc ? `<br><small style="color:#666">${it.desc}</small>` : ""}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${it.hsn || "—"}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${it.qty}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${it.unit || "Units"}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;color:#888;font-style:italic;font-size:10px;">[ Remarks / Box No ]</td>
        </tr>`;
    }

    if (isDeliveryChallan) {
      return `
        <tr ${rowClass}>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;"><b>${it.name}</b>${it.desc ? `<br><small style="color:#666">${it.desc}</small>` : ""}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${it.hsn || "—"}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${it.qty}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;">${it.unit || "Units"}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">₹${it.rate?.toFixed(2)}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;">₹${(taxable + taxAmt)?.toFixed(2)}</td>
        </tr>`;
    }

    // Default Tax Invoice rows
    return `
      <tr ${rowClass}>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;"><b>${it.name}</b>${it.desc ? `<br><small style="color:#666">${it.desc}</small>` : ""}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.hsn || "—"}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.qty} ${it.unit || ""}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${it.rate?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${taxable?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:center;">${it.gst_rate}%</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;">₹${taxAmt?.toFixed(2)}</td>
        <td style="padding:5px 6px;border:1px solid #ddd;text-align:right;font-weight:700;">₹${(taxable + taxAmt)?.toFixed(2)}</td>
      </tr>`;
  }).join("");

  const subtotal = items.reduce((s, it) => s + it.qty * it.rate, 0);
  const taxTotal = items.reduce((s, it) => s + it.qty * it.rate * it.gst_rate / 100, 0);
  const cgstTotal = isInterstate ? 0 : taxTotal / 2;
  const sgstTotal = isInterstate ? 0 : taxTotal / 2;
  const igstTotal = isInterstate ? taxTotal : 0;
  
  let discAmt = 0;
  let grand = 0;
  
  if (inv.grand_total !== undefined && inv.subtotal !== undefined) {
    grand = inv.grand_total;
    const diff = (inv.subtotal + inv.tax_amount) - inv.grand_total;
    discAmt = diff > 0.01 ? diff : 0;
  } else {
    discAmt = subtotal * ((inv.discount || 0) / 100);
    grand = subtotal - discAmt + taxTotal;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=820, initial-scale=1.0">
  <title>${documentTitle} ${inv.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family: ${fontStyles}; letter-spacing: normal !important; word-spacing: normal !important; font-variant-numeric: lnum tabular-nums !important; -webkit-font-smoothing: antialiased !important; }
    body { background:#fff; color:#111; font-size:12px; }
    .page { max-width:800px; margin:0 auto; padding:20px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:${headerBorderColor === "none" ? "none" : `3px solid ${headerBorderColor}`}; ${headerGradient ? `background:${headerGradient}; color:white; padding:15px; border-radius:10px;` : ""} }
    .logo-area { display:flex; flex-direction:column; }
    .shop-name { font-size:22px; font-weight:900; color:${headerGradient ? "white" : accentColor}; }
    .shop-info { font-size:10px; color:${headerGradient ? "#e2e8f0" : "#555"}; margin-top:4px; line-height:1.6; }
    .invoice-meta { text-align:right; }
    .inv-title { font-size:18px; font-weight:900; color:${headerGradient ? "white" : "#333"}; }
    .inv-no { font-size:16px; font-weight:800; color:${headerGradient ? "#ffd700" : accentColor}; }
    .inv-detail { font-size:11px; color:${headerGradient ? "#e2e8f0" : "#555"}; margin-top:2px; }
    .party-row { display:flex; gap:12px; margin:14px 0; }
    .party-box { flex:1; ${partyBoxStyle} padding:10px; }
    .party-label { font-size:10px; font-weight:800; color:${accentColor}; text-transform:uppercase; margin-bottom:5px; }
    .party-name { font-size:14px; font-weight:800; color:#111; }
    .party-info { font-size:10px; color:#555; margin-top:2px; line-height:1.6; }
    table { width:100%; border-collapse:collapse; margin:12px 0; font-size:11px; }
    th { ${tableHeaderStyle} padding:8px 6px; text-align:left; line-height:1.2; vertical-align:middle; ${activeTemplate !== "template_3" ? `border:1px solid ${accentColor};` : ""} }
    td { padding:6px; line-height:1.2; vertical-align:middle; }
    tr:nth-child(even) { background:${tableAlternateRowBg}; }
    .totals-row { display:flex; justify-content:flex-end; margin-top:8px; }
    .totals-box { width:260px; }
    .total-line { display:flex; justify-content:space-between; align-items:center; padding:4px 6px; font-size:11px; }
    .total-line.grand { font-size:14px; font-weight:900; ${totalLineGrandStyle} padding:6px; margin-top:4px; align-items:center; }
    .words { font-size:10px; color:#666; font-style:italic; margin:4px 0 10px; }
    .bank-box { background:${secondaryColor}; border:1px solid ${activeTemplate === "template_3" ? "#ccc" : accentColor + "30"}; border-radius:6px; padding:10px; margin-top:12px; font-size:11px; }
    .bank-title { font-weight:800; color:#333; margin-bottom:4px; }
    .footer { margin-top:16px; display:flex; justify-content:space-between; align-items:flex-end; border-top:2px solid #eee; padding-top:12px; }
    .terms { font-size:10px; color:#888; max-width:55%; }
    .sign-area { text-align:center; min-width:120px; }
    .sign-img { max-height:50px; max-width:120px; width:auto; height:auto; object-fit:contain; display:block; margin:0 auto; }
    .sign-label { font-size:10px; color:#555; margin-top:4px; border-top:1px solid #ccc; padding-top:3px; }
    @media print { 
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } 
      @page { margin: 0; size: auto; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      ${shop?.logo_url ? `<img src="${getCORSImageUrl(shop.logo_url)}" crossorigin="anonymous" class="logo-img" style="max-height:48px;max-width:150px;width:auto;height:auto;object-fit:contain;margin-bottom:4px;display:block;align-self:flex-start;" />` : ""}
      <div class="shop-name">${(!shop || !shop.shop_name) ? "Your Business" : shop.shop_name}</div>
      <div class="shop-info">
        ${shop?.gstin ? `GSTIN: ${shop.gstin}<br>` : ""}
        ${shop?.address || ""}${shop?.city ? ", " + shop.city : ""}${shop?.state ? ", " + shop.state : ""}${shop?.pincode ? " - " + shop.pincode : ""}<br>
        ${shop?.phone ? `📞 ${shop.phone}` : ""}${shop?.email ? ` | ${shop.email}` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="inv-title">${documentTitle}</div>
      <div class="inv-no">${inv.invoice_number}</div>
      <div class="inv-detail">Date: ${inv.date}</div>
      ${inv.due_date ? `<div class="inv-detail">Due: ${inv.due_date}</div>` : ""}
      ${inv.po_number ? `<div class="inv-detail">PO: ${inv.po_number}</div>` : ""}
      <div class="inv-detail" style="margin-top:4px;font-weight:700;color:${inv.status === "paid" ? "green" : inv.status === "partial" ? "orange" : "#cc0000"}">
        ${inv.status?.toUpperCase()}
      </div>
    </div>
  </div>

  <!-- Party Details -->
  <div class="party-row">
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.customer_name}</div>
      <div class="party-info">
        ${inv.customer_gstin ? `GSTIN: ${inv.customer_gstin}<br>` : ""}
        ${inv.bill_address || ""}${inv.bill_city ? ", " + inv.bill_city : ""}${inv.bill_pincode ? " - " + inv.bill_pincode : ""}<br>
        ${inv.customer_phone ? `📞 ${inv.customer_phone}` : ""}
      </div>
    </div>
    ${inv.ship_address && inv.ship_address !== inv.bill_address ? `
    <div class="party-box">
      <div class="party-label">Ship To</div>
      <div class="party-name">${inv.customer_name}</div>
      <div class="party-info">${inv.ship_address}${inv.ship_city ? ", " + inv.ship_city : ""}${inv.ship_pincode ? " - " + inv.ship_pincode : ""}</div>
    </div>` : ""}
    ${inv.place_of_supply ? `
    <div class="party-box" style="max-width:160px;">
      <div class="party-label">Supply Details</div>
      <div class="party-info"><b>Place:</b> ${inv.place_of_supply}<br><b>Type:</b> ${isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</div>
    </div>` : ""}
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      ${isPackingList ? `
        <tr>
          <th>#</th><th>Product Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Package Details / Remarks</th>
        </tr>
      ` : isDeliveryChallan ? `
        <tr>
          <th>#</th><th>Product Description</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total Value</th>
        </tr>
      ` : `
        <tr>
          <th>#</th><th>Product / Description</th><th>HSN</th><th>Qty</th>
          <th>Rate</th><th>Taxable</th><th>GST%</th><th>Tax</th><th>Total</th>
        </tr>
      `}
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Totals -->
  ${!isPackingList ? `
    <div class="totals-row">
      <div class="totals-box">
        <div class="total-line"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
        ${discAmt > 0.01 ? `<div class="total-line"><span>Discount ${inv.discount ? `(${inv.discount}%)` : ""}</span><span>−₹${discAmt.toFixed(2)}</span></div>` : ""}
        ${!isInterstate ? `
          <div class="total-line"><span>CGST</span><span>₹${cgstTotal.toFixed(2)}</span></div>
          <div class="total-line"><span>SGST</span><span>₹${sgstTotal.toFixed(2)}</span></div>
        ` : `<div class="total-line"><span>IGST</span><span>₹${igstTotal.toFixed(2)}</span></div>`}
        ${inv.paid_amount > 0 && inv.status !== "paid" ? `<div class="total-line"><span>Paid</span><span>₹${(inv.paid_amount || 0).toFixed(2)}</span></div>` : ""}
        <div class="total-line grand">
          <span>${inv.status === "partial" ? "Balance Due" : "Grand Total"}</span>
          <span>₹${inv.status === "partial" ? ((grand - (inv.paid_amount || 0)).toFixed(2)) : grand.toFixed(2)}</span>
        </div>
      </div>
    </div>
    <div class="words">${numToWords(grand)}</div>
  ` : ""}

  <!-- Bank & Transport -->
  ${!isPackingList && (shop?.bank_name || shop?.upi_id || inv.transport_mode) ? `
  <div style="display:flex;gap:12px;margin-top:8px;">
    ${(shop?.bank_name || shop?.upi_id) ? `
    <div class="bank-box" style="flex:1;">
      <div class="bank-title">💳 Payment Details</div>
      ${shop.bank_name ? `Bank: ${shop.bank_name}` : ""}
      ${shop.account_no ? ` | A/C: ${shop.account_no}` : ""}
      ${shop.ifsc ? ` | IFSC: ${shop.ifsc}` : ""}
      ${shop.branch ? ` | Branch: ${shop.branch}` : ""}
      ${shop.upi_id ? `<br>UPI: <b>${shop.upi_id}</b>` : ""}
    </div>` : ""}
    ${inv.transport_mode ? `
    <div class="bank-box" style="flex:1;">
      <div class="bank-title">🚚 Transport</div>
      Mode: ${inv.transport_mode}
      ${inv.vehicle_no ? ` | Vehicle: ${inv.vehicle_no}` : ""}
      ${inv.transporter ? `<br>Transporter: ${inv.transporter}` : ""}
      ${inv.lr_no ? ` | LR: ${inv.lr_no}` : ""}
      ${inv.waybill_no ? `<br>E-Waybill: <b>${inv.waybill_no}</b>` : ""}
    </div>` : ""}
  </div>` : ""}

  <!-- Notes -->
  ${(inv.notes || shop?.invoice_notes) ? `<div style="margin-top:8px;font-size:11px;color:#555;"><b>Notes:</b> ${inv.notes || shop?.invoice_notes}</div>` : ""}
  ${shop?.terms ? `<div style="margin-top:4px;font-size:10px;color:#888;"><b>Terms:</b> ${shop.terms}</div>` : ""}

  <!-- Delivery Challan Transporter/Recipient signatures -->
  ${isDeliveryChallan ? `
    <div style="display:flex; justify-content:space-between; margin-top:30px; border-top:1px dashed #ccc; padding-top:15px; font-size:11px; color:#333;">
      <div style="text-align:center; flex:1;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #eee; margin:0 20px; padding-top:5px; font-weight:bold;">Transporter's Signature</div>
      </div>
      <div style="text-align:center; flex:1;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #eee; margin:0 20px; padding-top:5px; font-weight:bold;">Recipient's Signature</div>
      </div>
      <div style="text-align:center; flex:1;">
        <div style="height:40px;"></div>
        <div style="border-top:1px solid #eee; margin:0 20px; padding-top:5px; font-weight:bold;">Authorized Signatory</div>
      </div>
    </div>
  ` : `
    <!-- Footer Signatures -->
    <div class="footer">
      <div class="terms">
        <div style="font-size:11px;color:#333;font-weight:700;">Declaration</div>
        <div>${footerDeclaration}</div>
      </div>
      <div class="sign-area">
        ${shop?.signature_url ? `<img src="${getCORSImageUrl(shop.signature_url)}" crossorigin="anonymous" class="sign-img" />` : `<div style="height:50px;"></div>`}
        <div class="sign-label">For ${(!shop || !shop.shop_name) ? "Authorized Signatory" : shop.shop_name}</div>
      </div>
    </div>
  `}

  <div style="text-align:center;margin-top:16px;font-size:9px;color:#aaa;">
    Generated by EasyBMT — B2B ${documentTitle} Layout (${activeTemplate})
  </div>
</div>
</body>
</html>`;
}

export default function InvoicePrintPreview({ open, onOpenChange, invoice, shopSettings }) {
  if (!invoice) return null;

  const isB2C = (invoice.billing_type || "B2C").toUpperCase() === "B2C";
  const isThermal = shopSettings?.printer_size === '58mm' || shopSettings?.printer_size === '80mm';
  
  // Enforce industrial A4 format if invoice was created from general invoices page
  // Fallback: If it's a legacy invoice without source, check if invoice_number lacks 'POS'
  const isGeneralInvoice = invoice.source === 'general' || (invoice.invoice_number && !invoice.invoice_number.includes('POS'));
  
  // States for document type and template layout live switcher in dialog
  const [docType, setDocType] = React.useState(() => invoice.type || "invoice");
  const [template, setTemplate] = React.useState(() => {
    const type = invoice.type || "invoice";
    if (type === "packing_list") return shopSettings?.packing_list_template || "template_1";
    if (type === "delivery_challan") return shopSettings?.delivery_challan_template || "template_1";
    return shopSettings?.b2b_invoice_template || "template_1";
  });

  const handleDocTypeChange = (newType) => {
    setDocType(newType);
    if (newType === "packing_list") {
      setTemplate(shopSettings?.packing_list_template || "template_1");
    } else if (newType === "delivery_challan") {
      setTemplate(shopSettings?.delivery_challan_template || "template_1");
    } else {
      setTemplate(shopSettings?.b2b_invoice_template || "template_1");
    }
  };

  const html = (isB2C && isThermal && !isGeneralInvoice && docType !== "packing_list" && docType !== "delivery_challan") 
    ? generateThermalHTML(invoice, shopSettings, shopSettings.printer_size)
    : generateInvoiceHTML(invoice, shopSettings, docType, template);

  const handlePrint = async () => {
    // For B2C thermal receipts, use the unified POS print service to respect settings (RawBT, BLE, USB, COM, etc.)
    if (isB2C && isThermal && !isGeneralInvoice && docType !== "packing_list" && docType !== "delivery_challan") {
      try {
        toast.loading("Sending to thermal printer...", { id: "pos-thermal-print" });
        const { printReceipt } = await import("@/lib/pos-print-service");
        const result = await printReceipt(invoice, shopSettings, {
          isDuplicate: false,
          preferNative: true,
          allowFallback: true
        });
        if (result && result.success) {
          toast.success("Receipt printed!", { id: "pos-thermal-print" });
        }
      } catch (err) {
        console.error("POS printing failed from preview:", err);
        toast.error("Failed to print: " + err.message, { id: "pos-thermal-print" });
      }
      return;
    }

    // Default standard A4 print path for B2B or general invoices
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    // Allow the browser engine time to parse document styles and fetch barcodes/QR images completely
    setTimeout(() => {
      win.print();
    }, 350);
  };

  const handleDownload = async () => {
    try {
      toast.loading("Generating PDF...", { id: "inv-pdf" });
      await downloadInvoicePDF(invoice, shopSettings, false, docType, template);
      toast.success("PDF downloaded!", { id: "inv-pdf" });
    } catch (err) {
      toast.error("Failed to generate PDF: " + err.message, { id: "inv-pdf" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-5xl max-h-[90vh] flex flex-col bg-white p-0 gap-0">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-card border-b border-border gap-3 shrink-0">
          <div>
            <p className="font-black text-[14px]">
              {invoice.type === "proforma" ? "Proforma Preview" : invoice.type === "quotation" ? "Quotation Preview" : "Invoice Preview"}
            </p>
            <p className="text-[11px] text-muted-foreground">{invoice.invoice_number} · {invoice.customer_name}</p>
          </div>

          {/* Document Switchers */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Type:</span>
              <select 
                value={docType} 
                onChange={(e) => handleDocTypeChange(e.target.value)}
                className="bg-background border border-border rounded-lg text-xs font-bold h-8 px-2 focus:outline-none cursor-pointer hover:border-primary/40 transition-all"
              >
                <option value="invoice">📄 Invoice / Tax Invoice</option>
                <option value="packing_list">📦 Packing List</option>
                <option value="delivery_challan">🚚 Delivery Challan</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Layout:</span>
              <select 
                value={template} 
                onChange={(e) => setTemplate(e.target.value)}
                className="bg-background border border-border rounded-lg text-xs font-bold h-8 px-2 focus:outline-none cursor-pointer hover:border-primary/40 transition-all"
              >
                <option value="template_1">🟠 Template 1 (Classic Amber)</option>
                <option value="template_2">🔵 Template 2 (Modern Blue)</option>
                <option value="template_3">⚫ Template 3 (Minimalist Slate)</option>
                <option value="template_4">🟢 Template 4 (Premium Emerald)</option>
                <option value="template_5">🟣 Template 5 (Creative Purple)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button size="sm" className="gold-gradient text-black font-bold gap-1.5 h-9" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Re-print
            </Button>
            <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground ml-1 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Preview iframe */}
        <div className="flex-1 overflow-auto -webkit-overflow-scrolling-touch">
          <iframe
            srcDoc={html}
            className="w-full h-full border-0"
            style={{ minHeight: "600px" }}
            title="Invoice Preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}