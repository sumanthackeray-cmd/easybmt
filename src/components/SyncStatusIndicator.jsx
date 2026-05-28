import React, { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export default function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [status, setStatus] = useState('idle'); // 'offline', 'syncing', 'idle'
  
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  useEffect(() => {
    // Initial status
    const checkNetwork = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch (e) {
        // Fallback for web
        setIsOnline(navigator.onLine);
      }
    };
    checkNetwork();

    let networkListener;
    try {
      Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
      }).then(listener => {
        networkListener = listener;
      });
    } catch (e) {}

    const handleWebOffline = () => setIsOnline(false);
    const handleWebOnline = () => setIsOnline(true);
    
    window.addEventListener('offline', handleWebOffline);
    window.addEventListener('online', handleWebOnline);

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
      window.removeEventListener('offline', handleWebOffline);
      window.removeEventListener('online', handleWebOnline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setStatus('offline');
      return;
    }

    if (isFetching > 0 || isMutating > 0) {
      setStatus('syncing');
    } else {
      setStatus('idle');
    }
  }, [isOnline, isFetching, isMutating]);

  if (status === 'idle' || status === 'syncing') return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-xs font-bold transition-all duration-300 transform ${
        status === 'offline' ? 'bg-[#3A1313] text-[#EF4444] border border-[#EF4444]/20 translate-y-0 opacity-100' :
        '-translate-y-4 opacity-0'
      }`}>
        {status === 'offline' && (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
