/**
 * MULTILINGUAL NLU & TRANSLATION ENGINE
 * 
 * Automatically detects query languages/dialects, extracts intents and parameters,
 * routes to real-time data connectors, and translates outcomes back into
 * the exact source language/dialect with localized phrasing.
 */

import {
  fetchSalesData,
  fetchGSTData,
  fetchInventoryData,
  fetchHRData,
  fetchFinanceData,
  fetchCRMData
} from "./erpConnector.js";

// Multi-dialect recognition markers
const LANGUAGES = {
  HINGLISH: "hinglish",
  HINDI: "hindi",
  MARATHI: "marathi",
  GUJARATI: "gujarati",
  BHOJPURI: "bhojpuri",
  TAMIL: "tamil",
  TELUGU: "telugu",
  MALAYALAM: "malayalam",
  BENGALI: "bengali",
  PUNJABI: "punjabi",
  KANNADA: "kannada",
  ARABIC: "arabic",
  FRENCH: "french",
  SPANISH: "spanish",
  CHINESE: "chinese",
  JAPANESE: "japanese",
  ENGLISH: "english"
};

// Patterns to detect languages
const LANGUAGE_PATTERNS = [
  { lang: LANGUAGES.HINGLISH, regex: /\b(aaj|mera|kitna|hai|hua|unpaid|due|dikhao|batao|karo|batavo|aajke|hai)\b/i },
  { lang: LANGUAGES.HINDI, regex: /[\u0900-\u097F]/ }, // Devanagari script indicator
  { lang: LANGUAGES.MARATHI, regex: /\b(majha|dakhava|dakhva|aahe|aahet|divsat|zalela|aala|kiti)\b/i },
  { lang: LANGUAGES.GUJARATI, regex: /\b(outstanding|kem|chhe|batavo|ketlo|javab|nathi)\b/i },
  { lang: LANGUAGES.BHOJPURI, regex: /\b(bikri|ketna|bha|tahar|raur|bataee|aaaj)\b/i },
  { lang: LANGUAGES.TAMIL, regex: /\b(evlo|iruku|varumana|indha|month|enaku|revenue)\b/i },
  { lang: LANGUAGES.TELUGU, regex: /\b(entha|unnadi|ee|nela|kavali|undhi)\b/i },
  { lang: LANGUAGES.MALAYALAM, regex: /\b(ethra|undu|nalkuka|revenue|ee)\b/i },
  { lang: LANGUAGES.ARABIC, regex: /[\u0600-\u06FF]/ }, // Arabic script
  { lang: LANGUAGES.CHINESE, regex: /[\u4e00-\u9fa5]/ }, // Chinese script
  { lang: LANGUAGES.JAPANESE, regex: /[\u3040-\u30ff\u31f0-\u31ff\u4e00-\u9faf]/ } // Hiragana/Katakana/Kanji
];

/**
 * Automatically detects the language of a query.
 */
export function detectLanguage(query) {
  const lower = query.toLowerCase();
  for (const pattern of LANGUAGE_PATTERNS) {
    if (pattern.regex.test(lower) || pattern.regex.test(query)) {
      // Differentiate Hindi vs Hinglish
      if (pattern.lang === LANGUAGES.HINGLISH && /[\u0900-\u097F]/.test(query)) {
        return LANGUAGES.HINDI;
      }
      return pattern.lang;
    }
  }
  return LANGUAGES.ENGLISH; // Default to English
}

/**
 * Extracts the user intent and timeframe/parameters from natural language.
 */
