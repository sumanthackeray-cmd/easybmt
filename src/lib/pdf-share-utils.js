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

  // â”€â”€ ITEMS HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ LOGO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const logoHtml = shop.logo_url
    ? `<img src="${getCORSImageUrl(shop.logo_url)}" class="logo-img" alt="Logo" crossorigin="anonymous">`
    : `<div class="logo-init">${shopInitials}</div>`;

  // â”€â”€ UPI QR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const upiId = shop.upi_id || '';
  let upiFooterHtml = '';
  if (upiId) {
    const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${grandTotal}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
    const qrSize = '35mm';
    upiFooterHtml = `
    <div class="upi-label">Scan &amp; Pay via UPI</div>
    <img class="qr-img" src="${qrUrl}" crossorigin="anonymous" alt="UPI QR" style="width:${qrSize};height:${qrSize};">
    <div class="upi-id">${upiId}</div>`;
  }

  // â”€â”€ BARCODE SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ DISCOUNT ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const discRow = discountAmount > 0.01
    ? `<div class="tot-row disc-row"><span>Savings / Discount</span><span>-&#8377;${discountAmount.toFixed(2)}</span></div>` : '';

  // â”€â”€ TERMS & CONDITIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const termsHtml = shop && shop.terms
    ? `<div class="terms-block"><strong>T&amp;C:</strong> ${shop.terms.replace(/\n/g, '<br>')}</div>`
    : '';

  // â”€â”€ CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  color:#000;
  width:100% !important;
  max-width:100% !important;
  margin:0 auto !important;
  padding:${is80mm ? '0 5mm' : '0 3mm'} !important;
  font-family:'Courier New',Courier,monospace;
  overflow:hidden !important;
  position:relative;
}
.w58 { font-size:19.2px; line-height:1.38; }
.w80 { font-size:24px; line-height:1.4; }

/* Top accent bar */
.top-bar {
  background:#000; color:#fff;
  text-align:center;
  padding:${is80mm ? '5px 4px' : '4px 4px'};
  letter-spacing:0.25em;
  font-size:${is80mm ? '18px' : '15.6px'};
  font-weight:700;
  font-family:Arial,sans-serif;
  text-transform:uppercase;
}

/* Header */
.rcpt-head {
  text-align:center;
  padding:${is80mm ? '10px 6px 8px' : '7px 5px 6px'};
  border-bottom:2px solid #000;
}
.logo-init {
  width:${is80mm ? '52.8px' : '43.2px'};
  height:${is80mm ? '52.8px' : '43.2px'};
  border-radius:50%;
  background:#000; color:#fff;
  display:flex; align-items:center; justify-content:center;
  margin:0 auto ${is80mm ? '6px' : '5px'};
  font-size:${is80mm ? '53.9px' : '43.2px'};
  font-weight:900;
  font-family:Arial Black,sans-serif;
  letter-spacing:-0.5px;
}
.logo-img {
  max-width:${is80mm ? '57.6px' : '45.6px'};
  max-height:${is80mm ? '57.6px' : '45.6px'};
  display:block; margin:0 auto ${is80mm ? '6px' : '5px'};
  object-fit:contain; border-radius:4px;
}
.biz-name {
  font-family:Arial Black,sans-serif;
  font-weight:900;
  font-size:${is80mm ? '50.4px' : '37.7px'};
  letter-spacing:0.04em;
  text-transform:uppercase;
  color:#000; line-height:1.2;
}
.biz-sub {
  font-size:${is80mm ? '27px' : '23.3px'};
  color:#000; margin-top:3px; line-height:1.5;
  font-family:Arial,sans-serif;
}

