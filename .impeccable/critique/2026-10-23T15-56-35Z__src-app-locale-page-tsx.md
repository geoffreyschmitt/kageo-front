---
target: landing page
total_score: 19
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Geoffrey\\PhpstormProjects\\kageo\\src\\app\\[locale]\\page.tsx"
target_fingerprint: "sha256:6d35351abb762d86eba52bc93bf54fbf72d5d79dfdcf3527d30b8db3caa204b9"
target_path: "C:\\Users\\Geoffrey\\PhpstormProjects\\kageo\\src\\app\\[locale]\\page.tsx"
timestamp: 2026-10-23T15-56-35Z
slug: src-app-locale-page-tsx
---
Method: dual-agent (A: a18ccce33c0240a45 · B: a7dc6325ec250b641)

# Critique: Kageo landing page (logged out, /fr)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Hero demo card is aria-hidden and not labelled as an example |
| 2 | Match System / Real World | 4 | Specific French family copy is the strongest part |
| 3 | User Control and Freedom | 3 | No "see a real example" exit; "En savoir plus" leads to a long page |
| 4 | Consistency and Standards | 3 | Same 62% pot is amber in the hero (--amber), green in the pot section (--accent) |
| 5 | Error Prevention | n/a | Nothing to prevent on a Persuade surface |
| 6 | Recognition Rather Than Recall | 3 | Guest path never shown |
| 7 | Flexibility and Efficiency | n/a | Persuade surface |
| 8 | Aesthetic and Minimalist Design | 3 | Four consecutive 3-up blocks, monotonous rhythm |
| 9 | Error Recovery | n/a | No error states |
| 10 | Help and Documentation | n/a | Persuade surface |
| **Total** | | **19/24** | **Good (79%)** |

## Design Specificity Verdict
About 60% authored (copy, demo data, Fraunces + cream + sage), 40% interchangeable (hero/3 steps/split/trust row/CTA band; generic step icons; blank grey thumbs; no gift or bow motif despite the logo).
Deterministic scan: CLI 0 findings. Overlay: 2 widows (p.pot__description "requis.", p.privacy__itemDesc "d'adresses.") and 1 nested-cards (heroCard__inner in heroCard, judged deliberate mock frame).

## Priority Issues
- [P1] The guest side is never shown (shape, clarify).
- [P1] Placeholder thumbs and generic icons read as unfinished (delight, colorize).
- [P2] Monotonous middle; surprise promise (.privacy) underpowered (layout, bolder).
- [P2] Small, probably low-contrast secondary text, 13-14.5px (audit, typeset).
- [P3] Mobile/dark details and the two widows (adapt).

## Persona Red Flags
Grandma with a shared link: no "you can just look" reassurance. Jordan: page never says Kageo moves no money. Casey: primary CTA below the fold at 844px, 14px text. Sam: demo cards aria-hidden with no text equivalent, contrast unverified.

## Minor Observations
Prices hard-coded as "€140" instead of "140 €" (page.tsx 62, 85, 136, 143-144). Chips look clickable but are not. .step__desc lacks margin: 0. Connexion competes with hero CTA. Confirm LoginCta lands new visitors on sign-up.

## Questions to Consider
What says "gift" if the logo and copy are removed? Owner or grandma as the hero's audience? Should the pot section follow the surprise promise? What is the one screenshot-worthy image?
