import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { generateInvoiceHTML } from "@/components/invoices/InvoicePrintPreview";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";

window.html2canvas = html2canvas;

// Helper to append cache-buster timestamp for CORS requests
const getCORSImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

// Helper: get initials for shop avatar fallback
const getInitials = (name) => {
  if (!name) return "GS";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Helper: format receipt date to "D MMM YYYY"
const formatReceiptDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = dateObj.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

// Generate HTML string for thermal slip PDF
export function generateThermalHTML(inv = {}, shop = {}, printerSize = "58mm") {
  if (!inv) inv = {};
  if (!shop) shop = {};
  const is80mm = printerSize === "80mm";
  const WC = is80mm ? "w80" : "w58";

  const shopName = !shop.shop_name ? "EASYBMT SHOP" : shop.shop_name;
  const shopInitials = getInitials(shopName);

  const subtotal = inv.subtotal || 0;
  const taxAmount = inv.tax_amount || 0;
  const grandTotal = inv.grand_total || 0;
  const discountAmount = subtotal + taxAmount - grandTotal;

  const totalQty = (inv.items || []).reduce((acc, item) => acc + (item.qty || 1), 0);
  const totalItems = (inv.items || []).length;

  // ── ITEMS HTML ──────────────────────────────────────────
  const itemsHtml = (inv.items || []).map((item, idx) => {
    const rateVal = parseFloat(item.rate || 0);
    const mrpVal = parseFloat(item.mrp || item.rate || 0);
    const qtyVal = item.qty || 1;
    const grossAmt = qtyVal * mrpVal;

    let baseDiscount = 0;
    if (mrpVal > rateVal) {
      baseDiscount = (mrpVal - rateVal) * qtyVal;
    }
    let manualShare = 0;
    if (discountAmount > 0.01 && subtotal > 0) {
      manualShare = discountAmount * (rateVal * qtyVal / subtotal);
    }
    const totalItemDisc = baseDiscount + manualShare;
    const finalAmt = Math.max(0, grossAmt - totalItemDisc);
    const discPct = grossAmt > 0 ? (totalItemDisc / grossAmt) * 100 : 0;
    const discStr = totalItemDisc > 0.01 ? `Disc: ${totalItemDisc.toFixed(2)}(${discPct.toFixed(2)}%)` : '';
    const itemLabel = item.name + (item.size ? ` ${item.size}` : '');
    const isLast = idx === (inv.items || []).length - 1;
    const borderStyle = isLast ? '' : ' style="border-bottom:1px solid #e8e8e8"';

    return `
<div class="i-row"${borderStyle}>
  <div class="i-c1">
    <div class="i-num">${String(idx + 1).padStart(2, '0')}</div>
    <div class="i-info">
      <div class="i-name">${itemLabel}</div>
      <div class="i-meta">${item.hsn ? `HSN:${item.hsn}` : ''} ${item.gst_rate ? `| GST:${item.gst_rate}%` : ''}</div>
      <div class="i-disc">${discStr}</div>
    </div>
  </div>
  <div class="i-c2">
    <div class="i-mrp">${mrpVal.toFixed(2)}</div>
    <div class="i-price">${rateVal.toFixed(2)}</div>
    <div class="i-qty">x${qtyVal}</div>
  </div>
  <div class="i-c3">
    <div class="i-gross">${grossAmt.toFixed(2)}</div>
    <div class="i-final">${finalAmt.toFixed(2)}</div>
  </div>
</div>`;
  }).join('');

  // ── LOGO ──────────────────────────────────────────────
  const logoHtml = shop.logo_url
    ? `<img src="${getCORSImageUrl(shop.logo_url)}" class="logo-img" alt="Logo" crossorigin="anonymous">`
    : `<div class="logo-init">${shopInitials}</div>`;

  // ── UPI QR ────────────────────────────────────────────
  const upiId = shop.upi_id || '';
  let upiFooterHtml = '';
  if (upiId) {
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${grandTotal}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
    const qrSize = is80mm ? '96px' : '72px';
    upiFooterHtml = `
    <div class="upi-label">Scan &amp; Pay via UPI</div>
    <img class="qr-img" src="${qrUrl}" crossorigin="anonymous" alt="UPI QR" style="width:${qrSize};height:${qrSize};">
    <div class="upi-id">${upiId}</div>`;
  }

  // ── BARCODE SVG ───────────────────────────────────────
  let barcodeHtml = '';
  if (inv.invoice_number) {
    const barcodeVal = inv.invoice_number;
    const svgW = is80mm ? 240 : 180;
    const svgH = is80mm ? 28 : 22;
    let rects = '';
    let cx = 0;
    for (let i = 0; i < 32; i++) {
      const c = barcodeVal.charCodeAt(i % barcodeVal.length) + i;
      const w = c % 3 === 0 ? 3.2 : c % 3 === 1 ? 1.4 : 2.2;
      rects += `<rect x="${cx.toFixed(1)}" y="0" width="${w}" height="${svgH}"/>`;
      cx += w + (c % 2 === 0 ? 1.8 : 1.2);
      if (cx > svgW - 8) break;
    }
    barcodeHtml = `
<div class="barcode-wrap">
  <svg viewBox="0 0 ${cx.toFixed(0)} ${svgH}" preserveAspectRatio="none" class="barcode-svg">
    <rect x="0" y="0" width="${cx.toFixed(0)}" height="${svgH}" fill="white"/>
    <g fill="#000">${rects}</g>
  </svg>
  <div class="barcode-no">${barcodeVal}</div>
</div>`;
  }

  // ── DISCOUNT ROW ───────────────────────────────────────
  const discRow = discountAmount > 0.01
    ? `<div class="tot-row disc-row"><span>Savings / Discount</span><span>-&#8377;${discountAmount.toFixed(2)}</span></div>` : '';

  // ── TERMS & CONDITIONS ─────────────────────────────────
  const termsHtml = shop && shop.terms
    ? `<div class="terms-block"><strong>T&amp;C:</strong> ${shop.terms.replace(/\n/g, '<br>')}</div>`
    : '';

  // ── CSS ────────────────────────────────────────────────
  const cssStyles = `
<style>
/* Reset (scoped) */
.rcpt, .rcpt * {
  margin:0; padding:0;
  box-sizing:border-box !important;
  max-width:100%;
  word-break:break-word;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.rcpt img { max-width:100%; height:auto; }

/* Shell */
.rcpt {
  background:#fff;
  color:#111;
  width:${is80mm ? '72mm' : '46mm'} !important;
  max-width:${is80mm ? '72mm' : '46mm'} !important;
  margin:0 auto !important;
  padding:0 !important;
  font-family:'Courier New',Courier,monospace;
  overflow:hidden !important;
  position:relative;
}
.w58 { font-size:8px; line-height:1.38; }
.w80 { font-size:10px; line-height:1.4; }

/* Top accent bar */
.top-bar {
  background:#111; color:#fff;
  text-align:center;
  padding:${is80mm ? '5px 4px' : '4px 4px'};
  letter-spacing:0.25em;
  font-size:${is80mm ? '7.5px' : '6.5px'};
  font-weight:700;
  font-family:Arial,sans-serif;
  text-transform:uppercase;
}

/* Header */
.rcpt-head {
  text-align:center;
  padding:${is80mm ? '10px 6px 8px' : '7px 5px 6px'};
  border-bottom:2px solid #111;
}
.logo-init {
  width:${is80mm ? '44px' : '36px'};
  height:${is80mm ? '44px' : '36px'};
  border-radius:50%;
  background:#111; color:#fff;
  display:flex; align-items:center; justify-content:center;
  margin:0 auto ${is80mm ? '6px' : '5px'};
  font-size:${is80mm ? '15px' : '12px'};
  font-weight:900;
  font-family:Arial Black,sans-serif;
  letter-spacing:-0.5px;
}
.logo-img {
  max-width:${is80mm ? '48px' : '38px'};
  max-height:${is80mm ? '48px' : '38px'};
  display:block; margin:0 auto ${is80mm ? '6px' : '5px'};
  object-fit:contain; border-radius:4px;
}
.biz-name {
  font-family:Arial Black,sans-serif;
  font-weight:900;
  font-size:${is80mm ? '14px' : '10.5px'};
  letter-spacing:0.04em;
  text-transform:uppercase;
  color:#000; line-height:1.2;
}
.biz-sub {
  font-size:${is80mm ? '7.5px' : '6.5px'};
  color:#444; margin-top:3px; line-height:1.5;
  font-family:Arial,sans-serif;
}

/* Section dividers */
.sep-dash  { border:none; border-top:1px dashed #bbb; margin:0; }
.sep-solid { border:none; border-top:1px solid #333;  margin:0; }
.sep-thick { border:none; border-top:2.5px solid #000; margin:0; }
.sep-double { border:none; border-top:3px double #000; margin:0; }

/* Invoice meta block */
.meta-block {
  padding:${is80mm ? '6px 8px' : '5px 6px'};
  display:flex; flex-direction:column; gap:2px;
}
.meta-row {
  display:flex; justify-content:space-between; align-items:baseline; gap:4px;
}
.mk {
  font-size:${is80mm ? '7.5px' : '6.5px'};
  color:#555; font-weight:700;
  text-transform:uppercase; letter-spacing:0.07em;
  font-family:Arial,sans-serif; flex-shrink:0;
}
.mv {
  font-size:${is80mm ? '8px' : '7px'};
  font-weight:700; text-align:right;
  word-break:break-all; overflow-wrap:anywhere; flex:1;
}
.mv.inv-no { color:#B8521A; font-size:${is80mm ? '8.5px' : '7.5px'}; }

/* Items section */
.items-section { padding:0 ${is80mm ? '6px' : '4px'}; }

/* Column header */
.col-head {
  display:grid;
  grid-template-columns:${is80mm ? '1fr 42px 46px' : '1fr 34px 38px'};
  gap:2px;
  padding:${is80mm ? '5px 0 4px' : '4px 0 3px'};
  font-size:${is80mm ? '7px' : '6px'};
  font-weight:900; text-transform:uppercase;
  letter-spacing:0.08em; color:#333;
  font-family:Arial,sans-serif;
}
.col-head-c2 { text-align:right; }
.col-head-c3 { text-align:right; }
.col-head-c2-inner { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.col-head-c3-inner { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }

/* Item row */
.i-row {
  display:grid;
  grid-template-columns:${is80mm ? '1fr 42px 46px' : '1fr 34px 38px'};
  gap:2px;
  padding:${is80mm ? '6px 0' : '5px 0'};
  align-items:start;
}
.i-c1 { display:flex; gap:${is80mm ? '5px' : '4px'}; align-items:flex-start; }
.i-num {
  font-size:${is80mm ? '7px' : '6px'};
  color:#999; font-weight:700;
  padding-top:1px; flex-shrink:0;
  font-family:Arial,sans-serif;
}
.i-info { flex:1; min-width:0; }
.i-name {
  font-weight:700;
  font-size:${is80mm ? '8.5px' : '7.5px'};
  color:#000; word-break:break-word;
  overflow-wrap:anywhere; line-height:1.25;
}
.i-meta {
  font-size:${is80mm ? '6.5px' : '5.5px'};
  color:#777; margin-top:1px;
  font-family:Arial,sans-serif; letter-spacing:0.03em;
}
.i-disc {
  font-size:${is80mm ? '6.5px' : '5.5px'};
  color:#16803c; margin-top:1px;
  font-family:Arial,sans-serif;
}

/* Price columns */
.i-c2 { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.i-mrp { font-size:${is80mm ? '7px' : '6px'}; color:#888; text-decoration:line-through; }
.i-price { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#333; font-weight:600; }
.i-qty { font-size:${is80mm ? '7px' : '6px'}; color:#555; }

.i-c3 { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.i-gross { font-size:${is80mm ? '7px' : '6px'}; color:#aaa; text-decoration:line-through; }
.i-final { font-size:${is80mm ? '8.5px' : '7.5px'}; font-weight:900; color:#000; }

/* Summary block */
.summary-block { padding:${is80mm ? '6px 8px' : '5px 6px'}; font-family:Arial,sans-serif; }
.sum-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
.sum-label { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#555; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
.sum-val { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#333; font-weight:700; }

/* Totals */
.totals-block { padding:${is80mm ? '6px 8px' : '5px 6px'}; font-family:Arial,sans-serif; }
.tot-row { display:flex; justify-content:space-between; font-size:${is80mm ? '8px' : '7px'}; margin-bottom:3px; font-weight:600; color:#333; }
.tot-row.disc-row { color:#16803c; }
.tot-row.tax-row { color:#555; font-weight:500; }
.grand-row { display:flex; justify-content:space-between; align-items:baseline; padding:${is80mm ? '5px 0 4px' : '4px 0 3px'}; margin-top:2px; }
.grand-label { font-family:Arial Black,sans-serif; font-weight:900; font-size:${is80mm ? '11px' : '9px'}; color:#000; text-transform:uppercase; letter-spacing:0.04em; }
.grand-val { font-family:Arial Black,sans-serif; font-weight:900; font-size:${is80mm ? '13px' : '10.5px'}; color:#000; }
.hindi-total { display:flex; justify-content:space-between; font-size:${is80mm ? '8px' : '7px'}; color:#555; margin-top:2px; font-weight:500; }

/* Savings highlight */
.savings-box { background:#f0fdf4; border:1px solid #86efac; border-radius:3px; padding:${is80mm ? '4px 8px' : '3px 6px'}; margin:${is80mm ? '6px 8px' : '5px 6px'}; display:flex; justify-content:space-between; align-items:center; }
.savings-label { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#15803d; font-weight:700; font-family:Arial,sans-serif; text-transform:uppercase; letter-spacing:0.05em; }
.savings-val { font-size:${is80mm ? '8.5px' : '7.5px'}; color:#15803d; font-weight:900; font-family:Arial Black,Arial,sans-serif; }

/* Terms block */
.terms-block { font-family:Arial,sans-serif; font-size:${is80mm ? '6.5px' : '5.5px'}; font-weight:600; text-align:center; color:#555; padding:${is80mm ? '4px 8px' : '3px 6px'}; line-height:1.3; }

/* Badges */
.badges { display:flex; gap:4px; flex-wrap:wrap; padding:${is80mm ? '0 8px 6px' : '0 6px 5px'}; }
.badge { font-size:${is80mm ? '7px' : '6px'}; font-weight:900; letter-spacing:0.06em; padding:${is80mm ? '2px 7px' : '2px 5px'}; border-radius:2px; text-transform:uppercase; border:1px solid currentColor; font-family:Arial,sans-serif; background:#fff; }
.cash { color:#166534; }
.upi  { color:#4c1d95; }
.card { color:#991b1b; }
.b2c  { color:#1e3a8a; }
.b2b  { color:#78350f; }

/* Points row */
.points-row { display:flex; justify-content:space-between; padding:${is80mm ? '4px 8px' : '3px 6px'}; font-size:${is80mm ? '7px' : '6px'}; color:#666; font-family:Arial,sans-serif; border-top:1px dashed #ddd; }

/* Footer */
.rcpt-foot { text-align:center; padding:${is80mm ? '8px 6px 10px' : '6px 5px 8px'}; }
.thank-msg { font-size:${is80mm ? '8px' : '7px'}; letter-spacing:0.12em; color:#333; font-family:Arial,sans-serif; font-weight:700; text-transform:uppercase; margin-bottom:${is80mm ? '10px' : '8px'}; }
.upi-label { font-size:${is80mm ? '7px' : '6px'}; font-weight:700; letter-spacing:0.15em; color:#333; text-transform:uppercase; font-family:Arial,sans-serif; margin-bottom:5px; }
.qr-img { display:block; margin:0 auto 4px; object-fit:contain; }
.upi-id { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#333; font-weight:700; word-break:break-all; font-family:Arial,sans-serif; margin-bottom:${is80mm ? '10px' : '8px'}; }
.barcode-wrap { display:flex; flex-direction:column; align-items:center; margin-top:${is80mm ? '10px' : '8px'}; }
.barcode-svg { width:${is80mm ? '150px' : '110px'}; height:${is80mm ? '26px' : '20px'}; display:block; margin-bottom:3px; }
.barcode-no { font-size:${is80mm ? '7.5px' : '6.5px'}; color:#444; letter-spacing:0.12em; font-family:Arial,sans-serif; }
.visit-again { margin-top:${is80mm ? '10px' : '8px'}; border-top:1px dashed #ccc; padding-top:${is80mm ? '7px' : '6px'}; }
.visit-l1 { font-size:${is80mm ? '7.5px' : '6.5px'}; font-weight:700; letter-spacing:0.1em; color:#444; text-transform:uppercase; font-family:Arial,sans-serif; margin-bottom:2px; }
.visit-l2 { font-family:Arial Black,Arial,sans-serif; font-size:${is80mm ? '8.5px' : '7.5px'}; font-weight:900; letter-spacing:0.12em; color:#000; text-transform:uppercase; }

/* Bottom accent */
.bot-bar { background:#111; color:#fff; text-align:center; padding:${is80mm ? '4px' : '3px'}; font-size:${is80mm ? '6.5px' : '5.5px'}; letter-spacing:0.2em; font-family:Arial,sans-serif; text-transform:uppercase; }

/* Print */
@media print {
  html,body { width:${is80mm ? '80mm' : '58mm'} !important; margin:0 !important; padding:0 !important; background:#fff !important; }
  @page { size:${is80mm ? '80mm' : '58mm'} auto; margin:0mm; }
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .rcpt { box-shadow:none !important; border:none !important; width:${is80mm ? '72mm' : '46mm'} !important; max-width:${is80mm ? '72mm' : '46mm'} !important; margin:0 auto !important; }
}
</style>`;

  // ── HTML BODY ──────────────────────────────────────────
  const payMethod = (inv.payment_method || 'CASH').toLowerCase();
  const billType = (inv.billing_type || 'B2C').toLowerCase();
  const points = (inv.customer_points || 0).toFixed(2);
  const custName = inv.customer_name || 'Walk-in Customer';
  const isWalkin = custName.toLowerCase().includes('walk-in');
  const phone = inv.customer_phone || '';
  const savingsAmt = discountAmount > 0.01 ? discountAmount : null;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Receipt ${inv.invoice_number || ''}</title>${cssStyles}</head>
<body>
<div class="rcpt ${WC}">

  <div class="top-bar">Cash Memo / Tax Invoice</div>

  <div class="rcpt-head">
    ${logoHtml}
    <div class="biz-name">${shopName}</div>
    <div class="biz-sub">
      ${shop.address ? `<div>${shop.address}</div>` : ''}
      ${shop.gstin ? `<div>GSTIN: ${shop.gstin}</div>` : ''}
      ${shop.phone ? `<div>Tel: ${shop.phone}</div>` : ''}
    </div>
  </div>

  <hr class="sep-solid">

  <div class="meta-block">
    <div class="meta-row"><span class="mk">Invoice No.</span><span class="mv inv-no">${inv.invoice_number || ''}</span></div>
    <div class="meta-row"><span class="mk">Date &amp; Time</span><span class="mv">${formatReceiptDate(inv.date)} | ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
    <div class="meta-row"><span class="mk">Customer</span><span class="mv">${custName}</span></div>
    ${phone && !isWalkin ? `<div class="meta-row"><span class="mk">Mobile</span><span class="mv">${phone}</span></div>` : ''}
  </div>

  <hr class="sep-thick">

  <div class="items-section">
    <div class="col-head">
      <div>
        <div>Item Description</div>
        <div style="margin-top:1px">HSN | GST%</div>
      </div>
      <div class="col-head-c2">
        <div class="col-head-c2-inner">
          <span>MRP</span>
          <span>Price</span>
          <span>Qty</span>
        </div>
      </div>
      <div class="col-head-c3">
        <div class="col-head-c3-inner">
          <span>MRP Amt</span>
          <span>Net Amt</span>
        </div>
      </div>
    </div>
    <hr class="sep-dash">
    ${itemsHtml}
  </div>

  <hr class="sep-thick">

  <div class="summary-block">
    <div class="sum-row">
      <span class="sum-label">Total Items</span>
      <span class="sum-val">${totalItems}</span>
    </div>
    <div class="sum-row">
      <span class="sum-label">Total Qty</span>
      <span class="sum-val">${totalQty} Units</span>
    </div>
  </div>

  <hr class="sep-dash">

  <div class="totals-block">
    <div class="tot-row"><span>Subtotal (excl. GST)</span><span>&#8377;${subtotal.toFixed(2)}</span></div>
    ${taxAmount > 0.01 ? `<div class="tot-row tax-row"><span>CGST + SGST</span><span>&#8377;${taxAmount.toFixed(2)}</span></div>` : ''}
    ${discRow}
  </div>

  <hr class="sep-double">

  <div class="totals-block" style="padding-bottom:${is80mm ? '4px' : '3px'}">
    <div class="grand-row">
      <span class="grand-label">Total</span>
      <span class="grand-val">&#8377;${grandTotal.toFixed(2)}</span>
    </div>
    <div class="hindi-total"><span>\u0915\u0941\u0932 \u092c\u093f\u0932 \u0930\u093e\u0936\u093f</span><span>&#8377;${grandTotal.toFixed(2)}</span></div>
  </div>

  <hr class="sep-solid">

  ${savingsAmt ? `
  <div class="savings-box">
    <span class="savings-label">\uD83C\uDF89 Your Savings Today</span>
    <span class="savings-val">&#8377;${savingsAmt.toFixed(2)}</span>
  </div>` : ''}

  <div class="badges">
    <span class="badge ${payMethod}">${(inv.payment_method || 'CASH').toUpperCase()}</span>
    <span class="badge ${billType}">${(inv.billing_type || 'B2C').toUpperCase()}</span>
  </div>

  ${termsHtml}

  <div class="points-row">
    <span>Loyalty Points Balance</span>
    <span>${points} pts</span>
  </div>

  <hr class="sep-dash">

  <div class="rcpt-foot">
    <div class="thank-msg">\u2726 Thank You for Shopping \u2726</div>
    ${upiFooterHtml}
    ${barcodeHtml}
    <div class="visit-again">
      <div class="visit-l1">\uD83D\uDE4F Have a Good Day \uD83D\uDE4F</div>
      <div class="visit-l2">\u2726 Please Visit Again \u2726</div>
    </div>
  </div>

  <div class="bot-bar">Powered by EasyBMT</div>

</div>
</body>
</html>`;
}
