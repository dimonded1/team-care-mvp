# Legal center override — orbital document archive

This page extends the active Living Editorial Passport system. Generic legal-blue palettes and serif law-firm styling from automated recommendations are intentionally rejected in favor of the existing NIKA identity.

## Purpose

- Keep four operational legal documents inside the interactive site.
- Preserve the visitor's current matching/game state.
- Make long legal copy readable and trustworthy rather than playful.

## Composition

- Full-screen dark forest overlay with sparse orbit lines and planet markers.
- One high-contrast cream reading sheet.
- Desktop: compact document rail beside the reading sheet.
- Mobile: full-screen sheet with a two-column document selector above the content.
- Only «Устав фонда» and «Отчёты» remain external links.

## Interaction

- Footer internal items are buttons, not links to `home.fond-nika.ru`.
- Opening updates the URL to `#legal/{document}`; switching replaces the hash; browser Back closes.
- Escape, scrim and the visible close button dismiss the sheet.
- Focus enters the close control, remains trapped inside the dialog and returns to the opening control.
- Sheet motion is critically damped and uses transform/opacity; reduced motion uses a short fade.

## Reading rules

- Raleway 16–18px, line-height 1.65–1.75, dark green ink on opaque warm paper.
- Legal headings remain plain and strongly hierarchical.
- Tables may scroll within their own container on narrow screens.
- Decorative layers never sit behind legal text.

## Accessibility checklist

- WCAG 2.2 AA contrast.
- 44px minimum controls.
- Semantic dialog, buttons, navigation and external links.
- Visible focus and non-color external-link marker.
- No dependency on hover, animation or network access for internal documents.
