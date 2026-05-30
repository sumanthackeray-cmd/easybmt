/**
 * Unified POS B2C receipt printing — works across Chrome, Firefox, Edge, Safari (desktop + mobile).
 * User picks connection type + paper size in Settings; POS calls printReceipt().
 */
import DOMPurify from "dompurify";
import { generateThermalHTML } from "@/lib/pdf-share-utils";
import {
  sendEscPosToPrinter,
  generateEscPosPayload,
  isWebSerialSupported,
  addToOfflinePrintQueue,
} from "@/lib/escpos-utils";

const LOCAL_CONFIG_KEY = "easybmt_printer_config";

/** Merge Firestore shop settings with locally saved printer prefs (instant apply without full save). */
export function getMergedPrinterSettings(shopSettings = {}) {
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}");
  } catch {
    local = {};
  }
  return { ...shopSettings, ...local };
}

export function saveLocalPrinterConfig(config) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Could not persist printer config", e);
  }
}

/** Detect APIs available in the current browser / device. */
export function getPrintCapabilities() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMobile = isAndroid || isIOS;

  return {
    thermalPrint: true, // iframe / window — all modern browsers
    serial: isWebSerialSupported(),
    bluetooth: typeof navigator !== "undefined" && "bluetooth" in navigator,
    usb: typeof navigator !== "undefined" && "usb" in navigator,
    rawbt: isAndroid,
    wifi: true, // needs LAN agent; falls back to thermal print
    isAndroid,
    isIOS,
    isMobile,
    browserName: detectBrowserName(ua),
  };
}

function detectBrowserName(ua) {
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  return "Browser";
}

/** Whether the selected connection can use raw ESC/POS in this browser. */
export function canUseNativeEscPos(printerType, caps = getPrintCapabilities()) {
  switch (printerType) {
    case "serial":
      return caps.serial;
    case "bluetooth":
      return caps.bluetooth;
    case "usb":
      return caps.usb;
    case "rawbt":
      return caps.rawbt;
    case "wifi":
      return true; // may use gateway; otherwise fallback
    case "browser":
    default:
      return false;
  }
}

function waitForImages(root, timeoutMs = 8000) {
  const imgs = root?.querySelectorAll?.("img") || [];
  if (!imgs.length) return Promise.resolve();
  return Promise.race([
    Promise.all(
      Array.from(imgs).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = resolve;
              img.onerror = resolve;
            }
          })
      )
    ),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

function buildThermalPrintDocument(htmlBody, printerSize) {
  return htmlBody;
}

/**
 * Instant thermal receipt via hidden iframe — Chrome, Firefox, Edge, Safari (desktop + mobile).
 */
export async function printThermalReceipt(invoice, shopSettings = {}, options = {}) {
  const { isDuplicate = false, onStatus } = options;
  const printerSize = shopSettings.printer_size || "58mm";
  const widthMm = printerSize === "80mm" ? 80 : 58;

  if (onStatus) onStatus("Preparing receipt...");

  const bodyHtml = generateThermalHTML(invoice, shopSettings, printerSize);
  const docHtml = buildThermalPrintDocument(bodyHtml, printerSize);

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Receipt print");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    };

    const runPrint = async () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) throw new Error("Print frame not ready");

        await waitForImages(doc.body);

        if (onStatus) onStatus("Sending to printer...");

        iframe.contentWindow.focus();
        iframe.contentWindow.print();

        cleanup();
        resolve(true);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.onload = () => runPrint();
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(docHtml);
    doc.close();

    // Fallback if onload does not fire
    setTimeout(() => {
      if (iframe.parentNode) runPrint().catch(reject);
    }, 600);
  });
}

/**
 * Popup-based print fallback (some mobile WebViews).
 */
export async function printThermalReceiptPopup(invoice, shopSettings = {}, options = {}) {
  const printerSize = shopSettings.printer_size || "58mm";
  const bodyHtml = generateThermalHTML(invoice, shopSettings, printerSize);
  const docHtml = buildThermalPrintDocument(bodyHtml, printerSize);

  const win = window.open("", "_blank", "width=400,height=720,scrollbars=yes");
  if (!win) {
    throw new Error("Pop-up blocked. Allow pop-ups for this site to print receipts.");
  }
  win.document.open();
  win.document.write(docHtml);
  win.document.close();
  await waitForImages(win.document.body);
  win.focus();
  win.print();
  setTimeout(() => {
    try {
      win.close();
    } catch (_) {}
  }, 800);
  return true;
}

