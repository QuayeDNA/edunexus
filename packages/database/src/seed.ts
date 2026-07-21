import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });
import { createClient } from "./client";
import { eq, and } from "drizzle-orm";
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
const ACADEMIC_YEAR_NAME = "2024/2025";

const TERMS = [
  {
    termNumber: "1",
    name: "First Term",
    startDate: "2024-09-09",
    endDate: "2024-12-13",
  },
  {
    termNumber: "2",
    name: "Second Term",
    startDate: "2025-01-06",
    endDate: "2025-04-11",
  },
  {
    termNumber: "3",
    name: "Third Term",
    startDate: "2025-04-28",
    endDate: "2025-07-18",
  },
];

const ACADEMIC_YEAR_2_NAME = '2025/2026';
const TERMS_2 = [
  { termNumber: '1', name: 'First Term', startDate: '2025-09-08', endDate: '2025-12-12' },
  { termNumber: '2', name: 'Second Term', startDate: '2026-01-05', endDate: '2026-04-10' },
  { termNumber: '3', name: 'Third Term', startDate: '2026-04-27', endDate: '2026-07-17' },
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

const GRADE_LEVELS = [
  {
    code: "KG1",
    name: "Kindergarten 1",
    level: 3,
    category: "kindergarten",
    sortOrder: 3,
  },
  {
    code: "KG2",
    name: "Kindergarten 2",
    level: 4,
    category: "kindergarten",
    sortOrder: 4,
  },
  {
    code: "P1",
    name: "Primary 1",
    level: 5,
    category: "primary",
    sortOrder: 5,
  },
  {
    code: "P2",
    name: "Primary 2",
    level: 6,
    category: "primary",
    sortOrder: 6,
  },
  {
    code: "P3",
    name: "Primary 3",
    level: 7,
    category: "primary",
    sortOrder: 7,
  },
  {
    code: "P4",
    name: "Primary 4",
    level: 8,
    category: "primary",
    sortOrder: 8,
  },
  {
    code: "P5",
    name: "Primary 5",
    level: 9,
    category: "primary",
    sortOrder: 9,
  },
  {
    code: "P6",
    name: "Primary 6",
    level: 10,
    category: "primary",
    sortOrder: 10,
  },
  {
    code: "JHS1",
    name: "JHS 1",
    level: 11,
    category: "junior_secondary",
    sortOrder: 11,
  },
  {
    code: "JHS2",
    name: "JHS 2",
    level: 12,
    category: "junior_secondary",
    sortOrder: 12,
  },
  {
    code: "JHS3",
    name: "JHS 3",
    level: 13,
    category: "junior_secondary",
    sortOrder: 13,
  },
];

async function main() {
  console.log("🌱 Seeding database...\n");

  const db = createClient();

  console.log("Checking for existing school...");
  let schoolId: string;
  const existingSchool = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, SCHOOL_SLUG))
    .then((r) => r[0] ?? null);

  if (existingSchool) {
    schoolId = existingSchool.id;
    console.log(
      `   Found existing school: ${SCHOOL_NAME} (${SCHOOL_SLUG}) — ID: ${schoolId}`,
    );
  } else {
    console.log("Creating school...");
    const school = await db
      .insert(schools)
      .values({
        name: SCHOOL_NAME,
        slug: SCHOOL_SLUG,
        code: SCHOOL_CODE,
        region: "Greater Accra",
        curriculum: "ghana_basic",
        calendar: "ghana_3_terms",
        grading: "ghana_basic",
        config: {},
        isActive: true,
      })
      .returning({ id: schools.id });
    schoolId = school[0].id;
    console.log(`   Created school: ${SCHOOL_NAME} — ID: ${schoolId}`);
  }

  console.log("Checking for existing academic year...");
  let academicYearId: string;
  const existingYear = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(
      and(
        eq(academicYears.schoolId, schoolId),
        eq(academicYears.name, ACADEMIC_YEAR_NAME),
      ),
    )
    .then((r) => r[0] ?? null);

  if (existingYear) {
    academicYearId = existingYear.id;
    console.log(`   Found existing academic year: ${ACADEMIC_YEAR_NAME}`);
  } else {
    console.log("Creating academic year...");
    const year = await db
      .insert(academicYears)
      .values({
        schoolId,
        name: ACADEMIC_YEAR_NAME,
        startDate: new Date("2024-09-09"),
        endDate: new Date("2025-07-18"),
        isCurrent: true,
      })
      .returning({ id: academicYears.id });
    academicYearId = year[0].id;
  }

  console.log("Creating terms...");
  for (const term of TERMS) {
    const existing = await db
      .select({ id: terms.id })
      .from(terms)
      .where(
        and(
          eq(terms.schoolId, schoolId),
          eq(terms.academicYearId, academicYearId),
          eq(terms.termNumber, term.termNumber),
        ),
      )
      .then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(terms).values({
        schoolId,
        academicYearId,
        termNumber: term.termNumber,
        name: term.name,
        startDate: new Date(term.startDate),
        endDate: new Date(term.endDate),
        isCurrent: term.termNumber === "1",
      });
    }
  }
  console.log(`   Terms: ${TERMS.length} ensured`);

  console.log('Creating 2025/2026 academic year...');
  const existingYear2 = await db.select({ id: academicYears.id }).from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, ACADEMIC_YEAR_2_NAME)))
    .then((r) => r[0] ?? null);

  if (existingYear2) {
    console.log(`   Found existing: ${ACADEMIC_YEAR_2_NAME}`);
  } else {
    const [year2] = await db.insert(academicYears).values({
      schoolId,
      name: ACADEMIC_YEAR_2_NAME,
      startDate: new Date('2025-09-08'),
      endDate: new Date('2026-07-17'),
      isCurrent: false,
    }).returning({ id: academicYears.id });
    console.log(`   Created: ${ACADEMIC_YEAR_2_NAME}`);

    for (const term of TERMS_2) {
      await db.insert(terms).values({
        schoolId,
        academicYearId: year2.id,
        termNumber: term.termNumber,
        name: term.name,
        startDate: new Date(term.startDate),
        endDate: new Date(term.endDate),
        isCurrent: false,
        locked: false,
      });
    }
    console.log(`   Terms for ${ACADEMIC_YEAR_2_NAME}: 3 created`);

    console.log(`   Creating classes for ${ACADEMIC_YEAR_2_NAME}...`);
    const allGradeLevels = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
    for (const gl of allGradeLevels) {
      const gradeClasses2 = CLASSES_BY_GRADE[gl.code] ?? [];
      for (const cl of gradeClasses2) {
        const existing = await db.select({ id: classes.id }).from(classes)
          .where(and(eq(classes.schoolId, schoolId), eq(classes.code, cl.code), eq(classes.academicYearId, year2.id)))
          .then((r) => r[0] ?? null);
        if (!existing) {
          await db.insert(classes).values({
            schoolId, name: cl.name, code: cl.code,
            gradeLevelId: gl.id, academicYearId: year2.id, capacity: cl.capacity,
          });
        }
      }
    }
    console.log(`   Classes for ${ACADEMIC_YEAR_2_NAME} created per grade level`);
  }

  console.log('Creating grade levels...');
  for (const gl of GRADE_LEVELS) {
    const existing = await db
      .select({ id: gradeLevels.id })
      .from(gradeLevels)
      .where(
        and(eq(gradeLevels.schoolId, schoolId), eq(gradeLevels.code, gl.code)),
      )
      .then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(gradeLevels).values({
        schoolId,
        code: gl.code,
        name: gl.name,
        level: gl.level,
        category: gl.category,
        sortOrder: gl.sortOrder,
      });
    }
  }
  console.log(`   Grade levels: ${GRADE_LEVELS.length} ensured`);

  console.log("Creating classes...");
  const allGradeLevels = await db
    .select()
    .from(gradeLevels)
    .where(eq(gradeLevels.schoolId, schoolId));
  for (const gl of allGradeLevels) {
    const gradeClasses = CLASSES_BY_GRADE[gl.code] ?? [];
    for (const cl of gradeClasses) {
      const existing = await db
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.code, cl.code)))
        .then((r) => r[0] ?? null);
      if (!existing) {
        await db.insert(classes).values({
          schoolId,
          name: cl.name,
          code: cl.code,
          gradeLevelId: gl.id,
          academicYearId,
          capacity: cl.capacity,
        });
      }
    }
  }
  console.log(`   Classes created per grade level`);

  console.log("Creating subjects...");
  const subjectData = [
    { code: 'MATH', name: 'Mathematics', category: 'core' },
    { code: 'ENGLISH', name: 'English Language', category: 'core' },
    { code: 'SCIENCE', name: 'Science', category: 'core' },
    { code: 'GH_LANG', name: 'Ghanaian Language', category: 'language' },
    { code: 'BDT', name: 'Basic Design & Technology', category: 'vocational' },
    { code: 'ICT', name: 'Information Technology', category: 'core' },
    { code: 'CREATIVE', name: 'Creative Arts', category: 'creative' },
    { code: 'RME', name: 'Religious & Moral Education', category: 'religious' },
    { code: 'HISTORY', name: 'History', category: 'humanities' },
    { code: 'FRENCH', name: 'French', category: 'language' },
    { code: 'PE', name: 'Physical Education', category: 'core' },
  ];

  const existingSubjects = await db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
  let createdSubjects: any[];
  if (existingSubjects.length > 0) {
    createdSubjects = existingSubjects;
    console.log(`   Subjects already exist, reusing ${existingSubjects.length} subjects`);
  } else {
    createdSubjects = await db.insert(subjects).values(
      subjectData.map((s) => ({ schoolId, ...s })),
    ).returning();
    console.log(`   Subjects: ${createdSubjects.length} created`);
  }

  console.log("Mapping subjects to grade levels...");
  const gradeLevelRows = await db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
  const coreSubjectCodes = ['MATH', 'ENGLISH', 'SCIENCE', 'ICT', 'PE'];
  const coreSubjects = createdSubjects.filter((s: any) => coreSubjectCodes.includes(s.code));
  const electiveSubjects = createdSubjects.filter((s: any) => !coreSubjectCodes.includes(s.code));

  for (const gl of gradeLevelRows) {
    const existingMappings = await db.select().from(subjectGradeLevels)
      .where(and(eq(subjectGradeLevels.schoolId, schoolId), eq(subjectGradeLevels.gradeLevelId, gl.id)));
    if (existingMappings.length > 0) continue;

    await db.insert(subjectGradeLevels).values(
      coreSubjects.map((s: any, i: number) => ({
        schoolId,
        subjectId: s.id,
        gradeLevelId: gl.id,
        isCore: true,
        sortOrder: i,
      })),
    );
    if (gl.level >= 5) {
      await db.insert(subjectGradeLevels).values(
        electiveSubjects.slice(0, 4).map((s: any, i: number) => ({
          schoolId,
          subjectId: s.id,
          gradeLevelId: gl.id,
          isCore: false,
          sortOrder: coreSubjects.length + i,
        })),
      );
    }
  }
  console.log(`   Subject-grade-level mappings created per grade level`);

  console.log("Creating curriculum...");
  const [existingCurriculum] = await db.select().from(curricula).where(
    and(eq(curricula.schoolId, schoolId), eq(curricula.code, 'CORE')),
  );
  if (!existingCurriculum) {
    const [coreCurriculum] = await db.insert(curricula).values({
      schoolId,
      code: 'CORE',
      name: 'Core Subjects',
      description: 'Ghana Education Service core curriculum subjects',
    }).returning();

    await db.insert(curriculumSubjects).values(
      coreSubjects.map((s: any) => ({
        schoolId,
        curriculumId: coreCurriculum.id,
        subjectId: s.id,
      })),
    );
    console.log('   Curriculum created with core subjects');
  } else {
    console.log('   Curriculum already exists, skipping');
  }

  const PASSWORD = "Admin@123";

  async function upsertProfile(
    email: string,
    role: string,
    firstName: string,
    lastName: string,
    scopedSchoolId: string | null,
  ) {
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.email, email),
          scopedSchoolId
            ? eq(profiles.schoolId, scopedSchoolId)
            : eq(profiles.schoolId, null as any),
        ),
      )
      .then((r) => r[0] ?? null);
    if (existing) {
      console.log(`   Skipped ${email} — already exists`);
      return existing.id;
    }
    const row = await db
      .insert(profiles)
      .values({
        schoolId: scopedSchoolId,
        email,
        passwordHash: hashPassword(PASSWORD),
        role,
        firstName,
        lastName,
        isActive: true,
      })
      .returning({ id: profiles.id });
    console.log(`   Created ${email} / ${PASSWORD}`);
    return row[0].id;
  }

  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

  const systemProfileId = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, SYSTEM_USER_ID))
    .then((r) => r[0]?.id ?? null);
  if (!systemProfileId) {
    await db.insert(profiles).values({
      id: SYSTEM_USER_ID,
      schoolId: null,
      email: "system@edunexus.com",
      passwordHash: hashPassword("system"),
      role: "super_admin",
      firstName: "System",
      lastName: "User",
      isActive: true,
    });
    console.log("   Created system profile (system@edunexus.com)");
  } else {
    console.log("   Skipped system profile — already exists");
  }

  console.log("Creating superadmin profile...");
  await upsertProfile(
    "admin@edunexus.com",
    "super_admin",
    "Super",
    "Admin",
    null,
  );

  console.log("Creating admin profile...");
  await upsertProfile(
    "admin@academy.edunexus.com",
    "admin",
    "Kofi",
    "Asante",
    schoolId,
  );

  console.log("Creating teacher profile...");
  await upsertProfile(
    "teacher@academy.edunexus.com",
    "teacher",
    "Ama",
    "Mensah",
    schoolId,
  );

  console.log("Creating student profile...");
  await upsertProfile(
    "student@academy.edunexus.com",
    "student",
    "Yaw",
    "Asare",
    schoolId,
  );

  console.log("Creating parent profile...");
  const parentProfileId = await upsertProfile(
    "parent@academy.edunexus.com",
    "parent",
    "Esi",
    "Asare",
    schoolId,
  );

  console.log("Creating student record...");
  let studentId: string;
  const existingStudent = await db
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(students.studentIdNumber, "STU2024001"),
      ),
    )
    .then((r) => r[0] ?? null);
  if (existingStudent) {
    studentId = existingStudent.id;
    console.log("   Skipped — student record already exists");
  } else {
    const studentRecord = await db
      .insert(students)
      .values({
        schoolId,
        studentIdNumber: "STU2024001",
        firstName: "Yaw",
        lastName: "Asare",
        gender: "male",
        dateOfBirth: "2012-05-15",
        enrollmentDate: "2024-09-09",
        status: "active",
      })
      .returning({ id: students.id });
    studentId = studentRecord[0].id;
    console.log("   Created student record");
  }

  console.log("Creating guardian record...");
  let guardianId: string;
  const existingGuardian = await db
    .select({ id: guardians.id })
    .from(guardians)
    .where(
      and(
        eq(guardians.schoolId, schoolId),
        eq(guardians.phone, "+233241234567"),
      ),
    )
    .then((r) => r[0] ?? null);
  if (existingGuardian) {
    guardianId = existingGuardian.id;
    console.log("   Skipped — guardian record already exists");
  } else {
    const guardianRecord = await db
      .insert(guardians)
      .values({
        schoolId,
        firstName: "Esi",
        lastName: "Asare",
        relationship: "Mother",
        phone: "+233241234567",
        email: "parent@academy.edunexus.com",
        isPrimary: true,
      })
      .returning({ id: guardians.id });
    guardianId = guardianRecord[0].id;
    console.log("   Created guardian record");
  }

  console.log("Creating student-guardian link...");
  const existingLink = await db
    .select({ id: studentGuardians.id })
    .from(studentGuardians)
    .where(
      and(
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.guardianId, guardianId),
      ),
    )
    .then((r) => r[0] ?? null);
  if (!existingLink) {
    await db.insert(studentGuardians).values({
      studentId,
      guardianId,
      relationship: "Mother",
      isEmergency: true,
    });
    console.log("   Created student-guardian link");
  } else {
    console.log("   Skipped — link already exists");
  }

  console.log("\n✅ Seed complete!");
  console.log(`   School: ${SCHOOL_NAME} (${SCHOOL_SLUG})`);
  console.log(`   Academic Year: ${ACADEMIC_YEAR_NAME}`);
  console.log(`   Terms: ${TERMS.length}`);
  console.log(`   Grade Levels: ${GRADE_LEVELS.length}`);
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