export function extractIntent(query) {
  const lower = query.toLowerCase();
  
  // 1. Sales Intent
  if (lower.includes("sale") || lower.includes("revenue") || lower.includes("bikri") || lower.includes("becha") || lower.includes("kamai") || lower.includes("varumana") || lower.includes("today sales")) {
    const isToday = lower.includes("aaj") || lower.includes("today") || lower.includes("abhi") || lower.includes("current");
    return { module: "sales", action: isToday ? "today" : "summary" };
  }

  // 2. GST Intent
  if (lower.includes("gst") || lower.includes("gstr") || lower.includes("tax") || lower.includes("itc")) {
    return { module: "gst", action: "summary" };
  }

  // 3. Inventory Intent
  if (lower.includes("stock") || lower.includes("inventory") || lower.includes("saman") || lower.includes("item") || lower.includes("product") || lower.includes("expiry") || lower.includes("warehouse")) {
    if (lower.includes("low") || lower.includes("khatam") || lower.includes("kam")) {
      return { module: "inventory", action: "low_stock" };
    }
    if (lower.includes("dead")) {
      return { module: "inventory", action: "dead_stock" };
    }
    return { module: "inventory", action: "summary" };
  }

  // 4. HR Intent
  if (lower.includes("employee") || lower.includes("staff") || lower.includes("attendance") || lower.includes("salary") || lower.includes("absent") || lower.includes("present") || lower.includes("roster")) {
    if (lower.includes("absent") || lower.includes("present")) {
      return { module: "hrms", action: "attendance" };
    }
    return { module: "hrms", action: "summary" };
  }

  // 5. Finance Intent
  if (lower.includes("cashflow") || lower.includes("profit") || lower.includes("margin") || lower.includes("expense") || lower.includes("kharcha") || lower.includes("unpaid") || lower.includes("due") || lower.includes("pending") || lower.includes("udhar") || lower.includes("baki") || lower.includes("outstanding") || lower.includes("lena hai")) {
    if (lower.includes("unpaid") || lower.includes("due") || lower.includes("pending") || lower.includes("udhar") || lower.includes("baki") || lower.includes("outstanding") || lower.includes("lena hai")) {
      return { module: "finance", action: "unpaid" };
    }
    return { module: "finance", action: "summary" };
  }

  // 6. CRM Intent
  if (lower.includes("customer") || lower.includes("grahak") || lower.includes("party") || lower.includes("client")) {
    return { module: "crm", action: "top_customers" };
  }

  // Default fallback
  return { module: "general", action: "none" };
}

/**
 * Core processor that links NLU, DB Connector, and secure translation together.
 */
export async function processAiQuery(query, user) {
  const language = detectLanguage(query);
  const intent = extractIntent(query);

  if (intent.module === "general") {
    return {
      text: translateGeneralFallback(language),
      language,
      intent
    };
  }

  return {
    text: "", // Filled by dispatcher
    language,
    intent
  };
}

function translateGeneralFallback(lang) {
  switch (lang) {
    case LANGUAGES.HINDI:
      return "मुझे आपका सवाल समझ नहीं आया। कृपया अपने sales, GST, inventory, या employee के बारे में पूछें।";
    case LANGUAGES.HINGLISH:
      return "Mujhe aapka sawal samajh nahi aaya. Kripya sales, GST, inventory, ya employee attendance ke baare me puchein.";
    case LANGUAGES.MARATHI:
      return "मला तुमचा प्रश्न समजला नाही. कृपया सेल्स, जीएसटी, इन्व्हेंटरी किंवा कर्मचार्‍यांबद्दल विचारा.";
    case LANGUAGES.GUJARATI:
      return "મને તમારો પ્રશ્ન સમજાણો નથી. કૃપા કરીને સેલ્સ, જીએસટી અથવા ઇન્વેન્ટરી વિશે પૂછો.";
    case LANGUAGES.BHOJPURI:
      return "हमके राउर सवाल ना बुझाइल। कृपया आज के बिक्री, जीएसटी, या कर्मचारी लोगन के बारे में पूछीं।";
    case LANGUAGES.TAMIL:
      return "உங்கள் கேள்வி எனக்கு புரியவில்லை. தயவுசெய்து உங்கள் விற்பனை, ஜிஎஸ்டி அல்லது பணியாளர்கள் பற்றி கேளுங்கள்.";
    default:
      return "I didn't quite catch that. Please ask me about sales, GST, low stock, unpaid invoices, or employee attendance.";
  }
}

/**
 * Formats the response in the target language and dialect.
 */
