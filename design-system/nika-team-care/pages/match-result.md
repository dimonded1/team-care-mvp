# Match result — page override

This screen is the emotional culmination of matching and follows `DESIGN.md` over the generic Master palette.

## Composition

- Reuse the forest-green gradient, coral/blush light fields, thin orbital lines and small planet points from the launch screen.
- Mobile order is fixed: introduction → circular animal photo → name → match explanation → primary CTA.
- Desktop uses a balanced two-column layout inside a 1180px container: the photo occupies the left field and the copy occupies the right field.
- Keep one primary action, `Открыть паспорт`, and preserve the existing result copy.

## Motion

- Reveal elements in five stages over roughly 1.8 seconds; preserve a perceptible pause between the introduction, photo and copy.
- The photo enters with a soft spring about 450ms after the screen opens.
- Use one non-looping ring expansion around the photo as the only accent animation.
- Do not use hearts, confetti, particle explosions, shooting stars or continuous decorative motion.
- Under `prefers-reduced-motion`, render the final state with a short opacity transition and omit the focus ring.

## Responsive and accessibility

- Keep the meaningful animal photo fully described by its existing alt text.
- Maintain at least 16px body copy and a 44px primary touch target.
- Background decoration remains `aria-hidden` and may crop outside the viewport without causing horizontal scroll.
- The green stage is full-bleed at every desktop width; only the inner content container is width-limited.
