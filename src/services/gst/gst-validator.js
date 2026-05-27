export function validateGSTFilingData(salesForMonth, hsnSummary) {
  const errors = [];
  
  // 1. Missing HSN warning
  if (hsnSummary.some(item => item.hsn === "0000" || !item.hsn)) {
    errors.push("HSN summaries contain placeholders or '0000' codes. Reporting standard HSNs is mandatory.");
  }
  
  // 2. Interstate without POS mismatch check
  salesForMonth.forEach(inv => {
    if (inv.is_interstate && !inv.place_of_supply) {
      errors.push(`Invoice ${inv.invoice_number} is interstate but is missing designated Place of Supply.`);
    }
  });
  
  // 3. GSTIN formatting checks
  salesForMonth.forEach(inv => {
    if (inv.customer_gstin && inv.customer_gstin.length !== 15) {
      errors.push(`Invoice ${inv.invoice_number} lists non-standard GSTIN: '${inv.customer_gstin}'.`);
    }
  });

  return errors;
}

export function calculateGSTHealthScore(salesForMonth, hsnSummary, deadlines) {
  let score = 96;
  if (salesForMonth.some(inv => !inv.customer_gstin && inv.grand_total > 250000)) {
    score -= 8; // Large B2C risk
  }
  if (hsnSummary.some(item => item.hsn === "0000" || !item.hsn)) {
    score -= 5; // Missing HSN risk
  }
  const overdueCount = deadlines.filter(d => d.daysLeft < 0).length;
  score -= overdueCount * 6; // Overdue deadline penalty
  return Math.max(45, Math.min(100, score));
}
