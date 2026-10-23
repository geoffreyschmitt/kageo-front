---
target: header and footer
total_score: 21
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\Geoffrey\\PhpstormProjects\\kageo\\src\\widgets\\Header"
timestamp: 2026-10-23T16-54-41Z
slug: src-widgets-header
---
# Critique: Header + Footer (src/widgets/Header, src/widgets/Footer)
Score 21/32 (heuristics 7 and 10 n/a). Acceptable.
P1: no :focus-visible in Header/Footer CSS (only .form__input:focus). P1: drawer/modal semantics (no role=dialog, no Escape on auth modal, no focus move/trap, unlabeled "x", error without role=alert). P1: signed-out mobile hides Connexion + language behind hamburger; no primary CTA. P2: desktop targets under 44px (FR/EN 20px, footer links 17px); footer bare legal strip, no nav landmark. P2: chrome is interchangeable SaaS bar except Logo.
