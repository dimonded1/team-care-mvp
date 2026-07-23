import assert from 'node:assert/strict'
import test from 'node:test'

import {
  authorizeIntegrationRequest,
  createBitrixConfig,
  mapCareEvent,
  mapGuardianshipLead,
  sendToBitrix,
} from './index.mjs'

const configuredEnv = {
  BITRIX_ENABLED: 'true',
  BITRIX_WEBHOOK_URL: 'https://example.bitrix24.ru/rest/1/token',
  BITRIX_WEBHOOK_SECRET: 'never-expose-this',
  BITRIX_CARE_EVENT_ENTITY_TYPE_ID: '145',
  BITRIX_GUARDIANSHIP_FORM_ID: '8',
  BITRIX_FIELD_GUARDIAN_NAME: 'UF_CRM_NAME',
  BITRIX_FIELD_GUARDIAN_EMAIL: 'UF_CRM_EMAIL',
  BITRIX_FIELD_GUARDIAN_PHONE: 'UF_CRM_PHONE',
  BITRIX_FIELD_ANIMAL_ID: 'UF_CRM_ANIMAL_ID',
  BITRIX_FIELD_ANIMAL_NAME: 'UF_CRM_ANIMAL_NAME',
  BITRIX_FIELD_CONSENT: 'UF_CRM_CONSENT',
  BITRIX_FIELD_CARE_TYPE: 'UF_CRM_CARE_TYPE',
  BITRIX_FIELD_OCCURRED_AT: 'UF_CRM_OCCURRED_AT',
}

test('disabled adapter makes no network request and exposes no secret', async () => {
  const config = createBitrixConfig({ BITRIX_WEBHOOK_SECRET: 'secret' })
  const result = await sendToBitrix({ method: 'crm.lead.add', payload: {} }, config, {
    fetch: () => assert.fail('fetch must not be called'),
  })

  assert.deepEqual(result, { status: 'disabled' })
  assert.equal(Object.hasOwn(config, 'secret'), false)
  assert.equal(JSON.stringify(config).includes('secret'), false)
})

test('mappers build guardianship lead and care-event payloads', () => {
  const config = createBitrixConfig(configuredEnv)
  const lead = mapGuardianshipLead({ guardianName: 'Анна', animalId: 'mira', animalName: 'Мира', consent: true }, config)
  const event = mapCareEvent({ animalId: 'mira', careType: 'feeding', occurredAt: '2026-07-23T10:00:00.000Z' }, config)

  assert.equal(lead.method, 'crm.lead.add')
  assert.equal(lead.payload.fields.UF_CRM_NAME, 'Анна')
  assert.equal(event.payload.entityTypeId, 145)
  assert.equal(event.payload.fields.UF_CRM_CARE_TYPE, 'feeding')
})

test('guardianship lead requires explicit consent', () => {
  const config = createBitrixConfig(configuredEnv)

  assert.throws(
    () => mapGuardianshipLead({
      guardianName: 'Анна',
      animalId: 'mira',
      animalName: 'Мира',
      consent: false,
    }, config),
    /Explicit guardianship consent is required/,
  )
})

test('enabled adapter validates HTTPS and sends through injected fetch without exposing secret', async () => {
  const config = createBitrixConfig(configuredEnv)
  let call
  const result = await sendToBitrix({ method: 'crm.lead.add', payload: { fields: {} } }, config, {
    fetch: async (url, options) => {
      call = { url, options }
      return { ok: true, status: 200 }
    },
  })

  assert.deepEqual(result, { status: 'sent', httpStatus: 200 })
  assert.equal(call.url, 'https://example.bitrix24.ru/rest/1/token/crm.lead.add.json')
  assert.equal(Object.values(call.options.headers).includes('never-expose-this'), false)
  assert.equal(JSON.stringify(result).includes('never-expose-this'), false)
  assert.equal(authorizeIntegrationRequest(config, 'never-expose-this'), true)
  assert.equal(authorizeIntegrationRequest(config, 'wrong-secret'), false)

  const insecure = createBitrixConfig({ ...configuredEnv, BITRIX_WEBHOOK_URL: 'http://example.test/webhook' })
  await assert.rejects(
    sendToBitrix({ method: 'crm.lead.add', payload: {} }, insecure, { fetch: async () => ({ ok: true, status: 200 }) }),
    /must use HTTPS/,
  )

  const incomplete = createBitrixConfig({ ...configuredEnv, BITRIX_GUARDIANSHIP_FORM_ID: '' })
  await assert.rejects(
    sendToBitrix({ method: 'crm.lead.add', payload: {} }, incomplete, { fetch: async () => ({ ok: true, status: 200 }) }),
    /GUARDIANSHIP_FORM_ID/,
  )
})
