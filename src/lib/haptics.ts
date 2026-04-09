/**
 * Haptic feedback utility for mobile devices.
 * Uses navigator.vibrate() where available.
 */
export const haptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const ms = intensity === 'light' ? 5 : intensity === 'medium' ? 10 : 20;
    navigator.vibrate(ms);
  }
};
