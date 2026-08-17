import { describe, expect, it } from "vitest";
import {
  createOfflineStationProgress,
  restoreOfflineStationProgress,
  verifyOfflineStation,
} from "./offlineStation";

describe("offline event station", () => {
  it("restores only a complete volunteer verification", () => {
    expect(restoreOfflineStationProgress(null)).toEqual(createOfflineStationProgress());
    expect(restoreOfflineStationProgress({ status: "verified" })).toEqual(createOfflineStationProgress());
    expect(restoreOfflineStationProgress({
      status: "verified",
      verifiedAt: "2026-08-17T12:00:00.000Z",
    })).toEqual({
      status: "verified",
      verifiedAt: "2026-08-17T12:00:00.000Z",
    });
  });

  it("makes a volunteer stamp idempotent", () => {
    const verified = verifyOfflineStation(
      createOfflineStationProgress(),
      "2026-08-17T12:00:00.000Z",
    );

    expect(verified.status).toBe("verified");
    expect(verifyOfflineStation(verified, "2026-08-17T13:00:00.000Z")).toBe(verified);
  });
});
