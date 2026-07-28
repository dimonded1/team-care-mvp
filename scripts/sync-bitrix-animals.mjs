import { execFile } from "node:child_process";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";

import { createBitrixConfig, validateBitrixConfig } from "../integrations/bitrix/config.mjs";
import { mapBitrixAnimal } from "../integrations/bitrix/mappers.mjs";
import { sendToBitrix } from "../integrations/bitrix/sender.mjs";

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const OUTPUT_DATA = join(process.cwd(), "src/data/bitrixAnimals.generated.json");
const OUTPUT_PHOTOS = join(process.cwd(), "public/assets/animals/bitrix");
const execFileAsync = promisify(execFile);

const importPlan = [
  { sourceId: "360911", expectedName: "Архыз", categoryId: 17, categoryName: "Мокрый Нос" },
  { sourceId: "639547", expectedName: "Мальвина", categoryId: 17, categoryName: "Мокрый Нос" },
  { sourceId: "431829", expectedName: "Перчинка", categoryId: 17, categoryName: "Мокрый Нос" },
  { sourceId: "266241", expectedName: "Маркус", categoryId: 13, categoryName: "Малино" },
  { sourceId: "266009", expectedName: "Юнити", categoryId: 13, categoryName: "Малино" },
  { sourceId: "650827", expectedName: "Кепчук", categoryId: 13, categoryName: "Малино" },
];

function itemFieldKey(fieldId) {
  return String(fieldId).replace(/^UF_CRM/u, "ufCrm");
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function storyExcerpt(value, maxSentences = 3, maxLength = 560) {
  const text = cleanText(value);
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/gu) ?? [text];
  const excerpt = sentences.slice(0, maxSentences).join(" ").replace(/\s+/gu, " ").trim();
  if (excerpt.length <= maxLength) return excerpt;
  const clipped = excerpt.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, boundary > maxLength * 0.65 ? boundary : maxLength).trim()}…`;
}

function imageFormat(bytes, contentType) {
  const mime = String(contentType ?? "").split(";", 1)[0].trim().toLowerCase();
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (mime === "image/jpeg" && jpeg) return { extension: "jpg", mime };
  if (mime === "image/png" && png) return { extension: "png", mime };
  if (mime === "image/webp" && webp) return { extension: "webp", mime };
  throw new Error(`Unsupported or mismatched image response (${mime || "unknown MIME"})`);
}

async function readResponseWithLimit(response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PHOTO_BYTES) {
    throw new Error(`Photo exceeds ${MAX_PHOTO_BYTES} bytes`);
  }
  if (!response.body) throw new Error("Photo response has no body");

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PHOTO_BYTES) {
      await reader.cancel();
      throw new Error(`Photo exceeds ${MAX_PHOTO_BYTES} bytes`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function downloadPhoto(signedUrl, config, sourceId) {
  const webhookOrigin = new URL(config.webhookUrl).origin;
  const url = new URL(signedUrl, webhookOrigin);
  if (url.protocol !== "https:" || url.origin !== webhookOrigin) {
    throw new Error(`Rejected photo host for Bitrix animal ${sourceId}`);
  }

  const response = await fetch(url, {
    headers: { accept: "image/avif,image/webp,image/png,image/jpeg" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Photo download failed with HTTP ${response.status}`);
  if (new URL(response.url).origin !== webhookOrigin) {
    throw new Error(`Rejected redirected photo host for Bitrix animal ${sourceId}`);
  }

  const bytes = await readResponseWithLimit(response);
  const format = imageFormat(bytes, response.headers.get("content-type"));
  const filename = `${sourceId}.${format.extension}`;
  const outputPath = join(OUTPUT_PHOTOS, filename);
  await writeFile(outputPath, bytes, { mode: 0o644 });

  if (process.platform === "darwin" && format.extension === "jpg") {
    await execFileAsync("/usr/bin/sips", [
      "-Z",
      "1600",
      "-s",
      "formatOptions",
      "82",
      outputPath,
    ]);
  }

  for (const existing of await readdir(OUTPUT_PHOTOS)) {
    if (
      existing.startsWith(`${sourceId}.`)
      && existing !== filename
      && ["jpg", "jpeg", "png", "webp"].includes(extname(existing).slice(1).toLowerCase())
    ) {
      await unlink(join(OUTPUT_PHOTOS, existing));
    }
  }

  return {
    photoPath: `assets/animals/bitrix/${filename}`,
    bytes: (await stat(outputPath)).size,
    mime: format.mime,
  };
}

