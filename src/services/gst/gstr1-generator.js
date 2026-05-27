import { getMonth, fmtDate } from "@/lib/gst-utils";

/**
 * Generate HSN Summary from a list of sales invoices.
 */
export function buildHSNSummary(salesInvoices) {
  const hsnSummary = {};
  salesInvoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const key = item.hsn || "0000";
      if (!hsnSummary[key]) {
        hsnSummary[key] = {
          hsn: key,
          description: item.name,
          uqc: item.unit || "PCS",
          qty: 0,
          value: 0,
          tax: 0,
          taxable_value: 0,
          integrated_tax: 0,
          central_tax: 0,
          state_tax: 0,
          cess: 0
        };
      }
      const qty = item.qty || 0;
      const rate = item.rate || 0;
      const gstRate = item.gst_rate || 0;
      const taxable = qty * rate;
      const tax = (taxable * gstRate) / 100;
      
      hsnSummary[key].qty += qty;
      hsnSummary[key].value += taxable + tax;
      hsnSummary[key].tax += tax;
      hsnSummary[key].taxable_value += taxable;
      hsnSummary[key].integrated_tax += inv.is_interstate ? tax : 0;
      hsnSummary[key].central_tax += !inv.is_interstate ? tax / 2 : 0;
      hsnSummary[key].state_tax += !inv.is_interstate ? tax / 2 : 0;
    });
  });
  return Object.values(hsnSummary);
}

/**
 * Generate GSTR-1 JSON Schema
 */
export function buildGSTR1JSON(invoices, month, gstin) {
  const salesInvoices = invoices.filter(
    (inv) => inv.type === "sale" && getMonth(inv.date) === month
  );

  const b2b = salesInvoices.filter((inv) => inv.customer_gstin);
  const b2c = salesInvoices.filter((inv) => !inv.customer_gstin);

  const b2bData = b2b.map((inv) => ({
    ctin: inv.customer_gstin,
    receiver_name: inv.customer_name,
    invoice_no: inv.invoice_number,
    invoice_date: inv.date,
    invoice_value: inv.grand_total,
    place_of_supply: inv.place_of_supply || "27-Maharashtra",
    reverse_charge: "N",
    invoice_type: "Regular",
    taxable_value: inv.subtotal || 0,
    igst: inv.is_interstate ? inv.tax_amount : 0,
    cgst: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
    sgst: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
    cess: 0,
  }));

  const hsnSummary = buildHSNSummary(salesInvoices);

  return {
    gstin: gstin || "YOUR_GSTIN",
    fp: month.replace("-", ""),
    version: "GST3.0.4",
    hash: "hash",
    b2b: b2bData.length > 0 ? [{ ctin: b2bData[0]?.ctin || "", inv: b2bData }] : [],
    b2cs: b2c.map((inv) => ({
      sply_ty: inv.is_interstate ? "INTER" : "INTRA",
      pos: inv.place_of_supply || "27",
      rt: (inv.items?.[0]?.gst_rate) || 18,
      txval: inv.subtotal || 0,
      iamt: inv.is_interstate ? inv.tax_amount : 0,
      camt: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      samt: !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      csamt: 0,
    })),
    hsn: { data: hsnSummary },
  };
}

/**
 * Generate GSTR-1 CSV Rows
 */
export function buildGSTR1CSVRows(salesInvoices, gstin, shopName) {
  const rows = [
    ["GSTIN of Supplier", "Trade Name", "Invoice No", "Invoice Date", "Invoice Value", "Taxable Value", "IGST", "CGST", "SGST"],
    ...salesInvoices.map((inv) => [
      gstin || "",
      shopName === "Vogats" ? "" : (shopName || ""),
      inv.invoice_number,
      fmtDate(inv.date),
      inv.grand_total,
      inv.subtotal || 0,
      inv.is_interstate ? inv.tax_amount : 0,
      !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
      !inv.is_interstate ? (inv.tax_amount || 0) / 2 : 0,
    ]),
  ];
  return rows;
}
