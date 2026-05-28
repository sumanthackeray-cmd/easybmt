/* @ts-nocheck */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Zap, ZapOff, X, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";

export default function CameraBarcodeScanner({ open, onOpenChange, onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null); // null = checking, true = granted, false = denied
  const [detectorSupported, setDetectorSupported] = useState(true);
  const [torchActive, setTorchActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scanLoopRef = useRef(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      onOpenChange(false);
      setManualBarcode("");
    }
  };

  // 1. Check for BarcodeDetector support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "BarcodeDetector" in window;
      setDetectorSupported(supported);
      if (supported) {
        try {
          // Initialize detector with common retail formats
          detectorRef.current = new window.BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
          });
        } catch (e) {
          console.error("Failed to initialize BarcodeDetector:", e);
          setDetectorSupported(false);
        }
      }
    }
  }, []);

  // 2. Control Camera Stream
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    setHasPermission(null);
    setTorchActive(false);
    setHasTorch(false);
    setIsScanning(false);

    try {
      const constraints = {
        video: {
          facingMode: { exact: "environment" }, // Prioritize back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Exact environment camera failed, falling back to any video source", err);
        // Fallback for emulators or front-camera-only devices
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to load before playing and starting scanner
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
          setHasPermission(true);
          setIsScanning(true);
          startScanningLoop();
          checkTorchCapability(stream);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      toast.error("Camera access denied or video hardware not available.");
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Check if camera track supports flashlight/torch control
  const checkTorchCapability = (stream) => {
    try {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities();
        if (capabilities && "torch" in capabilities) {
          setHasTorch(true);
        }
      }
    } catch (e) {
      console.warn("Failed to check torch capabilities:", e);
    }
  };

  // Toggle Flashlight/Torch natively
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const newTorchState = !torchActive;
        await track.applyConstraints({
          advanced: [{ torch: newTorchState }],
        });
        setTorchActive(newTorchState);
        toast.success(newTorchState ? "Flashlight turned ON" : "Flashlight turned OFF");
      }
    } catch (err) {
      console.error("Failed to toggle torch:", err);
      toast.error("Unable to control flashlight.");
    }
  };

  // 3. Scan frame loop using native BarcodeDetector API
  const startScanningLoop = () => {
    if (!detectorRef.current || !videoRef.current) return;

    const scanFrame = async () => {
      if (!isScanning && scanLoopRef.current === null) return;

      const video = videoRef.current;
      // Ensure video is playing and ready
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detectorRef.current.detect(video);
          if (barcodes && barcodes.length > 0) {
            const scannedValue = barcodes[0].rawValue;
            console.log("Barcode detected natively:", scannedValue);
            
            // Success audio/vibration feedback
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            // Dispatch result and close
            onScan(scannedValue);
            onOpenChange(false);
            return; // Exit loop on successful detection
          }
        } catch (e) {
          // Gracefully suppress frame-level detection errors
          console.debug("Frame detection error:", e);
        }
      }

      // Loop on next animation frame for maximum fluidity (60 FPS)
      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) stopCamera(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-slate-950 border border-slate-800 text-white rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-slate-900 bg-slate-950/90 backdrop-blur flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-amber-500">
              <Camera className="w-5 h-5 text-amber-500 animate-pulse" /> Camera Barcode Scanner
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 mt-0.5">
              Hold a product barcode within the central frame to scan automatically.
            </DialogDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-900 rounded-full w-8 h-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
          {/* Main Camera Video Viewport */}
          <video 
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Glassmorphic Darkened Outer Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
            {/* Upper Shading */}
            <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
            {/* Middle row containing target bracket and side blocks */}
            <div className="h-[200px] flex">
              <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
              {/* Scan box viewport frame */}
              <div className="w-[280px] h-[200px] relative flex items-center justify-center">
                {/* 4 Bracket Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-amber-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-amber-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-amber-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-amber-500 rounded-br-lg" />

                {/* Pulsing Scan Laser Line */}
                <div className="w-[90%] h-[2px] bg-red-500 absolute left-[5%] shadow-[0_0_8px_#ef4444] animate-[scan_2s_ease-in-out_infinite]" />

                {/* Subtitle instructions */}
                <span className="text-[10px] bg-black/75 px-3 py-1 rounded-full text-slate-300 font-bold border border-slate-800 tracking-wider absolute bottom-3 uppercase">
                  Align Barcode Here
                </span>
              </div>
              <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
            </div>
            {/* Lower Shading */}
            <div className="flex-1 bg-black/60 backdrop-blur-[1px]" />
          </div>

          {/* Loading & Status Alerts */}
          {hasPermission === null && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 gap-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs font-bold text-slate-350">Initializing camera streams...</p>
            </div>
          )}

          {hasPermission === false && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center gap-3">
              <AlertTriangle className="w-12 h-12 text-destructive" />
              <h4 className="font-extrabold text-sm text-slate-200">Camera Access Denied</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                This feature requires camera hardware access. Please grant camera permissions in your device settings to continue.
              </p>
              <Button onClick={startCamera} variant="outline" className="mt-2 border-slate-700 hover:bg-slate-900 gap-2 h-9 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          )}

          {/* Keyboard / Barcode Gun Manual Fallback */}
          {(!detectorSupported || showManualInput) && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-950/95 backdrop-blur border border-amber-500/30 rounded-2xl p-3.5 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col gap-2 pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                    {detectorSupported ? "Keyboard Entry Active" : "Software Scan & Gun Mode"}
                  </span>
                </div>
                <span className="text-[9px] text-slate-500">
                  {detectorSupported ? "tap apply or enter" : "optimized for USB/BT barcode guns"}
                </span>
              </div>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Scan with gun or type barcode..."
                  autoFocus
                  className="flex-1 h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black h-9 text-xs rounded-xl px-3.5 shadow-md shadow-amber-500/10"
                >
                  Apply
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 flex justify-between items-center">
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            Scanner Engine Active
          </div>
          <div className="flex gap-2">
            {detectorSupported && (
              <Button 
                onClick={() => setShowManualInput(!showManualInput)}
                variant="outline" 
                size="sm" 
                className={`h-9 bg-slate-900 border-slate-800 text-slate-250 ${showManualInput ? 'border-amber-500/50 text-amber-400 bg-amber-550/5' : 'hover:bg-slate-800'}`}
              >
                Keyboard
              </Button>
            )}
            {hasTorch && (
              <Button 
                onClick={toggleTorch}
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-9 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200"
              >
                {torchActive ? (
                  <>
                    <ZapOff className="w-3.5 h-3.5 text-amber-500" /> Flash Off
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Flash On
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={() => onOpenChange(false)}
              variant="outline" 
              size="sm" 
              className="h-9 border-slate-800 hover:bg-slate-900 text-slate-350"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
