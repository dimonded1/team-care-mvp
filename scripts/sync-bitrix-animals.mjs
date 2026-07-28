import { execFile } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";

import {
  createBitrixConfig,
  loadAllAnimalsFromBitrix,
  sendToBitrix,
  validateBitrixConfig,
} from "../integrations/bitrix/index.mjs";

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const OUTPUT_DATA = join(process.cwd(), "src/data/bitrixAnimals.generated.json");
const OUTPUT_CATALOG = join(process.cwd(), "integrations/bitrix/animalCatalog.generated.json");
const EDITORIAL_DATA = join(process.cwd(), "src/data/animalEditorial.json");
const OUTPUT_PHOTOS = join(process.cwd(), "public/assets/animals/bitrix");
const execFileAsync = promisify(execFile);

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

function categoryLabels(value) {
  const labels = new Map([
    [17, "Мокрый Нос"],
    [13, "Малино"],
  ]);
  String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const separator = item.indexOf(":");
      if (separator < 1) throw new Error("BITRIX_ANIMAL_CATEGORY_LABELS has an invalid item");
      const id = Number(item.slice(0, separator));
      const label = cleanText(item.slice(separator + 1));
      if (!Number.isInteger(id) || !label) {
        throw new Error("BITRIX_ANIMAL_CATEGORY_LABELS must use id:label|id:label");
      }
      labels.set(id, label);
    });
  return labels;
}

function itemFieldKey(fieldId) {
  return String(fieldId).replace(/^UF_CRM/u, "ufCrm");
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
    filename,
    photoPath: `assets/animals/bitrix/${filename}`,
    bytes: (await stat(outputPath)).size,
    mime: format.mime,
  };
}

async function writeJsonAtomic(path, value) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  await rename(temporary, path);
}

function catalogRecord(animal, labels, reviewedIds) {
  const complete = animal.species !== "unknown"
    && animal.sex !== "unknown"
    && Boolean(animal.birthDate)
    && Boolean(storyExcerpt(animal.story || animal.shortDescription))
    && animal.photoFileIds.length > 0;
  return {
    sourceId: animal.sourceId,
    categoryId: animal.categoryId,
    categoryName: labels.get(Number(animal.categoryId)) ?? `Категория ${animal.categoryId}`,
    name: animal.name,
    species: animal.species,
    sex: animal.sex,
    birthDate: animal.birthDate,
    story: storyExcerpt(animal.story || animal.shortDescription),
    character: storyExcerpt(animal.character, 2, 360),
    behavior: storyExcerpt(animal.behavior, 2, 360),
    profileUrl: animal.profileUrl,
    mainPhotoAvailable: animal.photoFileIds.length > 0,
    extraPhotoCount: Math.max(0, animal.photoFileIds.length - 1),
    matchingStatus: !complete
      ? "incomplete"
      : reviewedIds.has(animal.sourceId)
        ? "reviewed"
        : "needsEditorialProfile",
  };
}

