import type {SVGProps} from 'react'

type LogoProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  /** 'horizontal' = gift mark + wordmark, 'symbol' = the gift mark alone. */
  variant?: 'horizontal' | 'symbol'
}

/**
 * Kageo logo. The wordmark paints in `currentColor`, so it follows the surrounding text colour;
 * the gift mark is always the brand green (`--accent`, which switches with the theme).
 * The 'symbol' variant paints entirely in `currentColor`.
 */
export const Logo = ({variant = 'horizontal', ...props}: LogoProps) =>
  variant === 'symbol' ? (
    <svg viewBox="0 0 256 256" role="img" aria-label="Kageo" {...props}>
      <g transform="translate(0 -9)"><g fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round"><rect x="44" y="108" width="168" height="40" rx="10"/><rect x="56" y="148" width="144" height="68" rx="10"/><path d="M128 108V216"/></g><path transform="translate(128 98) rotate(-155)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/><path transform="translate(128 98) rotate(-25)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/></g>
    </svg>
  ) : (
    <svg viewBox="22 22 770 248" role="img" aria-label="Kageo" {...props}>
      <g style={{color: 'var(--accent)'}}><g transform="translate(0 -4) scale(.95)"><g fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round"><rect x="44" y="108" width="168" height="40" rx="10"/><rect x="56" y="148" width="144" height="68" rx="10"/><path d="M128 108V216"/></g><path transform="translate(128 98) rotate(-155)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/><path transform="translate(128 98) rotate(-25)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round"/></g></g>
      <path stroke="currentColor" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M249 40V200 M299 106L253 156 M265 144L301 200 M413 150A41 41 0 1 0 413 150.01 M413 109V200 M527 150A41 41 0 1 0 527 150.01 M527 109V205A35 35 0 0 1 467.3 229.7 M559 150H641A41 41 0 1 0 631.4 176.4 M755 150A41 41 0 1 0 755 150.01"/>
    </svg>
  )