async function fetchAnimal(plan, config, syncedAt) {
  const dealResponse = await sendToBitrix({
    feature: "animalSync",
    method: "crm.deal.get",
    responseMode: "json",
    payload: { id: Number(plan.sourceId) },
  }, config);
  const rawDeal = dealResponse.data;
  const animal = mapBitrixAnimal(rawDeal, config);

  if (Number(rawDeal.CATEGORY_ID) !== plan.categoryId) {
    throw new Error(`${plan.expectedName} moved out of the expected Bitrix funnel`);
  }
  if (animal.name !== plan.expectedName) {
    throw new Error(`Bitrix animal ${plan.sourceId} changed name to ${animal.name}`);
  }
  if (!animal.published || animal.blockedFromSite || animal.notForGuardianship) {
    throw new Error(`${animal.name} is no longer eligible for the public guardianship catalog`);
  }
  if (animal.species === "unknown" || animal.sex === "unknown" || !animal.birthDate) {
    throw new Error(`${animal.name} lacks species, sex or birth date`);
  }

  const itemResponse = await sendToBitrix({
    feature: "animalSync",
    method: "crm.item.get",
    responseMode: "json",
    payload: { entityTypeId: 2, id: Number(plan.sourceId) },
  }, config);
  const item = itemResponse.data?.item ?? itemResponse.data;
  const mainPhoto = item?.[itemFieldKey(config.animal.fields.mainPhoto)];
  const signedUrl = Array.isArray(mainPhoto) ? mainPhoto[0]?.urlMachine : mainPhoto?.urlMachine;
  if (!signedUrl) throw new Error(`${animal.name} has no server-downloadable main photo`);
  const downloaded = await downloadPhoto(signedUrl, config, plan.sourceId);

  const story = storyExcerpt(animal.story || animal.shortDescription);
  if (!story) throw new Error(`${animal.name} has no public story text`);

  return {
    snapshot: {
      sourceId: animal.sourceId,
      categoryId: plan.categoryId,
      categoryName: plan.categoryName,
      syncedAt,
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      birthDate: animal.birthDate,
      photoPath: downloaded.photoPath,
      story,
      sourceFieldCoverage: {
        story: Boolean(cleanText(rawDeal[config.animal.fields.story])),
        description: Boolean(cleanText(rawDeal[config.animal.fields.description])),
        character: Boolean(animal.character),
        behavior: Boolean(animal.behavior),
        mainPhoto: true,
        extraPhotoCount: Math.max(0, animal.photoFileIds.length - 1),
        profileUrl: Boolean(animal.profileUrl),
      },
      profileUrl: animal.profileUrl,
    },
    report: {
      id: animal.sourceId,
      name: animal.name,
      funnel: plan.categoryName,
      species: animal.species,
      sex: animal.sex,
      photo: downloaded.photoPath,
      photoBytes: downloaded.bytes,
      fields: {
        birthDate: Boolean(animal.birthDate),
        story: Boolean(story),
        character: Boolean(animal.character),
        behavior: Boolean(animal.behavior),
        profileUrl: Boolean(animal.profileUrl),
      },
    },
  };
}

async function main() {
  const config = createBitrixConfig({
    ...process.env,
    BITRIX_ENABLED: "true",
    BITRIX_ANIMAL_SYNC_ENABLED: "true",
  });
  validateBitrixConfig(config, "animalSync");

  const configuredCategories = new Set(config.animal.categoryIds.map(Number));
  for (const { categoryId } of importPlan) {
    if (!configuredCategories.has(categoryId)) {
      throw new Error(`Bitrix funnel ${categoryId} is missing from BITRIX_ANIMAL_CATEGORY_IDS`);
    }
  }

  await mkdir(OUTPUT_PHOTOS, { recursive: true });
  const syncedAt = new Date().toISOString();
  const imported = [];
  for (const plan of importPlan) {
    imported.push(await fetchAnimal(plan, config, syncedAt));
  }

  const snapshots = imported.map((item) => item.snapshot);
  await writeFile(OUTPUT_DATA, `${JSON.stringify(snapshots, null, 2)}\n`, { mode: 0o644 });

  console.log(JSON.stringify({
    status: "synced",
    animals: imported.map((item) => item.report),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Bitrix animal sync failed: ${error.message}`);
  process.exitCode = 1;
});
