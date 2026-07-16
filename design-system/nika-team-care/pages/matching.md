# Matching — page override

This screen follows the `Living editorial passport` direction in `interactive-mvp.md` and overrides the generic light-form treatment.

## Purpose

The matching step is the core tactile interaction. It should feel continuous with the dark, organic launch screen while keeping the question itself calm and instantly readable.

## Composition

- Full-viewport forest-green atmosphere with soft coral/blush light fields, thin orbital lines and a very faint full-body dog constellation inspired by Canis Major; never use a background grid, shooting stars or a readable animal mascot on this screen.
- One centered cream question card with two clearly visible cards behind it.
- The deck layers use distinct offsets, rotation and scale so they read as physical cards rather than a clipped gradient.
- Show only the title `Это про вас?`, the card, progress and one gesture hint.
- Keep `Нет` and `Да` as accessible button alternatives outside the first card; do not imitate controls inside the card.
- Place the first-card answer controls near the lower edge of the viewport with 32–52px of air after the deck, then remove the whole training group from questions 2–11.

## Motion

- Active card follows horizontal drag and rotates proportionally.
- Horizontal drag is unconstrained and follows the pointer 1:1; the decision threshold is applied only on release.
- `Да` / `Нет` labels and directional tint appear progressively during drag.
- A swipe commits after a distance or velocity threshold; an incomplete gesture springs back.
- Background cards counter-shift slightly during drag to reinforce depth.
- Progress uses transform-based 260ms ease-out animation.
- The animal constellation draws in once; do not loop decorative motion after the entrance completes.
- Under `prefers-reduced-motion`, remove tilt and spring travel while keeping immediate state feedback.

## 21st adaptation

- Source: `CardStack`, component `9813` by `ruixen.ui`.
- Reused concepts: perspective stage, explicit active/inactive depth, offset/rotation per layer, spring parameters, reduced-motion handling.
- Not adopted: Tailwind, Next.js, carousel dots, autoplay, generic image-card styling, additional dependencies.

## Content rules

- No eyebrow explaining that there are no correct answers.
- No explanatory paragraph above the card.
- No meta row such as `Вопрос по вайбу · Да / Нет`.
- No instruction inside the card.
- The single visible instruction is `Потяните карточку`, and it is present only for question 1.

## Accessibility

- Minimum 44px answer targets with text and consistent line icons.
- Left/Right Arrow keyboard input remains supported.
- Card exposes the full question as its accessible label.
- Color is never the only answer signal: labels include `Да` / `Нет` and icons.
