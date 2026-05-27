import React from 'react';
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FileText, Check, X } from "lucide-react";

export default function BillingSettingsTab({ form, set }) {
  const ToggleSetting = ({ label, description, field, value }) => (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex-1 pr-4">
        <p className="font-bold text-[13px] text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => set(field, !value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const SelectSetting = ({ label, description, field, value, options }) => (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="flex-1 pr-4">
        <p className="font-bold text-[13px] text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{description}</p>
      </div>
      <div className="w-[140px] shrink-0">
        <SearchableSelect
          options={options}
          value={value}
          onValueChange={(val) => set(field, val)}
          placeholder="Select..."
        />
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-bold text-[15px]">Billing Configuration Settings</h3>
          <p className="text-[11px] text-muted-foreground">Customize your point-of-sale features, defaults, and restrictions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SelectSetting
          label="Billing Engine"
          description="Select billing engine which suits your business"
          field="billing_engine"
          value={form.billing_engine || 'general'}
          options={[{ value: 'general', label: 'General' }, { value: 'restaurant', label: 'Restaurant' }, { value: 'supermarket', label: 'Supermarket' }]}
        />

        <ToggleSetting
          label="Barcode Quick Billing"
          description="Allows you to add item directly in invoice on scanning barcode"
          field="barcode_quick_billing"
          value={form.barcode_quick_billing}
        />

        <ToggleSetting
          label="Item Image"
          description="Allows you to add image of the item and show it during billing for reference"
          field="show_item_image"
          value={form.show_item_image}
        />

        <ToggleSetting
          label="Allow Decimal"
          description="Allows you to add decimal in quantity"
          field="allow_decimal_qty"
          value={form.allow_decimal_qty}
        />

        <ToggleSetting
          label="Sale Price Change"
          description="Allows you to change sale price at the time of billing"
          field="allow_sale_price_change"
          value={form.allow_sale_price_change}
        />

        <ToggleSetting
          label="Serial No. Textbox"
          description="Show serial number textbox at the time of billing"
          field="show_serial_no_textbox"
          value={form.show_serial_no_textbox}
        />

        <ToggleSetting
          label="Roundoff Total"
          description="Roundoff document total to the nearest one for easier billing"
          field="roundoff_total"
          value={form.roundoff_total}
        />

        <ToggleSetting
          label="Sale Price Excluding Tax"
          description="Automatically calculates sale price from amount and excludes tax"
          field="sale_price_excluding_tax"
          value={form.sale_price_excluding_tax}
        />

        <SelectSetting
          label="Credit Limit Crossed"
          description="Action to be taken when customer credit limit crosses"
          field="credit_limit_action"
          value={form.credit_limit_action || 'warn'}
          options={[{ value: 'warn', label: 'Warn' }, { value: 'block', label: 'Block' }, { value: 'allow', label: 'Allow' }]}
        />

        <SelectSetting
          label="Default Document Type"
          description="Set default document type as per your business practice"
          field="default_document_type"
          value={form.default_document_type || 'gst'}
          options={[{ value: 'gst', label: 'GST Invoice' }, { value: 'nongst', label: 'Non-GST Invoice' }, { value: 'bos', label: 'Bill of Supply' }]}
        />

        <ToggleSetting
          label="Change Document Type"
          description="Allows you to change document type at the time of billing"
          field="allow_change_document_type"
          value={form.allow_change_document_type}
        />

        <SelectSetting
          label="Default Item Search"
          description="Allows you to set method of finding item at the time of billing"
          field="default_item_search"
          value={form.default_item_search || 'name'}
          options={[{ value: 'name', label: 'Item Name' }, { value: 'barcode', label: 'Barcode' }, { value: 'tag', label: 'Item Tag' }]}
        />

        <SelectSetting
          label="Default Sale Linking"
          description="Set default sale linking as per your business practice"
          field="default_sale_linking"
          value={form.default_sale_linking || 'cash'}
          options={[{ value: 'cash', label: 'Cash Account' }, { value: 'customer', label: 'Customer Account' }]}
        />

        <ToggleSetting
          label="Change Sale Linking"
          description="Allows you to change sale linking at the time of billing"
          field="allow_change_sale_linking"
          value={form.allow_change_sale_linking}
        />

        <ToggleSetting
          label="Save Delivery Terms"
          description="Allows you to autosave delivery terms entered while billing"
          field="save_delivery_terms"
          value={form.save_delivery_terms}
        />

        <ToggleSetting
          label="Sale Price From Purchase"
          description="Allows you to fetch sale price of the item from last purchase bill"
          field="sale_price_from_purchase"
          value={form.sale_price_from_purchase}
        />

        <ToggleSetting
          label="Last Purchase Price"
          description="Show you last purchase price of selected item while billing"
          field="show_last_purchase_price"
          value={form.show_last_purchase_price}
        />

        <ToggleSetting
          label="Last 5 Sale Price"
          description="Show you last 5 sale transactions in sales while adding item"
          field="show_last_5_sale_price"
          value={form.show_last_5_sale_price}
        />
      </div>
    </div>
  );
}
