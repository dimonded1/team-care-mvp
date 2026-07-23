import { validateBitrixConfig } from './config.mjs'

function endpointFor(webhookUrl, method) {
  return `${webhookUrl.replace(/\/$/, '')}/${method}.json`
}

/**
 * Sends a prepared mapper result. Keep this module on the server only: it may
 * read a webhook secret and must never be included in a Vite client bundle.
 */
export async function sendToBitrix(request, config, { fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!config.enabled) return { status: 'disabled' }

  validateBitrixConfig(config)
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required')

  const response = await fetchImpl(endpointFor(config.webhookUrl, request.method), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request.payload),
  })

  if (!response.ok) throw new Error(`Bitrix request failed with HTTP ${response.status}`)
  return { status: 'sent', httpStatus: response.status }
}
