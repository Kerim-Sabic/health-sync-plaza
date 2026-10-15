/**
 * One map for every haptic in the app. On devices without vibration
 * (iOS Safari, desktop) these are silent no-ops.
 */
const vibrate = (p: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
  } catch {
    /* some browsers throw outside a user gesture */
  }
};

export const feedback = {
  /** Light tick: chips, steppers, scrubbing between data points. */
  selection: () => vibrate(6),
  /** Taps on primary actions. */
  impactLight: () => vibrate(10),
  impactMedium: () => vibrate(18),
  /** Save, set complete. */
  success: () => vibrate([12, 40, 18]),
  warning: () => vibrate([20, 60, 20]),
  error: () => vibrate([30, 40, 30]),
  /** Personal records and goals. */
  celebration: () => vibrate([16, 40, 16, 40, 60]),
};
