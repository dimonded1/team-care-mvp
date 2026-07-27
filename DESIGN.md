# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-27
- Primary product surfaces: launch screen, swipe matching, reveal, interactive care orbit, four care modules, optional guardianship reference, final card, foundation footer, legal document center.
- Evidence reviewed: `README.md`, `src/styles.css`, `src/components/EditorialHero.tsx`, `src/components/OrbitField.tsx`, `src/features/PassportScreen.tsx`, all four game screens and data configs, `design-system/nika-team-care/MASTER.md`, supplied orbit-navigation references, `design-concepts/guardian-orbit-hub.webp`, both Bitrix field workbooks, and the supplied flat cosmic-cartoon moodboard.

## Brand
- Personality: warm, adult, hopeful, tactile, contemporary, attentive.
- Trust signals: real foundation identity, clear guardianship explanation, accessible legal information, restrained motion, concrete language.
- Avoid: guilt, suffering imagery, childish or grotesque character design, generic SaaS chrome, casino mechanics, photorealistic AI-looking scenery, invented animal or guardian data, or recognisable copies of third-party animation characters.

## Product goals
- Goals: lead a visitor from curiosity to one concrete animal; explain regular guardianship through four short interactions; make the animal-centred care cycle understandable in under three minutes.
- Non-goals: simulate taking an animal home, promise adoption, expose a Bitrix24 admin interface, diagnose or treat animals, or edit legal documents in the browser.
- Success signals: first screen is understood without a volunteer; full flow works on phone/tablet; legal documents are readable locally and do not send users to another product surface.

## Personas and jobs
- Primary personas: event visitor on a personal phone; volunteer or visitor using a foundation tablet.
- User jobs: find a relatable animal, understand guardianship, complete the care route, save/share the result, verify foundation and legal information.
- Key contexts of use: one-handed mobile use, noisy event space, unstable connection, bright ambient light.

## Information architecture
- Primary navigation: focused journey with Back controls; after matching, the care orbit is the single navigation hub; every planet opens its module directly; guardianship facts are optional reference content rather than a mandatory route step.
- Core routes/screens: loading → welcome → matching → reveal → interactive orbit hub ↔ four care modules → final; the optional guardianship explainer opens from a smaller fifth orbit point. Legal documents open as deep-linkable overlay states `#legal/offer`, `#legal/privacy`, `#legal/consent`, `#legal/requisites`.
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
- Motion: Framer Motion springs, critically damped for sheets; on entering the hub, the portrait appears first, two or three story fragments converge into one caption, then four planets reveal on different phases and speeds; progress glow communicates state; decorative loops are subtle and disabled for reduced motion.
- Imagery/iconography: real animal photography remains the source of truth in matching, reveal and share surfaces. The hub and four game scenes use one original flat 2D “planets of care” illustration system: bold clean silhouettes, limited internal shading, warm saturated greens/corals/creams, tactile grain, readable foregrounds and friendly recognisable cats/dogs with consistent proportions. Each module is a compact planetary world with its own terrain and palette accent; no photorealistic backgrounds, fake 3D renders, readable third-party mascots, or copied animation characters.
- Planet identities: “Визит” is a welcoming shelter porch world; “Здоровье” is a calm care-station world; “Знакомство” is a quiet living-room world; “Прогулка” is a day-cycle garden world. The same stroke weight, eye construction, fur-shape language and lighting direction bind them together.

## Components
- Existing components to reuse: `Logo`, `Button`, `AppHeader`, `SiteFooter`, existing motion and color tokens.
- New/changed components: interactive `PassportScreen` orbit, optional guardianship reference node, `VisitCareGame`, reusable `OrbitField`, local legal-document data, existing game components, `ContactCaptureForm`, and the server-only `/api/contact-capture` boundary.
- Variants and states: module available/started/completed, correct/learning feedback, shelter visit step, story-fragment convergence, swipe idle/dragging/committed/returning.
- Token/component ownership: global tokens remain in `src/styles.css`; legal text content lives under `src/content/legal/`; metadata lives in `src/data/legalDocuments.ts`.

