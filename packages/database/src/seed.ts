import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import { createClient } from "./client";
import { eq, and, inArray } from "drizzle-orm";
import {
  schools,
  academicYears,
  terms,
  gradeLevels,
  classes,
  subjects,
  subjectGradeLevels,
  curricula,
  curriculumSubjects,
  profiles,
  students,
  guardians,
  studentGuardians,
  staff,
  employmentContracts,
  enrollments,
  classSubjects,
} from "./schema/index";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const SCHOOL_NAME = "Accra Academy Basic School";
const SCHOOL_SLUG = "academy";
const SCHOOL_CODE = "AABS001";

const CUR_YEAR_NAME = "2025/2026";
const CUR_TERMS = [
  { termNumber: "1", name: "First Term", startDate: "2025-09-08", endDate: "2025-12-12" },
  { termNumber: "2", name: "Second Term", startDate: "2026-01-05", endDate: "2026-04-10" },
  { termNumber: "3", name: "Third Term", startDate: "2026-04-27", endDate: "2026-07-17" },
];

const NEXT_YEAR_NAME = "2026/2027";
const NEXT_TERMS = [
  { termNumber: "1", name: "First Term", startDate: "2026-09-07", endDate: "2026-12-11" },
  { termNumber: "2", name: "Second Term", startDate: "2027-01-04", endDate: "2027-04-09" },
  { termNumber: "3", name: "Third Term", startDate: "2027-04-26", endDate: "2027-07-16" },
];

const OLD_YEAR_NAME = "2024/2025";
const OLD_TERMS = [
  { termNumber: "1", name: "First Term", startDate: "2024-09-09", endDate: "2024-12-13" },
  { termNumber: "2", name: "Second Term", startDate: "2025-01-06", endDate: "2025-04-11" },
  { termNumber: "3", name: "Third Term", startDate: "2025-04-28", endDate: "2025-07-18" },
];

const GRADE_LEVELS = [
  { code: "KG1", name: "Kindergarten 1", level: 3, category: "kindergarten", sortOrder: 3 },
  { code: "KG2", name: "Kindergarten 2", level: 4, category: "kindergarten", sortOrder: 4 },
  { code: "P1", name: "Primary 1", level: 5, category: "primary", sortOrder: 5 },
  { code: "P2", name: "Primary 2", level: 6, category: "primary", sortOrder: 6 },
  { code: "P3", name: "Primary 3", level: 7, category: "primary", sortOrder: 7 },
  { code: "P4", name: "Primary 4", level: 8, category: "primary", sortOrder: 8 },
  { code: "P5", name: "Primary 5", level: 9, category: "primary", sortOrder: 9 },
  { code: "P6", name: "Primary 6", level: 10, category: "primary", sortOrder: 10 },
  { code: "JHS1", name: "JHS 1", level: 11, category: "junior_secondary", sortOrder: 11 },
  { code: "JHS2", name: "JHS 2", level: 12, category: "junior_secondary", sortOrder: 12 },
  { code: "JHS3", name: "JHS 3", level: 13, category: "junior_secondary", sortOrder: 13 },
];

const CLASSES_BY_GRADE: Record<string, Array<{ name: string; code: string; capacity: number }>> = {
  KG1: [{ name: "Nursery A", code: "KG1-A", capacity: 25 }],
  KG2: [{ name: "Kindergarten A", code: "KG2-A", capacity: 25 }],
  P1: [
    { name: "Class 1A", code: "P1-A", capacity: 40 },
    { name: "Class 1B", code: "P1-B", capacity: 40 },
  ],
  P2: [{ name: "Class 2A", code: "P2-A", capacity: 40 }],
  P3: [{ name: "Class 3A", code: "P3-A", capacity: 40 }],
  P4: [
    { name: "Class 4A", code: "P4-A", capacity: 40 },
    { name: "Class 4B", code: "P4-B", capacity: 40 },
  ],
  P5: [{ name: "Class 5A", code: "P5-A", capacity: 40 }],
  P6: [{ name: "Class 6A", code: "P6-A", capacity: 40 }],
  JHS1: [{ name: "Form 1A", code: "JHS1-A", capacity: 45 }],
  JHS2: [{ name: "Form 2A", code: "JHS2-A", capacity: 45 }],
  JHS3: [{ name: "Form 3A", code: "JHS3-A", capacity: 45 }],
};

