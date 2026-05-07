import { describe, it, expect } from "vitest";

type ServiceType = "1-to-1 Private" | "Semi-Private (2-4)" | "Team Sessions";

interface FormData {
  athleteType: "youth" | "adult" | "";
  athleteName: string;
  email: string;
  phone: string;
  parentName: string;
  teamName: string;
}

function validateEnquiryForm(serviceType: ServiceType, form: FormData): string | null {
  if (serviceType !== "Team Sessions" && !form.athleteType) {
    return "Please select Youth or Adult athlete.";
  }
  if (!form.athleteName || !form.email || !form.phone) {
    return "Please fill in all required fields.";
  }
  if (form.athleteType === "youth" && !form.parentName) {
    return "Parent/Guardian name is required for youth athletes.";
  }
  if (serviceType === "Team Sessions" && !form.teamName) {
    return "Please enter your team name.";
  }
  return null;
}

describe("Enquiry Form Validation", () => {
  const validForm: FormData = {
    athleteType: "adult",
    athleteName: "John Doe",
    email: "john@example.com",
    phone: "7911123456",
    parentName: "",
    teamName: "",
  };

  describe("1-to-1 Private", () => {
    it("requires athlete type", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, athleteType: "" })).toContain("athlete");
    });

    it("requires athlete name", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, athleteName: "" })).toContain("required fields");
    });

    it("requires email", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, email: "" })).toContain("required fields");
    });

    it("requires phone", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, phone: "" })).toContain("required fields");
    });

    it("requires parent name for youth", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, athleteType: "youth", parentName: "" })).toContain("Parent/Guardian");
    });

    it("accepts valid adult form", () => {
      expect(validateEnquiryForm("1-to-1 Private", validForm)).toBeNull();
    });

    it("accepts valid youth form with parent", () => {
      expect(validateEnquiryForm("1-to-1 Private", { ...validForm, athleteType: "youth", parentName: "Jane" })).toBeNull();
    });
  });

  describe("Team Sessions", () => {
    it("does not require athlete type", () => {
      expect(validateEnquiryForm("Team Sessions", { ...validForm, athleteType: "", teamName: "Team A" })).toBeNull();
    });

    it("requires team name", () => {
      expect(validateEnquiryForm("Team Sessions", { ...validForm, athleteType: "", teamName: "" })).toContain("team name");
    });

    it("accepts valid team form", () => {
      expect(validateEnquiryForm("Team Sessions", { ...validForm, teamName: "Team A" })).toBeNull();
    });
  });
});
