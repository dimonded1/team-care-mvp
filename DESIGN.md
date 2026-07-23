# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-23
- Primary product surfaces: launch screen, swipe matching, reveal, animal passport, care route, guardianship explanation, final card, foundation footer, legal document center.
- Evidence reviewed: `README.md`, `src/styles.css`, `src/components/EditorialHero.tsx`, `src/components/OrbitField.tsx`, `src/features/PassportScreen.tsx`, all four game screens and data configs, `design-system/nika-team-care/MASTER.md`, supplied orbit-navigation references, and `design-concepts/guardian-orbit-hub.webp`.

## Brand
- Personality: warm, adult, hopeful, tactile, contemporary, attentive.
- Trust signals: real foundation identity, clear guardianship explanation, accessible legal information, restrained motion, concrete language.
- Avoid: guilt, suffering imagery, childish gamification, generic SaaS chrome, casino mechanics, invented animal or guardian data.

## Product goals
- Goals: lead a visitor from curiosity to one concrete animal; explain regular guardianship through four short interactions; make the animal-centred care cycle understandable in under three minutes.
- Non-goals: simulate taking an animal home, promise adoption, expose a Bitrix24 admin interface, diagnose or treat animals, or edit legal documents in the browser.
- Success signals: first screen is understood without a volunteer; full flow works on phone/tablet; legal documents are readable locally and do not send users to another product surface.

## Personas and jobs
- Primary personas: event visitor on a personal phone; volunteer or visitor using a foundation tablet.
- User jobs: find a relatable animal, understand guardianship, complete the care route, save/share the result, verify foundation and legal information.
- Key contexts of use: one-handed mobile use, noisy event space, unstable connection, bright ambient light.

## Information architecture
- Primary navigation: focused journey with Back controls; start-screen links for explanation, guardianship and the full animal catalogue; global footer for foundation and legal information.
- Core routes/screens: loading → welcome → matching → reveal → two-second care-orbit intro → ordered orbit hub → four care modules → guardianship explanation → final; legal documents open as deep-linkable overlay states `#legal/offer`, `#legal/privacy`, `#legal/consent`, `#legal/requisites`.
- Content hierarchy: one primary action per screen; supporting information is progressively disclosed; legal text is visually separate from decorative chrome.

## Design principles
- One animal, one emotional path: every core interaction returns attention to the selected animal.
- Repetition, not possession: every game rehearses an action an active guardian repeats while the animal remains a foundation ward.
- The metaphor explains the product: the ward is the warm centre, guardians are recurring planets, and their joined orbit is protection from unexpected risks.
- Warm clarity over spectacle: motion and cosmic motifs explain hierarchy but never reduce readability.
- Preserve agency: overlays close with a visible control, Escape, scrim and browser Back; focus returns to the trigger.
- Tradeoffs: legal documents use a richer branded shell, while their text remains a high-contrast, quiet paper surface.

## Visual language
- Color: forest green `#234721` / `#183419`, warm canvas `#F6F2E9`, paper `#FFFDF8`, coral `#F76D31`, blush `#FFB5B5`.
- Typography: bundled Raleway; 760–900 display weights, 450–600 reading text, 16px minimum legal body copy.
- Spacing/layout rhythm: mobile-first; 16–24px content rhythm, 44px minimum controls, 1200–1440px wide-screen bounds.
- Shape/radius/elevation: rounded paper surfaces, pill controls, tinted green shadows, sparse orbit lines and planet dots.
- Motion: Framer Motion springs, critically damped for sheets; the care intro stages sun → planets → protective ring once, then stops; progress glow communicates state; decorative loops are subtle and disabled for reduced motion.
- Imagery/iconography: real animal photography after matching; original vector mascots may appear on the launch screen, while matching uses abstract orbital motifs and a very faint full-body dog constellation inspired by Canis Major; no readable mascot, shooting stars or emoji icons.

