# Bitrix server adapter (disabled by default)

This is a small server-only adapter for a future Bitrix24 integration. It is deliberately disabled unless `BITRIX_ENABLED=true`; when disabled, `sendToBitrix()` returns `{ status: 'disabled' }` and makes no network request.

Place it behind a server endpoint (or another trusted server runtime). **Never import it from Vite client code**: it handles the integration secret and is not safe to bundle for the browser. Use `authorizeIntegrationRequest()` at that server boundary before accepting an event. The integration secret is deliberately not forwarded to Bitrix; the Bitrix webhook URL already contains its own access token.

`mapGuardianshipLead()` creates a standard CRM lead payload. `mapCareEvent()` creates a smart-process item payload. Configure all placeholder IDs in the server environment before enabling the adapter; enabled mode rejects non-HTTPS webhook URLs and incomplete configuration.

The sender accepts an injected `fetch` implementation to make server tests independent of the network. It returns only status metadata and never returns, logs or forwards the integration secret.

## Activation checklist

1. Deploy a trusted server endpoint. GitHub Pages cannot keep the webhook token or integration secret private.
2. Copy `.env.bitrix.example` into the server secret store and replace every placeholder.
3. Accept only `POST` requests, limit the request body, validate its shape and call `authorizeIntegrationRequest()` before mapping data.
4. Keep `BITRIX_ENABLED=false` during setup and run `node --test integrations/bitrix/bitrix.node-test.mjs`.
5. Change the flag to `true` only after the Bitrix field IDs and webhook URL have been verified in a non-production form.

`mapGuardianshipLead()` refuses to create a lead without explicit consent. Do not send questionnaire answers or other behavioural data unless the production privacy notice is updated for that exact purpose.
