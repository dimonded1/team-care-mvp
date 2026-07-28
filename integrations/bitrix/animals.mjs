import { buildAnimalListRequest, mapBitrixAnimal } from "./mappers.mjs";
import { sendToBitrix } from "./sender.mjs";

/**
 * Disabled-by-default server helper. It returns normalized candidates only;
 * an editorial matching profile must be added before a record enters the app.
 */
export async function loadAnimalsFromBitrix(config, dependencies = {}) {
  const categoryId = dependencies.categoryId ?? config.animal.categoryId;
  const start = dependencies.start ?? 0;
  const response = await sendToBitrix(
    buildAnimalListRequest(config, { categoryId, start }),
    config,
    dependencies,
  );
  if (response.status === "disabled") return { status: "disabled", animals: [], next: null };

  const records = Array.isArray(response.data) ? response.data : [];
  const animals = records
    .map((record) => ({
      ...mapBitrixAnimal(record, config),
      categoryId: Number(categoryId),
    }))
    .filter((animal) => animal.published && !animal.blockedFromSite && !animal.notForGuardianship);

  return {
    status: "sent",
    animals,
    next: response.next,
  };
}

/**
 * Loads every published guardianship candidate from every configured category.
 * Pagination is server-side and bounded; the browser never calls Bitrix.
 */
export async function loadAllAnimalsFromBitrix(config, dependencies = {}) {
  const animalsById = new Map();

  for (const categoryId of config.animal.categoryIds) {
    let start = 0;
    let pageCount = 0;
    do {
      const response = await loadAnimalsFromBitrix(config, {
        ...dependencies,
        categoryId,
        start,
      });
      if (response.status === "disabled") {
        return { status: "disabled", animals: [], pages: 0 };
      }
      response.animals.forEach((animal) => animalsById.set(animal.sourceId, animal));
      start = response.next;
      pageCount += 1;
      if (pageCount > 500) throw new Error("Bitrix animal pagination exceeded the safety limit");
    } while (start !== null);
  }

  return {
    status: "sent",
    animals: [...animalsById.values()].toSorted((a, b) =>
      Number(a.categoryId) - Number(b.categoryId)
      || Number(a.sourceId) - Number(b.sourceId)),
  };
}
