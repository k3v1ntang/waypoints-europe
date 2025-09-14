/**
 * Waypoints Europe - Theme Configuration
 * 
 * This file contains the official color scheme and theming variables
 * used throughout the Waypoints Europe application.
 * 
 * Usage: Import this file when you need consistent theming colors
 * Example: import { colors } from '../config/theme.js'
 */

export const colors = {
  /**
   * PRIMARY THEME COLOR: #2563eb
   * 
   * This is the main brand color for Waypoints Europe, derived from
   * the "Refresh Maps" button color. It represents a professional,
   * trustworthy blue that works well for travel applications.
   * 
   * Color Details:
   * - Hex: #2563eb
   * - RGB: rgb(37, 99, 235) 
   * - HSL: hsl(217, 91%, 60%)
   * - Tailwind CSS equivalent: blue-600
   * 
   * Used in:
   * - PWA manifest theme_color and background_color
   * - App icons (PWA icons, Apple touch icon)  
   * - Refresh Maps button background
   * - POI markers on the map
   * - Google Maps links in popups
   */
  primary: '#2563eb',
  
  /**
   * SECONDARY COLORS
   * Supporting colors that complement the primary theme
   */
  white: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6', 
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  },
  
  /**
   * SEMANTIC COLORS
   * Colors for specific UI states and meanings
   */
  success: '#10b981',
  warning: '#f59e0b', 
  error: '#ef4444',
  info: '#3b82f6'
};

/**
 * COMPONENT THEMING
 * Pre-defined styles for common UI components
 */
export const components = {
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      border: 'none',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      transition: 'opacity 0.2s ease'
    }
  },
  
  marker: {
    poi: {
      backgroundColor: colors.primary,
      border: '2px solid white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      cursor: 'pointer'
    }
  },
  
  link: {
    external: {
      color: colors.primary,
      textDecoration: 'none',
      fontSize: '13px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }
  }
};

/**
 * THEME METADATA
 * Information about the theme for documentation and tooling
 */
export const theme = {
  name: 'Waypoints Europe',
  version: '1.0.0',
  description: 'Professional blue theme optimized for travel and navigation apps',
  primaryColor: colors.primary,
  colorScheme: 'blue',
  accessibility: {
    contrastRatio: 'AA compliant',
    colorBlindFriendly: true
  },
  lastUpdated: '2025-09-13'
};

/**
 * QUICK REFERENCE
 * 
 * When you need the main theme color, use: colors.primary (#2563eb)
 * 
 * This color is already applied to:
 * ✅ PWA manifest (theme_color, background_color)
 * ✅ App icons (192x192, 512x512, Apple touch icon)
 * ✅ Refresh Maps button
 * ✅ POI markers
 * ✅ Google Maps links
 * 
 * Future usage examples:
 * - Loading spinners: colors.primary
 * - Active navigation states: colors.primary  
 * - Form focus states: colors.primary with opacity
 * - Progress indicators: colors.primary
 */