export interface OfflineStationProgress {
  status: "waiting" | "verified";
  verifiedAt: string | null;
}

export function createOfflineStationProgress(): OfflineStationProgress {
  return { status: "waiting", verifiedAt: null };
}

export function restoreOfflineStationProgress(value: unknown): OfflineStationProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createOfflineStationProgress();
  }
  const candidate = value as Partial<OfflineStationProgress>;
  if (candidate.status !== "verified" || typeof candidate.verifiedAt !== "string") {
    return createOfflineStationProgress();
  }
  return { status: "verified", verifiedAt: candidate.verifiedAt };
}

export function verifyOfflineStation(
  progress: OfflineStationProgress,
  verifiedAt = new Date().toISOString(),
): OfflineStationProgress {
  if (progress.status === "verified") return progress;
  return { status: "verified", verifiedAt };
}
