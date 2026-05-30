export const getDocumentSequence = (type, shopSettings, branchId = null) => {
  const date = new Date();
  const YY = String(date.getFullYear()).slice(-2);
  const YYYY = String(date.getFullYear());
  
  // Financial Year logic (April to March)
  const currentMonth = date.getMonth(); // 0-11
  let FY = "";
  if (currentMonth >= 3) {
    // April (3) to December (11)
    FY = `${YY}-${String(date.getFullYear() + 1).slice(-2)}`;
  } else {
    // January (0) to March (2)
    FY = `${String(date.getFullYear() - 1).slice(-2)}-${YY}`;
  }

  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const MMM = date.toLocaleString('default', { month: 'short' }).toUpperCase();

  let prefixKey = '';
  switch(type) {
    case 'gst': prefixKey = 'gst'; break;
    case 'sale':
    case 'invoice': prefixKey = 'inv'; break;
    case 'bill': prefixKey = 'bill'; break;
    case 'proforma': prefixKey = 'proforma'; break;
    case 'quotation': prefixKey = 'quotation'; break;
    case 'credit_note': prefixKey = 'return'; break;
    case 'delivery':
    case 'delivery_challan': prefixKey = 'delivery'; break;
    case 'receipt': prefixKey = 'receipt'; break;
    case 'so': prefixKey = 'so'; break;
    default: prefixKey = 'inv'; break;
  }

  let activePrefix = prefixKey;
  if (branchId && branchId !== 'main' && branchId !== 'all') {
    const branchHasFormat = shopSettings[`${branchId}_${prefixKey}_format`] !== undefined;
    const branchHasSeq = shopSettings[`${branchId}_${prefixKey}_seq`] !== undefined;
    if (branchHasFormat || branchHasSeq) {
      activePrefix = `${branchId}_${prefixKey}`;
    }
  }

  const seqValue = Number(shopSettings[`${activePrefix}_seq`] || 0) + 1;
  const format = shopSettings[`${activePrefix}_format`] || "INV-SEQ";
  
  const seqStr = String(seqValue).padStart(3, '0');

  let formatted = format.replace("SEQ", seqStr);
  formatted = formatted.replace("YYYY", YYYY);
  formatted = formatted.replace("YY", YY);
  formatted = formatted.replace("FY", FY);
  formatted = formatted.replace("MMM", MMM);
  formatted = formatted.replace("MM", MM);

  return {
    invoiceNumber: formatted,
    nextSeq: seqValue,
    prefixKey: prefixKey,
    activePrefix: activePrefix
  };
};
