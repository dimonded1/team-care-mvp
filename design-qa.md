# Product Design QA — 22 July 2026

## Scope

- Four-choice mobile layout for “Соберите день”.
- Expanded item pool and ambiguous hazards for “Шанс на дом”.
- Centered future-home icon and expanded guardianship content.
- Refined 9:16 share card with the orange “ЗНАКОМЬТЕСЬ” ribbon.

## Reference inputs

- User screenshot: `/private/tmp/nika-product-design-2026-07-22/reference-house-source.png` — 1134 × 214 px.
- Previous guardianship implementation: `/private/tmp/nika-product-design-2026-07-22/reference-guardianship-before.png` — 390 × 844 px.
- Previous story card: `/private/tmp/nika-product-design-2026-07-22/reference-story-before.png` — 1080 × 1920 px.

## Final implementation captures

- Day game: `/private/tmp/nika-product-design-2026-07-22/implementation-day-mobile.png` — CSS viewport 390 × 844, DPR 1, morning question state.
- Home game: `/private/tmp/nika-product-design-2026-07-22/implementation-home-mobile.png` — CSS viewport 390 × 844, DPR 1, initial candidate state.
- Guardianship hero: `/private/tmp/nika-product-design-2026-07-22/implementation-guardianship-mobile.png` — CSS viewport 390 × 844, DPR 1, top-of-page state.
- Guardianship fit section: `/private/tmp/nika-product-design-2026-07-22/implementation-guardianship-fit-mobile.png` — CSS viewport 390 × 844, DPR 1, scrolled state.
- Final screen: `/private/tmp/nika-product-design-2026-07-22/implementation-final-screen-mobile.png` — CSS viewport 390 × 844, DPR 1, ready-to-export state.
- Exported story card: `/private/tmp/nika-product-design-2026-07-22/implementation-story-card-1080x1920.png` — 1080 × 1920 px, 9:16.

## Same-input comparisons

- Guardianship before/after: `/private/tmp/nika-product-design-2026-07-22/comparison-guardianship-before-after.png`.
- Story card before/after: `/private/tmp/nika-product-design-2026-07-22/comparison-story-before-after.png`.

## Findings and iteration history

1. The house glyph was aligned to the top-left because a later generic `span` rule overrode its grid centering. The selector now targets only the text column; the glyph is visually centered at desktop and mobile sizes.
2. Four day choices initially left too little separation between the prompt and the animal. The choices were moved to a 2 × 2 layout and the animal was lowered so its face remains readable above the response cards.
3. The larger home-item pool is still presented four items at a time. Subtle hazards use consistent transparent illustration assets, and feedback explains the risk instead of only rejecting the object.
4. The guardianship facts remained readable after adding two opportunities and the “Кому подходит” section. Cards stay inside the mobile safe area and the long page scrolls normally.
5. The share-card comparison showed that the requested orange-and-white ribbon improves contrast and brand recognition. The fund lockup, orange home-search badge, direct “на пути к дому” message, and 9:16 safe margins remain legible at story size.

## Verification

- Complete user flow was exercised in the in-app browser at 390 × 844 through all four mini-games, guardianship, final screen, and story export.
- Export action produced `/Users/ds/Downloads/nika-lis-1-care-story-9x16.png` at exactly 1080 × 1920 px.
- No horizontal overflow or clipped primary controls were observed in the reviewed states.
- `npm test`: 40/40 passing.
- `npm run build`: passing.
- Docker image rebuilt; container responds with HTTP 200 and reports healthy.

final result: passed
