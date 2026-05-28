import React, { useState, useEffect } from "react";
import { registerPlugin } from '@capacitor/core';
import { motion, AnimatePresence } from "framer-motion";

const PermissionsHelper = registerPlugin('PermissionsHelper');
import {
  Camera,
  Mic,
  Users,
  MapPin,
  Bluetooth,
  Bell,
  FolderOpen,
  ArrowRight,
  Settings,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info
} from "lucide-react";

// List of permission steps for onboarding
const PERMISSIONS = [
  {
    id: "camera",
    title: "Camera Access",
    desc: "Required to scan item barcodes instantly during POS billing, capture catalog items, and snap profile images.",
    icon: Camera,
    color: "from-amber-400 to-orange-500",
    glow: "rgba(245, 158, 11, 0.25)",
    required: true
  },
  {
    id: "microphone",
    title: "Microphone Access",
    desc: "Used for hands-free AI voice commands, voice-guided product search, and dictating billing notes.",
    icon: Mic,
    color: "from-violet-400 to-purple-600",
    glow: "rgba(139, 92, 246, 0.25)",
    required: false
  },
  {
    id: "contacts",
    title: "Customer Contacts",
    desc: "Allows direct lookup and auto-completion of customer contact details during quick invoicing.",
    icon: Users,
    color: "from-teal-400 to-emerald-600",
    glow: "rgba(20, 184, 166, 0.25)",
    required: false
  },
  {
    id: "location",
    title: "Location Access",
    desc: "Required to scan and connect to local Bluetooth thermal receipt printers, and apply localized GST rules.",
    icon: MapPin,
    color: "from-blue-400 to-indigo-600",
    glow: "rgba(59, 130, 246, 0.25)",
    required: true,
    hasHardware: true
  },
  {
    id: "bluetooth",
    title: "Bluetooth Printer",
    desc: "Essential for linking wireless thermal printers and streaming high-speed native ESC/POS print jobs.",
    icon: Bluetooth,
    color: "from-cyan-400 to-sky-600",
    glow: "rgba(6, 182, 212, 0.25)",
    required: true,
    hasHardware: true
  },
  {
    id: "notifications",
    title: "Push Alerts",
    desc: "Receive real-time low-stock inventory warnings, cloud syncing notifications, and sales updates.",
    icon: Bell,
    color: "from-pink-400 to-rose-600",
    glow: "rgba(236, 72, 153, 0.25)",
    required: false
  },
  {
    id: "files",
    title: "Storage & Files",
    desc: "Used to save PDF sales invoices locally, backup offline ledger exports, and load product photos.",
    icon: FolderOpen,
    color: "from-yellow-400 to-amber-500",
    glow: "rgba(234, 179, 8, 0.25)",
    required: true
  }
];