/* Section dividers */
.sep-dash  { border:none; border-top:2px dashed #000; margin:0; }
.sep-solid { border:none; border-top:1.5px solid #000;  margin:0; }
.sep-thick { border:none; border-top:3px solid #000; margin:0; }
.sep-double { border:none; border-top:4px double #000; margin:0; }

/* Invoice meta block */
.meta-block {
  padding:${is80mm ? '6px 8px' : '5px 6px'};
  display:flex; flex-direction:column; gap:2px;
}
.meta-row {
  display:flex; justify-content:space-between; align-items:baseline; gap:4px;
}
.mk {
  font-size:${is80mm ? '22.5px' : '19.5px'};
  color:#000; font-weight:700;
  text-transform:uppercase; letter-spacing:0.07em;
  font-family:Arial,sans-serif; flex-shrink:0;
}
.mv {
  font-size:${is80mm ? '24px' : '21px'};
  font-weight:700; text-align:right;
  word-break:break-all; overflow-wrap:anywhere; flex:1;
  color:#000;
}
.mv.inv-no { color:#000; font-size:${is80mm ? '25.5px' : '22.5px'}; }

/* Items section */
.items-section { padding:0 ${is80mm ? '6px' : '4px'}; }

/* Column header */
.col-head {
  display:grid;
  grid-template-columns: 1.8fr 1.3fr 1.3fr;
  gap:4px;
  padding:${is80mm ? '5px 0 4px' : '4px 0 3px'};
  font-size:${is80mm ? '25.2px' : '21.6px'};
  font-weight:900; text-transform:uppercase;
  letter-spacing:0.08em; color:#000;
  font-family:Arial,sans-serif;
}
.col-head-c2 { text-align:right; }
.col-head-c3 { text-align:right; }
.col-head-c2-inner { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.col-head-c3-inner { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }

/* Item row */
.i-row {
  display:grid;
  grid-template-columns: 1.8fr 1.3fr 1.3fr;
  gap:4px;
  padding:${is80mm ? '6px 0' : '5px 0'};
  align-items:start;
}
.i-c1 { display:flex; gap:${is80mm ? '5px' : '4px'}; align-items:flex-start; }
.i-num {
  font-size:${is80mm ? '25.2px' : '21.6px'};
  color:#000; font-weight:700;
  padding-top:1px; flex-shrink:0;
  font-family:Arial,sans-serif;
}
.i-info { flex:1; min-width:0; }
.i-name {
  font-weight:700;
  font-size:${is80mm ? '30.6px' : '27px'};
  color:#000; word-break:break-word;
  overflow-wrap:anywhere; line-height:1.25;
}
.i-meta {
  font-size:${is80mm ? '23.4px' : '19.8px'};
  color:#000; margin-top:1px;
  font-family:Arial,sans-serif; letter-spacing:0.03em;
}
.i-disc {
  font-size:${is80mm ? '23.4px' : '19.8px'};
  color:#000; margin-top:1px;
  font-family:Arial,sans-serif;
}

/* Price columns */
.i-c2 { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.i-mrp { font-size:${is80mm ? '25.2px' : '21.6px'}; color:#000; text-decoration:line-through; }
.i-price { font-size:${is80mm ? '27px' : '23.4px'}; color:#000; font-weight:600; }
.i-qty { font-size:${is80mm ? '25.2px' : '21.6px'}; color:#000; }

.i-c3 { display:flex; flex-direction:column; align-items:flex-end; gap:1px; }
.i-gross { font-size:${is80mm ? '25.2px' : '21.6px'}; color:#000; text-decoration:line-through; }
.i-final { font-size:${is80mm ? '30.6px' : '27px'}; font-weight:900; color:#000; }

/* Summary block */
.summary-block { padding:${is80mm ? '6px 8px' : '5px 6px'}; font-family:Arial,sans-serif; }
.sum-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; }
.sum-label { font-size:${is80mm ? '22.5px' : '19.5px'}; color:#000; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
.sum-val { font-size:${is80mm ? '22.5px' : '19.5px'}; color:#000; font-weight:700; }

/* Totals */
.totals-block { padding:${is80mm ? '6px 8px' : '5px 6px'}; font-family:Arial,sans-serif; }
.tot-row { display:flex; justify-content:space-between; font-size:${is80mm ? '24px' : '21px'}; margin-bottom:3px; font-weight:600; color:#000; }
.tot-row.disc-row { color:#000; }
.tot-row.tax-row { color:#000; font-weight:500; }
.grand-row { display:flex; justify-content:space-between; align-items:baseline; padding:${is80mm ? '5px 0 4px' : '4px 0 3px'}; margin-top:2px; }
.grand-label { font-family:Arial Black,sans-serif; font-weight:900; font-size:${is80mm ? '33px' : '27px'}; color:#000; text-transform:uppercase; letter-spacing:0.04em; }
.grand-val { font-family:Arial Black,sans-serif; font-weight:900; font-size:${is80mm ? '39px' : '31.5px'}; color:#000; }
.hindi-total { display:flex; justify-content:space-between; font-size:${is80mm ? '24px' : '21px'}; color:#000; margin-top:2px; font-weight:500; }

/* Savings highlight */
.savings-box { background:#fff; border:1.5px solid #000; border-radius:3px; padding:${is80mm ? '4px 8px' : '3px 6px'}; margin:${is80mm ? '6px 8px' : '5px 6px'}; display:flex; justify-content:space-between; align-items:center; }
.savings-label { font-size:${is80mm ? '22.5px' : '19.5px'}; color:#000; font-weight:700; font-family:Arial,sans-serif; text-transform:uppercase; letter-spacing:0.05em; }
.savings-val { font-size:${is80mm ? '25.5px' : '22.5px'}; color:#000; font-weight:900; font-family:Arial Black,Arial,sans-serif; }

/* Terms block */
.terms-block { font-family:Arial,sans-serif; font-size:${is80mm ? '19.5px' : '16.5px'}; font-weight:600; text-align:center; color:#000; padding:${is80mm ? '4px 8px' : '3px 6px'}; line-height:1.3; }

/* Badges */
.badges { display:flex; gap:4px; flex-wrap:wrap; padding:${is80mm ? '0 8px 6px' : '0 6px 5px'}; }
.badge { font-size:${is80mm ? '21px' : '18px'}; font-weight:900; letter-spacing:0.06em; padding:${is80mm ? '2px 7px' : '2px 5px'}; border-radius:2px; text-transform:uppercase; border:1.5px solid currentColor; font-family:Arial,sans-serif; background:#fff; }
.cash { color:#000; }
.upi  { color:#000; }
.card { color:#000; }
.b2c  { color:#000; }
.b2b  { color:#000; }

/* Points row */
.points-row { display:flex; justify-content:space-between; padding:${is80mm ? '4px 8px' : '3px 6px'}; font-size:${is80mm ? '21px' : '18px'}; color:#000; font-family:Arial,sans-serif; border-top:1.5px dashed #000; }

/* Footer */
.rcpt-foot { text-align:center; padding:${is80mm ? '8px 6px 10px' : '6px 5px 8px'}; }
.thank-msg { font-size:${is80mm ? '24px' : '21px'}; letter-spacing:0.12em; color:#000; font-family:Arial,sans-serif; font-weight:700; text-transform:uppercase; margin-bottom:${is80mm ? '10px' : '8px'}; }
.upi-label { font-size:${is80mm ? '21px' : '18px'}; font-weight:700; letter-spacing:0.15em; color:#000; text-transform:uppercase; font-family:Arial,sans-serif; margin-bottom:5px; }
.qr-img { display:block; margin:0 auto 4px; object-fit:contain; filter: grayscale(1) contrast(100); }
.upi-id { font-size:${is80mm ? '22.5px' : '19.5px'}; color:#000; font-weight:700; word-break:break-all; font-family:Arial,sans-serif; margin-bottom:${is80mm ? '10px' : '8px'}; }
.barcode-wrap { display:flex; flex-direction:column; align-items:center; margin-top:${is80mm ? '10px' : '8px'}; }
.barcode-svg { width:${is80mm ? '150px' : '110px'}; height:${is80mm ? '26px' : '20px'}; display:block; margin-bottom:3px; }
.barcode-no { font-size:${is80mm ? '22.5px' : '19.5px'}; color:#000; letter-spacing:0.12em; font-family:Arial,sans-serif; }
.visit-again { margin-top:${is80mm ? '10px' : '8px'}; border-top:1.5px dashed #000; padding-top:${is80mm ? '7px' : '6px'}; }
.visit-l1 { font-size:${is80mm ? '22.5px' : '19.5px'}; font-weight:700; letter-spacing:0.1em; color:#000; text-transform:uppercase; font-family:Arial,sans-serif; margin-bottom:2px; }
.visit-l2 { font-family:Arial Black,Arial,sans-serif; font-size:${is80mm ? '25.5px' : '22.5px'}; font-weight:900; letter-spacing:0.12em; color:#000; text-transform:uppercase; }

/* Bottom accent */
.bot-bar { background:#000; color:#fff; text-align:center; padding:${is80mm ? '4px' : '3px'}; font-size:${is80mm ? '19.5px' : '16.5px'}; letter-spacing:0.2em; font-family:Arial,sans-serif; text-transform:uppercase; }

/* Print */
@media print {
  html,body { width:${is80mm ? '80mm' : '58mm'} !important; margin:0 !important; padding:0 !important; background:#fff !important; }
  @page { size:${is80mm ? '80mm' : '58mm'} auto; margin:0mm; }
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .rcpt { box-shadow:none !important; border:none !important; width:100% !important; max-width:100% !important; margin:0 !important; padding:${is80mm ? '0 5mm' : '0 3mm'} !important; }
}
</style>`;

  // â”€â”€ HTML BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  <div style="height: 15mm;"></div>

</div>
</body>
</html>`;
}

// Helper: Wait for all images to fully load
const waitForImages = async (container) => {
  const imgs = Array.from(container.getElementsByTagName("img"));
  const promises = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // resolve anyway on error to avoid blocking
    });
  });
  await Promise.all(promises);
};

// Helper: Lock image sizes to prevent squishing/stretching in html2canvas
const lockImageDimensions = (container) => {
  const imgs = Array.from(container.getElementsByTagName("img"));
  imgs.forEach((img) => {
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (natW && natH) {
      const win = img.ownerDocument.defaultView || window;
      let maxW = natW;
      let maxH = natH;
      
      try {
        const computedStyle = win.getComputedStyle(img);
        maxW = parseFloat(computedStyle.maxWidth) || img.offsetWidth || natW;
        maxH = parseFloat(computedStyle.maxHeight) || img.offsetHeight || natH;
      } catch (e) {
        maxW = img.offsetWidth || natW;
        maxH = img.offsetHeight || natH;
      }

      if (!maxW || maxW === 0 || isNaN(maxW)) maxW = natW;
      if (!maxH || maxH === 0 || isNaN(maxH)) maxH = natH;

      // Special overrides for A4 templates logo/signature and B2C receipt logo
      if (img.classList.contains("sign-img")) {
        maxW = 120;
        maxH = 50;
      } else if (img.classList.contains("logo-img")) {
        maxW = 150;
        maxH = 48;
      } else if (img.classList.contains("receipt-logo")) {
        maxW = 52;
        maxH = 52;
      } else if (img.style.maxHeight === "48px" || (img.src && img.src.includes("logo"))) {
        maxW = 150;
        maxH = 48;
      }

      const ratio = natW / natH;
      let newW = natW;
      let newH = natH;

      // Maintain proportional aspect ratio within constraints
      if (newW > maxW) {
        newW = maxW;
        newH = newW / ratio;
      }
      if (newH > maxH) {
        newH = maxH;
        newW = newH * ratio;
      }

      img.style.width = `${newW}px`;
      img.style.height = `${newH}px`;
      img.style.maxWidth = "none";
      img.style.maxHeight = "none";
      img.style.objectFit = "contain";
      img.style.alignSelf = "flex-start"; // Prevent Flexbox stretch
    }
  });
};

// Render thermal slip to PDF
async function renderThermalToPDFBlob(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthPx = is80mm ? 380 : 280;
  const widthMm = is80mm ? 80 : 58;

  const html = generateThermalHTML(inv, shop, printerSize);

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "0";
  tempDiv.style.width = `${widthPx}px`;
  tempDiv.style.background = "#ffffff";
  tempDiv.style.padding = "0";
  tempDiv.style.display = "flex";
  tempDiv.style.justifyContent = "center";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  // Wait for rendering and image load (qr code, logo, etc.)
  await waitForImages(tempDiv);
  lockImageDimensions(tempDiv);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    console.warn("Document fonts loading promise failed", e);
  }

  // Inject standard text rendering stabilizer styles specifically for the html2canvas engine capture
  const stabilizerStyle = document.createElement("style");
  stabilizerStyle.innerHTML = `
    /* PDF Capture Specific Overrides */
    body, html {
      background: #ffffff !important;
      background-color: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .rcpt {
      box-shadow: none !important;
      border: none !important;
      padding: 6px !important;
      margin: 0 auto !important;
      background: #ffffff !important;
    }
    /* Hide jagged paper edges on digital PDF */
    .rcpt::before,
    .rcpt::after {
      display: none !important;
      content: none !important;
      margin: 0 !important;
      height: 0 !important;
    }
    /* Guarantee perfect font smoothing */
    * {
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      font-variant-numeric: lnum tabular-nums !important;
    }
  `;
  tempDiv.appendChild(stabilizerStyle);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 3, // High scale for crisp text
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: widthPx,
      windowWidth: widthPx,
      windowHeight: tempDiv.scrollHeight + 100, // Prevent bottom cutoff
    });

    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const heightMm = (canvas.height / canvas.width) * widthMm;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [widthMm, heightMm]
    });

    doc.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
    return doc;
  } catch (err) {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    throw err;
  }
}

// Helper: render invoice HTML to a canvas, then to PDF blob
export async function renderInvoiceToPDFBlob(inv, shop, forceA4 = false, documentType = null, templateId = null) {
  // Check if invoice is B2C (Default is B2C if billing_type is empty)
  // Enforce A4 if explicitly requested OR if created from general invoices page (source === 'general')
  // Fallback: If it's a legacy invoice without source, check if invoice_number lacks 'POS'
  const isGeneralInvoice = inv.source === 'general' || (inv.invoice_number && !inv.invoice_number.includes('POS') && !inv.invoice_number.includes('SM-') && !inv.invoice_number.includes('FSH-'));
  const shouldForceA4 = forceA4 || isGeneralInvoice || documentType === "packing_list" || documentType === "delivery_challan";
  const isB2C = !shouldForceA4 && (inv.billing_type || "B2C").toUpperCase() === "B2C";
  
  if (isB2C) {
    // Determine roll size based on active selection in DOM, or shop settings
    const activeReceipt = document.querySelector(".thermal-receipt-print-area");
    let printerSize = "58mm";
    if (activeReceipt) {
      if (activeReceipt.classList.contains("printer-80mm")) {
        printerSize = "80mm";
      }
    } else if (shop.printer_size) {
      printerSize = shop.printer_size;
    }
    
    try {
      return await renderThermalToPDFBlob(inv, shop, printerSize);
    } catch (err) {
      console.error("Failed to generate thermal PDF, falling back to A4 template", err);
    }
  }

  // Standard A4 template generation for B2B or fallback
  const docsToRender = [];
  if (inv.create_packing_list || inv.create_delivery_challan) {
    docsToRender.push({ type: "invoice", template: shop?.b2b_invoice_template || "template_1" });
    if (inv.create_delivery_challan) {
      docsToRender.push({ type: "delivery_challan", template: shop?.delivery_challan_template || "template_1" });
    }
    if (inv.create_packing_list) {
      docsToRender.push({ type: "packing_list", template: shop?.packing_list_template || "template_1" });
    }
  } else {
    const activeTemplate = templateId || (
      (documentType || inv.type) === "packing_list" ? shop?.packing_list_template :
      (documentType || inv.type) === "delivery_challan" ? shop?.delivery_challan_template :
      shop?.b2b_invoice_template
    ) || "template_1";
    docsToRender.push({ type: documentType || inv.type || "invoice", template: activeTemplate });
  }

  let doc = null;
  const imgWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points

  for (let idx = 0; idx < docsToRender.length; idx++) {
    const currentDoc = docsToRender[idx];
    const html = generateInvoiceHTML(inv, shop, currentDoc.type, currentDoc.template);

    // Use a dynamic iframe to isolate rendering, completely avoiding parent stylesheet (Tailwind, reset) leakage
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = "800px";
    iframe.style.height = "1130px";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const docContext = iframe.contentWindow.document;
    docContext.open();
    docContext.write(html);
    docContext.close();

    // Wait for loading inside iframe context
    await new Promise((r) => {
      iframe.onload = r;
      setTimeout(r, 600); // safety fallback
    });

    const iframeBody = iframe.contentWindow.document.body;
    await waitForImages(iframeBody);
    lockImageDimensions(iframeBody);

    try {
      if (iframe.contentWindow.document.fonts && iframe.contentWindow.document.fonts.ready) {
        await iframe.contentWindow.document.fonts.ready;
      }
    } catch (e) {
      console.warn("Iframe fonts loading promise failed", e);
    }

    try {
      const canvas = await html2canvas(iframeBody, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 800,
        windowWidth: 800,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (!doc) {
        doc = new jsPDF("p", "pt", "a4");
      } else {
        doc.addPage();
      }

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Additional pages if content overflows
      while (heightLeft > 0) {
        position = -(pageHeight * (Math.ceil(imgHeight / pageHeight) - Math.ceil(heightLeft / pageHeight)));
        doc.addPage();
        doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    } catch (err) {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      throw err;
    }
  }

  return doc;
}

// Upload PDF to cloud and return URL (for WhatsApp sharing)
export async function generateAndUploadInvoicePDF(inv, shop, forceA4 = false, documentType = null, templateId = null) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4, documentType, templateId);
  const blob = doc.output("blob");
  const file = new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// Instant local PDF download - no cloud upload
export async function downloadInvoicePDF(inv, shop, forceA4 = false, documentType = null, templateId = null) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4, documentType, templateId);
  const filename = `${inv.invoice_number || "invoice"}.pdf`;
  doc.save(filename);
  return filename;
}

// Generate PDF blob for WhatsApp Web Share API
export async function getInvoicePDFBlob(inv, shop, forceA4 = false, documentType = null, templateId = null) {
  const doc = await renderInvoiceToPDFBlob(inv, shop, forceA4, documentType, templateId);
  const blob = doc.output("blob");
  return new File([blob], `${inv.invoice_number || "invoice"}.pdf`, { type: "application/pdf" });
}

export async function shareInvoiceViaWhatsApp(invoice, shopSettings, phoneNumber) {
  let cleanPhone = phoneNumber.replace(/\D/g, "");
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
  if (!cleanPhone) {
    toast.error("Please enter a valid WhatsApp number");
    return;
  }

  const loadingToast = toast.loading("Preparing invoice...");
  try {
    const shopName = !shopSettings.shop_name ? "EASYBMT SHOP" : shopSettings.shop_name;
    const customerName = invoice.customer_name || "Customer";
    
    const pdfFile = await getInvoicePDFBlob(invoice, shopSettings);
    
    let pdfUrl = "";
    let usedNativeShare = false;
    
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      usedNativeShare = true;
    } else {
      toast.loading("Uploading PDF for Desktop Web...", { id: loadingToast });
      pdfUrl = await generateAndUploadInvoicePDF(invoice, shopSettings);
    }
    
    const message = `Hello ${customerName},
Thank you for shopping with ${shopName}.

Invoice No: ${invoice.invoice_number}
Amount: Ã¢â€šÂ¹${invoice.grand_total.toFixed(2)}

${pdfUrl ? `Your invoice PDF is attached/shared below:\n${pdfUrl}\n\n` : ''}Ã°Å¸â„¢Â Have a Good Day Ã°Å¸â„¢Â
Please Visit Again`;

    toast.dismiss(loadingToast);
    
    if (usedNativeShare) {
      await navigator.share({
        title: `Invoice ${invoice.invoice_number}`,
        text: message,
        files: [pdfFile],
      });
      toast.success("Shared successfully!");
    } else {
      window.open("https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(message), "_blank");
      toast.success("Opened WhatsApp Web!");
    }
  } catch (err) {
    toast.dismiss(loadingToast);
    if (err.name !== "AbortError") {
      console.error(err);
      toast.error("Failed to share via WhatsApp");
    }
  }
}

// Convert HTML thermal slip layout into raw monochrome graphical ESC/POS raster print bytes
export async function renderThermalToEscPosBytes(inv, shop, printerSize = "58mm") {
  const is80mm = printerSize === "80mm";
  const widthPx = is80mm ? 576 : 384;
  const widthBytes = widthPx / 8; // 72 or 48 bytes

  const html = generateThermalHTML(inv, shop, printerSize);

  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "0";
  tempDiv.style.width = `${widthPx}px`;
  tempDiv.style.background = "#ffffff";
  tempDiv.style.padding = "0";
  tempDiv.style.display = "flex";
  tempDiv.style.justifyContent = "center";
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  await waitForImages(tempDiv);
  lockImageDimensions(tempDiv);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    console.warn("Fonts load promise failed", e);
  }

  // Inject stabilizer styles for html2canvas
  const stabilizerStyle = document.createElement("style");
  stabilizerStyle.innerHTML = `
    body, html {
      background: #ffffff !important;
      background-color: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .rcpt {
      box-shadow: none !important;
      border: none !important;
      padding: 6px !important;
      margin: 0 auto !important;
      background: #ffffff !important;
    }
    .rcpt::before, .rcpt::after {
      display: none !important;
      content: none !important;
    }
    * {
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      font-variant-numeric: lnum tabular-nums !important;
    }
  `;
  tempDiv.appendChild(stabilizerStyle);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 1, // Native printer resolution
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: widthPx,
      windowWidth: widthPx,
      windowHeight: tempDiv.scrollHeight + 50,
    });

    document.body.removeChild(tempDiv);

    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;
    const height = canvas.height;

    // Convert pixels to binary monochrome bitstream (ESC/POS GS v 0 format)
    const dataBytes = [];
    for (let y = 0; y < height; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          let isBlack = 0; // default white
          if (x < canvas.width) {
            const idx = (y * canvas.width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];

            // If pixel is semi-transparent, treat as white, otherwise check brightness threshold
            if (a >= 128) {
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              if (luminance < 200) { // threshold value (increased from 140 to 200 for bolder, high-contrast text on physical printouts)
                isBlack = 1;
              }
            }
          }
          byteVal = (byteVal << 1) | isBlack;
        }
        dataBytes.push(byteVal);
      }
    }

    // Build the ESC/POS GS v 0 raster print package
    // Reset printer: ESC @ (0x1B, 0x40)
    // GS v 0 m xL xH yL yH d1...dk
    const escPos = [0x1B, 0x40];

    const m = 0; // Normal mode
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    escPos.push(0x1D, 0x76, 0x30, m, xL, xH, yL, yH);
    escPos.push(...dataBytes);

    // Feed and cut: Feed 3 lines (ESC d 3), Cut (GS V 66 0)
    escPos.push(0x1B, 0x64, 0x03);
    escPos.push(0x1D, 0x56, 0x41, 0x03); // Cut command

    return new Uint8Array(escPos);
  } catch (err) {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
    throw err;
  }
}

