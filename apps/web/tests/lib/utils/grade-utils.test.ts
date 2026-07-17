import { describe, it, expect } from "vitest";
import {
  getGrade,
  calculateWeightedAverage,
  calculatePositionInClass,
  calculateClassAverage,
  hasPassed,
} from "@edunexus/shared";

describe("getGrade", () => {
  describe("Ghana Basic (ghana_basic)", () => {
    it("returns grade 1 for score 85", () => {
      const result = getGrade(85, "ghana_basic");
      expect(result).not.toBeNull();
      expect(result!.grade).toBe(1);
      expect(result!.label).toBe("Excellent");
    });

    it("returns grade 1 at upper boundary (80-100)", () => {
      expect(getGrade(80, "ghana_basic")!.grade).toBe(1);
      expect(getGrade(100, "ghana_basic")!.grade).toBe(1);
    });

    it("returns grade 2 at boundary (70-79)", () => {
      expect(getGrade(79, "ghana_basic")!.grade).toBe(2);
      expect(getGrade(70, "ghana_basic")!.grade).toBe(2);
    });

    it("returns grade 3 at boundary (60-69)", () => {
      expect(getGrade(69, "ghana_basic")!.grade).toBe(3);
      expect(getGrade(60, "ghana_basic")!.grade).toBe(3);
    });

    it("returns grade 4 at boundary (50-59)", () => {
      expect(getGrade(59, "ghana_basic")!.grade).toBe(4);
      expect(getGrade(50, "ghana_basic")!.grade).toBe(4);
    });

    it("returns grade 5 at boundary (40-49)", () => {
      expect(getGrade(49, "ghana_basic")!.grade).toBe(5);
      expect(getGrade(40, "ghana_basic")!.grade).toBe(5);
    });

    it("returns grade 6 for failing scores (0-39)", () => {
      expect(getGrade(39, "ghana_basic")!.grade).toBe(6);
      expect(getGrade(0, "ghana_basic")!.grade).toBe(6);
    });

    it("returns remarkable for each grade", () => {
      const grade1 = getGrade(85, "ghana_basic")!;
      expect(grade1.remark).toBe("Excellent");

      const grade6 = getGrade(20, "ghana_basic")!;
      expect(grade6.remark).toBe("Fail");
    });
  });

  describe("Ghana WASSCE (ghana_wasce)", () => {
    it("returns A1 for high scores", () => {
      const result = getGrade(85, "ghana_wasce");
      expect(result).not.toBeNull();
      expect(result!.grade).toBe("A1");
      expect(result!.points).toBe(1);
    });

    it("returns F9 for failing scores", () => {
      const result = getGrade(20, "ghana_wasce");
      expect(result!.grade).toBe("F9");
      expect(result!.points).toBe(9);
    });
  });

  describe("British GCSE (british_gcse)", () => {
    it("returns A* for scores 90+", () => {
      const result = getGrade(95, "british_gcse");
      expect(result!.grade).toBe("A*");
    });

    it("returns G for lowest band", () => {
      const result = getGrade(10, "british_gcse");
      expect(result!.grade).toBe("G");
    });
  });

  describe("American GPA (american_gpa)", () => {
    it("returns A with 4.0 points for 93+", () => {
      const result = getGrade(95, "american_gpa");
      expect(result!.grade).toBe("A");
      expect(result!.points).toBe(4.0);
    });

    it("returns F with 0.0 points for failing", () => {
      const result = getGrade(50, "american_gpa");
      expect(result!.grade).toBe("F");
      expect(result!.points).toBe(0.0);
    });
  });

  it("returns null for unknown grading system", () => {
    const result = getGrade(85, "unknown" as any);
    expect(result).toBeNull();
  });
});

describe("calculateWeightedAverage", () => {
  it("calculates weighted average correctly", () => {
    const scores = [
      { score: 80, weight: 10 },
      { score: 90, weight: 20 },
    ];
    const result = calculateWeightedAverage(scores);
    expect(result).toBe(86.67);
  });

  it("returns 0 for empty array", () => {
    expect(calculateWeightedAverage([])).toBe(0);
  });

  it("returns 0 for zero total weight", () => {
    const scores = [{ score: 80, weight: 0 }];
    expect(calculateWeightedAverage(scores)).toBe(0);
  });
});

describe("calculatePositionInClass", () => {
  it("returns 1 for the highest score (desc order)", () => {
    const position = calculatePositionInClass(95, [50, 60, 70, 95, 80]);
    expect(position).toBe(1);
  });

  it("returns correct position for middle score", () => {
    const position = calculatePositionInClass(70, [50, 60, 70, 95, 80]);
    expect(position).toBe(3);
  });

  it("returns last for lowest score", () => {
    const position = calculatePositionInClass(50, [50, 60, 70, 95, 80]);
    expect(position).toBe(5);
  });

  it("handles asc order", () => {
    const position = calculatePositionInClass(95, [50, 60, 70, 95, 80], "asc");
    expect(position).toBe(5);
  });
});

describe("calculateClassAverage", () => {
  it("calculates average correctly", () => {
    expect(calculateClassAverage([60, 70, 80, 90])).toBe(75);
  });

  it("returns 0 for empty array", () => {
    expect(calculateClassAverage([])).toBe(0);
  });
});

describe("hasPassed", () => {
  describe("Ghana Basic", () => {
    it("returns true for score 50 (grade 4 = pass)", () => {
      expect(hasPassed(50, "ghana_basic")).toBe(true);
    });

    it("returns false for score 39 (grade 6 = fail)", () => {
      expect(hasPassed(39, "ghana_basic")).toBe(false);
    });
  });

  describe("Ghana WASSCE", () => {
    it("returns true for credit grade", () => {
      expect(hasPassed(60, "ghana_wasce")).toBe(true);
    });

    it("returns false for F9", () => {
      expect(hasPassed(20, "ghana_wasce")).toBe(false);
    });
  });

  it("uses custom pass score when provided", () => {
    expect(hasPassed(60, "ghana_basic", 50)).toBe(true);
    expect(hasPassed(40, "ghana_basic", 50)).toBe(false);
  });
});
