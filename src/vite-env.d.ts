// ❓ CONCEPT: ambient type declarations
// 📝 EXPLANATION: TypeScript only knows about .ts/.tsx imports natively;
// importing 'BottomBar.module.css' would be a compile error without a
// declaration of what that import evaluates to. This reference pulls in
// Vite's bundled declarations, which type *.module.css imports as an
// object of class-name strings (plus other Vite asset imports). Purely
// compile-time - nothing is emitted.
/// <reference types="vite/client" />

// Build-stamp globals injected by vite.config.js `define` (string
// replacement at build time). `declare const` tells TypeScript they exist
// at runtime without creating them - the TS equivalent of a Python type
// stub entry.
declare const __BUILD_SHA__: string;
declare const __BUILD_DATE__: string;
