import { 
  getAnnouncements, 
  replaceStories,
  getHomeContentForUser,
  matchesAgeRange,
  resolveAgeFromAthlete
} from "../../src/services/content.service";
import { db } from "../../src/db";

// Mock db
jest.mock("../../src/db", () => {
  const mockDb = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn((cb) => cb({ 
      delete: jest.fn().mockReturnThis(), 
      insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }) }) 
    })),
  };
  return { db: mockDb };
});

describe("content.service", () => {
  const mockSelect = db.select as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2023-05-01"));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockChain = (data: any) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve(data)),
  });

  describe("getAnnouncements filtering", () => {
    const mockAnnouncements = [
      { id: 1, surface: "announcements", category: "all", title: "All Users" },
      { id: 2, surface: "announcements", category: "target:team:Team A", title: "Team A Only" },
      { id: 3, surface: "announcements", category: "target:group:10", title: "Group 10 Only" },
      { id: 4, surface: "announcements", category: "age", minAge: 10, maxAge: 12, title: "Age 10-12" },
      { id: 5, surface: "announcements", category: "age", ageList: [15, 16], title: "Age 15 or 16" },
    ];

    test("TC-C001: returns all announcements for admin", async () => {
      mockSelect.mockReturnValue(createMockChain(mockAnnouncements));
      const result = await getAnnouncements(1, "admin");
      expect(result).toHaveLength(5);
    });

    test("TC-C002: filters by team for athlete", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain(mockAnnouncements);
        if (callCount === 2) return createMockChain([{ team: "Team A" }]); // athlete lookup
        return createMockChain([]); // groups
      });

      const result = await getAnnouncements(1, "athlete");
      expect(result.map(r => r.id)).toContain(1);
      expect(result.map(r => r.id)).toContain(2);
      expect(result.map(r => r.id)).not.toContain(3);
    });

    test("TC-C003: filters by age range", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain(mockAnnouncements);
        if (callCount === 2) return createMockChain([{ birthDate: "2012-01-01", athleteType: "youth" }]); 
        return createMockChain([]);
      });

      const result = await getAnnouncements(1, "athlete");
      expect(result.map(r => r.id)).toContain(4); 
      expect(result.map(r => r.id)).not.toContain(5);
    });

    test("TC-C004: filters by ageList", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain(mockAnnouncements);
        if (callCount === 2) return createMockChain([{ age: 15, athleteType: "youth" }]);
        return createMockChain([]);
      });

      const result = await getAnnouncements(1, "athlete");
      expect(result.map(r => r.id)).toContain(1);
      expect(result.map(r => r.id)).toContain(5);
    });
  });

  describe("replaceStories", () => {
    test("TC-C005: replaceStories deletes old and inserts new", async () => {
      const stories = [{ title: "S1", mediaUrl: "url1", mediaType: "image" as const }];
      const mockTx = {
        delete: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1, ...stories[0] }])
          })
        })
      };
      (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));

      const result = await replaceStories(stories, 1);
      expect(mockTx.delete).toHaveBeenCalled();
      expect(mockTx.insert).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("Home Content", () => {
    test("TC-C006: getHomeContentForUser filters by age", async () => {
       let callCount = 0;
       mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain([{ age: 10, athleteType: "youth" }]); 
        if (callCount === 2) return createMockChain([
          { id: 1, minAge: 10, maxAge: 12 },
          { id: 2, minAge: 13, maxAge: 15 }
        ]);
        return createMockChain([]);
      });

      const result = await getHomeContentForUser(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  test("TC-C007: matchesAgeRange handles null age correctly", () => {
     expect(matchesAgeRange({ minAge: 10 }, null)).toBe(true);
     expect(matchesAgeRange({ ageList: [10] }, null)).toBe(false);
  });

  test("TC-C008: matchesAgeRange handles minAge", () => {
     expect(matchesAgeRange({ minAge: 10 }, 9)).toBe(false);
     expect(matchesAgeRange({ minAge: 10 }, 10)).toBe(true);
  });

  test("TC-C009: matchesAgeRange handles maxAge", () => {
     expect(matchesAgeRange({ maxAge: 15 }, 16)).toBe(false);
     expect(matchesAgeRange({ maxAge: 15 }, 15)).toBe(true);
  });

  test("TC-C010: resolveAgeFromAthlete handles birthDate", () => {
     const now = new Date();
     const birthDate = new Date(now.getFullYear() - 15, now.getMonth(), now.getDate());
     const athlete = { birthDate: birthDate.toISOString().split('T')[0], athleteType: "youth" } as any;
     expect(resolveAgeFromAthlete(athlete)).toBe(15);
  });

  test("TC-C011: resolveAgeFromAthlete handles raw age", () => {
     const athlete = { age: 12, athleteType: "youth" } as any;
     expect(resolveAgeFromAthlete(athlete)).toBe(12);
  });

  test("TC-C012: resolveAgeFromAthlete clamps youth age", () => {
     const athlete = { age: 5, athleteType: "youth" } as any;
     expect(resolveAgeFromAthlete(athlete)).toBe(7); 
  });

  test("TC-C013: resolveAgeFromAthlete returns null for empty athlete", () => {
     expect(resolveAgeFromAthlete(null)).toBeNull();
  });

  test("TC-C014: replaceStories trims strings", async () => {
     const stories = [{ title: "  Trim Me  ", mediaUrl: " url ", mediaType: "image" as const }];
     const mockTx = {
        delete: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }) })
     };
     (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));
     await replaceStories(stories, 1);
     expect(mockTx.insert().values).toHaveBeenCalledWith([expect.objectContaining({ title: "Trim Me", mediaUrl: "url" })]);
  });

  test("TC-C015: replaceStories defaults isActive to true", async () => {
     const stories = [{ title: "S", mediaUrl: "U", mediaType: "image" as const }];
     const mockTx = {
        delete: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }) })
     };
     (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));
     await replaceStories(stories, 1);
     expect(mockTx.insert().values).toHaveBeenCalledWith([expect.objectContaining({ isActive: true })]);
  });

  test("TC-C016: getAnnouncements returns items even if userId missing", async () => {
      mockSelect.mockReturnValue(createMockChain([{ id: 1 }]));
      const result = await getAnnouncements(undefined, "user");
      expect(result).toHaveLength(1);
  });

  test("TC-C017: parseAnnouncementAudience handles invalid group ID by defaulting to all", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain([{ id: 1, category: "target:group:abc" }]);
        return createMockChain([]);
      });
      const res = await getAnnouncements(1, "athlete");
      expect(res).toHaveLength(1);
  });

  test("TC-C018: resolveAnnouncementAudienceContext handles guardian role chain", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain([]); // announcements
        if (callCount === 2) return createMockChain([]); // athletes (direct)
        if (callCount === 3) return createMockChain([{ id: 10 }]); // guardian
        if (callCount === 4) return createMockChain([{ team: "T" }]); // athletes (via guardian)
        return createMockChain([]); // groups
      });
      await getAnnouncements(1, "guardian");
      expect(db.select).toHaveBeenCalledTimes(5);
  });

  test("TC-C019: replaceStories handles empty stories array", async () => {
     const mockTx = { delete: jest.fn().mockReturnThis(), insert: jest.fn() };
     (db.transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));
     const result = await replaceStories([], 1);
     expect(mockTx.delete).toHaveBeenCalled();
     expect(mockTx.insert).not.toHaveBeenCalled();
     expect(result).toEqual([]);
  });

  test("TC-C020: getAnnouncements filters by team (negative case)", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createMockChain([{ id: 1, category: "target:team:Team B" }]);
        if (callCount === 2) return createMockChain([{ team: "Team A" }]);
        return createMockChain([]);
      });
      const result = await getAnnouncements(1, "athlete");
      expect(result).toHaveLength(0);
  });
});
