---
name: Kageo
description: A warm, calm, editorial wishlist app wrapped in sage green and paper tones.
colors:
  sage: "#3f6845"
  sage-deep: "#2e5033"
  sage-tint: "#eaf2eb"
  sage-night: "#8fc597"
  paper: "#f7f4ef"
  paper-raised: "#ffffff"
  paper-sunken: "#f2ede5"
  paper-sunken-deep: "#ebe5da"
  paper-input: "#faf8f4"
  line: "#d6cec4"
  line-soft: "#e5dfd5"
  line-strong: "#a8a099"
  ink: "#1e1a16"
  ink-soft: "#4e443c"
  ink-faint: "#6b6258"
  amber: "#6e3c0c"
  amber-tint: "#fdf0e6"
  status-wanted: "#1a5491"
  status-wanted-tint: "#edf3fb"
  status-reserved: "#4e3278"
  status-reserved-tint: "#f0ebf8"
  alert: "#8a2318"
  alert-tint: "#fdecea"
  note-gold: "#d4a843"
  note-tint: "#fffcf5"
  night-page: "#17130e"
  night-raised: "#211b14"
  night-ink: "#f3eee4"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.1
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.3
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.1px"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  input: "10px"
  xl: "12px"
  panel: "16px"
  card: "20px"
  pill: "100px"
spacing:
  100: "8px"
  200: "16px"
  300: "24px"
  400: "32px"
  500: "40px"
  600: "48px"
  800: "64px"
  1000: "80px"
components:
  button-primary:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "9px 22px"
  button-primary-hover:
    backgroundColor: "{colors.sage-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "9px 22px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    rounded: "{rounded.pill}"
    padding: "9px 22px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    rounded: "{rounded.pill}"
    padding: "9px 22px"
  input:
    backgroundColor: "{colors.paper-input}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px 28px"
  wish-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  tabs:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-faint}"
    rounded: "{rounded.pill}"
    padding: "5px"
  header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "64px"
---

# Design System: Kageo

## Overview

**Creative North Star: "The Wrapped Gift"**

Kageo looks like something carefully wrapped: a calm paper ground, one ribbon of sage green, and a serif voice that feels hand-lettered rather than corporate. The interface is discreet by design, because the product's promise is a surprise kept intact. Nothing shouts; the gift (the wish, its image, its status) is the thing being presented, and the chrome stays quiet around it.

The mood is warm, calm and editorial. Surfaces are paper-warm neutrals tinted toward brown, never cool grey. Fraunces gives headlines a soft, bookish character; DM Sans keeps every form, label and sentence easy to read on a phone for someone who has never used the app. Shapes are rounded and friendly (pill buttons, 16 to 20px cards) without becoming toy-like. The internal CSS calls this look "Garden Party"; that name survives in file headers.

Light and dark are equal citizens. Dark mode is a warm brown-black with the sage lifted to a pale green, not an inverted grey UI.

**Key Characteristics:**
- Paper-warm neutrals with a single sage accent, used for action and "done".
- Fraunces for display voice, DM Sans for everything functional.
- Pill-shaped controls inside softly rounded cards.
- Warm, brown-tinted shadows; cards lift on hover.
- Status carried by tinted chips with paired foreground/background colors, never colour alone.

## Colors

A restrained palette: warm paper, brown-black ink, one sage accent, and a small family of tinted status colours used only to communicate gift state.

