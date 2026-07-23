import { bitrixSecrets } from './private.mjs'

const PLACEHOLDER = '<SET_IN_SERVER_ENV>'

function asBoolean(value) {
  return String(value).toLowerCase() === 'true'
}

function valueOrPlaceholder(value) {
  return value || PLACEHOLDER
}

/**
 * Loads only server environment values. The returned config deliberately does
 * not expose BITRIX_WEBHOOK_SECRET; sender.mjs reads it from private storage.
 */
export function createBitrixConfig(env = process.env) {
  const config = Object.freeze({
    enabled: asBoolean(env.BITRIX_ENABLED),
    webhookUrl: valueOrPlaceholder(env.BITRIX_WEBHOOK_URL),
    hasSecret: Boolean(env.BITRIX_WEBHOOK_SECRET),
    entityTypeId: valueOrPlaceholder(env.BITRIX_CARE_EVENT_ENTITY_TYPE_ID),
    formId: valueOrPlaceholder(env.BITRIX_GUARDIANSHIP_FORM_ID),
    fields: Object.freeze({
      guardianName: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_NAME),
      guardianEmail: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_EMAIL),
      guardianPhone: valueOrPlaceholder(env.BITRIX_FIELD_GUARDIAN_PHONE),
      animalId: valueOrPlaceholder(env.BITRIX_FIELD_ANIMAL_ID),
      animalName: valueOrPlaceholder(env.BITRIX_FIELD_ANIMAL_NAME),
      consent: valueOrPlaceholder(env.BITRIX_FIELD_CONSENT),
      careType: valueOrPlaceholder(env.BITRIX_FIELD_CARE_TYPE),
      occurredAt: valueOrPlaceholder(env.BITRIX_FIELD_OCCURRED_AT),
    }),
  })

  bitrixSecrets.set(config, env.BITRIX_WEBHOOK_SECRET || '')
  return config
}

export function validateBitrixConfig(config) {
  const errors = []
  let parsedUrl

  try {
    parsedUrl = new URL(config.webhookUrl)
  } catch {
    errors.push('BITRIX_WEBHOOK_URL must be a valid HTTPS URL')
  }
  if (parsedUrl && parsedUrl.protocol !== 'https:') errors.push('BITRIX_WEBHOOK_URL must use HTTPS')
  if (!bitrixSecrets.get(config)) errors.push('BITRIX_WEBHOOK_SECRET is required')
  if (!/^\d+$/.test(String(config.entityTypeId))) {
    errors.push('BITRIX_CARE_EVENT_ENTITY_TYPE_ID must be a numeric ID')
  }
  if (!/^\d+$/.test(String(config.formId))) {
    errors.push('BITRIX_GUARDIANSHIP_FORM_ID must be a numeric ID')
  }
  if (Object.values(config.fields).some((field) => field === PLACEHOLDER)) {
    errors.push('All BITRIX_FIELD_* IDs must be configured')
  }

  if (errors.length) throw new Error(`Invalid Bitrix configuration: ${errors.join('; ')}`)
}
