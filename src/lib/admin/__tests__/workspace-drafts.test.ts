import { formatGroupedSaveStatus, isSameDraft, shouldGuardUnload } from "../workspace-drafts";

describe("admin workspace drafts", () => {
  test("detects unchanged and dirty drafts", () => {
    const initial = { name: "SolidCraft", goal: "" };
    expect(isSameDraft({ name: "SolidCraft", goal: "" }, initial)).toBe(true);
    expect(isSameDraft({ name: "SolidCraft", goal: "Ship CAD tools" }, initial)).toBe(false);
  });

  test("never reports a global success when any write failed", () => {
    expect(formatGroupedSaveStatus({
      savedNames: ["Alpha"],
      failed: [{ name: "Beta", error: "network" }],
    })).toBe("1 saved; 1 failed (Beta). Failed drafts remain available.");
    expect(formatGroupedSaveStatus({
      savedNames: [],
      failed: [{ name: "Beta", error: "network" }, { name: "Gamma", error: "invalid" }],
    })).toBe("Save all failed. Nothing was written. Failed: Beta, Gamma.");
    expect(formatGroupedSaveStatus({ savedNames: ["Alpha"], failed: [] })).toBe("Alpha saved.");
    expect(formatGroupedSaveStatus({ savedNames: ["Alpha", "Beta"], failed: [] })).toBe("2 drafts saved.");
  });

  test("guards leaving only when drafts would actually be abandoned", () => {
    expect(shouldGuardUnload(0)).toBe(false);
    expect(shouldGuardUnload(2)).toBe(true);
  });
});
