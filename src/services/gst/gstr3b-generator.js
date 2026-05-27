import { getMonth } from "@/lib/gst-utils";

/**
 * Generate GSTR-3B JSON Schema
 */
export function buildGSTR3BJSON(invoices, purchases, month, gstin) {
  const salesInvoices = invoices.filter(
    (inv) => inv.type === "sale" && getMonth(inv.date) === month
  );
  const monthPurchases = purchases.filter((p) => getMonth(p.date) === month);

  const totalTaxable = salesInvoices.reduce((s, i) => s + (i.subtotal || 0), 0);
  const totalIGST = salesInvoices.filter((i) => i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalCGST = salesInvoices.filter((i) => !i.is_interstate).reduce((s, i) => s + (i.tax_amount || 0) / 2, 0);
  const totalSGST = totalCGST;

  const inputTaxable = monthPurchases.reduce((s, p) => s + ((p.grand_total || 0) - (p.grand_total * 0.18 / 1.18)), 0);
  const inputIGST = monthPurchases.reduce((s, p) => s + (p.grand_total || 0) * 0.18 / 1.18 * 0.5, 0);
  const inputCGST = inputIGST / 2;
  const inputSGST = inputIGST / 2;

  return {
    gstin: gstin || "YOUR_GSTIN",
    ret_period: month.replace("-", ""),
    sup_details: {
      osup_det: { txval: totalTaxable, iamt: totalIGST, camt: totalCGST, samt: totalSGST, csamt: 0 },
      osup_zero: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nil_exmp: { txval: 0 },
      isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nongst: { txval: 0 },
    },
    itc_elg: {
      itc_avl: [
        { ty: "IMPG", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "IMPS", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "ISRC", iamt: inputIGST, camt: inputCGST, samt: inputSGST, csamt: 0 },
        { ty: "ISD", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
      itc_rev: [
        { ty: "RUL_37", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
      itc_net: { iamt: inputIGST, camt: inputCGST, samt: inputSGST, csamt: 0 },
      itc_inelg: [
        { ty: "RUL_38", iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: "OTH", iamt: 0, camt: 0, samt: 0, csamt: 0 },
      ],
    },
    intr_ltfee: {
      intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    },
  };
}
