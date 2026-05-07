import { describe, it, expect } from "vitest";

const COUNTRY_CODES = [
  { code: "+44", country: "UK", length: 10 },
  { code: "+1", country: "US", length: 10 },
  { code: "+353", country: "IE", length: 9 },
  { code: "+61", country: "AU", length: 9 },
];

function validateStep3(data: {
  performanceGoals: string;
  equipmentAccess: string;
  otherEquipment: string;
  phone: string;
  countryCode: string;
  preferredTrainingDays: string[];
}) {
  if (!data.performanceGoals.trim()) return "Please enter your performance goals";
  if (data.equipmentAccess === "other" && !data.otherEquipment.trim()) return "Please specify your equipment access";

  const cleanPhone = data.phone.replace(/\s+/g, "").replace(/^0/, "");
  if (!cleanPhone) return "Please enter your phone number";

  const country = COUNTRY_CODES.find((c) => c.code === data.countryCode);
  if (country && cleanPhone.length !== country.length) {
    return `Phone number must be ${country.length} digits for ${country.country}`;
  }

  if (data.preferredTrainingDays.length === 0) return "Please select at least one training day";

  return null;
}

describe("Onboarding Step 3 - Training & Goals", () => {
  const validData = {
    performanceGoals: "Improve speed",
    equipmentAccess: "full",
    otherEquipment: "",
    phone: "7911123456",
    countryCode: "+44",
    preferredTrainingDays: ["mon", "wed", "fri"],
  };

  it("accepts valid data", () => {
    expect(validateStep3(validData)).toBeNull();
  });

  it("rejects empty performance goals", () => {
    expect(validateStep3({ ...validData, performanceGoals: "" })).toContain("performance goals");
  });

  it("rejects whitespace-only goals", () => {
    expect(validateStep3({ ...validData, performanceGoals: "   " })).toContain("performance goals");
  });

  it("rejects other equipment without description", () => {
    expect(validateStep3({ ...validData, equipmentAccess: "other", otherEquipment: "" })).toContain("equipment access");
  });

  it("accepts other equipment with description", () => {
    expect(validateStep3({ ...validData, equipmentAccess: "other", otherEquipment: "Resistance bands" })).toBeNull();
  });

  it("rejects empty phone", () => {
    expect(validateStep3({ ...validData, phone: "" })).toContain("phone number");
  });

  it("rejects wrong phone length for UK", () => {
    expect(validateStep3({ ...validData, phone: "12345", countryCode: "+44" })).toContain("10 digits");
  });

  it("strips leading zero from phone", () => {
    expect(validateStep3({ ...validData, phone: "07911123456", countryCode: "+44" })).toBeNull();
  });

  it("rejects no training days selected", () => {
    expect(validateStep3({ ...validData, preferredTrainingDays: [] })).toContain("training day");
  });

  it("validates Irish phone length", () => {
    expect(validateStep3({ ...validData, phone: "123456789", countryCode: "+353" })).toBeNull();
    expect(validateStep3({ ...validData, phone: "12345", countryCode: "+353" })).toContain("9 digits");
  });
});
