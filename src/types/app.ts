export type MatchAxis =
  | "energy"
  | "sociability"
  | "initiative"
  | "patience"
  | "routine"
  | "spaceRespect"
  | "challenge";

export type MatchProfile = Record<MatchAxis, number>;

export interface Animal {
  id: string;
  name: string;
  species: "cat" | "dog";
  sex: string;
  age: string;
  photo: string;
  shortDescription: string;
  story: string;
  traits: string[];
  careTags: string[];
  matchProfile: MatchProfile;
  profileUrl: string;
}

export interface Question {
  id: string;
  text: string;
  yes: Partial<MatchProfile>;
  no: Partial<MatchProfile>;
}

export interface MatchResult {
  animal: Animal;
  score: number;
  reasons: string[];
  userProfile: MatchProfile;
}

export interface MissionOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

export interface Mission {
  id: "food" | "health" | "trust" | "home";
  title: string;
  shortTitle: string;
  prompt: string;
  options: MissionOption[];
  impactLabel: string;
}

export type Stage =
  | "boot"
  | "welcome"
  | "quiz"
  | "reveal"
  | "passport"
  | "journey"
  | "guardianship"
  | "final";

export interface StoredSession {
  version: 2;
  stage: Exclude<Stage, "boot" | "reveal">;
  answers: boolean[];
  animalId: string | null;
  activeMissionId: Mission["id"] | null;
  startedMissionIds: Mission["id"][];
  completedMissionIds: Mission["id"][];
  updatedAt: string;
}
