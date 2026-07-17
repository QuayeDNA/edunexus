import { db } from "@/lib/db";
import {
  students,
  enrollments,
  guardians,
  studentGuardians,
  profiles,
} from "@edunexus/database";
import { generateStudentId } from "@/services/student-id";
import { scryptSync, randomBytes } from "crypto";

export interface StudentCreationParams {
  schoolId: string;
  schoolCode: string;
  academicYearId: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
}

export interface StudentCreationResult {
  student: {
    id: string;
    studentIdNumber: string;
    firstName: string;
    lastName: string;
  };
  enrollment: { id: string };
  guardian: { id: string };
  credentials: { student: { email: string | null; password: string } };
}

export async function createStudentFromData(
  params: StudentCreationParams,
): Promise<StudentCreationResult> {
  return db.transaction(async (tx) => {
    const studentIdNumber = await generateStudentId(
      tx as any,
      params.schoolId,
      params.schoolCode,
    );

    const [student] = await tx
      .insert(students)
      .values({
        schoolId: params.schoolId,
        studentIdNumber,
        firstName: params.firstName,
        lastName: params.lastName,
        gender: params.gender,
        dateOfBirth: params.dateOfBirth,
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "active",
      })
      .returning();

    const [enrollment] = await tx
      .insert(enrollments)
      .values({
        schoolId: params.schoolId,
        studentId: student.id,
        classId: params.classId,
        academicYearId: params.academicYearId,
        status: "active",
        enrollmentDate: new Date().toISOString().split("T")[0],
      })
      .returning();

    const nameParts = params.guardianName.trim().split(/\s+/);
    const guardianFirstName = nameParts[0] || params.guardianName;
    const guardianLastName = nameParts.slice(1).join(" ") || "";

    const [guardian] = await tx
      .insert(guardians)
      .values({
        schoolId: params.schoolId,
        firstName: guardianFirstName,
        lastName: guardianLastName,
        relationship: "parent",
        phone: params.guardianPhone,
        isPrimary: true,
      })
      .returning();

    await tx.insert(studentGuardians).values({
      studentId: student.id,
      guardianId: guardian.id,
      relationship: "parent",
      isEmergency: false,
    });

    const studentEmail = `${studentIdNumber.toLowerCase()}@edunexus.com`;
    const salt = randomBytes(32).toString("hex");
    const hash = scryptSync("password123", salt, 64).toString("hex");
    const passwordHash = `scrypt:${salt}:${hash}`;

    const [profile] = await tx
      .insert(profiles)
      .values({
        schoolId: params.schoolId,
        email: studentEmail,
        passwordHash,
        role: "student",
        firstName: params.firstName,
        lastName: params.lastName,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning();

    return {
      student: {
        id: student.id,
        studentIdNumber,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      enrollment: { id: enrollment.id },
      guardian: { id: guardian.id },
      credentials: {
        student: { email: profile?.email ?? null, password: "password123" },
      },
    };
  });
}
