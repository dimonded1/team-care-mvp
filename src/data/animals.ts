import snapshots from "./bitrixAnimals.generated.json";
import { animalEditorialBySourceId } from "./animalEditorial";
import { assetUrl } from "../lib/assets";
import type { Animal } from "../types/app";

interface BitrixAnimalSnapshot {
  sourceId: string;
  categoryId: number;
  categoryName: string;
  syncedAt: string;
  name: string;
  species: Animal["species"];
  sex: "female" | "male";
  birthDate: string;
  photoPath: string;
  story: string;
  sourceFieldCoverage: {
    story: boolean;
    description: boolean;
    character: boolean;
    behavior: boolean;
    mainPhoto: boolean;
    extraPhotoCount: number;
    profileUrl: boolean;
  };
  profileUrl: string | null;
}

function pluralize(value: number, one: string, few: string, many: string) {
  const tens = value % 100;
  const units = value % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}

export function formatAnimalAge(birthDate: string, now = new Date()): string {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.valueOf()) || birth > now) return "возраст уточняется";

  let months = (now.getUTCFullYear() - birth.getUTCFullYear()) * 12;
  months += now.getUTCMonth() - birth.getUTCMonth();
  if (now.getUTCDate() < birth.getUTCDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 12) {
    const value = Math.max(1, months);
    return `${value} ${pluralize(value, "месяц", "месяца", "месяцев")}`;
  }

  const years = Math.floor(months / 12);
  return `${years} ${pluralize(years, "год", "года", "лет")}`;
}

export const animals: Animal[] = (snapshots as BitrixAnimalSnapshot[]).map((snapshot) => {
  const editorial = animalEditorialBySourceId[snapshot.sourceId];
  if (!editorial) {
    throw new Error(`Missing editorial matching profile for Bitrix animal ${snapshot.sourceId}`);
  }

  return {
    id: `bitrix-${snapshot.sourceId}`,
    source: {
      type: "bitrix",
      id: snapshot.sourceId,
      categoryId: snapshot.categoryId,
      categoryName: snapshot.categoryName,
      syncedAt: snapshot.syncedAt,
    },
    name: snapshot.name,
    nameGenitive: editorial.nameGenitive,
    species: snapshot.species,
    sex: snapshot.sex === "female" ? "девочка" : "мальчик",
    birthDate: snapshot.birthDate,
    age: formatAnimalAge(snapshot.birthDate),
    photo: assetUrl(snapshot.photoPath),
    shortDescription: editorial.shortDescription,
    story: snapshot.story,
    traits: editorial.traits,
    careTags: editorial.careTags,
    matchProfile: editorial.matchProfile,
    profileUrl: snapshot.profileUrl ?? "https://fond-nika.ru/ourpets/",
  };
});
