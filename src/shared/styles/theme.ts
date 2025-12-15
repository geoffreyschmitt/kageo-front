/**
 * Design Tokens - TypeScript Theme Object
 * 
 * This file provides type-safe access to design tokens that match
 * the CSS custom properties defined in variables.css
 */

export type SpacingScale = 100 | 200 | 300 | 400 | 500 | 600 | 800 | 1000;

export interface ColorTokens {
  primary: {
    main: string;
    hover: string;
    active: string;
    light: string;
    lightHover: string;
  };
  success: {
    main: string;
    hover: string;
    light: string;
  };
  error: {
    main: string;
    hover: string;
    light: string;
  };
  warning: {
    main: string;
    hover: string;
    light: string;
  };
  info: {
    main: string;
    hover: string;
    light: string;
  };
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  status: {
    wanted: string;
    purchased: string;
    reserved: string;
    proposed: string;
  };
  priority: {
    high: string;
    medium: string;
    low: string;
  };
  background: {
    default: string;
    secondary: string;
    tertiary: string;
  };
  foreground: {
    default: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    default: string;
    hover: string;
    focus: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
}

export interface SpacingTokens {
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  800: string;
  1000: string;
}

export interface TypographyTokens {
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    normal: string;
    wide: string;
  };
}

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  buttonHover: string;
  card: string;
  cardHover: string;
  modal: string;
}

export interface BorderTokens {
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  width: {
    thin: string;
    medium: string;
  };
}

export interface TransitionTokens {
  duration: {
    fast: string;
    base: string;
  };
  easing: {
    standard: string;
    smooth: string;
  };
  all: {
    fast: string;
    base: string;
  };
  transform: {
    fast: string;
    base: string;
  };
}

export interface Theme {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  borders: BorderTokens;
  transitions: TransitionTokens;
}

/**
 * Theme object matching CSS custom properties
 * 
 * Note: These values reference CSS variables. In CSS Modules,
 * use var(--token-name) directly. This object is primarily
 * for TypeScript type checking and programmatic access.
 */
export const theme: Theme = {
  colors: {
    primary: {
      main: 'var(--color-primary-main)',
      hover: 'var(--color-primary-hover)',
      active: 'var(--color-primary-active)',
      light: 'var(--color-primary-light)',
      lightHover: 'var(--color-primary-light-hover)',
    },
    success: {
      main: 'var(--color-success-main)',
      hover: 'var(--color-success-hover)',
      light: 'var(--color-success-light)',
    },
    error: {
      main: 'var(--color-error-main)',
      hover: 'var(--color-error-hover)',
      light: 'var(--color-error-light)',
    },
    warning: {
      main: 'var(--color-warning-main)',
      hover: 'var(--color-warning-hover)',
      light: 'var(--color-warning-light)',
    },
    info: {
      main: 'var(--color-info-main)',
      hover: 'var(--color-info-hover)',
      light: 'var(--color-info-light)',
    },
    neutral: {
      50: 'var(--color-neutral-50)',
      100: 'var(--color-neutral-100)',
      200: 'var(--color-neutral-200)',
      300: 'var(--color-neutral-300)',
      400: 'var(--color-neutral-400)',
      500: 'var(--color-neutral-500)',
      600: 'var(--color-neutral-600)',
      700: 'var(--color-neutral-700)',
      800: 'var(--color-neutral-800)',
      900: 'var(--color-neutral-900)',
    },
    status: {
      wanted: 'var(--color-status-wanted)',
      purchased: 'var(--color-status-purchased)',
      reserved: 'var(--color-status-reserved)',
      proposed: 'var(--color-status-proposed)',
    },
    priority: {
      high: 'var(--color-priority-high)',
      medium: 'var(--color-priority-medium)',
      low: 'var(--color-priority-low)',
    },
    background: {
      default: 'var(--color-background)',
      secondary: 'var(--color-background-secondary)',
      tertiary: 'var(--color-background-tertiary)',
    },
    foreground: {
      default: 'var(--color-foreground)',
      secondary: 'var(--color-foreground-secondary)',
      tertiary: 'var(--color-foreground-tertiary)',
    },
    border: {
      default: 'var(--color-border)',
      hover: 'var(--color-border-hover)',
      focus: 'var(--color-border-focus)',
    },
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      tertiary: 'var(--color-text-tertiary)',
      inverse: 'var(--color-text-inverse)',
    },
  },
  spacing: {
    100: 'var(--spacing-100)',
    200: 'var(--spacing-200)',
    300: 'var(--spacing-300)',
    400: 'var(--spacing-400)',
    500: 'var(--spacing-500)',
    600: 'var(--spacing-600)',
    800: 'var(--spacing-800)',
    1000: 'var(--spacing-1000)',
  },
  typography: {
    fontSize: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      md: 'var(--font-size-md)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
      '4xl': 'var(--font-size-4xl)',
      '5xl': 'var(--font-size-5xl)',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.3,
      relaxed: 1.4,
      loose: 1.6,
    },
    letterSpacing: {
      normal: 'var(--letter-spacing-normal)',
      wide: 'var(--letter-spacing-wide)',
    },
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    buttonHover: 'var(--shadow-button-hover)',
    card: 'var(--shadow-card)',
    cardHover: 'var(--shadow-card-hover)',
    modal: 'var(--shadow-modal)',
  },
  borders: {
    radius: {
      sm: 'var(--border-radius-sm)',
      md: 'var(--border-radius-md)',
      lg: 'var(--border-radius-lg)',
      xl: 'var(--border-radius-xl)',
      '2xl': 'var(--border-radius-2xl)',
      full: 'var(--border-radius-full)',
    },
    width: {
      thin: 'var(--border-width-thin)',
      medium: 'var(--border-width-medium)',
    },
  },
  transitions: {
    duration: {
      fast: 'var(--transition-fast)',
      base: 'var(--transition-base)',
    },
    easing: {
      standard: 'var(--easing-standard)',
      smooth: 'var(--easing-smooth)',
    },
    all: {
      fast: 'var(--transition-all-fast)',
      base: 'var(--transition-all-base)',
    },
    transform: {
      fast: 'var(--transition-transform-fast)',
      base: 'var(--transition-transform-base)',
    },
  },
};

/**
 * Helper function to get spacing value
 * @param scale - Spacing scale (100, 200, 300, etc.)
 * @returns CSS variable reference for the spacing value
 */
export function getSpacing(scale: SpacingScale): string {
  return theme.spacing[scale];
}

/**
 * Helper function to get color value
 * @param path - Dot-separated path to color (e.g., 'primary.main', 'status.wanted')
 * @returns CSS variable reference for the color
 */
export function getColor(path: string): string {
  const parts = path.split('.');
  let value: any = theme.colors;
  
  for (const part of parts) {
    value = value[part];
    if (value === undefined) {
      throw new Error(`Color path "${path}" not found in theme`);
    }
  }
  
  return value;
}

/**
 * Helper function to check if dark mode is preferred
 * @returns boolean indicating if dark mode is preferred
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Export default theme
export default theme;