const SUBJECT_DATA = [
  { code: "MATH", name: "Mathematics", category: "core" },
  { code: "ENGLISH", name: "English Language", category: "core" },
  { code: "SCIENCE", name: "Science", category: "core" },
  { code: "GH_LANG", name: "Ghanaian Language", category: "language" },
  { code: "BDT", name: "Basic Design & Technology", category: "vocational" },
  { code: "ICT", name: "Information Technology", category: "core" },
  { code: "CREATIVE", name: "Creative Arts", category: "creative" },
  { code: "RME", name: "Religious & Moral Education", category: "religious" },
  { code: "HISTORY", name: "History", category: "humanities" },
  { code: "FRENCH", name: "French", category: "language" },
  { code: "PE", name: "Physical Education", category: "core" },
];

const STAFF_SEED = [
  { staffIdNumber: "ADM001", firstName: "Kofi", lastName: "Asante", gender: "male", dateOfBirth: "1980-06-15", phone: "0551234567", email: "admin@academy.edunexus.com", role: "admin", department: "administration", employmentStatus: "permanent", dateHired: "2022-01-01", qualification: "M.Ed. Educational Administration", profileEmail: "admin@academy.edunexus.com", profileRole: "admin", position: "School Administrator" },
  { staffIdNumber: "TCH001", firstName: "Ama", lastName: "Mensah", gender: "female", dateOfBirth: "1990-03-20", phone: "0557654321", email: "ama.mensah@academy.edunexus.com", role: "teacher", department: "academic", employmentStatus: "permanent", dateHired: "2020-09-01", qualification: "B.Sc. Mathematics Education", profileEmail: "teacher@academy.edunexus.com", profileRole: "teacher", position: "Mathematics Teacher" },
  { staffIdNumber: "TCH002", firstName: "Kwame", lastName: "Osei", gender: "male", dateOfBirth: "1987-11-08", phone: "0551112233", email: "kwame.osei@academy.edunexus.com", role: "teacher", department: "academic", employmentStatus: "permanent", dateHired: "2019-09-01", qualification: "B.Ed. English Language", profileEmail: null, profileRole: "teacher", position: "English Teacher" },
  { staffIdNumber: "TCH003", firstName: "Efua", lastName: "Acquah", gender: "female", dateOfBirth: "1993-05-12", phone: "0554445566", email: "efua.acquah@academy.edunexus.com", role: "teacher", department: "academic", employmentStatus: "permanent", dateHired: "2021-09-01", qualification: "B.Sc. Integrated Science", profileEmail: null, profileRole: "teacher", position: "Science Teacher" },
  { staffIdNumber: "TCH004", firstName: "Yaw", lastName: "Boateng", gender: "male", dateOfBirth: "1991-09-30", phone: "0557778899", email: "yaw.boateng@academy.edunexus.com", role: "teacher", department: "academic", employmentStatus: "contract", dateHired: "2023-09-01", qualification: "B.Ed. ICT", profileEmail: null, profileRole: "teacher", position: "ICT Teacher" },
  { staffIdNumber: "TCH005", firstName: "Akosua", lastName: "Sarpong", gender: "female", dateOfBirth: "1995-01-25", phone: "0552223344", email: "akosua.sarpong@academy.edunexus.com", role: "teacher", department: "academic", employmentStatus: "probation", dateHired: "2024-09-01", qualification: "B.Ed. Creative Arts", profileEmail: null, profileRole: "teacher", position: "Creative Arts Teacher" },
  { staffIdNumber: "SUP001", firstName: "Daniel", lastName: "Quaye", gender: "male", dateOfBirth: "1975-04-18", phone: "0558889911", email: "daniel.quaye@academy.edunexus.com", role: "support", department: "administration", employmentStatus: "permanent", dateHired: "2018-01-01", qualification: "Diploma in Business Admin", profileEmail: null, profileRole: null, position: "Administrative Assistant" },
];

