import { submitOnboarding } from "../../src/services/onboarding.service";
import { db } from "../../src/db";
import * as billingService from "../../src/services/billing.service";
import * as userService from "../../src/services/user.service";

// Mock the db
jest.mock("../../src/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock billing service
jest.mock("../../src/services/billing.service", () => ({
  getActiveSubscriptionPlanByTier: jest.fn(),
  isSubscriptionPlanFree: jest.fn(),
}));

// Mock user service
jest.mock("../../src/services/user.service", () => ({
  getUserById: jest.fn(),
  getGuardianAndAthlete: jest.fn(),
  listGuardianAthletes: jest.fn(),
  setActiveAthleteForGuardian: jest.fn(),
}));

// Mock push service
jest.mock("../../src/services/push.service", () => ({
  sendPushNotification: jest.fn(),
}));

describe("onboarding.service - submitOnboarding", () => {
  const mockNow = new Date("2023-01-01T00:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(mockNow);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseInput = {
    userId: 1,
    athleteName: "Test Athlete",
    birthDate: "2010-01-01",
    team: "Team A",
    trainingPerWeek: 3,
    parentEmail: "parent@example.com",
    termsVersion: "1.0",
    privacyVersion: "1.0",
    appVersion: "1.0.0",
  };

  test("throws error if no age or birthDate is provided", async () => {
    const input = { ...baseInput, birthDate: null, age: null };
    await expect(submitOnboarding(input)).rejects.toThrow("Birth date is required.");
  });

  test("successfully creates new guardian and athlete when none exist", async () => {
    // 1. Mock getActiveSubscriptionPlanByTier
    (billingService.getActiveSubscriptionPlanByTier as jest.Mock).mockResolvedValue({ id: 1, tier: "PHP" });
    (billingService.isSubscriptionPlanFree as jest.Mock).mockReturnValue(true);

    // 2. Mock db.select for guardian (not found)
    const mockSelect = db.select as jest.Mock;
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValueOnce([]), // guardian lookup
        }),
      }),
    });

    // 3. Mock db.insert for guardian
    const mockInsert = db.insert as jest.Mock;
    mockInsert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ id: 10 }]) // guardian insert
          .mockResolvedValueOnce([{ id: 20, userId: 1, name: "Test Athlete" }]), // athlete insert
      }),
    });

    // 4. Mock db.update for guardian (activeAthleteId) and db.select for user lookup in ensureAthleteUserRecord
    const mockUpdate = db.update as jest.Mock;
    mockUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 10 }]),
      }),
    });

    // ensureAthleteUserRecord calls db.select for user
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockResolvedValueOnce([]) // initial guardian select
            .mockResolvedValueOnce([{ id: 1, role: "athlete" }]) // user select in ensureAthleteUserRecord
            .mockResolvedValueOnce([]), // enrollment select
        }),
      }),
    });

    // db.insert for legalAcceptance and enrollment
    mockInsert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ id: 10 }]) // guardian insert
          .mockResolvedValueOnce([{ id: 20, userId: 1, name: "Test Athlete" }]) // athlete insert
          .mockResolvedValueOnce([]) // legalAcceptance insert
          .mockResolvedValueOnce([]), // enrollment insert
      }),
    });

    const result = await submitOnboarding(baseInput);

    expect(result).toEqual({
      athleteId: 20,
      athleteUserId: 1,
      status: "active",
    });

    expect(db.insert).toHaveBeenCalledTimes(4); // guardian, athlete, legal, enrollment
  });

  test("successfully updates existing athlete", async () => {
    const input = { ...baseInput, athleteId: 20 };

    // 1. Mock billing
    (billingService.getActiveSubscriptionPlanByTier as jest.Mock).mockResolvedValue({ id: 1, tier: "PHP" });
    (billingService.isSubscriptionPlanFree as jest.Mock).mockReturnValue(true);

    const mockSelect = db.select as jest.Mock;
    const mockUpdate = db.update as jest.Mock;

    // 2. Mock selects: guardian, existing athlete, user, enrollment
    mockSelect.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockResolvedValueOnce([{ id: 10 }]) // guardian lookup
            .mockResolvedValueOnce([{ id: 20, guardianId: 10, userId: 1 }]) // existing athlete lookup
            .mockResolvedValueOnce([{ id: 1, role: "athlete" }]) // user select in ensureAthleteUserRecord
            .mockResolvedValueOnce([{ id: 100 }]), // enrollment select (existing)
        }),
      }),
    });

    // 3. Mock updates
    mockUpdate.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 20, userId: 1 }]), // athlete update returning
        }),
      }),
    });

    // 4. Mock insert for legalAcceptance (enrollment is skipped if exists)
    const mockInsert = db.insert as jest.Mock;
    mockInsert.mockReturnValue({
      values: jest.fn().mockResolvedValue([]),
    });

    const result = await submitOnboarding(input);

    expect(result).toEqual({
      athleteId: 20,
      athleteUserId: 1,
      status: "active",
    });

    expect(db.update).toHaveBeenCalledTimes(3); // guardian (email/phone), athlete (onboarding info), guardian (activeAthleteId)
    expect(db.insert).toHaveBeenCalledTimes(1); // legalAcceptance
  });
});
