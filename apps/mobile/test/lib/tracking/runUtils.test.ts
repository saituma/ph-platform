import {
  formatDistanceKm,
  formatDurationClock,
  formatHoursMinutes,
  calculatePaceAndSpeed,
  estimateCalories,
  estimateCaloriesAdvanced,
  getPaceZone,
  estimateVO2Max,
  calculateEfficiencyScore,
} from "@/lib/tracking/runUtils";

describe("formatDistanceKm", () => {
  it("converts meters to km", () => {
    expect(formatDistanceKm(5000)).toBe("5.00");
    expect(formatDistanceKm(1500, 1)).toBe("1.5");
  });

  it("returns 0 for non-positive", () => {
    expect(formatDistanceKm(0)).toBe("0.00");
    expect(formatDistanceKm(-100)).toBe("0.00");
  });
});

describe("formatDurationClock", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDurationClock(65)).toBe("01:05");
    expect(formatDurationClock(3661)).toBe("1:01:01");
  });

  it("handles zero", () => {
    expect(formatDurationClock(0)).toBe("00:00");
  });
});

describe("formatHoursMinutes", () => {
  it("returns hours and minutes", () => {
    expect(formatHoursMinutes(3661)).toEqual({ h: "1", m: "1" });
  });
});

describe("calculatePaceAndSpeed", () => {
  it("calculates pace and speed for 5km in 25 min", () => {
    const result = calculatePaceAndSpeed(5000, 1500);
    expect(result.paceMinPerKm).toBe("5:00");
    expect(result.speedKmH).toBe("12.0");
  });

  it("returns zeros for invalid inputs", () => {
    const result = calculatePaceAndSpeed(0, 0);
    expect(result.paceMinPerKm).toBe("0:00");
    expect(result.speedKmH).toBe("0.0");
  });
});

describe("estimateCalories", () => {
  it("estimates ~60 cal per km", () => {
    expect(estimateCalories(5000)).toBe(300);
  });

  it("returns 0 for invalid distance", () => {
    expect(estimateCalories(0)).toBe(0);
    expect(estimateCalories(-100)).toBe(0);
  });
});

describe("estimateCaloriesAdvanced", () => {
  it("returns positive calories for valid input", () => {
    expect(estimateCaloriesAdvanced(5000, 1500, 70)).toBeGreaterThan(0);
  });

  it("returns 0 for invalid inputs", () => {
    expect(estimateCaloriesAdvanced(0, 0)).toBe(0);
  });
});

describe("getPaceZone", () => {
  it("returns zone 5 for fast pace", () => {
    expect(getPaceZone(3.5).zone).toBe(5);
  });

  it("returns zone 1 for slow pace", () => {
    expect(getPaceZone(9).zone).toBe(1);
  });

  it("returns zone 3 for moderate pace", () => {
    expect(getPaceZone(5.5).zone).toBe(3);
  });
});

describe("estimateVO2Max", () => {
  it("returns null for short runs", () => {
    expect(estimateVO2Max(100, 60)).toBeNull();
  });

  it("returns value for valid runs", () => {
    const result = estimateVO2Max(3000, 900);
    expect(result).toBeGreaterThan(20);
    expect(result).toBeLessThan(80);
  });
});

describe("calculateEfficiencyScore", () => {
  it("returns 100 for too few coordinates", () => {
    expect(calculateEfficiencyScore([])).toBe(100);
    expect(calculateEfficiencyScore([{ latitude: 0, longitude: 0, timestamp: 0 }])).toBe(100);
  });

  it("returns high score for consistent speeds", () => {
    const coords = Array.from({ length: 10 }, (_, i) => ({
      latitude: i * 0.001,
      longitude: 0,
      timestamp: i * 10000,
    }));
    const score = calculateEfficiencyScore(coords);
    expect(score).toBeGreaterThan(50);
  });
});
