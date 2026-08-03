type PetSex = "female" | "male";

const indeclinableEndings = ["е", "ё", "и", "о", "у", "ю", "ы"];

function preserveCase(source: string, ending: string) {
  return source === source.toUpperCase() ? ending.toUpperCase() : ending;
}

function replaceEnding(name: string, length: number, ending: string) {
  const sourceEnding = name.slice(-length);
  return `${name.slice(0, -length)}${preserveCase(sourceEnding, ending)}`;
}

/**
 * A deliberately small nickname declension helper for CTA copy.
 * Reviewed editorial forms always take precedence; this covers common
 * one-word Russian pet names received from Bitrix.
 */
export function petNameGenitive(name: string, sex: PetSex): string {
  const trimmed = name.trim();
  if (!trimmed || !/^[А-ЯЁа-яё-]+$/.test(trimmed)) return trimmed || name;

  const parts = trimmed.split("-");
  const last = parts.at(-1) ?? trimmed;
  const lower = last.toLocaleLowerCase("ru-RU");
  let declined = last;

  if (lower.endsWith("ия")) declined = replaceEnding(last, 2, "ии");
  else if (lower.endsWith("ая")) declined = replaceEnding(last, 2, "ой");
  else if (lower.endsWith("яя")) declined = replaceEnding(last, 2, "ей");
  else if (sex === "male" && (lower.endsWith("ый") || lower.endsWith("ой"))) {
    declined = replaceEnding(last, 2, "ого");
  } else if (sex === "male" && lower.endsWith("ий")) declined = replaceEnding(last, 2, "ия");
  else if (lower.endsWith("а")) {
    const previous = lower.at(-2) ?? "";
    declined = replaceEnding(last, 1, "гкхжчшщ".includes(previous) ? "и" : "ы");
  } else if (lower.endsWith("я")) declined = replaceEnding(last, 1, "и");
  else if (lower.endsWith("й")) declined = replaceEnding(last, 1, "я");
  else if (lower.endsWith("ь")) declined = replaceEnding(last, 1, sex === "female" ? "и" : "я");
  else if (sex === "male" && !indeclinableEndings.some((ending) => lower.endsWith(ending))) {
    declined = `${last}${preserveCase(last.slice(-1), "а")}`;
  }

  parts[parts.length - 1] = declined;
  return parts.join("-");
}
