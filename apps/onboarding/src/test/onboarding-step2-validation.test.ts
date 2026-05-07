import { describe, it, expect } from "vitest";
import { differenceInYears } from "date-fns";

function validateYouthAge(birthDate: Date): string | null {
  const age = differenceInYears(new Date(), birthDate);
  if (age < 7 || age > 18) {
    return "Youth athletes must be between 7 and 18 years old.";
  }
  return null;
}

function validateYouthForm(data: { guardianName: string; athleteName: string; birthDate: Date | null }) {
  if (!data.guardianName) return "Please fill in all fields";
  if (!data.athleteName) return "Please fill in all fields";
  if (!data.birthDate) return "Please fill in all fields";
  const ageErr = validateYouthAge(data.birthDate);
  if (ageErr) return ageErr;
  return null;
}

function validateAdultForm(data: { name: string; birthDate: Date | null }) {
  if (!data.name) return "Please fill in all fields";
  if (!data.birthDate) return "Please fill in all fields";
  return null;
}

function validateTeamForm(data: {
  teamName: string;
  teamType: "youth" | "adult";
  minAge: string;
  maxAge: string;
  maxAthletes: string;
}) {
  if (!data.teamName || !data.maxAthletes) return "Please fill in all fields";
  if (data.teamType === "youth") {
    if (!data.minAge || !data.maxAge) return "Please fill in the age range for your youth team";
    if (Number(data.minAge) > Number(data.maxAge)) return "Min age cannot be greater than Max age";
  }
  return null;
}

describe("Onboarding Step 2 - Basic Information", () => {
  describe("Youth athlete validation", () => {
    it("rejects missing guardian name", () => {
      expect(validateYouthForm({ guardianName: "", athleteName: "John", birthDate: new Date(2012, 0, 1) })).toBe("Please fill in all fields");
    });

    it("rejects missing athlete name", () => {
      expect(validateYouthForm({ guardianName: "Jane", athleteName: "", birthDate: new Date(2012, 0, 1) })).toBe("Please fill in all fields");
    });

    it("rejects missing birth date", () => {
      expect(validateYouthForm({ guardianName: "Jane", athleteName: "John", birthDate: null })).toBe("Please fill in all fields");
    });

    it("rejects age under 7", () => {
      const tooYoung = new Date();
      tooYoung.setFullYear(tooYoung.getFullYear() - 5);
      expect(validateYouthForm({ guardianName: "Jane", athleteName: "John", birthDate: tooYoung })).toContain("7 and 18");
    });

    it("rejects age over 18", () => {
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 20);
      expect(validateYouthForm({ guardianName: "Jane", athleteName: "John", birthDate: tooOld })).toContain("7 and 18");
    });

    it("accepts valid youth data", () => {
      const valid = new Date();
      valid.setFullYear(valid.getFullYear() - 14);
      expect(validateYouthForm({ guardianName: "Jane", athleteName: "John", birthDate: valid })).toBeNull();
    });
  });

  describe("Adult athlete validation", () => {
    it("rejects missing name", () => {
      expect(validateAdultForm({ name: "", birthDate: new Date(1990, 0, 1) })).toBe("Please fill in all fields");
    });

    it("rejects missing birth date", () => {
      expect(validateAdultForm({ name: "John", birthDate: null })).toBe("Please fill in all fields");
    });

    it("accepts valid adult data", () => {
      expect(validateAdultForm({ name: "John", birthDate: new Date(1990, 0, 1) })).toBeNull();
    });
  });

  describe("Team validation", () => {
    it("rejects missing team name", () => {
      expect(validateTeamForm({ teamName: "", teamType: "youth", minAge: "12", maxAge: "16", maxAthletes: "25" })).toBe("Please fill in all fields");
    });

    it("rejects missing max athletes", () => {
      expect(validateTeamForm({ teamName: "Team A", teamType: "youth", minAge: "12", maxAge: "16", maxAthletes: "" })).toBe("Please fill in all fields");
    });

    it("rejects missing age range for youth teams", () => {
      expect(validateTeamForm({ teamName: "Team A", teamType: "youth", minAge: "", maxAge: "16", maxAthletes: "25" })).toContain("age range");
    });

    it("rejects min age > max age", () => {
      expect(validateTeamForm({ teamName: "Team A", teamType: "youth", minAge: "18", maxAge: "12", maxAthletes: "25" })).toContain("Min age cannot be greater");
    });

    it("accepts valid youth team", () => {
      expect(validateTeamForm({ teamName: "Team A", teamType: "youth", minAge: "12", maxAge: "16", maxAthletes: "25" })).toBeNull();
    });

    it("accepts adult team without age range", () => {
      expect(validateTeamForm({ teamName: "Team A", teamType: "adult", minAge: "", maxAge: "", maxAthletes: "20" })).toBeNull();
    });
  });
});
