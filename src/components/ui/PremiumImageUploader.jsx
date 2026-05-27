import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Trash2, Edit, RefreshCw, X, Eye, ShieldAlert } from "lucide-react";

export default function PremiumImageUploader({
  value = "",
  onChange,
  label = "Upload Image",
  recommendedWidth = 300,
  recommendedHeight = 300,
  maxSizeBytes = 2 * 1024 * 1024, // Default 2MB
  maxSizeLabel = "2MB",
  aspectRatio = "aspect-square",
  className = "",
  onUploadStart,
  onUploadEnd
}) {
  const [uploading, setUploading] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify file size
    if (file.size > maxSizeBytes) {
      toast.error(`File is too large! Maximum limit is ${maxSizeLabel}`);
      return;
    }

    setUploading(true);
    if (onUploadStart) onUploadStart();

    try {
      toast.promise(
        base44.integrations.Core.UploadFile({ file }),
        {
          loading: "Uploading image to cloud database...",
          success: (res) => {
            if (res && res.file_url) {
              onChange(res.file_url);
              if (onUploadEnd) onUploadEnd(res.file_url);
              return "Image uploaded successfully!";
            }
            throw new Error("Invalid response format");
          },
          error: (err) => `Upload failed: ${err.message}`
        }
      );
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      // Reset input value to allow selecting same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBoxClick = (e) => {
    e.preventDefault();
    if (value) {
      // Image already exists: open the premium option modal
      setShowOptionsModal(true);
    } else {
      // Empty: trigger standard file upload
      fileInputRef.current?.click();
    }
  };

  const handleReplace = () => {
    setShowOptionsModal(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 200);
  };

  const handleDelete = () => {
    onChange("");
    setShowOptionsModal(false);
    toast.success("Image deleted successfully");
  };

  const handleEditPreview = () => {
    setShowOptionsModal(false);
    setTimeout(() => {
      setShowPreviewModal(true);
    }, 200);
  };

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {label && (
        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" /> {label}
        </Label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {/* Trigger Box */}
      <div
        onClick={handleBoxClick}
        className={cn(
          "relative w-full rounded-2xl border-2 border-dashed border-border/80 bg-secondary/15 hover:bg-secondary/25 hover:border-primary/50 cursor-pointer overflow-hidden transition-all duration-300 flex flex-col items-center justify-center group shadow-sm select-none",
          aspectRatio,
          value ? "border-solid border-primary/20 bg-card" : ""
        )}
      >
        {value ? (
          // Pre-uploaded Image View
          <div className="absolute inset-0 w-full h-full p-2 flex items-center justify-center bg-white/5 dark:bg-black/10">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* Quick Action Badge overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-background/90 text-foreground border border-border/50 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                <Edit className="w-3 h-3 text-primary animate-pulse" /> Manage Image
              </span>
            </div>
          </div>
        ) : (
          // Empty State view with upload instructions
          <div className="p-4 flex flex-col items-center justify-center text-center space-y-2">
            <div className={cn(
              "p-3 rounded-full bg-secondary/40 border border-border group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300",
              uploading ? "animate-spin" : ""
            )}>
              {uploading ? (
                <RefreshCw className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                {uploading ? "Uploading Image..." : "Click to Upload"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Recommended: <strong className="text-foreground">{recommendedWidth}×{recommendedHeight}px</strong>
              </p>
              <p className="text-[9px] text-muted-foreground/80">
                Format: JPG, PNG • Max <strong className="text-foreground/90">{maxSizeLabel}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==================== POPUP DIALOG: MANAGE UPLOADED IMAGE (REPLACE/DELETE/EDIT) ==================== */}
      <Dialog open={showOptionsModal} onOpenChange={setShowOptionsModal}>
        <DialogContent className="max-w-md bg-card/95 border border-border/80 backdrop-blur-xl p-5 shadow-2xl rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-black tracking-tight text-primary uppercase flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> Manage {label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Would you like to preview, replace, or permanently delete the uploaded {label.toLowerCase()} image?
            </DialogDescription>
          </DialogHeader>

          {/* Quick Preview Thumbnail */}
          <div className="my-4 border border-border/40 rounded-xl bg-secondary/10 overflow-hidden flex items-center justify-center p-4 min-h-[120px] max-h-[200px]">
            <img src={value} alt="Preview" className="max-w-full max-h-[160px] object-contain rounded shadow-sm p-1" />
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleEditPreview}
              className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border border-border hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              <Eye className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-extrabold uppercase">Edit / View</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReplace}
              className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border border-border hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-amber-500 animate-spin-slow" />
              <span className="text-[10px] font-extrabold uppercase">Replace</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl border border-destructive/20 hover:bg-destructive/10 text-destructive bg-transparent transition-colors hover:text-destructive"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-[10px] font-extrabold uppercase">Delete</span>
            </Button>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border/30 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowOptionsModal(false)}
              className="text-xs font-bold h-8 px-4"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== POPUP DIALOG: IMAGE FULL SCREEN PREVIEW & DETAILS ==================== */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl bg-card border border-border/80 p-5 shadow-2xl rounded-2xl flex flex-col h-[80vh]">
          <DialogHeader className="space-y-0.5 flex flex-row items-center justify-between border-b border-border/30 pb-2">
            <div>
              <DialogTitle className="text-base font-black tracking-tight text-primary uppercase">
                Image HD Preview
              </DialogTitle>
              <DialogDescription className="text-xs">
                Full high-definition digital rendering of your {label.toLowerCase()}.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreviewModal(false)}
              className="w-8 h-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* Full Screen Image Sandbox */}
          <div className="flex-1 my-4 border border-border/30 rounded-xl bg-slate-950/80 overflow-hidden flex items-center justify-center p-6 relative">
            <img src={value} alt="Full Size Preview" className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-95 duration-300" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Recommended: {recommendedWidth}×{recommendedHeight}px ({maxSizeLabel} Limit)</span>
            </div>
            <Button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="text-xs font-bold h-8 px-5 bg-primary text-black"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