const STUDENT_SEED = [
  { studentIdNumber: "STU2025001", firstName: "Yaw", lastName: "Asare", gender: "male", dateOfBirth: "2012-05-15", gradeCode: "P6" },
  { studentIdNumber: "STU2025002", firstName: "Abena", lastName: "Mensah", gender: "female", dateOfBirth: "2013-08-22", gradeCode: "P5" },
  { studentIdNumber: "STU2025003", firstName: "Kwesi", lastName: "Ofori", gender: "male", dateOfBirth: "2011-11-03", gradeCode: "JHS1" },
  { studentIdNumber: "STU2025004", firstName: "Adwoa", lastName: "Boateng", gender: "female", dateOfBirth: "2014-02-18", gradeCode: "P4" },
  { studentIdNumber: "STU2025005", firstName: "Nana", lastName: "Sarpong", gender: "male", dateOfBirth: "2010-07-09", gradeCode: "JHS2" },
  { studentIdNumber: "STU2025006", firstName: "Esi", lastName: "Acquah", gender: "female", dateOfBirth: "2015-12-01", gradeCode: "P3" },
  { studentIdNumber: "STU2025007", firstName: "Kojo", lastName: "Quaye", gender: "male", dateOfBirth: "2016-04-14", gradeCode: "P2" },
  { studentIdNumber: "STU2025008", firstName: "Araba", lastName: "Tetteh", gender: "female", dateOfBirth: "2017-09-20", gradeCode: "P1" },
  { studentIdNumber: "STU2025009", firstName: "Kwame", lastName: "Asante", gender: "male", dateOfBirth: "2019-03-10", gradeCode: "KG2" },
  { studentIdNumber: "STU2025010", firstName: "Maame", lastName: "Nkrumah", gender: "female", dateOfBirth: "2009-06-30", gradeCode: "JHS3" },
];

const PASSWORD = "Admin@123";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const CORE_SUBJECT_CODES = ["MATH", "ENGLISH", "SCIENCE", "ICT", "PE"];

async function ensureAcademicYear(
  db: ReturnType<typeof createClient>,
  schoolId: string,
  name: string,
  termDefs: typeof CUR_TERMS,
  isCurrent: boolean,
) {
  let yearId: string;
  const existingRows = await db.select({ id: academicYears.id, isCurrent: academicYears.isCurrent }).from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, name)));
  const existing = existingRows[0] ?? null;

  if (existing) {
    yearId = existing.id;
    if (existing.isCurrent !== isCurrent) {
      await db.update(academicYears).set({ isCurrent }).where(eq(academicYears.id, yearId));
    }
    console.log(`   Found academic year: ${name}`);
  } else {
    const [year] = await db.insert(academicYears).values({
      schoolId,
      name,
      startDate: new Date(termDefs[0].startDate),
      endDate: new Date(termDefs[termDefs.length - 1].endDate),
      isCurrent,
    }).returning({ id: academicYears.id });
    yearId = year.id;
    console.log(`   Created academic year: ${name} (isCurrent: ${isCurrent})`);
  }

  for (const td of termDefs) {
    const existingTerm = await db.select({ id: terms.id }).from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, yearId), eq(terms.termNumber, td.termNumber)))
      .then((r) => r[0] ?? null);
    if (!existingTerm) {
      await db.insert(terms).values({
        schoolId,
        academicYearId: yearId,
        termNumber: td.termNumber,
        name: td.name,
        startDate: new Date(td.startDate),
        endDate: new Date(td.endDate),
        isCurrent: isCurrent && td.termNumber === "1",
        locked: !isCurrent,
      });
    }
  }
  console.log(`   Terms for ${name}: ensured`);

  const allGL = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
  for (const gl of allGL) {
    const gradeClasses = CLASSES_BY_GRADE[gl.code] ?? [];
    for (const cl of gradeClasses) {
      const existingClass = await db.select({ id: classes.id }).from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.code, cl.code), eq(classes.academicYearId, yearId)))
        .then((r) => r[0] ?? null);
      if (!existingClass) {
        await db.insert(classes).values({
          schoolId, name: cl.name, code: cl.code,
          gradeLevelId: gl.id, academicYearId: yearId, capacity: cl.capacity,
        });
      }
    }
  }
  console.log(`   Classes for ${name}: ensured`);

  return yearId;
}

