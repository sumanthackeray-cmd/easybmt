import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerHaptic = async (style = ImpactStyle.Light) => {
  if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNative) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};

export const triggerHapticSuccess = async () => triggerHaptic(ImpactStyle.Medium);
export const triggerHapticWarning = async () => triggerHaptic(ImpactStyle.Heavy);
export const triggerHapticLight = async () => triggerHaptic(ImpactStyle.Light);
