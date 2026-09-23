import { expect, it } from "vitest";
import { createDiagnosticBuffer } from "./journeyDiagnostics";
it("keeps only bounded allowlisted event codes and times, not contact data", () => {
  const buffer = createDiagnosticBuffer(2);
  buffer.record("contact.submit-start", 1);
  buffer.record("contact.submit-error", 2);
  buffer.record("contact.submit-success", 3);
  // Runtime callers must not introduce arbitrary text into the buffer.
  buffer.record("name@example.org" as never, 4);
  expect(buffer.read()).toEqual([{ code: "contact.submit-error", at: 2 }, { code: "contact.submit-success", at: 3 }]);
  buffer.read()[0].at = 100;
  expect(buffer.read()[0].at).toBe(2);
});