async function createMatchSnapshot(animal, config, labels, syncedAt) {
  if (animal.species === "unknown" || animal.sex === "unknown" || !animal.birthDate) {
    throw new Error(`${animal.name} lacks species, sex or birth date`);
  }
  const story = storyExcerpt(animal.story || animal.shortDescription);
  if (!story) throw new Error(`${animal.name} has no public story text`);

  const itemResponse = await sendToBitrix({
    feature: "animalSync",
    method: "crm.item.get",
    responseMode: "json",
    payload: { entityTypeId: 2, id: Number(animal.sourceId) },
  }, config);
  const item = itemResponse.data?.item ?? itemResponse.data;
  const mainPhoto = item?.[itemFieldKey(config.animal.fields.mainPhoto)];
  const signedUrl = Array.isArray(mainPhoto) ? mainPhoto[0]?.urlMachine : mainPhoto?.urlMachine;
  if (!signedUrl) throw new Error(`${animal.name} has no server-downloadable main photo`);
  const downloaded = await downloadPhoto(signedUrl, config, animal.sourceId);

  return {
    snapshot: {
      sourceId: animal.sourceId,
      categoryId: Number(animal.categoryId),
      categoryName: labels.get(Number(animal.categoryId)) ?? `Категория ${animal.categoryId}`,
      syncedAt,
      name: animal.name,
      species: animal.species,
      sex: animal.sex,
      birthDate: animal.birthDate,
      photoPath: downloaded.photoPath,
      story,
      sourceFieldCoverage: {
        story: Boolean(animal.story),
        description: Boolean(animal.shortDescription),
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
      categoryId: Number(animal.categoryId),
      photo: downloaded.photoPath,
      photoBytes: downloaded.bytes,
    },
    filename: downloaded.filename,
  };
}

async function main() {
  const config = createBitrixConfig({
    ...process.env,
    BITRIX_ENABLED: "true",
    BITRIX_ANIMAL_SYNC_ENABLED: "true",
  });
  validateBitrixConfig(config, "animalSync");

  const editorial = JSON.parse(await readFile(EDITORIAL_DATA, "utf8"));
  const reviewedIds = new Set(Object.keys(editorial));
  const labels = categoryLabels(process.env.BITRIX_ANIMAL_CATEGORY_LABELS);
  const syncedAt = new Date().toISOString();
  const response = await loadAllAnimalsFromBitrix(config);
  const candidates = response.animals;
  const candidateById = new Map(candidates.map((animal) => [animal.sourceId, animal]));

  const missingReviewed = [...reviewedIds].filter((sourceId) => !candidateById.has(sourceId));
  if (missingReviewed.length > 0) {
    throw new Error(`Reviewed animals are no longer eligible in Bitrix: ${missingReviewed.join(", ")}`);
  }

  await mkdir(OUTPUT_PHOTOS, { recursive: true });
  const imported = [];
  for (const sourceId of reviewedIds) {
    imported.push(await createMatchSnapshot(candidateById.get(sourceId), config, labels, syncedAt));
  }

  const snapshots = imported
    .map((item) => item.snapshot)
    .toSorted((a, b) => a.sourceId.localeCompare(b.sourceId, "ru", { numeric: true }));
  const catalog = candidates.map((animal) => catalogRecord(animal, labels, reviewedIds));

  await writeJsonAtomic(OUTPUT_DATA, snapshots);
  await writeJsonAtomic(OUTPUT_CATALOG, {
    syncedAt,
    source: "Bitrix24",
    categories: config.animal.categoryIds.map((id) => ({
      id: Number(id),
      name: labels.get(Number(id)) ?? `Категория ${id}`,
    })),
    summary: {
      eligible: catalog.length,
      matchReady: catalog.filter((animal) => animal.matchingStatus === "reviewed").length,
      awaitingEditorial: catalog.filter((animal) => animal.matchingStatus === "needsEditorialProfile").length,
      incomplete: catalog.filter((animal) => animal.matchingStatus === "incomplete").length,
    },
    animals: catalog,
  });

  const activePhotos = new Set(imported.map((item) => item.filename));
  for (const filename of await readdir(OUTPUT_PHOTOS)) {
    if (
      ["jpg", "jpeg", "png", "webp"].includes(extname(filename).slice(1).toLowerCase())
      && !activePhotos.has(filename)
    ) {
      await unlink(join(OUTPUT_PHOTOS, filename));
    }
  }

  console.log(JSON.stringify({
    status: "synced",
    eligibleAnimals: catalog.length,
    matchReadyAnimals: snapshots.length,
    awaitingEditorial: catalog.filter((animal) => animal.matchingStatus === "needsEditorialProfile").length,
    incomplete: catalog.filter((animal) => animal.matchingStatus === "incomplete").length,
    matchedAnimals: imported.map((item) => item.report),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Bitrix animal sync failed: ${error.message}`);
  process.exitCode = 1;
});