async function migrateOldYear(db: ReturnType<typeof createClient>, schoolId: string) {
  const [oldYear] = await db.select().from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, OLD_YEAR_NAME)))
    .then((r) => r);
  if (!oldYear) return;

  console.log(`   Migrating old academic year ${OLD_YEAR_NAME} → ${CUR_YEAR_NAME}...`);
  await db.update(academicYears).set({
    name: CUR_YEAR_NAME,
    startDate: new Date(CUR_TERMS[0].startDate),
    endDate: new Date(CUR_TERMS[CUR_TERMS.length - 1].endDate),
    isCurrent: true,
  }).where(eq(academicYears.id, oldYear.id));

  await db.delete(terms).where(eq(terms.academicYearId, oldYear.id));
  for (const term of CUR_TERMS) {
    await db.insert(terms).values({
      schoolId,
      academicYearId: oldYear.id,
      termNumber: term.termNumber,
      name: term.name,
      startDate: new Date(term.startDate),
      endDate: new Date(term.endDate),
      isCurrent: term.termNumber === "1",
      locked: false,
    });
  }

  const allGL = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
  for (const gl of allGL) {
    const gradeClasses = CLASSES_BY_GRADE[gl.code] ?? [];
    for (const cl of gradeClasses) {
      const existing = await db.select({ id: classes.id }).from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.code, cl.code), eq(classes.academicYearId, oldYear.id)))
        .then((r) => r[0] ?? null);
      if (!existing) {
        await db.insert(classes).values({
          schoolId, name: cl.name, code: cl.code,
          gradeLevelId: gl.id, academicYearId: oldYear.id, capacity: cl.capacity,
        });
      }
    }
  }
  console.log(`   Migrated ${OLD_YEAR_NAME} → ${CUR_YEAR_NAME}`);
}

