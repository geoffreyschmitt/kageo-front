---
target: the wish card
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\Geoffrey\\PhpstormProjects\\kageo\\src\\widgets\\WishCard"
timestamp: 2026-10-23T17-24-23Z
slug: src-widgets-wishcard
---
# Critique: Kageo wish card (src/widgets/WishCard)

Method: dual-agent. Score 23/40 (Acceptable).

Design specificity: specificity lives in tokens (sage/paper, Fraunces, pills), not structure; layout is a stock shop product card. No wrap/reveal gesture; owner notes are buried.

Priority issues
- [P1] Owner view of archived lists may leak reservations (wishlist.tsx:653, showOwnerAction false in history). Product call needed; replace 3 flags with one viewerRole. -> harden
- [P1] Reserved over-signalled (6 signals); extra side-tabs at WishCard.module.css:163 and :449 violate DESIGN.md. -> distill
- [P1] Priority chip noisy, collides with status colours, High glow reads as error. -> quieter
- [P1] Type/target sizes: 10px chips, 10.5px label, 12px toggle without 44px target, stale truncation check, no aria-expanded, opacity 0.5 contrast. -> typeset
- [P2] Acheter competes with Reserve; French copy literal ("Désiré"), EUR formatting. -> clarify

Detector: 14 CSS findings (3 side-tab, 8 font-size, 1 radius, 2 colour); WishCard.tsx alone clean.
