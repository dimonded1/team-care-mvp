# Bitrix server adapter (disabled by default)

This is a server-only Bitrix24 adapter. It is deliberately disabled unless the global flag and a specific feature flag are enabled. `BITRIX_ANIMAL_SYNC_ENABLED`, `BITRIX_GUARDIANSHIP_LEADS_ENABLED`, `BITRIX_CARE_EVENTS_ENABLED` and `BITRIX_CONTACTS_ENABLED` are independent, so configuring one contour cannot accidentally enable another.

Place it behind a server endpoint (or another trusted server runtime). **Never import it from Vite client code**: it handles the integration secret and is not safe to bundle for the browser. Use `authorizeIntegrationRequest()` at that server boundary before accepting an event. The integration secret is deliberately not forwarded to Bitrix; the Bitrix webhook URL already contains its own access token.

`buildAnimalListRequest()` requests only the configured public animal fields. `mapBitrixAnimal()` strips markup, validates public HTTPS links and deliberately excludes medication/medical free text from the game model. It also marks every imported record as requiring an editorial `matchProfile`; the matching algorithm must never invent behavioural scores from CRM prose.

The checked-in browser catalog is refreshed with `npm run sync:animals`. The
script paginates every category from `BITRIX_ANIMAL_CATEGORY_IDS` and writes a
safe full inventory to `animalCatalog.generated.json`. Only animals with a
reviewed profile in `src/data/animalEditorial.json` enter
`src/data/bitrixAnimals.generated.json` and have their main image downloaded
through the temporary server-only `crm.item.get` URL. Signed file URLs are never
persisted or returned to the browser.

`mapGuardianshipLead()` creates a standard CRM lead payload. `mapCareEvent()` creates a smart-process item payload. `mapContactCapture()` creates a Bitrix contact from the final-screen form and refuses requests without explicit personal-data consent. Configure all placeholder IDs in the server environment before enabling a feature; enabled mode rejects non-HTTPS webhook URLs and incomplete feature configuration.

For the contact form, the supplied workbook confirmed the standard `NAME`,
`LAST_NAME`, `SECOND_NAME`, `PHONE`, `EMAIL`, `BIRTHDATE` and `ADDRESS` fields,
plus these custom fields:

- Telegram: `UF_CRM_1682596086758`;
- about: `UF_CRM_1704894991128`;
- work sphere: `UF_CRM_1715684248494`;
- hobbies: `UF_CRM_1715684330391`;
- pets: `UF_CRM_1715684359389`;
- preferred contact method: `UF_CRM_1715684447761`;
- interest: `UF_CRM_1773242372621`;
- consent: `UF_CRM_1771837766068`;
- consent date: `UF_CRM_1771837777534`;
- submission date: `UF_CRM_1773673401962`;
- MAX handle: `UF_CRM_1781700742387`.

The exact enum IDs were verified against `crm.contact.fields`: ten work-sphere
values (`1749`–`1767`), preferred contact values (`1769`, `1771`, `1773`,
`1775`, `3377`) and guardianship program interest `2957`. They live only in
server environment variables so the mapping can be changed without rebuilding
the client.

The sender accepts an injected `fetch` implementation to make server tests independent of the network. It returns only status metadata and never returns, logs or forwards the integration secret.

## Activation checklist

1. Deploy the bundled Node server (or an equivalent trusted backend). GitHub Pages cannot keep the webhook token or integration secret private.
2. Copy `.env.example` to `.env` on the server, replace placeholders, and keep the file outside the image/repository with mode `0600`.
3. Set `APP_ALLOWED_ORIGINS` to the public HTTPS origin. Set `APP_TRUST_PROXY=true` only behind a trusted proxy that overwrites forwarded headers.
4. Keep `BITRIX_ENABLED=false` and `BITRIX_CONTACTS_ENABLED=false` during setup, then run `npm run test:server`.
5. Verify the field map and webhook against a non-production contact.
6. Enable only `BITRIX_ENABLED=true` and `BITRIX_CONTACTS_ENABLED=true`; leave unrelated feature flags off.

GitHub Pages cannot execute this adapter or protect its credentials. Keep the current app on Pages in read-only demo mode until a trusted server endpoint is available.

The public endpoint is same-origin, JSON-only, schema-validated, rate-limited and body-size-limited. It never sends quiz answers. `BITRIX_WEBHOOK_SECRET` is server-only and must never be exposed to browser code.

`mapGuardianshipLead()` refuses to create a lead without explicit consent. Do not send questionnaire answers or other behavioural data unless the production privacy notice is updated for that exact purpose.
