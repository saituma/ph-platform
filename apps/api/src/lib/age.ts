export function parseISODate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

export function normalizeDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return parseISODate(value);
}

export function calculateAge(birthDate: Date, asOf = new Date()): number {
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  const currentYear = asOf.getUTCFullYear();
  const currentMonth = asOf.getUTCMonth();
  const currentDay = asOf.getUTCDate();

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }
  return age;
}

export const MIN_YOUTH_AGE = 7;

export function clampYouthAge(age: number | null | undefined, athleteType?: string | null): number | null {
  if (age === null || age === undefined || !Number.isFinite(age)) return null;
  const numericAge = Math.trunc(age);
  if ((athleteType ?? "youth") !== "youth") {
    return numericAge;
  }
  return Math.max(MIN_YOUTH_AGE, numericAge);
}

export function isBirthday(birthDate: Date, asOf = new Date()): boolean {
  return birthDate.getUTCMonth() === asOf.getUTCMonth() && birthDate.getUTCDate() === asOf.getUTCDate();
}
