import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

export function useAppLifecycle() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let listener = null;
    
    const setupListener = async () => {
      try {
        listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          setIsActive(isActive);
          
          if (isActive) {
            // App restored from background
            // We dispatch a custom event that data hooks can listen to for background refetching
            window.dispatchEvent(new Event('app_resumed'));
          } else {
            // App minimized
            window.dispatchEvent(new Event('app_minimized'));
          }
        });
      } catch (e) {
        console.warn('Capacitor App plugin not available for lifecycle', e);
      }
    };

    if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNative) {
      setupListener();
    }

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, []);

  return { isActive };
}

export default useAppLifecycle;