## Components
- Existing components to reuse: `Logo`, `Button`, `AppHeader`, `SiteFooter`, existing motion and color tokens.
- New/changed components: `CareCycleIntro`, `VisitCareGame`, ordered `PassportScreen` mission nodes, reusable `OrbitField`, local legal-document data and existing game components.
- Variants and states: module available/started/completed/locked, correct/learning feedback, shelter visit step, orbit protection intro, swipe idle/dragging/committed/returning.
- Token/component ownership: global tokens remain in `src/styles.css`; legal text content lives under `src/content/legal/`; metadata lives in `src/data/legalDocuments.ts`.

## Accessibility
- Target standard: WCAG 2.2 AA.
- Keyboard/focus behavior: semantic buttons/links; visible focus; modal focus trap; Escape and browser Back close; trigger focus restored.
- Contrast/readability: legal copy at least 16px with dark green ink on opaque cream paper; external status is not conveyed by color alone.
- Screen-reader semantics: `role="dialog"`, `aria-modal`, labelled document navigation and title; decorative planets hidden.
- Reduced motion and sensory considerations: sheet becomes short cross-fade; no sound; decorative movement is disabled under `prefers-reduced-motion`.

## Responsive behavior
- Supported breakpoints/devices: 320px+, modern iPhone/Android, tablets, 1024px and 1440px desktop checks.
- Layout adaptations: desktop uses a circular four-node orbit; mobile converts it to an ordered compact route while preserving the same sequence. Game scenes keep one visual focus and place answer groups below it.
- Touch/hover differences: minimum 44px touch targets; hover is supplemental only.

## Interaction states
- Loading: legal content is bundled with the app and opens instantly; no network spinner.
- Empty: unavailable document falls back to the first valid legal document.
- Error: unknown legal hash is removed without breaking the main journey.
- Success: selected legal document is reflected in the URL hash for copying and Back navigation.
- Disabled: future care modules remain visible but clearly locked until the previous module is complete; answer controls become inactive only during readable feedback.
- Offline/slow network: four internal documents work from the built application cache; external charter/reports still require connectivity.

## Content voice
- Tone: human, calm, concrete, legally exact where source text is reproduced.
- Terminology: «подопечный», «опекун», «орбита заботы», «знакомство», «визит», «прогулка», «здоровье»; never describe the game outcome as taking the animal home.
- Microcopy rules: distinguish internal documents from external resources with `↗`; do not simplify or rewrite legal clauses in the interface.
- Matching instruction rule: show the short gesture hint and accessible `Да` / `Нет` alternatives only on the first card; remove the entire training group after the first successful answer.

## Implementation constraints
- Framework/styling system: React 19, TypeScript, Vite, Framer Motion, CSS; no router or new UI dependency required.
- Design-token constraints: extend current NIKA palette and motion tokens; do not import the generic colors/fonts suggested by external design generators.
- Performance constraints: legal HTML and game configs are static; generated scene images must be compressed; movement uses transform/opacity; no runtime request to `home.fond-nika.ru`.
- Integration constraints: Bitrix code remains server-only and disabled until server environment IDs, webhook URL and secret are configured; no secret may use a `VITE_` prefix or enter the browser bundle.
- Compatibility constraints: semantic HTML, iOS safe areas, keyboard navigation and body-scroll locking.
- Test/screenshot expectations: unit validation of bundled documents; browser smoke for 375, 1024 and 1440px; opening, switching and closing the legal center; match-result captures on phone, desktop and reduced motion.
- Matching screenshot expectations: capture the first question at rest and during drag; verify stack depth, yes/no label opacity, spring return, button alternative and reduced motion.

## Open questions
- [ ] Foundation legal owner: confirm that the current privacy policy and consent text, which name `home.fond-nika.ru`, legally cover the final production domain of this interactive site before public launch.
- [ ] Product owner: define who refreshes local legal copies when official source documents change.
