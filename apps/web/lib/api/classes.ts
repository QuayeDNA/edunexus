import type { ApplicantClassOption } from "@/types/applicant";

export async function fetchClassesByGradeLevel(
  gradeLevelId: string,
): Promise<ApplicantClassOption[]> {
  const res = await fetch(`/api/classes?gradeLevelId=${gradeLevelId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}
