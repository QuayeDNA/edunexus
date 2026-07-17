import type { GradingSystem } from "../types/common";
import { GRADE_SYSTEMS } from "../constants/grades";

export interface ScoreEntry {
  score: number;
  weight: number;
}

export function getGrade(
  score: number,
  system: GradingSystem,
): {
  grade: string | number;
  label: string;
  points?: number;
  remark?: string;
} | null {
  const grades = GRADE_SYSTEMS[system];
  if (!grades) return null;

  for (const entry of grades) {
    if (score >= entry.min && score <= entry.max) {
      return {
        grade: entry.grade,
        label: entry.label,
        points: "points" in entry ? (entry.points as number) : undefined,
        remark: "remark" in entry ? (entry.remark as string) : undefined,
      };
    }
  }
  return null;
}

export function calculateWeightedAverage(scores: ScoreEntry[]): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce(
    (sum, entry) => sum + entry.score * entry.weight,
    0,
  );
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function calculatePositionInClass(
  studentScore: number,
  allScores: number[],
  order: "asc" | "desc" = "desc",
): number {
  const sorted = [...allScores].sort((a, b) =>
    order === "desc" ? b - a : a - b,
  );
  const position = sorted.indexOf(studentScore) + 1;
  return position;
}

export function calculateClassAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

export function hasPassed(
  score: number,
  system: GradingSystem,
  passScore?: number,
): boolean {
  if (passScore !== undefined) return score >= passScore;

  const grade = getGrade(score, system);
  if (!grade) return false;

  if (system === "ghana_basic") return (grade.grade as number) <= 4;
  if (system === "ghana_wasce") return (grade.grade as string) !== "F9";
  if (system === "british_gcse")
    return (grade.grade as string) !== "G" && (grade.grade as string) !== "F";
  if (system === "american_gpa") return (grade.points ?? 0) > 0;

  return false;
}