/**
 * Main POS print API — respects Settings connection; auto-falls back to thermal print.
 */
export async function printReceipt(invoice, shopSettings = {}, options = {}) {
  const {
    isDuplicate = false,
    onStatus,
    preferNative = true,
    allowFallback = true,
  } = options;

  if (!invoice) {
    throw new Error("No invoice to print");
  }

  const settings = getMergedPrinterSettings(shopSettings);
  const printerType = settings.printer_type || "browser";
  const caps = getPrintCapabilities();

  // Universal path — works everywhere instantly
  if (printerType === "browser" || !printerType) {
    if (onStatus) onStatus("Opening print dialog...");
    try {
      await printThermalReceipt(invoice, settings, { isDuplicate, onStatus });
      return { success: true, method: "thermal" };
    } catch (e) {
      await printThermalReceiptPopup(invoice, settings, { isDuplicate, onStatus });
      return { success: true, method: "thermal_popup" };
    }
  }

  if (!preferNative || !canUseNativeEscPos(printerType, caps)) {
    if (!allowFallback) {
      throw new Error(
        `${printerType} printing is not supported in ${caps.browserName}. Use System Print or switch to Chrome/Edge for COM/BLE/USB.`
      );
    }
    if (onStatus) onStatus(`Using system receipt (${caps.browserName})...`);
    await printThermalReceipt(invoice, settings, { isDuplicate, onStatus });
    return { success: true, method: "thermal_fallback", fallbackReason: "unsupported_native" };
  }

  // Graphical PDF printing path for RawBT (Android)
  if (printerType === "rawbt") {
    if (onStatus) onStatus("Generating high-fidelity receipt PDF...");
    try {
      const { renderInvoiceToPDFBlob } = await import("@/lib/pdf-share-utils");
      const doc = await renderInvoiceToPDFBlob(invoice, settings, false, "invoice");
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      if (onStatus) onStatus("Sending graphic receipt to RawBT...");
      const intentUrl = `intent:data:application/pdf;base64,${pdfBase64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`;
      window.location.href = intentUrl;
      return { success: true, method: "rawbt_pdf" };
    } catch (pdfErr) {
      console.warn("RawBT PDF generation failed, falling back to text ESC/POS:", pdfErr);
    }
  }

  try {
    if (onStatus) onStatus("Compiling print commands...");
    const payload = generateEscPosPayload(invoice, settings, isDuplicate);
    if (onStatus) onStatus("Sending print job to printer...");
    const ok = await sendEscPosToPrinter(payload, settings, onStatus);
    if (ok) return { success: true, method: printerType };
    throw new Error("Printer did not accept the job");
  } catch (err) {
    if (!allowFallback) throw err;

    console.warn("Native print failed, using thermal fallback:", err);
    if (onStatus) onStatus("Fallback: system receipt print...");
    try {
      await printThermalReceipt(invoice, settings, { isDuplicate, onStatus });
      return {
        success: true,
        method: "thermal_fallback",
        fallbackReason: err.message,
      };
    } catch (e2) {
      try {
        await printThermalReceiptPopup(invoice, settings, { isDuplicate, onStatus });
        return { success: true, method: "thermal_popup_fallback", fallbackReason: err.message };
      } catch (e3) {
        addToOfflinePrintQueue(invoice, settings);
        throw new Error(`${err.message}. Receipt queued for retry.`);
      }
    }
  }
}

/** Settings / POS test receipt */
export function buildTestInvoice() {
  return {
    invoice_number: "TEST-0001",
    date: new Date().toLocaleDateString("en-IN"),
    customer_name: "Walk-in Customer",
    billing_type: "B2C",
    subtotal: 847,
    tax_amount: 152.46,
    grand_total: 999.46,
    payment_method: "UPI",
    items: [
      { name: "Sample Product A", qty: 2, rate: 299, gst_rate: 18 },
      { name: "Test Item B", qty: 1, rate: 249, gst_rate: 18 },
    ],
  };
}

export async function printTestReceipt(shopSettings = {}, onStatus) {
  return printReceipt(buildTestInvoice(), shopSettings, { onStatus, allowFallback: true });
}
