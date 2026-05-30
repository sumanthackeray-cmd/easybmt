import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { StatusBar, Style } from '@capacitor/status-bar';

export function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

    const isDark = resolvedTheme === 'dark';
    const backgroundColor = isDark ? '#0b141a' : '#ffffff';

    // Update meta theme-color for Android navigation bar / status bar fallback
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = backgroundColor;

    // Capacitor Status Bar plugin
    try {
      // Style.Dark means light text (for dark backgrounds)
      // Style.Light means dark text (for light backgrounds)
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      
      // Set to match theme background dynamically instead of transparent overlay
      StatusBar.setBackgroundColor({ color: backgroundColor }).catch(() => {});
    } catch (e) {
      // Ignore if not running in Capacitor
    }
  }, [resolvedTheme]);

  return null;
}
