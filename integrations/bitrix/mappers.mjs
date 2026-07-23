function requireValue(value, name) {
  if (value === undefined || value === null || value === '') throw new TypeError(`${name} is required`)
  return value
}

/** Maps a consented guardianship request to Bitrix CRM lead fields. */
export function mapGuardianshipLead(input, config) {
  if (input.consent !== true) {
    throw new TypeError('Explicit guardianship consent is required')
  }

  const fields = config.fields
  return {
    method: 'crm.lead.add',
    payload: {
      fields: {
        TITLE: `Опека: ${requireValue(input.animalName, 'animalName')}`,
        [fields.guardianName]: requireValue(input.guardianName, 'guardianName'),
        [fields.guardianEmail]: input.email || '',
        [fields.guardianPhone]: input.phone || '',
        [fields.animalId]: requireValue(input.animalId, 'animalId'),
        [fields.animalName]: input.animalName,
        [fields.consent]: true,
      },
      params: { REGISTER_SONET_EVENT: 'N' },
    },
  }
}

/** Maps an in-app care action to a configured Bitrix smart-process item. */
export function mapCareEvent(input, config) {
  const fields = config.fields
  return {
    method: 'crm.item.add',
    payload: {
      entityTypeId: Number(config.entityTypeId),
      fields: {
        [fields.animalId]: requireValue(input.animalId, 'animalId'),
        [fields.careType]: requireValue(input.careType, 'careType'),
        [fields.occurredAt]: input.occurredAt || new Date().toISOString(),
      },
    },
  }
}
