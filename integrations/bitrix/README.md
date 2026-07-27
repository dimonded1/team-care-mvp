# Bitrix server adapter (disabled by default)

This is a server-only adapter for a future Bitrix24 integration. It is deliberately disabled unless the global flag and a specific feature flag are enabled. `BITRIX_ANIMAL_SYNC_ENABLED`, `BITRIX_GUARDIANSHIP_LEADS_ENABLED` and `BITRIX_CARE_EVENTS_ENABLED` are independent, so configuring animal reads cannot accidentally enable lead or analytics writes.

Place it behind a server endpoint (or another trusted server runtime). **Never import it from Vite client code**: it handles the integration secret and is not safe to bundle for the browser. Use `authorizeIntegrationRequest()` at that server boundary before accepting an event. The integration secret is deliberately not forwarded to Bitrix; the Bitrix webhook URL already contains its own access token.

`buildAnimalListRequest()` requests only the configured public animal fields. `mapBitrixAnimal()` strips markup, validates public HTTPS links and deliberately excludes medication/medical free text from the game model. It also marks every imported record as requiring an editorial `matchProfile`; the matching algorithm must never invent behavioural scores from CRM prose.

`mapGuardianshipLead()` creates a standard CRM lead payload. `mapCareEvent()` creates a smart-process item payload. Configure all placeholder IDs and Bitrix enumeration values in the server environment before enabling a feature; enabled mode rejects non-HTTPS webhook URLs and incomplete feature configuration.

The sender accepts an injected `fetch` implementation to make server tests independent of the network. It returns only status metadata and never returns, logs or forwards the integration secret.

## Activation checklist

1. Deploy a trusted server endpoint. GitHub Pages cannot keep the webhook token or integration secret private.
2. Copy `.env.example` to `.env.local` (or the server secret store) and replace every placeholder.
3. Accept only `POST` requests, limit the request body, validate its shape and call `authorizeIntegrationRequest()` before mapping data.
4. Keep `BITRIX_ENABLED=false` during setup and run `node --test integrations/bitrix/bitrix.node-test.mjs`.
5. Confirm the cat/dog and female/male enumeration IDs with Bitrix metadata. The sample workbook contains only one record and is not enough to infer all enum values safely.
6. Enable only the required feature flag after the field map and webhook have been verified against a non-production record.

GitHub Pages cannot execute this adapter or protect its credentials. Keep the current app on Pages in read-only demo mode until a trusted server endpoint is available.

`mapGuardianshipLead()` refuses to create a lead without explicit consent. Do not send questionnaire answers or other behavioural data unless the production privacy notice is updated for that exact purpose.
