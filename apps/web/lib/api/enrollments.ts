export async function withdrawEnrollment(
  enrollmentId: string,
  reason: string,
): Promise<void> {
  const res = await fetch(`/api/enrollments/${enrollmentId}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "Withdrawal failed");
  }
}

export async function transferEnrollment(
  enrollmentId: string,
  reason: string,
  targetSchoolName: string,
): Promise<void> {
  const res = await fetch(`/api/enrollments/${enrollmentId}/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, targetSchoolName }),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "Transfer failed");
  }
}

export async function graduateEnrollment(enrollmentId: string): Promise<void> {
  const res = await fetch(`/api/enrollments/${enrollmentId}/graduate`, {
    method: "POST",
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "Graduation failed");
  }
}

export async function readmitStudent(
  studentId: string,
  classId: string,
  academicYearId: string,
): Promise<void> {
  const res = await fetch(`/api/students/${studentId}/re-admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId, academicYearId }),
  });
  if (!res.ok) {
    const d = await res.json();
    throw new Error(d.error ?? "Re-admission failed");
  }
}