### Primary
- **Sage Ribbon** (#3f6845): the single action colour: primary buttons, links, focus rings, purchased/"done" marks, selected tabs. Lifts to **Moonlit Sage** (#8fc597) in dark mode.
- **Deep Sage** (#2e5033): hover and pressed state of the accent.
- **Sage Mist** (#eaf2eb): tinted backgrounds for accent chips, ghost-button hover, purchased status.

### Secondary
- **Burnt Amber** (#6e3c0c) on **Amber Cream** (#fdf0e6): proposed wishes and medium priority; warm, never alarming.

### Tertiary
- **Wanted Blue** (#1a5491) on #edf3fb: "wanted" status.
- **Reserved Plum** (#4e3278) on #f0ebf8: reserved status, carried by the chip and the "Réservé par" line.
- **Alert Brick** (#8a2318) on #fdecea: errors and high priority.
- **Note Gold** (#d4a843) on #fffcf5: sticky-note accent on wish notes.

### Neutral
- **Warm Paper** (#f7f4ef): page background. **Clean Sheet** (#ffffff): raised cards and panels. **Sunken Paper** (#f2ede5 / #ebe5da): wells, hover fills. **Input Paper** (#faf8f4): field background.
- **Warm Ink** (#1e1a16), **Soft Ink** (#4e443c), **Faint Ink** (#6b6258): the three text levels, all AA on white.
- **Hairline** (#e5dfd5 soft, #d6cec4 default, #a8a099 strong): borders.
- **Night Paper** (#17130e), **Night Sheet** (#211b14), **Night Ink** (#f3eee4): the dark counterparts.

### Named Rules
**The One Ribbon Rule.** Sage is the only chromatic accent for action. Status colours label state; they never decorate or act as buttons.

**The Warm Neutral Rule.** Every neutral leans brown (hue ~60-80). No cool greys, no pure black text, no pure black shadows in light mode.

**The Paired Status Rule.** A status colour is always a foreground on its own tint (e.g. #4e3278 on #f0ebf8), with an icon or label. Colour never carries meaning alone.

## Typography

**Display Font:** Fraunces (Georgia, serif), exposed through the historical `--font-cormorant` variable.
**Body Font:** DM Sans (system-ui, sans-serif).
**Label/Mono Font:** DM Sans for labels; JetBrains Mono for rare technical values.

**Character:** A soft, wonky old-style serif over a clean geometric sans: warm and literary on top, plain and legible underneath.

### Hierarchy
- **Display** (500, clamp(2.25rem, 5vw, 3rem), 1.1): landing and hero headlines. Tokens go up to 48px.
- **Headline** (500, 22px, 1.3): panel and section titles.
- **Title** (500, 18px, 1.3): card titles. Wish names on the wish card run 20px / 1.25 so a long name wraps in fewer lines on a phone.
- **Body** (400, 14px, 1.6): descriptions, form text; keep lines to 65-75ch.
- **Label** (500, 13px, 0.1px tracking): buttons, tabs, chips. Small captions go down to 11-12px (never below); status chips are 11px, rising to 12px on touch.

### Named Rules
**The Serif Is a Voice Rule.** Fraunces is for names, titles and moments of warmth. Forms, buttons, metadata and tables are always DM Sans.

**The Cormorant Is Dead Rule.** Never reintroduce Cormorant Garamond; the CSS variable name is historical only.

## Layout

Content sits in a centred container capped at 1300px with 32px side padding; the header is a 64px sticky bar on that same container. Spacing follows an 8px base scale (8, 16, 24, 32, 40, 48, 64, 80); panels use 24px vertical / 28px horizontal padding with 24px gaps. Wish cards flow in a responsive grid with a 260px image area. The mobile experience is the primary one (the "grandma test"): shared lists must read cleanly on a phone, with a drawer navigation replacing the header links.

## Elevation & Depth

Hybrid: surfaces are tonal (page, raised, sunken) and a soft warm shadow separates raised content. Shadows are tinted brown, never neutral black in light mode; in dark mode they deepen to black with higher opacity. Cards lift on hover; modals sit above a blurred, warm-dark scrim.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 2px 12px rgba(60, 45, 25, 0.08)`): resting cards and panels.
- **Hover** (`box-shadow: 0 8px 28px rgba(60, 45, 25, 0.13)`): hovered cards, paired with `translateY(-4px)`.
- **Modal** (`box-shadow: 0 24px 64px rgba(60, 45, 25, 0.18)`): dialogs; scrim is `rgba(30, 22, 10, 0.45)` with a 6px blur.
- **Button lift** (`box-shadow: 0 4px 14px rgba(63, 104, 69, 0.3)`): primary and outline buttons on hover.

### Named Rules
**The Lift-On-Interest Rule.** Elevation increases only in response to hover or focus; at rest everything stays calm.

## Shapes

Rounded, friendly, hierarchical. Controls that act are pills (100px); containers that hold are rounded rectangles that grow with importance: 10px fields, 16px panels, 20px wish cards. Borders are 1px hairlines on cards and 1.5px on fields and outlined buttons. State is signalled by a chip and one line of text, never by a coloured border or a full colour wash.

## Components

### Buttons
- **Shape:** full pill (100px), 9px 22px padding, 13px / 500 DM Sans.
- **Primary:** Sage Ribbon fill, white text (dark ink on the pale dark-mode sage).
- **Secondary:** transparent with a 1.5px Hairline border and Soft Ink text; **Outline:** sage border and text that fills on hover; **Ghost:** sage text, Sage Mist fill on hover.
- **Hover / Focus:** hover lifts 1px, primary gains the sage shadow; active returns to rest; disabled drops to 55% opacity. Focus is a 2px sage outline with 2px offset.

### Chips (status)
- **Style:** pill chip, status foreground on its tint, with icon or label.
- **State:** wanted, reserved, purchased, proposed, funded, high priority each have a fg/bg pair in both themes.

### Cards / Containers
- **Corner Style:** 20px wish cards, 16px panels.
- **Background:** Clean Sheet on Warm Paper, 1px Hairline border.
- **Shadow Strategy:** Card shadow at rest, Hover shadow with 4px lift.
- **Internal Padding:** 24px / 28px on panels.
- **States:** purchased shows a sage veil on the image and a struck-through title; reserved adds the plum chip and a one-line "Réservé par" note; high priority adds a quiet gold chip beside the date.

### Inputs / Fields
- **Style:** 1.5px Hairline border, 10px radius, Input Paper background, 10px 14px padding, 14px DM Sans.
- **Focus:** border turns sage, 3px sage-tint ring, background lifts to Clean Sheet.
- **Error / Disabled:** Alert Brick border on Alert Tint background; error focus ring uses the error border tint.

### Navigation
- **Header:** sticky 64px bar on Warm Paper with a soft bottom hairline; logo left, links and auth right; one shared 2px sage focus ring across header, drawer and dialogs; a skip link appears on focus. Mobile switches to a drawer.
- **Tabs:** a pill track (Clean Sheet, hairline border, 5px padding) holding pill buttons; the active tab takes the sage tint.

### Modals
Centred container on a blurred warm scrim, 24px viewport padding, Clean Sheet surface, hairline border, Modal shadow; opens with a 0.2s fade.

### Logo
An outlined gift box with a bow in the site green and an ink wordmark, one colour on light and dark.

## Do's and Don'ts

### Do:
- **Do** use Sage Ribbon (#3f6845) as the only action colour and keep it to buttons, links, focus and "done" states.
- **Do** read colours through the semantic tokens in `theme.css` so light and dark both resolve.
- **Do** make every control a pill and every container softly rounded (10 / 16 / 20px).
- **Do** keep the shared list readable on a phone with no account; viewing is never gated visually.
- **Do** pair status colours with an icon or label.
- **Do** ease in with `cubic-bezier(0.16, 1, 0.3, 1)` for entrances; hover transitions run 0.2-0.3s.

### Don't:
- **Don't** reintroduce Cormorant Garamond or use Fraunces for form controls.
- **Don't** use cool greys, pure black text or neutral black shadows in light mode.
- **Don't** hard-code hex values in components; use the theme tokens.
- **Don't** show reservations, pots or guest comments styling in any owner view; surprise is part of the design.
- **Don't** add ad-like banners, paywall surfaces over a shared list, or generic utilitarian dashboards.
- **Don't** signal state by colour alone, or add side-stripe borders (a coloured border above 1px on one side of a card).
