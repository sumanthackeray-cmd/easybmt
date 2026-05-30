import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, X, Chrome, Info, Share, PlusSquare, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const [activeTab, setActiveTab] = useState('chrome');

  useEffect(() => {
    // Detect device type for contextual text and default instruction tab
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      setDeviceType('android');
      setActiveTab('android');
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      setDeviceType('ios');
      setActiveTab('ios');
    } else {
      setDeviceType('desktop');
      setActiveTab('chrome');
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredInstallPrompt = e;
      
      // Dispatch custom event to notify external navbar buttons
      window.dispatchEvent(new CustomEvent('pwa-installable'));

      // Wait a few seconds before showing the passive bottom prompt
      setTimeout(() => {
        const hasDismissed = localStorage.getItem('easybmt_install_dismissed');
        if (!hasDismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      window.deferredInstallPrompt = null;
      setShowPrompt(false);
      setShowInstructions(false);
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    };

    const handleTriggerInstall = () => {
      // Check if native prompt is available
      const currentPrompt = window.deferredInstallPrompt || deferredPrompt;
      if (currentPrompt) {
        currentPrompt.prompt();
        currentPrompt.userChoice.then(({ outcome }) => {
          if (outcome === 'accepted') {
            handleAppInstalled();
          }
        });
      } else {
        // Show instructions modal if native installation trigger isn't ready
        setShowInstructions(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-app-install', handleTriggerInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-app-install', handleTriggerInstall);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const currentPrompt = window.deferredInstallPrompt || deferredPrompt;
    if (!currentPrompt) {
      setShowInstructions(true);
      return;
    }
    
    currentPrompt.prompt();
    const { outcome } = await currentPrompt.userChoice;
    if (outcome === 'accepted') {
      handleAppInstalled();
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('easybmt_install_dismissed', 'true');
  };

  return (
    <>
      {/* Passive bottom-right banner */}
      <AnimatePresence>
        {showPrompt && !showInstructions && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] bg-card border border-primary/30 shadow-2xl rounded-2xl z-50 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />
            
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    {deviceType === 'desktop' ? <Monitor className="w-6 h-6 text-primary" /> : <Smartphone className="w-6 h-6 text-primary" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight text-foreground">
                      Install EasyBMT App
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      Fast, Secure & Desktop-Ready
                    </p>
                  </div>
                </div>
                <button onClick={handleDismiss} className="text-muted-foreground hover:bg-secondary p-1 rounded-md transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Get full native desktop & mobile experience! Click install to add EasyBMT to your home screen with offline features.
              </p>

              <div className="flex gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download & Install
                </button>
                <button 
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-xl text-sm transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern instructions modal popup (Fallback) */}
      <AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-primary/20 shadow-2xl rounded-3xl overflow-hidden text-foreground"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />
              
              {/* Header */}
              <div className="p-6 border-b border-border/40 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0">
                    <Download className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">How to Install EasyBMT</h2>
                    <p className="text-xs text-muted-foreground font-semibold">Easy step-by-step app setup guide</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 flex gap-2 border-b border-border/20">
                <button
                  onClick={() => setActiveTab('chrome')}
                  className={`flex items-center gap-1.5 pb-3 px-2 text-sm font-black transition-all border-b-2 ${
                    activeTab === 'chrome' 
                      ? 'border-amber-500 text-amber-500' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Chrome className="w-4 h-4" />
                  Desktop (PC)
                </button>
                <button
                  onClick={() => setActiveTab('android')}
                  className={`flex items-center gap-1.5 pb-3 px-2 text-sm font-black transition-all border-b-2 ${
                    activeTab === 'android' 
                      ? 'border-amber-500 text-amber-500' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Android
                </button>
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`flex items-center gap-1.5 pb-3 px-2 text-sm font-black transition-all border-b-2 ${
                    activeTab === 'ios' 
                      ? 'border-amber-500 text-amber-500' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  iPhone & iPad
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'chrome' && (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-sm text-amber-600 dark:text-amber-400">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>If you are on Google Chrome, Brave, Edge, or Opera, you can install the site as an app with 1 click directly from the search bar.</span>
                    </div>
                    <ol className="space-y-3 text-sm text-muted-foreground font-medium">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">1</span>
                        <span>Look at your browser's address bar (search bar) at the top right.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">2</span>
                        <span>Click the **Install** icon (looks like a monitor with an arrow, or a **+** sign).</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">3</span>
                        <span>Confirm by clicking **Install** in the popup. A desktop shortcut will be automatically created!</span>
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'android' && (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-sm text-amber-600 dark:text-amber-400">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>Installs as a high-performance WebAPK with native background features.</span>
                    </div>
                    <ol className="space-y-3 text-sm text-muted-foreground font-medium">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">1</span>
                        <span>Open this website inside **Google Chrome** on your mobile phone.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">2</span>
                        <span>Tap the three dots icon (**⋮**) at the top right corner of Chrome.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">3</span>
                        <span>Tap **Add to Home screen** or **Install App** to place the icon on your launcher!</span>
                      </li>
                    </ol>
                  </div>
                )}

                {activeTab === 'ios' && (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-sm text-amber-600 dark:text-amber-400">
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>Apple requires Safari to install Progressive Web Apps onto iOS home screens.</span>
                    </div>
                    <ol className="space-y-3 text-sm text-muted-foreground font-medium">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">1</span>
                        <span>Open this website using the **Safari** browser on your iPhone or iPad.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">2</span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          Tap the **Share** button <Share className="w-4 h-4 text-blue-500 inline" /> in the bottom navigation bar.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-black text-foreground shrink-0">3</span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          Scroll down and tap **Add to Home Screen** <PlusSquare className="w-4 h-4 inline text-foreground" /> option.
                        </span>
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="p-6 bg-secondary/30 border-t border-border/40 flex justify-end">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors text-sm"
                >
                  Got It, Thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