export function formatResponse(lang, module, action, data) {
  if (lang === LANGUAGES.HINGLISH) {
    if (module === "sales") {
      if (action === "today") {
        return `Aaj aapka total sales ₹${data.todaySales.toLocaleString("en-IN")} hua hai, jisme total ${data.todayInvoiceCount} bills create hue hain.`;
      }
      return `Aapki total cumulative sales ₹${data.totalSales.toLocaleString("en-IN")} hai.`;
    }
    if (module === "gst") {
      return `Aapka current GST due ₹${data.gstDue.toLocaleString("en-IN")} hai aur GSTR1 status "${data.gstr1Status}" hai. ITC Mismatch: ₹${data.itcMismatch.toLocaleString("en-IN")}.`;
    }
    if (module === "inventory") {
      if (action === "low_stock") {
        const listStr = data.lowStockList.map(p => `${p.name} (stock: ${p.stock})`).join(", ");
        return `${data.lowStockCount} items abhi low stock me hain: ${listStr}.`;
      }
      return `Inventory status loaded. Warehouse me total ${data.warehouseStock} items present hain. Low stock items: ${data.lowStockCount}.`;
    }
    if (module === "hrms") {
      if (action === "attendance") {
        return `Aaj ${data.present} employees present hain aur ${data.absent} employees absent hain. Absent employees list: ${data.absentList.join(", ") || "None"}.`;
      }
      return `HRMS overview: Total ${data.totalEmployees} active employees hain. Total salary due ₹${data.salaryDue.toLocaleString("en-IN")} hai.`;
    }
    if (module === "finance") {
      if (action === "unpaid") {
        return `Current market me total ${data.unpaidCount} unpaid/due invoices hain, jinse total ₹${data.unpaidTotal.toLocaleString("en-IN")} receivables pending hain.`;
      }
      return `Finance stats: Net cashflow abhi ₹${data.cashflow.toLocaleString("en-IN")} hai. Profit margin ${data.profitMargin} chal raha hai.`;
    }
    if (module === "crm") {
      const topCust = data.topCustomers.map(c => c.name).join(", ");
      return `Aapke repeat customer rate ${data.repeatRate} hai. Top customers hain: ${topCust}. Pending followups: ${data.pendingFollowups}.`;
    }
  }

  if (lang === LANGUAGES.HINDI) {
    if (module === "sales") {
      if (action === "today") {
        return `आज आपका कुल सेल्स ₹${data.todaySales.toLocaleString("en-IN")} हुआ है, जिसमें कुल ${data.todayInvoiceCount} बिल बनाए गए हैं।`;
      }
      return `आपकी कुल संचयी बिक्री ₹${data.totalSales.toLocaleString("en-IN")} है।`;
    }
    if (module === "gst") {
      return `आपका वर्तमान जीएसटी देय ₹${data.gstDue.toLocaleString("en-IN")} है और GSTR1 स्थिति "${data.gstr1Status}" है। आईटीसी विसंगति: ₹${data.itcMismatch.toLocaleString("en-IN")} है।`;
    }
    if (module === "inventory") {
      if (action === "low_stock") {
        const listStr = data.lowStockList.map(p => `${p.name} (स्टॉक: ${p.stock})`).join(", ");
        return `${data.lowStockCount} उत्पाद अभी कम स्टॉक में हैं: ${listStr}।`;
      }
      return `इन्वेंटरी में कुल ${data.warehouseStock} उत्पाद हैं। कम स्टॉक वाले उत्पाद: ${data.lowStockCount}।`;
    }
    if (module === "hrms") {
      if (action === "attendance") {
        return `आज ${data.present} कर्मचारी उपस्थित हैं और ${data.absent} कर्मचारी अनुपस्थित हैं। अनुपस्थित कर्मचारी: ${data.absentList.join(", ") || "कोई नहीं"}।`;
      }
      return `कुल कर्मचारी: ${data.totalEmployees}, कुल देय वेतन: ₹${data.salaryDue.toLocaleString("en-IN")} है।`;
    }
    if (module === "finance") {
      if (action === "unpaid") {
        return `वर्तमान में बाज़ार में कुल ${data.unpaidCount} भुगतान न किए गए बिल हैं, जिनसे कुल ₹${data.unpaidTotal.toLocaleString("en-IN")} बकाया लंबित है।`;
      }
      return `वित्तीय सारांश: शुद्ध कैशफ्लो ₹${data.cashflow.toLocaleString("en-IN")} है। लाभ मार्जिन ${data.profitMargin} है।`;
    }
  }

  if (lang === LANGUAGES.MARATHI) {
    if (module === "sales") {
      return `आज तुमची एकूण विक्री ₹${data.todaySales.toLocaleString("en-IN")} झाली आहे.`;
    }
    if (module === "gst") {
      return `तुमचा जीएसटी भरणा ₹${data.gstDue.toLocaleString("en-IN")} प्रलंबित आहे. GSTR1 स्थिती: ${data.gstr1Status}.`;
    }
    if (module === "inventory") {
      return `इन्व्हेंटरी रिस्क: ${data.lowStockCount} उत्पादने संपत आली आहेत. गोदामात एकूण ${data.warehouseStock} उत्पादने उपलब्ध आहेत.`;
    }
    if (module === "hrms") {
      return `आज उपस्थित कर्मचारी: ${data.present}, अनुपस्थित कर्मचारी: ${data.absent}. प्रलंबित वेतन: ₹${data.salaryDue.toLocaleString("en-IN")}.`;
    }
    if (module === "finance") {
      return `तुमचा एकूण कॅशफ्लो ₹${data.cashflow.toLocaleString("en-IN")} आहे. प्रलंबित देयके: ₹${data.unpaidTotal.toLocaleString("en-IN")}.`;
    }
  }

  if (lang === LANGUAGES.GUJARATI) {
    if (module === "sales") {
      return `આજે તમારી કુલ સેલ્સ ₹${data.todaySales.toLocaleString("en-IN")} થઈ છે.`;
    }
    if (module === "inventory") {
      return `ઓછા સ્ટોક વાળી વસ્તુઓ: ${data.lowStockCount}. ગોડાઉનમાં કુલ સ્ટોક ${data.warehouseStock} છે.`;
    }
    if (module === "finance") {
      return `બાકી લેણું (Outstanding payment): ₹${data.unpaidTotal.toLocaleString("en-IN")} છે.`;
    }
  }

  if (lang === LANGUAGES.BHOJPURI) {
    if (module === "sales") {
      return `आज के राउर कुल बिक्री ₹${data.todaySales.toLocaleString("en-IN")} भईल बा। कुल बिल भइल: ${data.todayInvoiceCount}.`;
    }
    if (module === "inventory") {
      return `राउर ${data.lowStockCount} गो सामान खत्म होखे वाला बा। जल्दी आर्डर करीं।`;
    }
  }

  if (lang === LANGUAGES.TAMIL) {
    if (module === "sales") {
      return `இன்றைய மொத்த விற்பனை ₹${data.todaySales.toLocaleString("en-IN")} ஆகும்.`;
    }
    if (module === "gst") {
      return `இந்த மாத ஜிஎஸ்டி நிலுவை ₹${data.gstDue.toLocaleString("en-IN")} ஆகும். GSTR1 நிலை: ${data.gstr1Status}.`;
    }
  }

  // Default/English formatting
  if (module === "sales") {
    if (action === "today") {
      return `Today's revenue is ₹${data.todaySales.toLocaleString("en-IN")} across ${data.todayInvoiceCount} sales invoices.`;
    }
    return `Your cumulative sales revenue is ₹${data.totalSales.toLocaleString("en-IN")}.`;
  }
  if (module === "gst") {
    return `Your estimated GST due is ₹${data.gstDue.toLocaleString("en-IN")}. GSTR-1 Status is "${data.gstr1Status}", and ITC Mismatch stands at ₹${data.itcMismatch.toLocaleString("en-IN")}.`;
  }
  if (module === "inventory") {
    if (action === "low_stock") {
      const listStr = data.lowStockList.map(p => `${p.name} (qty: ${p.stock})`).join(", ");
      return `Inventory alert: ${data.lowStockCount} products are low in stock: ${listStr}.`;
    }
    return `Inventory status loaded: ${data.warehouseStock} total items across all counter racks. Low-stock: ${data.lowStockCount} SKUs.`;
  }
  if (module === "hrms") {
    if (action === "attendance") {
      return `Attendance report: ${data.present} present, ${data.absent} absent. Absentees: ${data.absentList.join(", ") || "None"}.`;
    }
    return `HRMS overview: ${data.totalEmployees} registered staff. Total monthly payroll outstanding is ₹${data.salaryDue.toLocaleString("en-IN")}.`;
  }
  if (module === "finance") {
    if (action === "unpaid") {
      return `Accounts Receivable: You have ${data.unpaidCount} unpaid/partial invoices totaling ₹${data.unpaidTotal.toLocaleString("en-IN")} due.`;
    }
    return `Business metrics: Net cashflow is ₹${data.cashflow.toLocaleString("en-IN")} and gross profit margin is ${data.profitMargin}.`;
  }
  if (module === "crm") {
    const top = data.topCustomers.map(c => c.name).join(", ");
    return `CRM intelligence: Repeat buyer rate is ${data.repeatRate}. Top customers: ${top}. Pending followups: ${data.pendingFollowups}.`;
  }

  return `System data: query successfully computed. Data keys loaded.`;
}
