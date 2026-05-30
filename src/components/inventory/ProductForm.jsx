import { useEffect, useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { RefreshCw, Upload, Image as ImageIcon, Trash2, X, Check, Loader2, Printer, QrCode, Plus, Tag, DollarSign, Package, Layers, Percent, Settings, Sparkles, Scale, Shirt, Info, Barcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import { getCategoriesByShopType, suggestCategoryByName } from "@/lib/shopCategories";

export const UNITS = ["PCS", "KG", "LTR", "MTR", "BOX", "BAG", "SET", "PAIR", "DOZEN"];
export const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];

export function ProductForm({ open, onOpenChange, product, onSave, businessType }) {
  const [openPricing, setOpenPricing] = useState(false);
  const [openInventory, setOpenInventory] = useState(false);
  const [openSpecialized, setOpenSpecialized] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    hsn: product?.hsn || "",
    category: product?.category || "",
    brand: product?.brand || "",
    gst_rate: product?.gst_rate ?? 18,
    gst_effective_date: product?.gst_effective_date || "",
    mrp: product?.mrp || 0,
    rate: product?.rate || 0,
    purchase_rate: product?.purchase_rate || product?.purchase_price || 0,
    wholesale_price: product?.wholesale_price || 0,
    stock: product?.stock || 0,
    min_stock: product?.min_stock || 10,
    unit: product?.unit || "PCS",
    barcode: product?.barcode || "",
    batch_no: product?.batch_no || "",
    expiry_date: product?.expiry_date || "",
    is_weighed: product?.is_weighed || false,
    sizes: product?.sizes || [],
    colors: product?.colors || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    supplier_name: product?.supplier_name || "",
    manufacturer_name: product?.manufacturer_name || "",
    rack_location: product?.rack_location || "",
    infinite_stock: product?.infinite_stock || false,
    loose_selling: product?.loose_selling || false,
    selling_unit: product?.selling_unit || "PCS",
    pack_size: product?.pack_size || 1,
    loose_stock: product?.loose_stock || 0,
    plu_code: product?.plu_code || "",
    requires_scale: product?.requires_scale || false,
    loose_rate_per_kg: product?.loose_rate_per_kg || 0,
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Barcode Sticker Customization & Printer States
  const [showBarcodePanel, setShowBarcodePanel] = useState(false);
  const [stickerShowName, setStickerShowName] = useState(true);
  const [stickerShowMrp, setStickerShowMrp] = useState(true);
  const [stickerShowPrice, setStickerShowPrice] = useState(true);
  const [stickerUseQr, setStickerUseQr] = useState(false);
  const [stickerSize, setStickerSize] = useState("50x30");
  const [stickerQty, setStickerQty] = useState(1);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Shop Categories logic & preloads
  const [activeBusinessType, setActiveBusinessType] = useState("retail");

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await base44.entities.ShopSettings.list();
        const bType = settings?.[0]?.business_type || "retail";
        setActiveBusinessType(bType);
      } catch (err) {
        console.error("Failed to load settings in ProductForm:", err);
      }
    }
    if (businessType) {
      setActiveBusinessType(businessType);
    } else {
      loadSettings();
    }
  }, [businessType]);

  const categoriesList = useMemo(() => {
    return getCategoriesByShopType(activeBusinessType);
  }, [activeBusinessType]);

  const categoryOptions = useMemo(() => {
    return categoriesList.map(cat => ({
      label: `${cat.name} (${cat.hindi})`,
      value: cat.name
    }));
  }, [categoriesList]);

  const handleCategoryChange = (catName) => {
    const normalizedCatName =
      catName && typeof catName === "object" && "name" in catName
        ? catName.name
        : catName;

    if (!normalizedCatName || typeof normalizedCatName !== "string") return;

    set("category", normalizedCatName);
    const matched = categoriesList.find((c) => c.name === normalizedCatName);
    if (matched) {
      set("gst_rate", matched.defaultGst);
      set("hsn", matched.defaultHsn);
      set("unit", matched.defaultUnit);
      toast.info(
        `Auto-filled: GST ${matched.defaultGst}%, HSN ${matched.defaultHsn}, UOM ${matched.defaultUnit}`
      );
    }
  };

  const aiSuggestedCat = useMemo(() => {
    if (!form.name) return null;
    return suggestCategoryByName(form.name, activeBusinessType);
  }, [form.name, activeBusinessType]);

  // Voice recognition logic
  const [listeningVoice, setListeningVoice] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningVoice(true);
      toast.info("Listening for category name...");
    };

    recognition.onresult = (event) => {
      if (!event.results?.[0]?.[0]?.transcript) {
        toast.warning("Could not recognize speech. Please try again.");
        return;
      }
      const speechToText = event.results[0][0].transcript.toLowerCase();
      console.log("Voice speech recognized:", speechToText);

      const match = categoriesList.find(cat => {
        const engName = cat.name.toLowerCase();
        const hindiName = cat.hindi.toLowerCase();
        return speechToText.includes(engName) || 
               speechToText.includes(hindiName) ||
               engName.includes(speechToText) || 
               hindiName.includes(speechToText);
      });

      if (match) {
        handleCategoryChange(match.name);
        toast.success(`Voice selected: ${match.name}`);
      } else {
        toast.error(`Could not match voice "${speechToText}" to any category.`);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error", e);
      toast.error("Speech recognition failed.");
      setListeningVoice(false);
    };

    recognition.onend = () => {
      setListeningVoice(false);
    };

    recognition.start();
  };

  const generateBarcode = () => {
    const code = "8" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    set("barcode", code);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("image_url", file_url);
      toast.success("Product image uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const clearImage = (e) => {
    e.preventDefault();
    set("image_url", "");
  };

  const handlePrintStickers = (e) => {
    e.preventDefault();
    const sizeMap = {
      "38x25": { w: 144, h: 96 },
      "50x30": { w: 190, h: 113 },
      "60x40": { w: 227, h: 151 },
      "100x70": { w: 378, h: 264 }
    };
    const size = sizeMap[stickerSize] || sizeMap["50x30"];
    const codeValue = form.barcode || form.sku || "000000";

    const labels = Array(stickerQty).fill(null).map((_, i) => `
      <div style="
        width:${size.w}px; height:${size.h}px;
        border:1px solid #ccc; border-radius:4px;
        display:inline-flex; flex-direction:column; align-items:center; justify-content:center;
        padding:4px; margin:3px; box-sizing:border-box; font-family:monospace; page-break-inside:avoid;
        background:#fff; color:#000;
      ">
        ${stickerShowName ? `
        <div style="font-size:9px;font-weight:900;text-align:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-family:sans-serif;margin-bottom:2px;">
          ${form.name || "Product"}
        </div>` : ""}
        ${stickerUseQr ? `
        <svg width="${size.h - 32}" height="${size.h - 32}" viewBox="0 0 21 21" xmlns="http://www.w3.org/2050/svg">
          ${generateQRModulesHTML(codeValue)}
        </svg>
        ` : `
        <svg width="${size.w - 16}" height="${Math.floor(size.h * 0.45)}" viewBox="0 0 200 60" xmlns="http://www.w3.org/2055/svg">
          ${generateBarsHTML(codeValue)}
          <text x="100" y="58" text-anchor="middle" font-size="8" font-family="monospace">${codeValue}</text>
        </svg>
        `}
        <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
          ${stickerShowPrice ? `<div style="font-size:10px;font-weight:900;color:#000;">₹${form.rate || 0}</div>` : ""}
          ${stickerShowMrp && form.mrp ? `<div style="font-size:8px;text-decoration:line-through;color:#666;">MRP: ₹${form.mrp}</div>` : ""}
        </div>
        ${form.batch_no ? `<div style="font-size:7px;color:#555;">B.No: ${form.batch_no}</div>` : ""}
      </div>
    `).join("");

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked! Please allow popups to print barcode labels.");
      return;
    }

    try {
      win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
      <style>body{margin:8px;background:#fff;}@media print{body{margin:0;}}</style>
      </head><body>
      <div style="display:flex;flex-wrap:wrap;">${labels}</div>
      <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1000);}</script>
      </body></html>`);
      win.document.close();
    } catch (e) {
      console.error("Print error:", e);
      toast.error("Failed to generate print layout");
      win.close();
    }
  };

  function generateBarsHTML(val) {
    if (!val) return "";
    let bars = [];
    let x = 5;
    const bw = 160 / (val.length * 9 + 10);
    for (let ci = 0; ci < val.length; ci++) {
      const c = val.charCodeAt(ci);
      const pat = (c % 16).toString(2).padStart(4, "0");
      for (let b = 0; b < pat.length; b++) {
        const w = bw * (b % 2 === 0 ? 2 : 1.5);
        if (pat[b] === "1") bars.push(`<rect x="${x}" y="0" width="${w}" height="48" fill="#000"/>`);
        x += w;
      }
      x += bw;
    }
    return bars.join("");
  }

  function generateQRModulesHTML(val) {
    const matrix = generateQRMatrix(val);
    const rects = [];
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if (matrix[r][c] === 1) {
          rects.push(`<rect x="${c}" y="${r}" width="1.05" height="1.05" fill="#000"/>`);
        }
      }
    }
    return rects.join("");
  }

  // Auto-calculated variables
  const totalSellableUnits = form.loose_selling 
    ? (form.stock * (form.pack_size || 1)) + (form.loose_stock || 0) 
    : form.stock;

  const pricePerUnit = form.loose_selling && form.pack_size > 0 
    ? (form.rate / form.pack_size).toFixed(2) 
    : form.rate;

  useEffect(() => {
    if (open) {
      setSaving(false);
      setSavedSuccess(false);
      setOpenPricing(false);
      setOpenInventory(false);
      setOpenSpecialized(false);
      setShowBarcodePanel(false);
    }
    if (open && !product) {
      const randomSku = "PROD-" + Math.floor(1000 + Math.random() * 9000);
      const randomBarcode = "8" + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
      setForm({
        name: "",
        sku: randomSku,
        hsn: "",
        category: "General",
        brand: "Generic",
        gst_rate: 18,
        gst_effective_date: "",
        mrp: 0,
        rate: 0,
        purchase_rate: 0,
        wholesale_price: 0,
        stock: 0,
        min_stock: 10,
        unit: "PCS",
        barcode: randomBarcode,
        batch_no: "",
        expiry_date: "",
        is_weighed: false,
        sizes: [],
        colors: "",
        description: "",
        image_url: "",
        supplier_name: "",
        manufacturer_name: "",
        rack_location: "",
        infinite_stock: false,
        loose_selling: false,
        selling_unit: "PCS",
        pack_size: 1,
        loose_stock: 0,
        plu_code: "",
        requires_scale: false,
        loose_rate_per_kg: 0,
      });
    } else if (product) {
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        hsn: product.hsn || "",
        category: product.category || "",
        brand: product.brand || "",
        gst_rate: product.gst_rate ?? 18,
        gst_effective_date: product.gst_effective_date || "",
        mrp: product.mrp || 0,
        rate: product.rate || 0,
        purchase_rate: product.purchase_rate || product.purchase_price || 0,
        wholesale_price: product.wholesale_price || 0,
        stock: product.stock || 0,
        min_stock: product.min_stock || 10,
        unit: product.unit || "PCS",
        barcode: product.barcode || "",
        batch_no: product.batch_no || "",
        expiry_date: product.expiry_date || "",
        is_weighed: product.is_weighed || false,
        sizes: product.sizes || [],
        colors: product.colors || "",
        description: product.description || "",
        image_url: product.image_url || "",
        supplier_name: product.supplier_name || "",
        manufacturer_name: product.manufacturer_name || "",
        rack_location: product.rack_location || "",
        infinite_stock: product.infinite_stock || false,
        loose_selling: product.loose_selling || false,
        selling_unit: product.selling_unit || "PCS",
        pack_size: product.pack_size || 1,
        loose_stock: product.loose_stock || 0,
        plu_code: product.plu_code || "",
        requires_scale: product.requires_scale || false,
        loose_rate_per_kg: product.loose_rate_per_kg || 0,
      });
    }
  }, [open, product]);

  const handleSaveClick = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter the Product Name");
      const nameEl = document.getElementById("product-form-name");
      if (nameEl) nameEl.focus();
      return;
    }
    if (!form.rate || Number(form.rate) <= 0) {
      toast.error("Please enter a valid Selling Price");
      const rateEl = document.getElementById("product-form-rate");
      if (rateEl) rateEl.focus();
      return;
    }

    setSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        ...form,
        purchase_price: Number(form.purchase_rate || 0),
        purchase_rate: Number(form.purchase_rate || 0),
        total_sellable_units: totalSellableUnits,
        price_per_unit: Number(pricePerUnit),
      });
      setSaving(false);
setSavedSuccess(true);
    } catch (err) {
      setSaving(false);
      toast.error("Failed to save product: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full sm:w-[95vw] h-full sm:h-auto max-h-screen sm:max-h-[92vh] overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-0 rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-slate-800 fixed left-0 sm:left-[50%] top-0 sm:top-[50%] translate-x-0 sm:translate-x-[-50%] translate-y-0 sm:translate-y-[-50%] [&>button.absolute]:hidden shadow-2xl transition-all duration-200">
        {savedSuccess && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-card border border-emerald-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-4 max-w-sm border-border animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="font-black text-xl text-emerald-600 dark:text-emerald-400">
                🎉 Product Saved!
              </h3>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Product successfully synced with Full-Stack Inventory
              </p>
              <p className="text-xs text-muted-foreground animate-pulse">
                This window will auto-close in 2 seconds...
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full animate-[loading-bar_2s_linear_forwards]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        )}
        

        <div className="p-5 space-y-5">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <DialogTitle className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5 text-xl tracking-tight">
                <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-450">
                  <Plus className="w-5 h-5" />
                </span>
                {product ? "Edit Catalog Product" : "Create New Product"}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Setup essential details on the left. Expand advanced configurations on the right as needed.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => onOpenChange(false)} 
              className="text-slate-900 dark:text-slate-100 hover:text-red-500 transition-colors p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>
          </DialogHeader>

          {/* TWO-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* LEFT COLUMN: CORE INFO (3/5 width on lg) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Card 1: Core Details */}
              <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2">
                  <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span> 📦 Core Description
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">* Required</span>
                </div>

                {/* Main Product Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="product-form-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product/Item Name *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-[50%] -translate-y-[50%] text-slate-400"><Tag className="w-4 h-4" /></span>
                    <Input 
                      id="product-form-name"
                      placeholder="e.g. Philips LED Bulb 9W, Parle-G 100g" 
                      value={form.name} 
                      onChange={e => set("name", e.target.value)} 
                      className="pl-9 h-11 text-sm bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500 font-semibold shadow-inner" 
                    />
                  </div>
                </div>

                {/* Category & Brand row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        Category
                      </Label>
                      <button
                        type="button"
                        onClick={startVoiceSearch}
                        className={cn(
                          "p-1 rounded-lg text-slate-400 hover:text-indigo-500 transition-all active:scale-95",
                          listeningVoice ? "bg-red-500/20 text-red-500 animate-pulse scale-105" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                        title="Voice Search Category"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="relative">
                      <SearchableSelect
                        options={categoryOptions}
                        value={form.category}
                        onValueChange={handleCategoryChange}
                        placeholder="Select Category"
                        searchPlaceholder="Search category..."
                        className="h-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl"
                      />
                      {aiSuggestedCat && form.category !== aiSuggestedCat.name && (
                        <button
                          type="button"
                          onClick={() => handleCategoryChange(aiSuggestedCat.name)}
                          className="mt-1.5 text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-indigo-500/20 active:scale-95 transition-all w-fit z-10 animate-bounce"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500 animate-spin" />
                          <span>AI Category Option: {aiSuggestedCat.name}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:mt-0 mt-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Brand Name</Label>
                    <Input 
                      placeholder="e.g. Philips, Generic" 
                      value={form.brand} 
                      onChange={e => set("brand", e.target.value)} 
                      className="h-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl" 
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Core Pricing Grid */}
              <div className="bg-emerald-50/10 dark:bg-emerald-950/5 p-5 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                  <h3 className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> 💰 Financial Pricing Matrix
                  </h3>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/15">Active Rates</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Selling Price *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-[50%] -translate-y-[50%] text-emerald-600 font-black text-xs">₹</span>
                      <Input 
                        id="product-form-rate"
                        type="number" 
                        inputMode="decimal"
                        placeholder="0" 
                        value={form.rate || ""} 
                        onChange={e => set("rate", Number(e.target.value))} 
                        className="pl-6 h-10 bg-white dark:bg-slate-950/50 border-emerald-500/20 dark:border-emerald-500/10 text-slate-900 dark:text-slate-100 rounded-xl font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400 focus-visible:ring-emerald-500 shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Buy Price (Cost)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-[50%] -translate-y-[50%] text-slate-400 font-black text-xs">₹</span>
                      <Input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0" 
                        value={form.purchase_rate || ""} 
                        onChange={e => set("purchase_rate", Number(e.target.value))} 
                        className="pl-6 h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">MRP (Limit)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-[50%] -translate-y-[50%] text-slate-400 font-black text-xs">₹</span>
                      <Input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0" 
                        value={form.mrp || ""} 
                        onChange={e => set("mrp", Number(e.target.value))} 
                        className="pl-6 h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Wholesale Rate</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-[50%] -translate-y-[50%] text-slate-400 font-black text-xs">₹</span>
                      <Input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="0" 
                        value={form.wholesale_price || ""} 
                        onChange={e => set("wholesale_price", Number(e.target.value))} 
                        className="pl-6 h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Logistics & Units Card */}
              <div className="bg-indigo-50/10 dark:bg-indigo-950/5 p-5 rounded-2xl border border-indigo-500/10 dark:border-indigo-500/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-500/10 pb-2">
                  <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> ⚡ Logistics, Stock & Alert
                  </h3>
                  {form.infinite_stock && <span className="text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full tracking-wider border border-indigo-500/10 animate-pulse">Infinite Stock Active</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Stock Quantity</Label>
                    <Input 
                      type="number" 
                      inputMode="numeric"
                      placeholder="0" 
                      value={form.stock || ""} 
                      onChange={e => set("stock", Number(e.target.value))} 
                      disabled={form.infinite_stock}
                      className="h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Minimum Alert Limit</Label>
                    <Input 
                      type="number" 
                      inputMode="numeric"
                      placeholder="10" 
                      value={form.min_stock} 
                      onChange={e => set("min_stock", Number(e.target.value))} 
                      disabled={form.infinite_stock}
                      className="h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-mono" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock UOM (Unit)</Label>
                    <SearchableSelect
                      options={UNITS}
                      value={form.unit}
                      onValueChange={v => set("unit", v)}
                      placeholder="Select Unit"
                      searchPlaceholder="Search unit..."
                      className="h-10 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Specs & Upload */}
              <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                  
                  {/* Image Upload Area */}
                  <div className="sm:col-span-1 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" /> Media File
                    </Label>
                    <div className="flex justify-center items-center">
                      {form.image_url ? (
                        <div className="relative w-full aspect-square sm:h-20 sm:w-20 border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 group shadow-sm">
                          <img src={form.image_url} alt="Product" className="object-cover w-full h-full" />
                          <button 
                            onClick={clearImage}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500 rounded-xl"
                            title="Remove Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full aspect-square sm:h-20 sm:w-20 cursor-pointer flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl p-1.5 transition-all bg-slate-50/50 dark:bg-slate-950/50">
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                          <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                          <span className="text-[9px] font-black text-center text-slate-500 leading-none">
                            {uploadingImage ? "Uploading..." : "Upload Image"}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Description area */}
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description Specs</Label>
                    <textarea 
                      placeholder="Add product specifications, materials, warranty guidelines, or internal merchant notes..." 
                      value={form.description} 
                      onChange={e => set("description", e.target.value)} 
                      className="w-full mt-0 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs resize-none h-[80px] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ADVANCED SETTINGS (2/5 width on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1 select-none">
                ⚙️ Optional Configurations
              </h3>

              {/* CARD 1: TAXES & SUPPLIER (💰) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenPricing(!openPricing)}
                  className="w-full px-4 py-3.5 flex items-center justify-between font-extrabold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all outline-none"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="p-1 rounded bg-amber-500/10 text-amber-500"><Percent className="w-4 h-4" /></span>
                    Tax & Supplier Details
                  </span>
                  <span className="text-[10px] text-slate-400 font-black">
                    {openPricing ? "COLLAPSE ▲" : "EXPAND ▼"}
                  </span>
                </button>

                {openPricing && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-950/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">GST Rate (%)</Label>
                        <SearchableSelect
                          options={GST_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                          value={String(form.gst_rate)}
                          onValueChange={v => set("gst_rate", Number(v))}
                          placeholder="Select GST"
                          searchPlaceholder="Search Tax..."
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">HSN/SAC Code</Label>
                        <Input placeholder="e.g. 8539" value={form.hsn} onChange={e => set("hsn", e.target.value)} className="h-9 text-xs font-mono text-slate-900 dark:text-slate-100" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-bold text-slate-605 dark:text-slate-400">Supplier Name</Label>
                        <Input placeholder="e.g. Philips India Distributor Ltd." value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} className="h-9 text-xs text-slate-900 dark:text-slate-100" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">GST Effective Date</Label>
                      <Input type="date" value={form.gst_effective_date} onChange={e => set("gst_effective_date", e.target.value)} className="h-9 text-xs text-slate-900 dark:text-slate-100" />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: BARCODES & PRINT LABELS (🏷️) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenInventory(!openInventory)}
                  className="w-full px-4 py-3.5 flex items-center justify-between font-extrabold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all outline-none"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="p-1 rounded bg-indigo-500/10 text-indigo-500"><Barcode className="w-4 h-4" /></span>
                    Custom Labels & Barcodes
                  </span>
                  <span className="text-[10px] text-slate-400 font-black">
                    {openInventory ? "COLLAPSE ▲" : "EXPAND ▼"}
                  </span>
                </button>

                {openInventory && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-950/10 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">SKU Code</Label>
                        <Input placeholder="PROD-001" value={form.sku} onChange={e => set("sku", e.target.value)} className="h-9 text-xs font-mono text-slate-900 dark:text-slate-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Rack Location</Label>
                        <Input placeholder="Shelf A-3" value={form.rack_location} onChange={e => set("rack_location", e.target.value)} className="h-9 text-xs text-slate-900 dark:text-slate-100" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Barcode / EAN-13</Label>
                      <div className="flex gap-2">
                        <Input placeholder="8901234567890" value={form.barcode} onChange={e => set("barcode", e.target.value)} className="h-9 text-xs font-mono flex-1 text-slate-900 dark:text-slate-100 bg-background" />
                        <Button type="button" variant="outline" onClick={generateBarcode} className="px-2.5 h-9 text-xs hover:bg-slate-100 border-slate-200 dark:border-slate-800 dark:hover:bg-slate-900" title="Auto Generate">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form.infinite_stock}
                            onChange={e => set("infinite_stock", e.target.checked)}
                            className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Set as Infinite stock (Digital / Services)</span>
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.loose_selling}
                          onChange={e => set("loose_selling", e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-black text-indigo-550 dark:text-indigo-400 flex items-center gap-1 uppercase tracking-wide">
                          Enable Loose / Sub-item Selling
                        </span>
                      </label>

                      {form.loose_selling && (
                        <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-purple-600 dark:text-purple-400">Loose Unit (UOM)</Label>
                            <Input placeholder="e.g. PCS, Tab" value={form.selling_unit} onChange={e => set("selling_unit", e.target.value)} className="h-8 text-xs font-semibold bg-background border-purple-500/20 text-slate-900 dark:text-slate-100" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-purple-600 dark:text-purple-400">Pack Size</Label>
                            <Input type="number" min={1} value={form.pack_size} onChange={e => set("pack_size", Number(e.target.value))} className="h-8 text-xs font-semibold bg-background border-purple-500/20 text-slate-900 dark:text-slate-100" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-bold text-purple-600 dark:text-purple-400">Loose Qty Available</Label>
                            <Input type="number" value={form.loose_stock} onChange={e => set("loose_stock", Number(e.target.value))} className="h-8 text-xs font-semibold bg-background border-purple-500/20 text-slate-900 dark:text-slate-100" />
                          </div>
                          <div className="flex flex-col justify-center bg-background/50 border border-purple-500/10 rounded-lg p-1 text-center select-none font-semibold">
                            <p className="text-[8px] text-muted-foreground uppercase">Rate Per Unit</p>
                            <p className="text-xs font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">₹{pricePerUnit}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Integrated Barcode Sticker Creator accordion sub-panel */}
                    <div className="border-t border-slate-200 dark:border-slate-800/80 pt-3">
                      <Button
                        type="button"
                        onClick={() => setShowBarcodePanel(!showBarcodePanel)}
                        className="w-full h-8 px-2 flex items-center justify-between text-[10px] font-black bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                      >
                        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          🏷️ {showBarcodePanel ? "Hide Sticker Designer" : "Design & Print Barcode Sticker"}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                          {showBarcodePanel ? "Close ▲" : "Design ▼"}
                        </span>
                      </Button>

                      {showBarcodePanel && (
                        <div className="mt-3 border border-slate-200 dark:border-slate-850 rounded-xl p-3 bg-slate-100/50 dark:bg-slate-900/50 space-y-4 animate-in fade-in duration-300">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold text-slate-500">Sticker Size</Label>
                              <select
                                value={stickerSize}
                                onChange={e => setStickerSize(e.target.value)}
                                className="w-full bg-background border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[11px] outline-none text-slate-900 dark:text-slate-100"
                              >
                                <option value="38x25">38×25mm (Single)</option>
                                <option value="50x30">50×30mm (Store)</option>
                                <option value="60x40">60×40mm (Large)</option>
                                <option value="100x70">100×70mm (Box)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold text-slate-500">Sticker Count</Label>
                              <Input type="number" min={1} max={100} value={stickerQty} onChange={e => setStickerQty(Number(e.target.value))} className="h-7 text-xs text-center font-mono text-slate-900 dark:text-slate-100" />
                            </div>
                          </div>

                          <div className="space-y-1.5 p-2.5 bg-background border border-slate-200 dark:border-slate-800 rounded-xl">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={stickerShowName} onChange={e => setStickerShowName(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                              <span className="text-[10px] text-slate-700 dark:text-slate-300">Show Item Name</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={stickerShowMrp} onChange={e => setStickerShowMrp(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                              <span className="text-[10px] text-slate-700 dark:text-slate-300">Show MRP (₹{form.mrp || 0})</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={stickerShowPrice} onChange={e => setStickerShowPrice(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                              <span className="text-[10px] text-slate-700 dark:text-slate-300">Show Sell Price (₹{form.rate || 0})</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
                              <input type="checkbox" checked={stickerUseQr} onChange={e => setStickerUseQr(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                              <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                                <QrCode className="w-3 h-3" /> Print QR Graphic instead of Barcode
                              </span>
                            </label>
                          </div>

                          {/* High-fidelity thermal label graphics layout block */}
                          <div className="flex flex-col items-center justify-center p-6 bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800 rounded-2xl w-full shadow-inner relative overflow-hidden select-none">
                            <div className="absolute top-2 left-2 text-[7px] text-slate-400 font-black tracking-widest uppercase">Thermal Board Preview</div>
                            <div 
                              className="bg-white text-black p-4 border rounded-xl shadow-2xl flex flex-col items-center justify-center font-mono border-slate-300 max-w-full relative transition-all hover:scale-[1.01] select-none"
                              style={{ 
                                width: stickerSize === "38x25" ? "144px" : stickerSize === "60x40" ? "210px" : stickerSize === "100x70" ? "260px" : "180px", 
                                minHeight: stickerSize === "38x25" ? "96px" : stickerSize === "60x40" ? "140px" : stickerSize === "100x70" ? "180px" : "110px"
                              }}
                            >
                              {stickerShowName && (
                                <div className="text-[10px] font-black text-center text-slate-950 truncate max-w-full font-sans mb-1 uppercase tracking-tight">{form.name || "PRODUCT NAME"}</div>
                              )}
                              <div className="py-1 bg-white flex justify-center items-center w-full">
                                {stickerUseQr ? (
                                  renderQRCodeSVG(form.barcode || form.sku || "000000", stickerSize === "38x25" ? 45 : stickerSize === "60x40" ? 65 : stickerSize === "100x70" ? 90 : 55)
                                ) : (
                                  renderBarcodeSVG(form.barcode || form.sku || "000000", stickerSize === "38x25" ? 110 : stickerSize === "60x40" ? 160 : stickerSize === "100x70" ? 200 : 130, stickerSize === "38x25" ? 40 : stickerSize === "60x40" ? 55 : stickerSize === "100x70" ? 70 : 50)
                                )}
                              </div>
                              <div className="flex gap-2 items-center justify-center text-[9px] font-black text-slate-950 font-sans mt-1">
                                {stickerShowPrice && <span className="font-extrabold text-[10px]">₹{form.rate || 0}</span>}
                                {stickerShowMrp && form.mrp > 0 && <span className="line-through text-slate-500 text-[8px] font-bold">MRP: ₹{form.mrp}</span>}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={handlePrintStickers}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold h-9.5 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-all"
                          >
                            <Printer className="w-3.5 h-3.5 text-white" /> Print Labels ({stickerQty} stickers)
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: SPECIALIZED BUSINESS SETTINGS (⚙️) */}
              {["fashion", "supermarket", "mall", "hypermarket", "grocery_store", "convenience_store", "departmental_store", "mini_mart", "medical"].some(b => String(activeBusinessType || "").toLowerCase().includes(b)) && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenSpecialized(!openSpecialized)}
                    className="w-full px-4 py-3.5 flex items-center justify-between font-extrabold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-all outline-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="p-1 rounded bg-teal-500/10 text-teal-500"><Settings className="w-4 h-4" /></span>
                      Specialized Shop Fields
                    </span>
                    <span className="text-[10px] text-slate-400 font-black">
                      {openSpecialized ? "COLLAPSE ▲" : "EXPAND ▼"}
                    </span>
                  </button>

                  {openSpecialized && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-805 bg-slate-50/20 dark:bg-slate-950/10 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {/* Supermarket Settings */}
                      {["supermarket", "mall", "hypermarket", "grocery_store", "convenience_store", "departmental_store", "mini_mart"].some(b => String(activeBusinessType || "").toLowerCase().includes(b)) && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800/40 pb-1">🛒 Grocery & Scale (Reliance/DMart Mode)</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">PLU Code (4-digit)</Label>
                              <Input 
                                placeholder="e.g. 4011" 
                                value={form.plu_code} 
                                maxLength={4}
                                onChange={e => set("plu_code", e.target.value.replace(/\D/g, ''))} 
                                className="h-9 text-xs font-mono text-slate-900 dark:text-slate-100" 
                              />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end pb-1.5">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={form.requires_scale} 
                                  onChange={e => set("requires_scale", e.target.checked)} 
                                  className="w-3.5 h-3.5 accent-teal-500" 
                                />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Requires Scale</span>
                              </label>
                            </div>
                          </div>
                          {form.requires_scale && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <Label className="text-[10px] font-bold text-teal-500 flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Loose Rate per Kg (₹)</Label>
                              <Input 
                                type="number" 
                                inputMode="decimal"
                                placeholder="₹ per kg" 
                                value={form.loose_rate_per_kg || ""} 
                                onChange={e => set("loose_rate_per_kg", Number(e.target.value))} 
                                className="h-9 text-xs font-mono font-extrabold text-teal-600 dark:text-teal-400" 
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fashion Settings */}
                      {String(activeBusinessType || "").toLowerCase().includes("fashion") && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800/40 pb-1">👕 Apparel & Size Matrix</span>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-655 flex items-center gap-1"><Shirt className="w-3.5 h-3.5" /> Available Sizes</Label>
                            <div className="flex gap-2 flex-wrap mt-0.5">
                              {["S", "M", "L", "XL", "XXL"].map(size => {
                                const hasSize = form.sizes.includes(size);
                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                      const next = hasSize ? form.sizes.filter(s => s !== size) : [...form.sizes, size];
                                      set("sizes", next);
                                    }}
                                    className={cn(
                                      "px-3 py-1 text-xs font-black rounded-lg border transition-all active:scale-95 shadow-sm",
                                      hasSize 
                                        ? "bg-teal-600 text-white border-teal-600 font-extrabold" 
                                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-200 hover:border-slate-350"
                                    )}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-655">Colors (comma separated)</Label>
                            <Input 
                              placeholder="e.g. Black, Navy Blue, Ash Gray" 
                              value={form.colors} 
                              onChange={e => set("colors", e.target.value)} 
                              className="h-9 text-xs text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Medical Settings */}
                      {(String(activeBusinessType || "").toLowerCase().includes("medical") || String(activeBusinessType || "").toLowerCase().includes("pharmacy")) && (
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800/40 pb-1">💊 Pharmacy & Expiry Control</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-655 flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" /> Batch No. <span className="text-red-500 font-bold">*</span>
                              </Label>
                              <Input placeholder="B2024-01" value={form.batch_no} onChange={e => set("batch_no", e.target.value)} className="h-9 text-xs font-mono text-slate-900 dark:text-slate-100" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-655 flex items-center gap-1">
                                Expiry Date <span className="text-red-500 font-bold">*</span>
                              </Label>
                              <Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className="h-9 text-xs font-mono text-slate-900 dark:text-slate-100" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS FOOTER */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-850">
            <Button 
              onClick={handleSaveClick} 
              disabled={!form.name || !form.rate || saving || savedSuccess}
              className="flex-1 h-11 text-xs font-extrabold gold-gradient text-black rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all duration-150"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" /> Saving Product Details...
                </>
              ) : (
                <>💾 Save Product Details</>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={saving || savedSuccess}
              className="h-11 px-6 text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 🏷️ STICKER BARCODE & QR SVG GENERATION HELPERS
// ==========================================
function generateQRMatrix(text) {
  const size = 21;
  const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
  
  const drawFinder = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isBorder || isCenter) {
          matrix[row + r][col + c] = 1;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, 14);
  drawFinder(14, 0);

  for (let i = 8; i < 13; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isFinder = (r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8);
      const isTiming = r === 6 || c === 6;
      if (!isFinder && !isTiming) {
        const val = Math.abs(Math.sin(hash + r * 13 + c * 37)) * 10;
        matrix[r][c] = (Math.floor(val) % 2 === 0) ? 1 : 0;
      }
    }
  }

  return matrix;
}

function renderQRCodeSVG(value, size = 70) {
  const matrix = generateQRMatrix(value || "00000");
  const moduleSize = size / 21;
  const rects = [];
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (matrix[r][c] === 1) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * moduleSize}
            y={r * moduleSize}
            width={moduleSize + 0.05}
            height={moduleSize + 0.05}
            fill="#000"
          />
        );
      }
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rects}
    </svg>
  );
}

function renderBarcodeSVG(value, width = 200, height = 60) {
  if (!value) return null;
  const bars = [];
  let x = 0;
  const barWidth = width / (value.length * 11 + 20);
  x += barWidth * 5;
  for (let ci = 0; ci < value.length; ci++) {
    const code = value.charCodeAt(ci);
    const pattern = (code % 16).toString(2).padStart(4, "0");
    for (let b = 0; b < pattern.length; b++) {
      const w = barWidth * (b % 2 === 0 ? 2 : 1.5);
      if (pattern[b] === "1") bars.push({ x, w });
      x += w;
    }
    x += barWidth * 1.5;
  }
  x += barWidth * 5;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${x} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: width }}>
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.w} height={height * 0.8} fill="#000" />
      ))}
      <text x={x / 2} y={height - 2} textAnchor="middle" fontSize={height * 0.12} fontFamily="monospace" fill="#000">
        {value}
      </text>
    </svg>
  );
}
