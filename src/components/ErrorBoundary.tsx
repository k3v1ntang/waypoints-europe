import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

// Catches uncaught render errors so a crash shows a recoverable screen
// instead of a silent blank page mid-trip (no dev tools on a phone to debug).
//
// ❓ CONCEPT: class component
// 📝 EXPLANATION: error boundaries are the one React feature that still
// requires a class (there is no hook equivalent of getDerivedStateFromError).
// In TS the Component base class takes <Props, State> type parameters -
// like typing a Generic[P, S] subclass in Python.

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Waypoints Europe crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className={styles.screen}>
        <div className={styles.art} aria-hidden="true">🗺️</div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          Waypoints Europe hit an unexpected error. Reloading usually fixes it.
        </p>
        <button className={styles.reload} onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
