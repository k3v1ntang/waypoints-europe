import { Component } from 'react';
import { colors } from '../config/theme.js';

// Catches uncaught render errors so a crash shows a recoverable screen
// instead of a silent blank page mid-trip (no dev tools on a phone to debug).
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Waypoints Europe crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div style={{ fontSize: '40px' }}>🗺️</div>
        <h1 style={{ fontSize: '18px', color: colors.gray[800], margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '14px', color: colors.gray[600], margin: 0, maxWidth: '320px' }}>
          Waypoints Europe hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            minHeight: '44px'
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
