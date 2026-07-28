import type { MatchProfile } from "../types/app";

export interface AnimalEditorialProfile {
  nameGenitive: string;
  shortDescription: string;
  traits: string[];
  careTags: string[];
  matchProfile: MatchProfile;
}

/**
 * Editorial enrichment for the matching game.
 *
 * Bitrix does not store the seven-dimensional matching profile used by the
 * questionnaire. These values are reviewed game content based only on the
 * non-medical character/behaviour fields and remain separate from the CRM
 * snapshot so they are never presented as source data.
 */
export const animalEditorialBySourceId: Record<string, AnimalEditorialProfile> = {
  "360911": {
    nameGenitive: "Архыза",
    shortDescription: "Спокойный и ласковый пёс, который уверенно ходит на поводке",
    traits: ["спокойный", "ласковый", "дружелюбный", "внимательный"],
    careTags: ["прогулки", "общение", "постоянство"],
    matchProfile: {
      energy: 55,
      sociability: 85,
      initiative: 70,
      patience: 55,
      routine: 60,
      spaceRespect: 50,
      challenge: 35,
    },
  },
  "639547": {
    nameGenitive: "Мальвины",
    shortDescription: "Ласковая молодая кошка, которой нравится быть рядом",
    traits: ["ласковая", "добрая", "дружелюбная", "нежная"],
    careTags: ["внимание", "общение", "уют"],
    matchProfile: {
      energy: 45,
      sociability: 95,
      initiative: 80,
      patience: 45,
      routine: 60,
      spaceRespect: 35,
      challenge: 25,
    },
  },
  "431829": {
    nameGenitive: "Перчинки",
    shortDescription: "Осторожная кошка, которая учится доверять маленькими шагами",
    traits: ["осторожная", "наблюдательная", "чуткая", "спокойная"],
    careTags: ["доверие", "пространство", "постоянство"],
    matchProfile: {
      energy: 35,
      sociability: 25,
      initiative: 20,
      patience: 95,
      routine: 85,
      spaceRespect: 100,
      challenge: 85,
    },
  },
  "266241": {
    nameGenitive: "Маркуса",
    shortDescription: "Добрый и открытый пёс, которому особенно важно внимание",
    traits: ["добрый", "общительный", "радостный", "чуткий"],
    careTags: ["общение", "прогулки", "внимание"],
    matchProfile: {
      energy: 65,
      sociability: 90,
      initiative: 75,
      patience: 60,
      routine: 55,
      spaceRespect: 45,
      challenge: 45,
    },
  },
  "266009": {
    nameGenitive: "Юнити",
    shortDescription: "Активная и общительная собака с мягким характером",
    traits: ["активная", "общительная", "нежная", "доверчивая"],
    careTags: ["движение", "общение", "режим"],
    matchProfile: {
      energy: 85,
      sociability: 85,
      initiative: 65,
      patience: 50,
      routine: 45,
      spaceRespect: 40,
      challenge: 35,
    },
  },
  "650827": {
    nameGenitive: "Кепчука",
    shortDescription: "Молодой ласковый кот, который любит контакт с человеком",
    traits: ["ласковый", "контактный", "нежный", "общительный"],
    careTags: ["внимание", "игра", "уют"],
    matchProfile: {
      energy: 50,
      sociability: 95,
      initiative: 85,
      patience: 45,
      routine: 60,
      spaceRespect: 30,
      challenge: 25,
    },
  },
};
