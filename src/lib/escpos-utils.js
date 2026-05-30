// ESC/POS Command Codes
const ESC = 0x1B;
const GS = 0x1D;

export const ESC_POS_COMMANDS = {
  RESET: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],
  DOUBLE_SIZE_OFF: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x41, 0x03],
  FEED_3_LINES: [ESC, 0x64, 0x03]
};

// ─────────────────────────────────────────────────────────────────────────────
//  WEB SERIAL PORT MANAGER
//  Works for: MPT-II, classic Bluetooth COM ports, USB-Serial printers
//  Requires Chrome 89+ (Web Serial API)
// ─────────────────────────────────────────────────────────────────────────────

let _serialPort = null;  // Cached open port handle

/** Returns true if Web Serial API is available in this browser */
export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Opens Chrome's native COM port picker dialog.
 * User selects their MPT-II COM port (e.g. COM4, COM3).
 * Returns port info object or null on cancel/error.
 */
export async function requestSerialPort(baudRate = 9600) {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API not supported. Please use Google Chrome 89+.');
  }

  try {
    // If we already have an open port, close it first
    if (_serialPort) {
      try {
        await _serialPort.close();
      } catch (_) {}
      _serialPort = null;
    }

    // Show Chrome's port picker dialog
    const port = await navigator.serial.requestPort({
      // No filters: shows ALL COM ports including Bluetooth COM ports
      filters: []
    });

    // Open the port at the baud rate MPT-II uses (9600 default, some models: 19200)
    await port.open({ baudRate });
    _serialPort = port;

    // Get port info for display
    const info = port.getInfo();
    const portName = info.usbVendorId
      ? `USB-Serial (VID:${info.usbVendorId.toString(16).toUpperCase()})`
      : 'COM Port (Bluetooth)';

    return { port, portName };
  } catch (err) {
    if (err.name === 'NotFoundError') return null; // User cancelled
    throw err;
  }
}

/**
 * Send raw ESC/POS bytes to an already-open serial port.
 * Automatically retries if port was closed.
 */
export async function sendToSerialPort(commands, baudRate = 9600) {
  if (!_serialPort) {
    // Try to auto-reconnect to previously granted ports
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      _serialPort = ports[0];
    } else {
      throw new Error('No COM port selected. Please select your printer port first in Settings.');
    }
  }

  try {
    // Check if port is still open, reopen if needed
    if (!_serialPort.readable) {
      await _serialPort.open({ baudRate });
    }

    const writer = _serialPort.writable.getWriter();
    try {
      const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
      const CHUNK = 64;
      for (let i = 0; i < data.length; i += CHUNK) {
        await writer.write(data.slice(i, i + CHUNK));
      }
    } finally {
      writer.releaseLock();
      // FIX: Windows Bluetooth virtual COM ports often buffer indefinitely until the port is closed.
      // Closing the port forces the flush and ensures the printer prints immediately!
      try { await _serialPort.close(); } catch(e) {}
      _serialPort = null;
    }
    return true;
  } catch (err) {
    console.error('Serial write error:', err);
    throw err;
  }
}

/**
 * Close the cached serial port connection.
 */
export async function closeSerialPort() {
  if (_serialPort) {
    try {
      await _serialPort.close();
    } catch (_) {}
    _serialPort = null;
  }
}

/**
 * Returns whether a serial port is currently open or previously authorized.
 */
