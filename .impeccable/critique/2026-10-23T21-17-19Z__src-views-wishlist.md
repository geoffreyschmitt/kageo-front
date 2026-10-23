---
target: wishlist page
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Geoffrey\\PhpstormProjects\\kageo\\src\\views\\wishlist"
timestamp: 2026-10-23T21-17-19Z
slug: src-views-wishlist
---
# Critique: Kageo wishlist page (src/views/wishlist)

Method: dual-agent. Score 23/40 (Acceptable). Source-only review (no seeded wishlist reachable for browser inspection).

Design specificity: tokens and privacy copy are authored; structure is a generic progress dashboard (hero stats, % complete, sticky filters) rather than a gift unwrapping.

Priority issues
- [P1] Owner stats always 0% / 0 bought / 0 reserved because status is masked (wishlist.tsx:398-427). -> distill/clarify
- [P1] Hero pushes first gift ~2 screens down on phones (css:62-69, 276-300). -> layout
- [P2] Too many guest filters; bare sort glyph, no aria-pressed, silent price fallback. -> distill, harden
- [P2] A11y gaps: unlabeled inputs, outline:none, no reduced-motion guard, progress bar without role. -> harden
- [P3] Most Wanted red wash and second amber action colour violate DESIGN.md. -> quieter/polish
- Bug: ageInDays (wishlist.tsx:89) makes date sort meaningless.

Detector: 37 advisories in wishlist.module.css (17 colour, 16 font-size, 4 radius); PotCard 7, GiftPotSection 11; sub-12px text and 8 amber alpha values.
