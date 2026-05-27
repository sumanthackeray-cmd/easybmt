import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/LanguageContext";

export default function PrintingGeneralSettings({ form, set }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Printing Template */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold flex items-center justify-between">
              Printing Template
              <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">
                {form.printing_template || "58mm Trend 1"}
              </span>
            </Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Select template you prefer for printing invoices/bills
            </p>
          </div>
          <Select 
            value={form.printing_template} 
            onValueChange={(val) => set("printing_template", val)}
          >
            <SelectTrigger className="h-9 mt-2">
              <SelectValue placeholder="Select Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="58mm Trend 1">58mm Trend 1</SelectItem>
              <SelectItem value="80mm Standard">80mm Standard</SelectItem>
              <SelectItem value="A4 Format">A4 Format</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Print Preview */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-bold">Print Preview</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Show print preview while creating invoice
            </p>
          </div>
          <Switch 
            checked={form.show_print_preview} 
            onCheckedChange={(val) => set("show_print_preview", val)} 
          />
        </div>

        {/* Watermark */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold">Watermark</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Text to be shown as watermark in printed documents
            </p>
          </div>
          <Input 
            className="h-9 mt-2" 
            placeholder="e.g. DRAFT"
            value={form.print_watermark} 
            onChange={e => set("print_watermark", e.target.value)} 
          />
        </div>

        {/* Payment Receipt */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-bold">Payment Receipt</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Generate payment receipt on saving customer payments
            </p>
          </div>
          <Switch 
            checked={form.generate_payment_receipt} 
            onCheckedChange={(val) => set("generate_payment_receipt", val)} 
          />
        </div>

        {/* Barcode Print Engine */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold">Barcode Print Engine</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Select print engine for printing barcodes/labels
            </p>
          </div>
          <Select 
            value={form.barcode_print_engine} 
            onValueChange={(val) => set("barcode_print_engine", val)}
          >
            <SelectTrigger className="h-9 mt-2">
              <SelectValue placeholder="Select Engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4 Multi">A4 Multi</SelectItem>
              <SelectItem value="Direct Thermal">Direct Thermal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Authorized Signatory */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold">Authorized Signatory</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Text to be shown in place of authorized signatory
            </p>
          </div>
          <Input 
            className="h-9 mt-2" 
            placeholder="e.g. John Doe"
            value={form.authorized_signatory} 
            onChange={e => set("authorized_signatory", e.target.value)} 
          />
        </div>

        {/* Print PoS Invoice/Bill */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-bold">Print PoS Invoice/Bill</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Allow printing of PoS invoice/bill in PoS billing engine
            </p>
          </div>
          <Switch 
            checked={form.print_pos_invoice} 
            onCheckedChange={(val) => set("print_pos_invoice", val)} 
          />
        </div>

        {/* Multi-Language Print */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-bold">Multi-Language Print</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Allow item name printing in other languages
            </p>
          </div>
          <Switch 
            checked={form.multi_language_print} 
            onCheckedChange={(val) => set("multi_language_print", val)} 
          />
        </div>

        {/* Invoice Print Count */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold">Invoice Print Count</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Enter no. of copies to be printed of cash and customer invoices
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <Input 
              className="h-9 flex-1" 
              type="number"
              min="1"
              max="10"
              placeholder="Cash"
              value={form.invoice_print_count_cash} 
              onChange={e => set("invoice_print_count_cash", Number(e.target.value))} 
            />
            <Input 
              className="h-9 flex-1" 
              type="number"
              min="1"
              max="10"
              placeholder="Customer"
              value={form.invoice_print_count_customer} 
              onChange={e => set("invoice_print_count_customer", Number(e.target.value))} 
            />
          </div>
        </div>

        {/* Print QR Code */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-bold">Print QR Code</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Print QR code of UPI, web link on sale invoice/bill
            </p>
          </div>
          <div className="text-sm text-blue-600 font-medium cursor-pointer hover:underline underline-offset-2">
            Setup QR Code
          </div>
        </div>

        {/* Invoice Item Group */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-2 flex flex-col justify-between">
          <div>
            <Label className="text-sm font-bold">Invoice Item Group</Label>
            <p className="text-[11px] text-muted-foreground mt-1">
              Allows you to print sale invoice particulars in groups
            </p>
          </div>
          <Select 
            value={form.invoice_item_group} 
            onValueChange={(val) => set("invoice_item_group", val)}
          >
            <SelectTrigger className="h-9 mt-2">
              <SelectValue placeholder="Select Item Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Category">Category</SelectItem>
              <SelectItem value="Brand">Brand</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>
    </div>
  );
}