## Accessibility
- Target standard: WCAG 2.2 AA.
- Keyboard/focus behavior: semantic buttons/links; visible focus; modal focus trap; Escape and browser Back close; trigger focus restored.
- Contrast/readability: legal copy at least 16px with dark green ink on opaque cream paper; external status is not conveyed by color alone.
- Screen-reader semantics: `role="dialog"`, `aria-modal`, labelled document navigation and title; decorative planets hidden.
- Reduced motion and sensory considerations: sheet becomes short cross-fade; no sound; decorative movement is disabled under `prefers-reduced-motion`.

## Responsive behavior
- Supported breakpoints/devices: 320px+, modern iPhone/Android, tablets, 1024px and 1440px desktop checks.
- Layout adaptations: desktop uses a circular four-node orbit; mobile keeps portrait and all four compact planet controls within one coherent first-screen composition, with longer explanations progressively disclosed below. Game scenes keep one visual focus and place answer groups below it.
- Touch/hover differences: minimum 44px touch targets; hover is supplemental only.

## Interaction states
- Loading: legal content is bundled with the app and opens instantly; no network spinner.
- Empty: unavailable document falls back to the first valid legal document; optional phone remains absent rather than substituted.
- Error: unknown legal hash is removed without breaking the main journey; contact submission errors keep entered non-secret values and provide a retry without claiming that Bitrix accepted the contact.
- Success: selected legal document is reflected in the URL hash for copying and Back navigation; successful contact capture replaces the form with a calm confirmation and does not imply guardianship is оформлена.
- Disabled: orbit modules are never locked; answer controls become inactive only during readable feedback; contact submit stays disabled until required fields and explicit personal-data consent are present.
- Offline/slow network: four internal documents work from the built application cache; external charter/reports still require connectivity.

## Content voice
- Tone: human, calm, concrete, legally exact where source text is reproduced.
- Terminology: «подопечный», «опекун», «орбита заботы», «знакомство», «визит», «прогулка», «здоровье»; never describe the game outcome as taking the animal home.
- Microcopy rules: distinguish internal documents from external resources with `↗`; do not simplify or rewrite legal clauses in the interface.
- Contact-capture rule: present “оставить контакты” as a lighter next step for a foundation coordinator to follow up, visibly secondary to “стать опекуном”; never describe form submission as a donation, signed guardianship or guaranteed callback.
- Matching instruction rule: show the short gesture hint and accessible `Да` / `Нет` alternatives only on the first card; remove the entire training group after the first successful answer.

## Implementation constraints
- Framework/styling system: React 19, TypeScript, Vite, Framer Motion, CSS; no router or new UI dependency required.
- Design-token constraints: extend current NIKA palette and motion tokens; do not import the generic colors/fonts suggested by external design generators.
- Performance constraints: legal HTML and game configs are static; generated scene images must be compressed; movement uses transform/opacity; no runtime request to `home.fond-nika.ru`.
- Integration constraints: Bitrix code remains server-only and disabled until server environment IDs, enum mappings, webhook URL and secret are configured; no secret may use a `VITE_` prefix or enter the browser bundle. The browser posts only a fixed allowlisted contact payload to a same-origin server endpoint. CRM animal records are normalized before entering the UI, and matching scores are never inferred automatically from medical or free-text fields.
- Deployment constraints: the static Vite/nginx image cannot submit directly to Bitrix. Production uses a same-origin Node API process with runtime `.env`, request-size limits, origin checks and rate limiting; nginx proxies `/api/` and continues to serve the built client. No webhook or secret is copied into the image build stage.
- Compatibility constraints: semantic HTML, iOS safe areas, keyboard navigation and body-scroll locking.
- Test/screenshot expectations: unit validation of bundled documents; browser smoke for 375, 1024 and 1440px; opening, switching and closing the legal center; match-result captures on phone, desktop and reduced motion.
- Matching screenshot expectations: capture the first question at rest and during drag; verify stack depth, yes/no label opacity, spring return, button alternative and reduced motion.

## Open questions
- [ ] Foundation legal owner: confirm that the current privacy policy and consent text, which name `home.fond-nika.ru`, legally cover the final production domain of this interactive site before public launch.
- [ ] Product owner: define who refreshes local legal copies when official source documents change.
- [ ] Bitrix administrator: confirm the enumeration item IDs for “Какие программы фонда НИКА вас интересуют?” before enabling the interest field in production.
