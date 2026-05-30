import React, { useState, useEffect } from 'react';
import { getAllBranches } from '@/api/branchService';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function SequenceSettingsTab({ form, set }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("main");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllBranches();
        setBranches(data || []);
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    };
    load();
  }, []);

  const documentTypes = [
    { id: 'gst', label: 'GST Invoice', defaultFormat: 'GST-SEQ' },
    { id: 'inv', label: 'Invoice', defaultFormat: 'INV-SEQ' },
    { id: 'bill', label: 'Bill of Supply', defaultFormat: 'BILL-SEQ' },
    { id: 'proforma', label: 'Proforma Invoice', defaultFormat: 'PRO-SEQ' },
    { id: 'quotation', label: 'Quotation', defaultFormat: 'QUO-SEQ' },
    { id: 'return', label: 'Sale Return', defaultFormat: 'CR-SEQ' },
    { id: 'delivery', label: 'Delivery Challan', defaultFormat: 'DEL-SEQ' },
    { id: 'receipt', label: 'Payment Receipt', defaultFormat: 'REC-SEQ' },
    { id: 'so', label: 'Sale Order', defaultFormat: 'SO-SEQ' },
  ];

  const renderPreview = (format, seq) => {
    const s = String(Number(seq || 0) + 1).padStart(3, '0');
    return (format || "").replace("SEQ", s) || s;
  };

  const handleResetAll = () => {
    if (window.confirm(`Are you sure you want to reset all document sequences to zero for ${selectedBranch === 'main' ? 'Headquarters' : 'this branch'}?`)) {
      documentTypes.forEach(doc => {
        const prefix = selectedBranch === "main" ? "" : `${selectedBranch}_`;
        set(`${prefix}${doc.id}_seq`, "0");
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
        <h3 className="font-bold text-lg text-blue-600">Document Sequences</h3>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Configure for:</Label>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[220px] h-9 text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              <SelectValue placeholder="Select context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main" className="font-bold">🏢 Headquarters (Global)</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>📍 {b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentTypes.map(doc => {
          const prefix = selectedBranch === "main" ? "" : `${selectedBranch}_`;
          const seqKey = `${prefix}${doc.id}_seq`;
          const formatKey = `${prefix}${doc.id}_format`;
          const monthlyKey = `${prefix}${doc.id}_monthly`;

          return (
            <div key={doc.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{doc.label}</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs w-28 shrink-0">Number Seq <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    value={form[seqKey] || "0"} 
                    onChange={e => set(seqKey, e.target.value)} 
                    className="h-8 flex-1"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs w-28 shrink-0">Number Format <span className="text-red-500">*</span></Label>
                  <Select value={form[formatKey] || doc.defaultFormat} onValueChange={v => set(formatKey, v)}>
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={doc.defaultFormat}>{doc.defaultFormat}</SelectItem>
                      <SelectItem value={`${doc.defaultFormat.split('-')[0]}-YY-SEQ`}>{doc.defaultFormat.split('-')[0]}-YY-SEQ</SelectItem>
                      <SelectItem value={`${doc.defaultFormat.split('-')[0]}-YYYY-SEQ`}>{doc.defaultFormat.split('-')[0]}-YYYY-SEQ</SelectItem>
                      <SelectItem value={`${doc.defaultFormat.split('-')[0]}-FY-SEQ`}>{doc.defaultFormat.split('-')[0]}-FY-SEQ</SelectItem>
                      <SelectItem value={`SEQ`}>SEQ (Number Only)</SelectItem>
                      <SelectItem value={`Custom`}>Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form[formatKey] === 'Custom' && (
                  <div className="flex items-center justify-end gap-2">
                    <Input 
                      placeholder="e.g. PREFIX/FY/SEQ"
                      value={form[`${formatKey}_custom`] || doc.defaultFormat}
                      onChange={e => set(`${formatKey}_custom`, e.target.value)}
                      onBlur={e => {
                        if (e.target.value) set(formatKey, e.target.value);
                      }}
                      className="h-8 flex-1 ml-28"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id={monthlyKey} 
                      checked={form[monthlyKey] || false}
                      onCheckedChange={c => set(monthlyKey, c)}
                    />
                    <label htmlFor={monthlyKey} className="text-[10px] text-slate-500 cursor-pointer">Reset Monthly</label>
                  </div>
                  <div className="bg-blue-600 text-white px-4 py-1 rounded text-xs font-bold min-w-[80px] text-center shadow-sm">
                    {renderPreview(form[formatKey], form[seqKey])}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <button 
          onClick={handleResetAll} 
          className="text-red-500 hover:text-red-600 text-xs font-bold self-start underline underline-offset-2 mb-4"
        >
          Reset all number sequences to zero
        </button>

        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 p-4 rounded-lg text-[11px] leading-relaxed">
          <p><strong>Keywords -</strong> SEQ: Document No., YY: Year (20), YYYY: Year (2020), FY: Financial Year (19-20), MM: Month (09), MMM: Month (JUL)</p>
          <p className="mt-1">*Use SEQ keyword to place document number in format</p>
          <p>**Reset monthly function will work only when MM or MMM is used in format</p>
        </div>
      </div>
    </div>
  );
}
