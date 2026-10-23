import type {SVGProps} from 'react'

type GlyphProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'>

/**
 * Small decorative glyphs for marketing surfaces, one stroke weight on a 32px grid. They paint in
 * `currentColor` and are hidden from assistive tech: whatever they illustrate is also written in text.
 */
const base = {
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

/** A checklist: building a list. */
export const ListGlyph = (props: GlyphProps) => (
  <svg {...base} {...props}>
    <rect x="5" y="6" width="5" height="5" rx="1.5" />
    <rect x="5" y="14" width="5" height="5" rx="1.5" />
    <rect x="5" y="22" width="5" height="5" rx="1.5" />
    <path d="M15 8.5h12M15 16.5h12M15 24.5h12" />
  </svg>
)

/** A sealed envelope: sharing a link. */
export const EnvelopeGlyph = (props: GlyphProps) => (
  <svg {...base} {...props}>
    <rect x="4" y="8" width="24" height="17" rx="3" />
    <path d="m4 11 12 8 12-8" />
  </svg>
)

/** The loops of the Kageo logo's bow, on their own. */
export const Bow = ({strokeWidth = 12, ...props}: GlyphProps) => (
  <svg viewBox="30 14 196 92" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" aria-hidden focusable={false} {...props}>
    <path transform="translate(128 98) rotate(-155)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" />
    <path transform="translate(128 98) rotate(-25)" d="M0 0A52 52 0 0 1 80 0A52 52 0 0 1 0 0Z" />
  </svg>
)
