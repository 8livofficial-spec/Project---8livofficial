/**
 * Healthcare SaaS Design System Tokens
 * Premium Onboarding & Telemedicine Platform
 * Inspired by: Stripe, Linear, Notion, Headspace Health, One Medical, Apple Health
 */

// ──────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ──────────────────────────────────────────────────────────────────

export const colors = {
  // Primary Brand
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Secondary (Teal/Accent)
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#134E4A',
    900: '#0F2F2D',
  },

  // Success
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#145231',
  },

  // Warning
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Error
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutral
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Semantic
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
}

// ──────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ──────────────────────────────────────────────────────────────────

export const typography = {
  // Headings
  heading1: {
    fontSize: '2.25rem', // 36px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  heading2: {
    fontSize: '1.875rem', // 30px
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  heading3: {
    fontSize: '1.5rem', // 24px
    fontWeight: 700,
    lineHeight: 1.33,
    letterSpacing: '-0.01em',
  },
  heading4: {
    fontSize: '1.25rem', // 20px
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0em',
  },

  // Body
  bodyLarge: {
    fontSize: '1.125rem', // 18px
    fontWeight: 500,
    lineHeight: 1.556,
    letterSpacing: '0em',
  },
  bodyRegular: {
    fontSize: '1rem', // 16px
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0em',
  },
  bodySmall: {
    fontSize: '0.875rem', // 14px
    fontWeight: 500,
    lineHeight: 1.43,
    letterSpacing: '0em',
  },

  // UI Text
  uiText: {
    fontSize: '0.75rem', // 12px
    fontWeight: 600,
    lineHeight: 1.33,
    letterSpacing: '0.05em',
  },

  // Label
  label: {
    fontSize: '0.8125rem', // 13px
    fontWeight: 600,
    lineHeight: 1.54,
    letterSpacing: '0em',
  },
}

// ──────────────────────────────────────────────────────────────────
// SPACING SCALE
// ──────────────────────────────────────────────────────────────────

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '2.5rem',  // 40px
  '3xl': '3rem',    // 48px
  '4xl': '4rem',    // 64px
}

// ──────────────────────────────────────────────────────────────────
// BORDER RADIUS
// ──────────────────────────────────────────────────────────────────

export const borderRadius = {
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
}

// ──────────────────────────────────────────────────────────────────
// SHADOWS
// ──────────────────────────────────────────────────────────────────

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
  sm: '0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
  '2xl': '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
  elevated: '0 8px 16px -2px rgba(15, 23, 42, 0.08)',
  focus: '0 0 0 3px rgba(37, 99, 235, 0.1)',
}

// ──────────────────────────────────────────────────────────────────
// TRANSITIONS
// ──────────────────────────────────────────────────────────────────

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
}

// ──────────────────────────────────────────────────────────────────
// Z-INDEX SCALE
// ──────────────────────────────────────────────────────────────────

export const zIndex = {
  hidden: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  offcanvas: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
}

// ──────────────────────────────────────────────────────────────────
// COMPONENT TOKENS
// ──────────────────────────────────────────────────────────────────

export const components = {
  button: {
    primary: {
      background: colors.primary[600],
      text: '#FFFFFF',
      hover: colors.primary[700],
      active: colors.primary[800],
      disabled: colors.neutral[300],
    },
    secondary: {
      background: colors.neutral[100],
      text: colors.neutral[900],
      hover: colors.neutral[200],
      active: colors.neutral[300],
      disabled: colors.neutral[200],
    },
  },
  card: {
    background: colors.surface,
    border: colors.border,
    shadow: shadows.sm,
  },
  input: {
    background: colors.surface,
    border: colors.border,
    focus: colors.primary[500],
    placeholder: colors.textTertiary,
  },
}
