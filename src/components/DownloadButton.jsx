import React, { useState } from 'react';
import { Download, Check, Loader2, X, Monitor, Apple, Terminal, Info, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSoftwareDownloadUrl } from '@/firebase/functions';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'react-hot-toast';

export default function DownloadButton({ className = "" }) {
  const { user } = useAuth();
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'failed'
  const [showModal, setShowModal] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  // Automated OS Detection
  const detectOS = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'mac';
    if (ua.includes('linux')) return 'linux';
    return null; // OS detection failed fallback
  };

  const handleDownload = async (targetOS = null) => {
    const os = targetOS || detectOS();

    if (!os) {
      // OS detection failed - present target operating system selection modal
      setShowModal(true);
      return;
    }

    setState('loading');

    try {
      // Fetch secure, signed download URL from Cloud Functions backend
      const response = await generateSoftwareDownloadUrl({ os });
      
      if (response && response.success) {
        setDownloadInfo(response);
        setState('success');
        
        // Trigger file download dynamically
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Downloading EasyBMT for ${os.toUpperCase()} (${response.version})`);

        // Reset state back to idle after a few seconds
        setTimeout(() => {
          setState('idle');
        }, 4000);
      } else {
        throw new Error("Could not fetch secure download URL.");
      }
    } catch (error) {
      console.error("Software download failed:", error);
      setState('failed');
      toast.error("Download failed. Please try again.");
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <>
      <button
        onClick={() => handleDownload()}
        disabled={state === 'loading'}
        aria-label="Download Enterprise Software Installer"
        className={`w-full md:w-auto h-9 px-4 inline-flex items-center justify-center gap-2 rounded-[11px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-black shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${className}`}
      >
        {state === 'loading' && (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        )}
        {state === 'success' && (
          <Check className="w-4 h-4 text-emerald-500 stroke-[3px]" />
        )}
        {state === 'idle' && (
          <Download className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:scale-110 transition-transform" />
        )}
        <span>
          {state === 'loading' ? 'Preparing Download...' : 
           state === 'success' ? 'Download Started!' : 
           'Download Software'}
        </span>
      </button>

      {/* Fallback Selection Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-card border border-border/40 shadow-2xl rounded-2xl p-6 text-foreground overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-base leading-tight">Select Operating System</h3>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Please choose your device platform</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  aria-label="Close modal"
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex gap-2 text-xs text-amber-600 dark:text-amber-400 mb-4 font-semibold">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>We couldn't automatically detect your operating system. Please select your setup manually below.</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => { setShowModal(false); handleDownload('windows'); }}
                  className="w-full p-3 rounded-xl border border-border/50 hover:bg-secondary/50 transition-all flex items-center justify-between text-sm font-bold text-foreground group"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-blue-500" />
                    <span>Windows Installer (.exe)</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold group-hover:text-foreground">Download &rarr;</span>
                </button>

                <button
                  onClick={() => { setShowModal(false); handleDownload('mac'); }}
                  className="w-full p-3 rounded-xl border border-border/50 hover:bg-secondary/50 transition-all flex items-center justify-between text-sm font-bold text-foreground group"
                >
                  <div className="flex items-center gap-3">
                    <Apple className="w-5 h-5 text-slate-800 dark:text-slate-100" />
                    <span>macOS DMG File (.dmg)</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold group-hover:text-foreground">Download &rarr;</span>
                </button>

                <button
                  onClick={() => { setShowModal(false); handleDownload('linux'); }}
                  className="w-full p-3 rounded-xl border border-border/50 hover:bg-secondary/50 transition-all flex items-center justify-between text-sm font-bold text-foreground group"
                >
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-emerald-500" />
                    <span>Linux Package (.AppImage)</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold group-hover:text-foreground">Download &rarr;</span>
                </button>
              </div>

              <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SECURE SIGNED BY EASYBMT</span>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
