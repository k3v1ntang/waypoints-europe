// Shared spring presets for the `motion` library (Phase 5b, plan step 4).
//
// ❓ CONCEPT: spring animation
// 📝 EXPLANATION: instead of "move over 300ms along a curve", a spring
// simulates a physical system - stiffness (how strongly it pulls toward the
// target) and damping (how quickly the bounce dies out). Springs keep their
// velocity when interrupted mid-flight, which is why iOS sheets feel
// "grabbable" rather than scripted. One shared vocabulary of springs keeps
// every surface moving with the same character.
//
// Reduced motion is handled globally: App.tsx wraps the tree in
// <MotionConfig reducedMotion="user">, which turns these transform
// animations into instant cross-fades when the OS setting asks for it.

import type { Transition } from 'motion/react';

/** Sheets sliding up from the bottom edge - soft, no overshoot. */
export const springSheet: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 40
};

/** Small popovers/menus scaling in - snappier, a hint of overshoot. */
export const springPop: Transition = {
  type: 'spring',
  stiffness: 550,
  damping: 32
};
