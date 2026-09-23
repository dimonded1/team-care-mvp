export const diagnosticCodes = ["walk.completed-time", "walk.completed-finish", "contact.config-unavailable", "contact.submit-start", "contact.submit-success", "contact.submit-error", "card.generate-error"] as const;
type DiagnosticCode = typeof diagnosticCodes[number];
export function createDiagnosticBuffer(limit = 30) {
  const entries: { code: DiagnosticCode; at: number }[] = [];
  return {
    record(code: DiagnosticCode, at = Date.now()) {
      if (!diagnosticCodes.includes(code)) return;
      entries.push({ code, at });
      entries.splice(0, Math.max(0, entries.length - limit));
    },
    read: () => entries.map((entry) => ({ ...entry })),
  };
}
const buffer = createDiagnosticBuffer();
/** Explicit opt-in. No requests, storage, user/animal IDs, payloads, or error text. */
export function recordJourneyDiagnostic(code: DiagnosticCode) {
  if (!diagnosticCodes.includes(code) || typeof window === "undefined" || new URLSearchParams(window.location.search).get("diagnostics") !== "1") return;
  buffer.record(code);
  console.info("[team-care diagnostic]", code);
}
export const getJourneyDiagnostics = buffer.read;
