// ❓ CONCEPT: ambient type declarations
// 📝 EXPLANATION: TypeScript only knows about .ts/.tsx imports natively;
// importing 'BottomBar.module.css' would be a compile error without a
// declaration of what that import evaluates to. This reference pulls in
// Vite's bundled declarations, which type *.module.css imports as an
// object of class-name strings (plus other Vite asset imports). Purely
// compile-time - nothing is emitted.
/// <reference types="vite/client" />