export async function isSerialPortOpen() {
  if (_serialPort !== null) return true;
  try {
    const ports = await navigator.serial.getPorts();
    return ports.length > 0;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  OFFLINE PRINT QUEUE
// ─────────────────────────────────────────────────────────────────────────────

export const getOfflinePrintQueue = () => {
  try {
    const queue = localStorage.getItem("pos_offline_print_queue");
    return queue ? JSON.parse(queue) : [];
  } catch (e) {
    return [];
  }
};

export const saveOfflinePrintQueue = (queue) => {
  try {
    localStorage.setItem("pos_offline_print_queue", JSON.stringify(queue));
  } catch (e) {}
};

export const addToOfflinePrintQueue = (invoice, printerSettings) => {
  const queue = getOfflinePrintQueue();
  const newItem = {
    id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    invoice,
    printerSettings,
    timestamp: new Date().toISOString(),
    status: "pending"
  };
  queue.push(newItem);
  saveOfflinePrintQueue(queue);
  return newItem;
};

// ─────────────────────────────────────────────────────────────────────────────
//  TEXT FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function formatLine(text, width = 32, align = "left") {
  if (text.length >= width) return text.substring(0, width);
  const spaces = width - text.length;
  if (align === "center") {
    const left = Math.floor(spaces / 2);
    return " ".repeat(left) + text + " ".repeat(spaces - left);
  } else if (align === "right") {
    return " ".repeat(spaces) + text;
  }
  return text + " ".repeat(spaces);
}

export function formatRow(leftText, rightText, width = 32) {
  const spacesNeeded = width - (leftText.length + rightText.length);
  if (spacesNeeded <= 0) {
    const spaceCount = Math.max(1, width - rightText.length);
    return leftText.substring(0, spaceCount - 1) + " " + rightText;
  }
  return leftText + " ".repeat(spacesNeeded) + rightText;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MOCK DEVICES (for UI display only — not used for real printing)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PRINTER_DEVICES = {
  bluetooth: [
    { name: "SRK-Z91-Printer (Internal)", address: "00:11:22:33:AA:BB", type: "Built-in" },
    { name: "ATPOS-1008-BT (Handheld)", address: "88:0F:10:2E:BB:44", type: "Portable" },
    { name: "Shreyans Bluetooth 58mm", address: "3F:A9:78:B2:CC:55", type: "External" },
    { name: "RP-80 Thermal Printer BT", address: "1C:D6:70:93:DD:02", type: "External (80mm)" }
  ],
  usb: [
    { name: "POS-58 Thermal Printer USB", vendorId: "0x416", productId: "0x5011" },
    { name: "Shreyans USB Thermal Printer (80mm)", vendorId: "0x1a86", productId: "0x7523" },
    { name: "Z91 USB Print Port", vendorId: "0x0483", productId: "0x5740" }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PRINT DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export async function sendEscPosToPrinter(commands, settings, onProgress) {
  let printerType = settings.printer_type || "browser";

  if (printerType === "browser") {
    throw new Error("Use System Print mode via printReceipt() for cross-browser thermal printing.");
  }

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isCapacitorNative = typeof window !== 'undefined' && !!window.Capacitor?.isNative;

  // ── DIRECT CAPACITOR NATIVE ANDROID BLUETOOTH PRINTER ────────────────────
  if (isCapacitorNative && (printerType === "bluetooth" || printerType === "rawbt")) {
    const macAddress = settings.paired_printer_address;
    if (macAddress && macAddress.trim()) {
      if (onProgress) onProgress("Connecting to direct Bluetooth printer...");
      try {
        const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
        let binary = "";
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        const base64Data = btoa(binary);

        const { Capacitor } = window;
        await Capacitor.Plugins.BluetoothPrinter.printRawData({
          address: macAddress,
          data: base64Data
        });

        if (onProgress) onProgress("Print completed successfully!");
        return true;
      } catch (err) {
        console.error("Direct native Bluetooth print failed, falling back...", err);
        if (onProgress) onProgress("Direct connection failed. Falling back to Intent/BLE...");
      }
    }
  }

  // Force route Bluetooth to RawBT if inside Capacitor Android Native App
  // because Web Bluetooth API is disabled in Android WebViews by default.
  if (printerType === "bluetooth") {
    if (isAndroid && isCapacitorNative) {
      printerType = "rawbt";
    }
  }

  // ── RAWBT (ANDROID APP) ───────────────────────────────────────────────────
  if (printerType === "rawbt") {
    if (onProgress) onProgress("Sending print job to RawBT...");
    const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
    let binary = "";
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64Data = btoa(binary);

    // RawBT accepts several intent/deeplink formats across app versions
    const intents = [
      `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`,
      `intent:${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`,
      `rawbt:base64,${base64Data}`,
    ];

    let sent = false;
    for (const href of intents) {
      try {
        const a = document.createElement("a");
        a.href = href;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        sent = true;
        break;
      } catch (e) {
        console.warn("RawBT intent attempt failed:", href, e);
      }
    }

    if (!sent) {
      window.location.href = intents[0];
    }

    if (onProgress) onProgress("Print sent to RawBT — confirm in the app if prompted.");
    return true;
  }

  if (onProgress) onProgress(`Connecting to ${printerType} printer...`);

  // ── SERIAL / COM PORT (MPT-II, Classic BT, USB-Serial) ──────────────────
  if (printerType === "serial") {
    try {
      if (!isWebSerialSupported()) {
        throw new Error("Web Serial not supported. Use Chrome 89+.");
      }
      const hasPort = await isSerialPortOpen();
      if (!hasPort) {
        throw new Error("No COM port selected. Please go to Settings → Printer Setup → Select COM Port first.");
      }
      if (onProgress) onProgress("Sending ESC/POS data to COM port...");
      const baudRate = parseInt(settings.serial_baud_rate) || 9600;
      await sendToSerialPort(commands, baudRate);
      if (onProgress) onProgress("Print job sent successfully!");
      return true;
    } catch (err) {
      console.error("Serial print error:", err);
      throw err;
    }
  }

  // ── BLUETOOTH (BLE only — for BLE thermal printers) ──────────────────────
  if (printerType === "bluetooth") {
    if (navigator.bluetooth) {
      try {
        let device;
        if (typeof navigator.bluetooth.getDevices === 'function') {
          try {
            const devices = await navigator.bluetooth.getDevices();
            if (devices && devices.length > 0) {
              device = devices[0];
            }
          } catch (e) {
            console.warn("getDevices error:", e);
          }
        }
        
        if (!device) {
          if (onProgress) onProgress("Searching for BLE Bluetooth printers...");
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              "000018f0-0000-1000-8000-00805f9b34fb",
              "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
              "49535343-fe7d-4ae5-8fa9-9fafd205e455"
            ]
          });
        }
        
        if (device) {
          if (onProgress) onProgress(`Connecting to ${device.name}...`);
          
          const connectPromise = device.gatt.connect();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Bluetooth connection timeout. MPT-II requires RawBT app on Android.")), 8000)
          );
          
          const server = await Promise.race([connectPromise, timeoutPromise]);
          const services = await server.getPrimaryServices();
          
          let printed = false;
          for (const service of services) {
            const chars = await service.getCharacteristics();
            const writable = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (writable) {
              if (onProgress) onProgress("Sending print data...");
              const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
              const CHUNK = 20;
              for (let i = 0; i < data.length; i += CHUNK) {
                await writable.writeValue(data.slice(i, i + CHUNK));
              }
              if (onProgress) onProgress("Print completed!");
              printed = true;
              break;
            }
          }
          if (printed) return true;
          throw new Error("No writable characteristics found. If using MPT-II on mobile, use RawBT.");
        }
      } catch (err) {
        if (err.name !== "NotFoundError") {
          console.error("BLE Bluetooth print failed:", err);
          throw err;
        }
      }
    }
    throw new Error("Bluetooth printer not found or connection failed.");
  }

  // ── USB (WebUSB) ──────────────────────────────────────────────────────────
  if (printerType === "usb") {
    if (navigator.usb) {
      try {
        if (onProgress) onProgress("Checking for paired USB printers...");
        // Auto-reconnect to already paired devices to prevent prompting every time
        let pairedDevices = [];
        if (typeof navigator.usb.getDevices === 'function') {
          try {
            pairedDevices = await navigator.usb.getDevices();
          } catch (e) {
            console.warn("usb.getDevices error:", e);
          }
        }
        let device = pairedDevices.length > 0 ? pairedDevices[0] : null;

        if (!device) {
          if (onProgress) onProgress("Requesting USB printer access...");
          device = await navigator.usb.requestDevice({ filters: [] });
        }

        if (device) {
          if (onProgress) onProgress(`Opening connection to USB Printer...`);
          await device.open();
          if (device.configuration === null) await device.selectConfiguration(1);
          await device.claimInterface(0);
          
          if (onProgress) onProgress("Sending ESC/POS data via USB...");
          const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
          
          // Endpoint 1 is usually the bulk out endpoint for printers, but we should find the exact one ideally
          // We'll fallback to endpoint 1 or 2 as typical for thermal printers
          try {
            await device.transferOut(1, data);
          } catch (e) {
            await device.transferOut(2, data); // fallback endpoint
          }
          
          if (onProgress) onProgress("Print job sent to USB!");
          return true;
        }
      } catch (err) {
        console.error("WebUSB print error:", err);
        throw new Error("USB Print Failed: " + err.message + "\n(Note: On Windows, standard USB drivers often block browser access. Use COM Port or Zadig driver.)");
      }
    }
    throw new Error("WebUSB API not supported or printer not connected.");
  }

  // ── WIFI / LAN (local EasyBMT print agent on port 9105) ───────────────────
  if (printerType === "wifi") {
    const ip = settings.printer_ip;
    const port = settings.printer_port || "9100";
    if (!ip) throw new Error("WiFi Printer IP address not specified.");

    if (onProgress) onProgress(`Connecting to ${ip}:${port}...`);

    const data = commands instanceof Uint8Array ? commands : new Uint8Array(commands);
    const payload = {
      action: "print_raw",
      ip,
      port: parseInt(port, 10) || 9100,
      data: Array.from(data),
    };

    const gateways = [
      "ws://127.0.0.1:9105",
      "ws://localhost:9105",
    ];

    for (const gwUrl of gateways) {
      try {
        const ok = await new Promise((resolve, reject) => {
          const socket = new WebSocket(gwUrl);
          const timer = setTimeout(() => {
            socket.close();
            reject(new Error("Gateway timeout"));
          }, 2500);

          socket.onopen = () => {
            if (onProgress) onProgress("Sending via print gateway...");
            socket.send(JSON.stringify(payload));
          };
          socket.onmessage = () => {
            clearTimeout(timer);
            socket.close();
            resolve(true);
          };
          socket.onerror = () => {
            clearTimeout(timer);
            reject(new Error("Gateway error"));
          };
        });
        if (ok) {
          if (onProgress) onProgress("Sent to network printer!");
          return true;
        }
      } catch (e) {
        console.warn(`Print gateway ${gwUrl} unavailable:`, e);
      }
    }

    throw new Error(
      `Cannot reach printer at ${ip}:${port}. Install the EasyBMT LAN print helper, or use System Print for instant receipts in any browser.`
    );
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESC/POS PAYLOAD GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateEscPosPayload(invoice, shop, isDuplicate = false) {
  const width = shop.printer_size === "80mm" ? 48 : 32;
  const encoder = [];

  const add = (cmd) => encoder.push(...cmd);
  const addLine = (text, align = "left", bold = false, double = false) => {
    if (align === "center") add(ESC_POS_COMMANDS.ALIGN_CENTER);
    else if (align === "right") add(ESC_POS_COMMANDS.ALIGN_RIGHT);
    else add(ESC_POS_COMMANDS.ALIGN_LEFT);

    if (bold) add(ESC_POS_COMMANDS.BOLD_ON);
    if (double) add(ESC_POS_COMMANDS.DOUBLE_SIZE_ON);

    for (let i = 0; i < text.length; i++) encoder.push(text.charCodeAt(i));
    encoder.push(10);

    if (bold) add(ESC_POS_COMMANDS.BOLD_OFF);
    if (double) add(ESC_POS_COMMANDS.DOUBLE_SIZE_OFF);
  };

  const addQRCode = (content, moduleSize = 8) => {
    // 1. Set model (Model 2)
    add([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // 2. Set module size
    add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, moduleSize]);
    // 3. Set EC level (M)
    add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);
    
    // 4. Store data
    const bytes = [];
    for (let i = 0; i < content.length; i++) {
      bytes.push(content.charCodeAt(i) & 0xFF);
    }
    const len = bytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    add([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    add(bytes);
    
    // 5. Print the QR code
    add([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
  };

  add(ESC_POS_COMMANDS.RESET);

  if (isDuplicate) {
    addLine("** DUPLICATE COPY **", "center", true);
    addLine("-".repeat(width), "center");
  }

  const shopName = !shop.shop_name ? "EASYBMT SHOP" : shop.shop_name;
  addLine(shopName, "center", true, true);
  if (shop.address) addLine(shop.address, "center");
  if (shop.gstin) addLine(`GSTIN: ${shop.gstin}`, "center");
  if (shop.phone) addLine(`Mob: ${shop.phone}`, "center");
  addLine("=".repeat(width), "center");

  addLine(formatRow(`Inv: ${invoice.invoice_number}`, `Date: ${invoice.date || ""}`, width));
  addLine(formatRow(`Cust: ${invoice.customer_name}`, `Pay: ${invoice.payment_method?.toUpperCase() || ""}`, width));
  addLine("-".repeat(width), "center");

  if (width === 48) {
    addLine(formatRow("Item Description", "Qty    Rate     Amount", width), "left", true);
  } else {
    addLine(formatRow("Item", "Qty  Rate   Amt", width), "left", true);
  }
  addLine("-".repeat(width), "center");

  (invoice.items || []).forEach(item => {
    const amtStr = (item.qty * item.rate).toFixed(2);
    if (width === 48) {
      const rateStr = item.rate.toFixed(2).padStart(8);
      const qtyStr = item.qty.toString().padStart(5);
      const rightSide = `${qtyStr} ${rateStr} ${amtStr.padStart(10)}`;
      if (item.name.length > 22) {
        addLine(item.name);
        addLine(" ".repeat(22) + rightSide);
      } else {
        addLine(formatRow(item.name, rightSide, width));
      }
    } else {
      const rightSide = `${item.qty} ${item.rate.toFixed(0).padStart(4)} ${amtStr.padStart(7)}`;
      if (item.name.length > 17) {
        addLine(item.name);
        addLine(" ".repeat(17) + rightSide);
      } else {
        addLine(formatRow(item.name, rightSide, width));
      }
    }
  });
  addLine("-".repeat(width), "center");

  addLine(formatRow("Subtotal", `Rs.${invoice.subtotal?.toFixed(2)}`, width));
  addLine(formatRow("Tax (GST)", `Rs.${invoice.tax_amount?.toFixed(2)}`, width));
  addLine(formatRow("GRAND TOTAL", `Rs.${invoice.grand_total?.toFixed(2)}`, width), "left", true);
  addLine("=".repeat(width), "center");

  if (shop.upi_id) {
    addLine("Scan to Pay via UPI", "center", true);
    add(ESC_POS_COMMANDS.ALIGN_CENTER);
    const upiURI = `upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shop.shop_name || 'Merchant')}&am=${invoice.grand_total?.toFixed(2)}&cu=INR`;
    addQRCode(upiURI, 8);
    add([10]); // vertical line spacing
    addLine(`UPI ID: ${shop.upi_id}`, "center");
    addLine("-".repeat(width), "center");
  }

  addLine("*** Thank You for Shopping! ***", "center");
  addLine("Please visit again", "center");
  addLine("Powered by EasyBMT", "center");
  // Feed 6 lines for clean 15mm tear-off spacing
  add([0x1B, 0x64, 0x06]);
  add(ESC_POS_COMMANDS.CUT);

  return new Uint8Array(encoder);
}
