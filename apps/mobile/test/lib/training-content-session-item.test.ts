import { buildSessionItemMetadata, emptySessionExerciseForm } from "@/lib/training-content-session-item";

describe("buildSessionItemMetadata", () => {
  const empty = {
    sets: "", reps: "", duration: "", restSeconds: "",
    steps: "", cues: "", progression: "", regression: "",
    category: "", equipment: "",
  };

  it("returns null for all-empty fields", () => {
    expect(buildSessionItemMetadata(empty)).toBeNull();
  });

  it("builds metadata from numeric fields", () => {
    const result = buildSessionItemMetadata({ ...empty, sets: "3", reps: "10" });
    expect(result).toEqual({ sets: 3, reps: 10 });
  });

  it("builds metadata from string fields", () => {
    const result = buildSessionItemMetadata({ ...empty, cues: "Keep back straight", category: "strength" });
    expect(result).toEqual({ cues: "Keep back straight", category: "strength" });
  });

  it("ignores whitespace-only fields", () => {
    const result = buildSessionItemMetadata({ ...empty, sets: "  ", reps: "5" });
    expect(result).toEqual({ reps: 5 });
  });
});

describe("emptySessionExerciseForm", () => {
  it("returns form with default values", () => {
    const form = emptySessionExerciseForm();
    expect(form.id).toBeNull();
    expect(form.blockType).toBe("main");
    expect(form.title).toBe("");
    expect(form.sets).toBe("");
  });
});
