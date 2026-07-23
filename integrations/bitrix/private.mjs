import { timingSafeEqual } from 'node:crypto'

// Internal-only storage keeps the secret out of the public configuration object.
export const bitrixSecrets = new WeakMap()

export function authorizeIntegrationRequest(config, providedSecret) {
  const expected = bitrixSecrets.get(config) || ''
  const provided = typeof providedSecret === 'string' ? providedSecret : ''
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  return expectedBuffer.length > 0
    && expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer)
}
