# Interactive MVP — page override

This page intentionally overrides the generic dark SaaS recommendation in `MASTER.md`.

## Direction

**Living editorial passport** — an immersive, photo-led editorial experience with tactile card layers. It should feel like a contemporary cultural project about one animal, not a dashboard, game store, or charity donation form.

## Visual principles

- Photography is the dominant object on every key screen.
- One large editorial statement per screen; supporting copy stays short.
- Warm paper surfaces replace plain white boxes.
- Forest green carries trust and continuity; coral marks progress; blush marks care and celebration.
- Card layers use restrained perspective and offset, never glassmorphism.
- Motion follows the user’s gesture and explains hierarchy; no infinite decorative animation.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#F6F2E9` |
| Surface | `#FFFDF8` |
| Surface soft | `#EAF0E7` |
| Primary | `#234721` |
| Primary deep | `#183419` |
| Ink | `#1F2A20` |
| Muted | `#657064` |
| Blush | `#FFB5B5` |
| Coral | `#F76D31` |
| Border | `rgba(35, 71, 33, 0.14)` |

Typography remains the brand Raleway family already bundled in the project. Use 760–850 weights for editorial display text, regular 450–550 for body copy, and uppercase labels with restrained tracking.

## 21st adaptations

- `Minimalist Hero`, demo `4582`: asymmetric photo focus, large typographic statement, circular color field behind the subject.
- `Image Swiper`, demo `2484`: perspective card stack, offset background cards, real-time gesture response.
- `Stepper`, demo `769` metadata: one controlled progress language for route and passport sections.

The project does not adopt Tailwind/shadcn or Lucide solely for these components. Their composition and interaction patterns are translated into the existing React, TypeScript, Framer Motion, and CSS architecture.

## Avoid

- Generic SaaS bento dashboards.
- Pure black backgrounds and electric blue gradients.
- Childish paw-print decoration, emoji icons, trophy mechanics.
- Floating glass panels over every surface.
- More than one dominant CTA per screen.