export default function PremiumPermissionOnboarding({ onComplete }) {
  // Onboarding screens: -1 = Welcome Splash, 0..6 = Permissions, 7 = Complete Splash
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [permissionStates, setPermissionStates] = useState({});
  const [hardwareStates, setHardwareStates] = useState({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanationType, setExplanationType] = useState(null); // 'denied' | 'permanently_denied' | 'gps_off' | 'bt_off'

  const activeStep = currentStepIndex >= 0 && currentStepIndex < PERMISSIONS.length ? PERMISSIONS[currentStepIndex] : null;

  // Check initial permissions status on load
  useEffect(() => {
    if (window.Capacitor && window.Capacitor.isNative) {
      checkAllInitialPermissions();
    }
  }, []);

  const checkAllInitialPermissions = async () => {
    try {
      const states = {};
      const hardware = {};
      for (const p of PERMISSIONS) {
        const res = await PermissionsHelper.checkPermissionStatus({ name: p.id });
        states[p.id] = res.status;
        if (p.hasHardware) {
          hardware[p.id] = res.serviceEnabled;
        }
      }
      setPermissionStates(states);
      setHardwareStates(hardware);
    } catch (err) {
      console.error("Error checking initial permission states:", err);
    }
  };

  const handleStart = () => {
    setCurrentStepIndex(0);
  };

  const handleSkip = () => {
    // If optional permission is skipped, we track it as denied but proceed
    if (activeStep && !activeStep.required) {
      setPermissionStates(prev => ({ ...prev, [activeStep.id]: "denied" }));
      setShowExplanationModal(false);
      goToNextStep();
    }
  };

  const handleNextAction = async () => {
    if (!activeStep) return;
    setIsLoading(true);

    try {
      // Check current state first
      const statusRes = await PermissionsHelper.checkPermissionStatus({ name: activeStep.id });
      
      if (statusRes.status === "granted") {
        // If granted, check hardware service if applicable
        if (activeStep.id === "location" && !statusRes.serviceEnabled) {
          setExplanationType("gps_off");
          setShowExplanationModal(true);
          setIsLoading(false);
          return;
        }
        if (activeStep.id === "bluetooth" && !statusRes.serviceEnabled) {
          setExplanationType("bt_off");
          setShowExplanationModal(true);
          setIsLoading(false);
          return;
        }
        
        // Progress to next step
        setPermissionStates(prev => ({ ...prev, [activeStep.id]: "granted" }));
        goToNextStep();
        setIsLoading(false);
        return;
      }

      if (statusRes.status === "permanently_denied") {
        setExplanationType("permanently_denied");
        setShowExplanationModal(true);
        setIsLoading(false);
        return;
      }

      // Request permission natively
      const reqRes = await PermissionsHelper.requestPermission({ name: activeStep.id });
      setPermissionStates(prev => ({ ...prev, [activeStep.id]: reqRes.status }));

      if (reqRes.status === "granted") {
        // Check hardware trigger
        if (activeStep.id === "location" && !reqRes.serviceEnabled) {
          setExplanationType("gps_off");
          setShowExplanationModal(true);
        } else if (activeStep.id === "bluetooth" && !reqRes.serviceEnabled) {
          setExplanationType("bt_off");
          setShowExplanationModal(true);
        } else {
          goToNextStep();
        }
      } else if (reqRes.status === "permanently_denied") {
        setExplanationType("permanently_denied");
        setShowExplanationModal(true);
      } else {
        // Just denied
        setExplanationType("denied");
        setShowExplanationModal(true);
      }
    } catch (err) {
      console.error("Error executing permission flow:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryPermission = async () => {
    setShowExplanationModal(false);
    await handleNextAction();
  };

  const handleOpenSettings = async () => {
    try {
      await PermissionsHelper.openSettings();
      // Brief interval to let user return
      const checkInterval = setInterval(async () => {
        if (!activeStep) {
          clearInterval(checkInterval);
          return;
        }
        const res = await PermissionsHelper.checkPermissionStatus({ name: activeStep.id });
        if (res.status === "granted") {
          setPermissionStates(prev => ({ ...prev, [activeStep.id]: "granted" }));
          setShowExplanationModal(false);
          clearInterval(checkInterval);
          goToNextStep();
        }
      }, 1000);
      
      // Auto-clear after 15 seconds to prevent memory resource leaks
      setTimeout(() => clearInterval(checkInterval), 15000);
    } catch (err) {
      console.error("Could not trigger app settings:", err);
    }
  };

  const handleEnableGPS = async () => {
    setIsLoading(true);
    try {
      const res = await PermissionsHelper.enableLocation();
      if (res.enabled) {
        setHardwareStates(prev => ({ ...prev, location: true }));
        setShowExplanationModal(false);
        goToNextStep();
      }
    } catch (err) {
      console.error("Failed to enable GPS:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBluetooth = async () => {
    setIsLoading(true);
    try {
      const res = await PermissionsHelper.enableBluetooth();
      if (res.enabled) {
        setHardwareStates(prev => ({ ...prev, bluetooth: true }));
        setShowExplanationModal(false);
        goToNextStep();
      }
    } catch (err) {
      console.error("Failed to enable Bluetooth:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex + 1 < PERMISSIONS.length) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setCurrentStepIndex(PERMISSIONS.length); // Complete screen
    }
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("easybmt_permissions_setup_completed", "true");
    onComplete();
  };

  // Helper render for step icons inside progress indicator
  const renderStepIndicator = (p, idx) => {
    const isCompleted = idx < currentStepIndex;
    const isActive = idx === currentStepIndex;
    const Icon = p.icon;

    return (
      <div key={p.id} className="flex flex-col items-center flex-1 position-relative">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            isCompleted
              ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              : isActive
              ? "bg-gold-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              : "bg-white/5 border-white/10 text-white/40"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className={`text-[10px] mt-1.5 font-medium hidden xs:block ${isActive ? "text-yellow-400" : isCompleted ? "text-emerald-400" : "text-white/30"}`}>
          {p.title.split(" ")[0]}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden flex flex-col justify-between font-sans text-slate-100 select-none">
      {/* Background Neon Glow Circles */}
      <div className="absolute top-[-10%] left-[-15%] w-[60%] aspect-square rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60%] aspect-square rounded-full bg-yellow-500/10 blur-[150px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center font-black text-black text-lg shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            E
          </div>
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-yellow-400">EasyBMT</h1>
            <p className="text-[10px] text-white/50 tracking-tight">Enterprise Setup Flow</p>
          </div>
        </div>

        {currentStepIndex >= 0 && currentStepIndex < PERMISSIONS.length && (
          <span className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full font-semibold text-white/80">
            Step {currentStepIndex + 1} of {PERMISSIONS.length}
          </span>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 overflow-y-auto py-8 z-10">
        <AnimatePresence mode="wait">
          {/* WELCOME SPLASH SCREEN (-1) */}
          {currentStepIndex === -1 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="max-w-md w-full text-center flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-pulse">
                  <Sparkles className="w-12 h-12 text-black" />
                </div>
                <div className="absolute -inset-1 bg-yellow-400/20 rounded-2xl blur-md pointer-events-none" />
              </div>

              <div>
                <h2 className="text-2xl xs:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">
                  Setup EasyBMT
                </h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed px-4">
                  Welcome to the premium billing platform. To ensure high-speed processing, local printer connectivity, and barcode scanning, let's configure your terminal permissions.
                </p>
              </div>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-left flex flex-col gap-3.5 backdrop-blur-md">
                <h3 className="text-xs font-black tracking-widest text-yellow-400 uppercase">System Integration Overview</h3>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-normal">
                    <strong>Seamless Printer Linkage:</strong> Automatically discover local Bluetooth thermal checkout receipt devices.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-normal">
                    <strong>Ultra-Fast Scanning:</strong> Instant native camera integration for rapid product lookups and retail checkouts.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="w-full mt-2 py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold rounded-xl shadow-[0_4px_25px_rgba(234,179,8,0.25)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* ACTIVE STEP SCREEN (0 to 6) */}
          {activeStep && (
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="max-w-md w-full flex flex-col items-center gap-6"
            >
              {/* Animated Floating Card */}
              <div className="relative w-full aspect-[4/3] rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col items-center justify-center overflow-hidden backdrop-blur-lg shadow-2xl">
                {/* Radial color backglow */}
                <div
                  className="absolute inset-0 transition-all duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${activeStep.glow} 0%, transparent 65%)`
                  }}
                />

                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12 }}
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${activeStep.color} flex items-center justify-center shadow-lg text-black mb-4 z-10`}
                >
                  <activeStep.icon className="w-10 h-10" />
                </motion.div>

                <h3 className="text-xl font-extrabold z-10">{activeStep.title}</h3>
                <span className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full border z-10 mt-2 ${
                  activeStep.required 
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-white/5 border-white/10 text-white/50"
                }`}>
                  {activeStep.required ? "Required Core Feature" : "Optional Enhancement"}
                </span>
              </div>

              {/* Step Description */}
              <div className="text-center px-2">
                <p className="text-sm leading-relaxed text-slate-300">
                  {activeStep.desc}
                </p>
              </div>

              {/* Primary Action Button */}
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={handleNextAction}
                  disabled={isLoading}
                  className={`w-full py-4 font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    isLoading
                      ? "bg-yellow-500/20 text-yellow-500/50 cursor-not-allowed border border-yellow-500/10"
                      : "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(234,179,8,0.2)]"
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Grant {activeStep.title.split(" ")[0]}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Skip option for optional integrations */}
                {!activeStep.required && (
                  <button
                    onClick={goToNextStep}
                    className="w-full py-3 bg-transparent hover:bg-white/5 text-white/40 hover:text-white/80 font-medium rounded-xl text-xs transition-all duration-200"
                  >
                    Skip & Configure Later
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ONBOARDING COMPLETE SPLASH (7) */}
          {currentStepIndex === PERMISSIONS.length && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="max-w-md w-full text-center flex flex-col items-center gap-6"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-12 h-12 text-black" />
                </div>
                <div className="absolute -inset-1 bg-emerald-400/20 rounded-2xl blur-md pointer-events-none" />
              </div>

              <div>
                <h2 className="text-2xl xs:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">
                  Terminal Configured!
                </h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed px-4">
                  Awesome! EasyBMT has successfully integrated with your device hardware permissions. You are ready to issue high-speed offline sales receipts and run billing seamlessly.
                </p>
              </div>

              {/* Status checklist grid */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-left grid grid-cols-2 gap-3.5 backdrop-blur-md">
                {PERMISSIONS.map(p => {
                  const state = permissionStates[p.id];
                  const granted = state === "granted";
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${granted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/20"}`} />
                      <span className={`text-xs ${granted ? "text-slate-200" : "text-white/30 line-through"}`}>{p.title}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleFinishOnboarding}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold rounded-xl shadow-[0_4px_25px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Proceed to Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER - PROGRESS PIPELINE */}
      <footer className="px-6 py-8 border-t border-white/5 bg-slate-950/60 backdrop-blur-md z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {PERMISSIONS.map((p, idx) => renderStepIndicator(p, idx))}
        </div>
      </footer>

      {/* DYNAMIC MODALS AND RATIONALES DIALOGS OVERLAY */}
      <AnimatePresence>
        {showExplanationModal && activeStep && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Header Icon */}
              <div className="flex gap-4 items-start mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 text-yellow-400 shrink-0 border border-white/10`}>
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold leading-tight">
                    {explanationType === "gps_off" && "Location Services Disabled"}
                    {explanationType === "bt_off" && "Bluetooth Radio Disabled"}
                    {explanationType === "permanently_denied" && `${activeStep.title} Settings Required`}
                    {explanationType === "denied" && `${activeStep.title} Required`}
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-0.5">Device Integration Alert</p>
                </div>
              </div>

              {/* Rationale Copy */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6">
                <p className="text-xs leading-relaxed text-slate-300">
                  {explanationType === "gps_off" && "Your device location setting is switched OFF. EasyBMT requires active hardware Location Services to identify and print receipts via nearby Bluetooth thermal printers."}
                  {explanationType === "bt_off" && "Bluetooth radio connectivity is currently turned OFF. We require Bluetooth active to transmit thermal sales drafts directly to your mobile printer."}
                  {explanationType === "permanently_denied" && `You have permanently blocked ${activeStep.title} permissions ("Don't ask again"). Please click 'Open App Settings' to enable it manually under the app details screen.`}
                  {explanationType === "denied" && `Without approving ${activeStep.title}, EasyBMT cannot fully integrate with your device's core features. Let's try again!`}
                </p>
              </div>

              {/* Actions Grid */}
              <div className="flex flex-col gap-2">
                {explanationType === "gps_off" && (
                  <button
                    onClick={handleEnableGPS}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-xl transition-all duration-200"
                  >
                    Enable Location Services (GPS)
                  </button>
                )}
                
                {explanationType === "bt_off" && (
                  <button
                    onClick={handleEnableBluetooth}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-xl transition-all duration-200"
                  >
                    Enable Bluetooth Radio
                  </button>
                )}

                {explanationType === "permanently_denied" && (
                  <button
                    onClick={handleOpenSettings}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <Settings className="w-5 h-5" />
                    Open App Settings
                  </button>
                )}

                {explanationType === "denied" && (
                  <button
                    onClick={handleRetryPermission}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold rounded-xl transition-all duration-200"
                  >
                    Retry Permission
                  </button>
                )}

                {/* Show Skip Option for Optional Permissions in Explanation Dialog */}
                {!activeStep.required ? (
                  <button
                    onClick={handleSkip}
                    className="w-full py-3 bg-transparent hover:bg-white/5 text-white/50 font-medium rounded-xl text-xs transition-all duration-200"
                  >
                    Skip and continue anyway
                  </button>
                ) : (
                  <button
                    onClick={() => setShowExplanationModal(false)}
                    className="w-full py-3 bg-transparent hover:bg-white/5 text-white/40 hover:text-white/80 font-medium rounded-xl text-xs transition-all duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
