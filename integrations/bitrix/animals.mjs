import { buildAnimalListRequest, mapBitrixAnimal } from "./mappers.mjs";
import { sendToBitrix } from "./sender.mjs";

/**
 * Disabled-by-default server helper. It returns normalized candidates only;
 * an editorial matching profile must be added before a record enters the app.
 */
export async function loadAnimalsFromBitrix(config, dependencies = {}) {
  const response = await sendToBitrix(buildAnimalListRequest(config), config, dependencies);
  if (response.status === "disabled") return { status: "disabled", animals: [], next: null };

  const records = Array.isArray(response.data) ? response.data : [];
  const animals = records
    .map((record) => mapBitrixAnimal(record, config))
    .filter((animal) => animal.published && !animal.blockedFromSite && !animal.notForGuardianship);

  return {
    status: "sent",
    animals,
    next: response.next,
  };
}