async function main() {
  console.log("🌱 Seeding database...\n");
  const db = createClient();

  console.log("Checking for existing school...");
  let schoolId: string;
  const existingSchool = await db.select({ id: schools.id }).from(schools)
    .where(eq(schools.slug, SCHOOL_SLUG)).then((r) => r[0] ?? null);

  if (existingSchool) {
    schoolId = existingSchool.id;
    console.log(`   Found existing school: ${SCHOOL_NAME} (${SCHOOL_SLUG}) — ID: ${schoolId}`);
  } else {
    const [school] = await db.insert(schools).values({
      name: SCHOOL_NAME, slug: SCHOOL_SLUG, code: SCHOOL_CODE, region: "Greater Accra",
      curriculum: "ghana_basic", calendar: "ghana_3_terms", grading: "ghana_basic",
      config: {}, isActive: true,
    }).returning({ id: schools.id });
    schoolId = school.id;
    console.log(`   Created school: ${SCHOOL_NAME} — ID: ${schoolId}`);
  }

  console.log("Setting up grade levels...");
  for (const gl of GRADE_LEVELS) {
    const existing = await db.select({ id: gradeLevels.id }).from(gradeLevels)
      .where(and(eq(gradeLevels.schoolId, schoolId), eq(gradeLevels.code, gl.code)))
      .then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(gradeLevels).values({
        schoolId, code: gl.code, name: gl.name, level: gl.level,
        category: gl.category, sortOrder: gl.sortOrder,
      });
    }
  }
  console.log(`   Grade levels: ${GRADE_LEVELS.length} ensured`);

  console.log("Setting up academic years...");
  await migrateOldYear(db, schoolId);
  const curYearId = await ensureAcademicYear(db, schoolId, CUR_YEAR_NAME, CUR_TERMS, true);
  const nextYearId = await ensureAcademicYear(db, schoolId, NEXT_YEAR_NAME, NEXT_TERMS, false);

  console.log("Setting up subjects...");
  const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  let createdSubjects: any[];
  if (existingSubjects.length > 0) {
    createdSubjects = existingSubjects;
    console.log(`   Subjects already exist, reusing ${existingSubjects.length}`);
  } else {
    createdSubjects = await db.insert(subjects).values(
      SUBJECT_DATA.map((s) => ({ schoolId, ...s })),
    ).returning();
    console.log(`   Subjects: ${createdSubjects.length} created`);
  }

  console.log("Mapping subjects to grade levels...");
  const coreSubjects = createdSubjects.filter((s: any) => CORE_SUBJECT_CODES.includes(s.code));
  const electiveSubjects = createdSubjects.filter((s: any) => !CORE_SUBJECT_CODES.includes(s.code));
  const allGL = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));

  for (const gl of allGL) {
    const existingMappings = await db.select().from(subjectGradeLevels)
      .where(and(eq(subjectGradeLevels.schoolId, schoolId), eq(subjectGradeLevels.gradeLevelId, gl.id)));
    if (existingMappings.length > 0) continue;

    await db.insert(subjectGradeLevels).values(
      coreSubjects.map((s: any, i: number) => ({
        schoolId, subjectId: s.id, gradeLevelId: gl.id, isCore: true, sortOrder: i,
      })),
    );
    if (gl.level >= 5) {
      await db.insert(subjectGradeLevels).values(
        electiveSubjects.slice(0, 4).map((s: any, i: number) => ({
          schoolId, subjectId: s.id, gradeLevelId: gl.id, isCore: false,
          sortOrder: coreSubjects.length + i,
        })),
      );
    }
  }
  console.log(`   Subject-grade-level mappings created per grade level`);

  console.log("Creating curriculum...");
  const [existingCurriculum] = await db.select().from(curricula)
    .where(and(eq(curricula.schoolId, schoolId), eq(curricula.code, "CORE")));
  if (!existingCurriculum) {
    const [coreCurriculum] = await db.insert(curricula).values({
      schoolId, code: "CORE", name: "Core Subjects",
      description: "Ghana Education Service core curriculum subjects",
    }).returning();
    await db.insert(curriculumSubjects).values(
      coreSubjects.map((s: any) => ({ schoolId, curriculumId: coreCurriculum.id, subjectId: s.id })),
    );
    console.log("   Curriculum created with core subjects");
  } else {
    console.log("   Curriculum already exists, skipping");
  }

  async function upsertProfile(
    email: string,
    role: string,
    firstName: string,
    lastName: string,
    scopedSchoolId: string | null,
  ) {
    const existing = await db.select({ id: profiles.id }).from(profiles)
      .where(and(eq(profiles.email, email), eq(profiles.schoolId, scopedSchoolId)))
      .then((r) => r[0] ?? null);
    if (existing) return existing.id;
    const [row] = await db.insert(profiles).values({
      schoolId: scopedSchoolId, email, passwordHash: hashPassword(PASSWORD),
      role, firstName, lastName, isActive: true,
    }).returning({ id: profiles.id });
    return row.id;
  }

  console.log("Setting up system profile...");
  const existingSystem = await db.select({ id: profiles.id }).from(profiles)
    .where(eq(profiles.id, SYSTEM_USER_ID)).then((r) => r[0] ?? null);
  if (!existingSystem) {
    await db.insert(profiles).values({
      id: SYSTEM_USER_ID, schoolId: null, email: "system@edunexus.com",
      passwordHash: hashPassword("system"), role: "super_admin",
      firstName: "System", lastName: "User", isActive: true,
    });
    console.log("   Created system profile");
  } else {
    console.log("   System profile exists");
  }

  console.log("Setting up user profiles...");
  await upsertProfile("admin@edunexus.com", "super_admin", "Super", "Admin", null);
  await upsertProfile("admin@academy.edunexus.com", "admin", "Kofi", "Asante", schoolId);
  await upsertProfile("teacher@academy.edunexus.com", "teacher", "Ama", "Mensah", schoolId);
  await upsertProfile("student@academy.edunexus.com", "student", "Yaw", "Asare", schoolId);
  await upsertProfile("parent@academy.edunexus.com", "parent", "Esi", "Asare", schoolId);

  console.log("Setting up staff records...");
  const existingStaff = await db.select({ id: staff.id }).from(staff).where(eq(staff.schoolId, schoolId));
  if (existingStaff.length === 0) {
    const createdStaff = await db.insert(staff).values(
      STAFF_SEED.map((s) => ({
        schoolId,
        staffIdNumber: s.staffIdNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender as "male" | "female",
        dateOfBirth: s.dateOfBirth,
        phone: s.phone,
        email: s.email,
        role: s.role as "admin" | "teacher" | "support",
        department: s.department,
        employmentStatus: s.employmentStatus as "permanent" | "contract" | "probation",
        dateHired: s.dateHired,
        qualification: s.qualification,
        status: "active",
      })),
    ).returning();

    for (const s of createdStaff) {
      const seed = STAFF_SEED.find((x) => x.staffIdNumber === s.staffIdNumber)!;
      if (seed.profileEmail) {
        const profile = await db.select({ id: profiles.id }).from(profiles)
          .where(and(eq(profiles.email, seed.profileEmail), eq(profiles.schoolId, schoolId)))
          .then((r) => r[0] ?? null);
        if (profile) {
          await db.update(staff).set({ profileId: profile.id }).where(eq(staff.id, s.id));
        }
      }
    }

    await db.insert(employmentContracts).values(
      createdStaff.map((s: any) => ({
        schoolId,
        staffId: s.id,
        type: s.employmentStatus === "contract" ? "fixed_term" : "permanent",
        startDate: s.dateHired,
        position: s.role === "admin" ? "School Administrator"
          : s.role === "support" ? "Administrative Assistant"
          : "Classroom Teacher",
        salary: s.role === "admin" ? "5000" : s.role === "support" ? "2500" : "3500",
      })),
    );
    console.log(`   Staff records created: ${createdStaff.length}`);
  } else {
    console.log(`   Staff records already exist: ${existingStaff.length}`);
  }

  console.log("Setting up students...");
  const allStaff = await db.select().from(staff).where(eq(staff.schoolId, schoolId));
  const teachers = allStaff.filter((s: any) => s.role === "teacher");
  const existingStudents = await db.select({ id: students.id }).from(students)
    .where(eq(students.schoolId, schoolId)).then((r) => r.length);

  if (existingStudents === 0) {
    for (const s of STUDENT_SEED) {
      const gradeLevel = allGL.find((g: any) => g.code === s.gradeCode);
      if (!gradeLevel) continue;

      const [student] = await db.insert(students).values({
        schoolId,
        studentIdNumber: s.studentIdNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender as "male" | "female",
        dateOfBirth: s.dateOfBirth,
        enrollmentDate: "2024-09-09",
        status: "active",
      }).returning({ id: students.id });

      const yearClasses = await db.select().from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.gradeLevelId, gradeLevel.id), eq(classes.academicYearId, curYearId)))
        .limit(1);
      const classId = yearClasses[0]?.id;

      await db.insert(enrollments).values({
        schoolId,
        studentId: student.id,
        classId: classId ?? null,
        academicYearId: curYearId,
        status: "active",
        enrollmentDate: "2024-09-09",
      });
    }
    console.log(`   Student records created: ${STUDENT_SEED.length}`);
  } else {
    console.log(`   Student records already exist: ${existingStudents}`);
  }

  console.log("Setting up guardian and student-guardian links...");
  const [guardianStudentId] = (await db.select({ id: students.id }).from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.studentIdNumber, "STU2025001")))
    .then((r) => r));

  if (guardianStudentId) {
    let guardianId: string;
    const existingGuardian = await db.select({ id: guardians.id }).from(guardians)
      .where(and(eq(guardians.schoolId, schoolId), eq(guardians.phone, "+233241234567")))
      .then((r) => r[0] ?? null);

    if (existingGuardian) {
      guardianId = existingGuardian.id;
    } else {
      const [guardian] = await db.insert(guardians).values({
        schoolId, firstName: "Esi", lastName: "Asare", relationship: "Mother",
        phone: "+233241234567", email: "parent@academy.edunexus.com", isPrimary: true,
      }).returning({ id: guardians.id });
      guardianId = guardian.id;
    }

    const existingLink = await db.select({ id: studentGuardians.id }).from(studentGuardians)
      .where(and(eq(studentGuardians.studentId, guardianStudentId.id), eq(studentGuardians.guardianId, guardianId)))
      .then((r) => r[0] ?? null);
    if (!existingLink) {
      await db.insert(studentGuardians).values({
        studentId: guardianStudentId.id, guardianId, relationship: "Mother", isEmergency: true,
      });
    }
    console.log("   Guardian linked to student");
  }

  console.log("\n✅ Seed complete!");
  console.log(`   School: ${SCHOOL_NAME}`);
  console.log(`   Current Academic Year: ${CUR_YEAR_NAME}`);
  console.log(`   Next Academic Year: ${NEXT_YEAR_NAME}`);
  console.log(`   Grade Levels: ${GRADE_LEVELS.length}`);
  console.log(`   Subjects: ${createdSubjects.length}`);
  console.log(`   Staff: ${STAFF_SEED.length}`);
  console.log(`   Students: ${STUDENT_SEED.length}`);
  console.log(`   Accounts (all passwords: ${PASSWORD}):`);
  console.log(`      super_admin  → admin@edunexus.com`);
  console.log(`      admin        → admin@academy.edunexus.com`);
  console.log(`      teacher      → teacher@academy.edunexus.com`);
  console.log(`      student      → student@academy.edunexus.com`);
  console.log(`      parent       → parent@academy.edunexus.com`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
