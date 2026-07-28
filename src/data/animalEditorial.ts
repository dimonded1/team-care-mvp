import profiles from "./animalEditorial.json";
import type { MatchProfile } from "../types/app";

export interface AnimalEditorialProfile {
  nameGenitive: string;
  shortDescription: string;
  traits: string[];
  careTags: string[];
  matchProfile: MatchProfile;
}

/**
 * Reviewed matching content keyed by the stable Bitrix animal ID.
 *
 * The JSON source is also read by the server-side synchronization script. A
 * Bitrix animal enters the matching pool only after this explicit profile is
 * present; inconsistent CRM prose is never converted into scores at runtime.
 */
export const animalEditorialBySourceId =
  profiles as Record<string, AnimalEditorialProfile>;
