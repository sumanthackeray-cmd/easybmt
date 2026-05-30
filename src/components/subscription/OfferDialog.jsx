import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

export default function OfferDialog({ isOpen, onClose, onProceed, planName }) {
  useEffect(() => {
    if (isOpen) {
      // Flower rain when popup opens
      const end = Date.now() + 1.5 * 1000;
      const colors = ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#ffd700'];
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 10000 });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 10000 });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader className="text-center pt-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-inner">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-3xl font-black text-center mb-2">
            Limited Time <span className="gold-text">Offer!</span>
          </DialogTitle>
          <DialogDescription className="text-center text-[15px]">
            You're about to unlock the <strong className="text-foreground">{planName}</strong> plan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-gradient-to-r from-primary/10 to-success/10 rounded-xl p-6 my-2 border border-primary/20 relative overflow-hidden shadow-sm">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-success/20 rounded-full blur-2xl"></div>
          
          <h3 className="font-black text-2xl text-center mb-2 relative z-10 leading-tight">3 Months Completely <br/><span className="text-success text-3xl font-black drop-shadow-sm">FREE</span></h3>
          <p className="text-[13.5px] text-center text-foreground/80 relative z-10 font-medium">
            Start today and get full access without paying anything for the first 3 months. No commitments!
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
          <Button 
            className="w-full text-lg py-6 font-black gold-gradient text-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all" 
            onClick={() => { onClose(); onProceed(); }}
          >
            Claim Offer & Continue
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-muted-foreground font-bold hover:bg-secondary/50">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
