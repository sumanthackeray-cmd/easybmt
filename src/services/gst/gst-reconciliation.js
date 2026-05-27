import { getMonth } from "@/lib/gst-utils";

/**
 * Generate reconciliation data from actual purchases
 */
export function buildReconciliationData(purchases, month) {
  const monthPurchases = purchases.filter((p) => getMonth(p.date) === month);
  
  return monthPurchases.map(p => {
    // Determine assumed tax based on 18% standard rate assumption for the demo
    const purchaseTax = (p.grand_total || 0) * 0.18 / 1.18;
    
    // Simulate portal match state (Normally this would be compared against GSTR-2B API fetch)
    // We will randomly assign missing or matched for demonstration purposes if no real portal link exists.
    const isMockMatched = Math.random() > 0.3; // 70% matched
    
    return {
      id: p.id || Math.random().toString(36),
      invoice: p.invoice_number || `PUR-${Date.now().toString().slice(-4)}`,
      vendor: p.customer_name || "Cash Purchase",
      gst: p.customer_gstin || "UNREGISTERED",
      purchaseTax: purchaseTax,
      gstr2bTax: isMockMatched ? purchaseTax : (Math.random() > 0.5 ? purchaseTax * 0.8 : 0),
      status: isMockMatched ? "Matched" : (purchaseTax * 0.8 ? "Partial" : "Missing"),
      diff: isMockMatched ? 0 : (purchaseTax - (purchaseTax * 0.8 || 0)),
    };
  });
}

/**
 * Extract Vendor Compliance from overall purchases
 */
export function buildVendorComplianceList(purchases) {
  const vendorMap = {};
  
  purchases.forEach(p => {
    if (!p.customer_name || !p.customer_gstin) return; // Skip unregistered
    if (!vendorMap[p.customer_gstin]) {
      vendorMap[p.customer_gstin] = {
        id: p.id,
        name: p.customer_name,
        gstin: p.customer_gstin,
        totalPurchases: 0,
        itcAtStake: 0,
        filingHistory: "100% (Last 12 Periods)",
        status: "Compliant",
        risk: "Low"
      };
    }
    const tax = (p.grand_total || 0) * 0.18 / 1.18;
    vendorMap[p.customer_gstin].totalPurchases += p.grand_total;
    vendorMap[p.customer_gstin].itcAtStake += tax;
  });

  // Randomize some risks for realistic demo simulation
  const list = Object.values(vendorMap);
  list.forEach((v, i) => {
    if (i % 3 === 1) {
      v.filingHistory = "60% (Filing Gaps)";
      v.status = "Non-Compliant";
      v.risk = "High";
    }
  });
  
  return list;
}
