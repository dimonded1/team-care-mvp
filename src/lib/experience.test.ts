import { describe, expect, it } from "vitest";
import { animals } from "../data/animals";
import { fourPawsStations } from "../data/eventStations";
import { getMissions } from "../data/missions";
import {
  getContactCampaignForExperience,
  getMissionsForExperience,
  isMissionUnlocked,
  reconcileRestoredMissionAccess,
  reconcileSessionExperience,
  resolveExperienceMode,
} from "./experience";
import type { StoredSession } from "../types/app";

const baseSession: StoredSession = {
  version: 3,
  experienceMode: "standard",
  stage: "final",
  answers: Array(11).fill(true),
  animalId: "bitrix-test-animal",
  activeMissionId: null,
  startedMissionIds: ["trust", "food", "home", "health"],
  completedMissionIds: ["trust", "food", "home", "health"],
  missionProgress: { home: { position: { x: 2, y: 1 } } },
  updatedAt: "2026-08-17T00:00:00.000Z",
};

describe("experience mode", () => {
  it("opens the standard game from both four-paws campaign links", () => {
    expect(resolveExperienceMode("?e=4-lapy")).toBe("standard");
    expect(resolveExperienceMode("?utm_campaign=4-LAPY")).toBe("standard");
    expect(resolveExperienceMode("?e=other")).toBe("standard");
    expect(resolveExperienceMode("")).toBe("standard");
  });

  it("keeps the standard orbit nonlinear and makes the event route sequential", () => {
    const standardMissions = getMissions(animals[0]);
    const eventMissions = getMissionsForExperience(standardMissions, "four-paws-event");
    expect(eventMissions.map((mission) => mission.id)).toEqual(["trust", "home", "food", "health"]);
    expect(isMissionUnlocked(standardMissions, [], "health", "standard")).toBe(true);
    expect(isMissionUnlocked(eventMissions, [], "trust", "four-paws-event")).toBe(true);
    expect(isMissionUnlocked(eventMissions, [], "home", "four-paws-event")).toBe(false);
    expect(isMissionUnlocked(eventMissions, ["trust"], "home", "four-paws-event")).toBe(true);
    expect(isMissionUnlocked(eventMissions, ["trust", "home"], "food", "four-paws-event")).toBe(true);
    expect(isMissionUnlocked(eventMissions, ["trust", "home", "food"], "health", "four-paws-event")).toBe(true);
  });

  it("matches the numbered station names and modes printed on the event banners", () => {
    expect(fourPawsStations.map(({ number, title, mode }) => ({ number, title, mode }))).toEqual([
      { number: 1, title: "Планета доверия", mode: "offline" },
      { number: 2, title: "Планета жизни", mode: "online" },
      { number: 3, title: "Планета домой", mode: "offline" },
      { number: 4, title: "Планета здоровья", mode: "online" },
    ]);
  });

  it("resets only journey progress when switching experience modes", () => {
    expect(reconcileSessionExperience(baseSession, "four-paws-event", 11)).toMatchObject({
      experienceMode: "four-paws-event",
      stage: "passport",
      animalId: "bitrix-test-animal",
      startedMissionIds: [],
      completedMissionIds: [],
      missionProgress: {},
    });
  });

  it("restores an old event session into the standard game without treating offline stamps as completed games", () => {
    expect(reconcileSessionExperience(
      { ...baseSession, experienceMode: "four-paws-event" },
      resolveExperienceMode("?e=4-lapy"),
      11,
    )).toMatchObject({
      experienceMode: "standard",
      stage: "passport",
      animalId: "bitrix-test-animal",
      startedMissionIds: [],
      completedMissionIds: [],
      missionProgress: {},
    });
  });

  it("does not restore a locked event station from storage or browser history", () => {
    const eventMissions = getMissionsForExperience(getMissions(animals[0]), "four-paws-event");
    const lockedHealthSession: StoredSession = {
      ...baseSession,
      experienceMode: "four-paws-event",
      stage: "journey",
      activeMissionId: "health",
      startedMissionIds: ["health"],
      completedMissionIds: [],
    };

    expect(reconcileRestoredMissionAccess(
      lockedHealthSession,
      eventMissions,
      "four-paws-event",
    )).toMatchObject({
      stage: "passport",
      activeMissionId: null,
    });

    expect(reconcileRestoredMissionAccess(
      { ...lockedHealthSession, activeMissionId: "home", completedMissionIds: ["trust"] },
      eventMissions,
      "four-paws-event",
    )).toMatchObject({
      stage: "journey",
      activeMissionId: "home",
    });
  });

  it("derives the form campaign from the current experience instead of stale storage", () => {
    expect(getContactCampaignForExperience("four-paws-event", "")).toBe("4-lapy");
    expect(getContactCampaignForExperience("standard", "?e=4-lapy")).toBe("4-lapy");
    expect(getContactCampaignForExperience("standard", "")).toBeUndefined();
    expect(getContactCampaignForExperience("standard", "?utm_campaign=zabeg")).toBe("zabeg");
  });
});
