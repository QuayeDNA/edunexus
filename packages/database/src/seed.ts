import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../../.env') });
import { createClient } from './client';
import { eq, and } from 'drizzle-orm';
import {
  schools,
  academicYears,
  terms,
  gradeLevels,
  profiles,
  students,
  guardians,
  studentGuardians,
} from './schema/index';
import { randomBytes, scryptSync } from 'crypto';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const SCHOOL_NAME = 'Accra Academy Basic School';
const SCHOOL_SLUG = 'academy';
const SCHOOL_CODE = 'AABS001';
const ACADEMIC_YEAR_NAME = '2024/2025';

const TERMS = [
  { termNumber: '1', name: 'First Term', startDate: '2024-09-09', endDate: '2024-12-13' },
  { termNumber: '2', name: 'Second Term', startDate: '2025-01-06', endDate: '2025-04-11' },
  { termNumber: '3', name: 'Third Term', startDate: '2025-04-28', endDate: '2025-07-18' },
];

const GRADE_LEVELS = [
  { code: 'KG1', name: 'Kindergarten 1', level: 3, category: 'kindergarten', sortOrder: 3 },
  { code: 'KG2', name: 'Kindergarten 2', level: 4, category: 'kindergarten', sortOrder: 4 },
  { code: 'P1', name: 'Primary 1', level: 5, category: 'primary', sortOrder: 5 },
  { code: 'P2', name: 'Primary 2', level: 6, category: 'primary', sortOrder: 6 },
  { code: 'P3', name: 'Primary 3', level: 7, category: 'primary', sortOrder: 7 },
  { code: 'P4', name: 'Primary 4', level: 8, category: 'primary', sortOrder: 8 },
  { code: 'P5', name: 'Primary 5', level: 9, category: 'primary', sortOrder: 9 },
  { code: 'P6', name: 'Primary 6', level: 10, category: 'primary', sortOrder: 10 },
  { code: 'JHS1', name: 'JHS 1', level: 11, category: 'junior_secondary', sortOrder: 11 },
  { code: 'JHS2', name: 'JHS 2', level: 12, category: 'junior_secondary', sortOrder: 12 },
  { code: 'JHS3', name: 'JHS 3', level: 13, category: 'junior_secondary', sortOrder: 13 },
];

async function main() {
  console.log('🌱 Seeding database...\n');

  const db = createClient();

  console.log('Checking for existing school...');
  let schoolId: string;
  const existingSchool = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, SCHOOL_SLUG)).then((r) => r[0] ?? null);

  if (existingSchool) {
    schoolId = existingSchool.id;
    console.log(`   Found existing school: ${SCHOOL_NAME} (${SCHOOL_SLUG}) — ID: ${schoolId}`);
  } else {
    console.log('Creating school...');
    const school = await db.insert(schools).values({
      name: SCHOOL_NAME,
      slug: SCHOOL_SLUG,
      code: SCHOOL_CODE,
      region: 'Greater Accra',
      curriculum: 'ghana_basic',
      calendar: 'ghana_3_terms',
      grading: 'ghana_basic',
      config: {},
      isActive: true,
    }).returning({ id: schools.id });
    schoolId = school[0].id;
    console.log(`   Created school: ${SCHOOL_NAME} — ID: ${schoolId}`);
  }

  console.log('Checking for existing academic year...');
  let academicYearId: string;
  const existingYear = await db.select({ id: academicYears.id }).from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.name, ACADEMIC_YEAR_NAME)))
    .then((r) => r[0] ?? null);

  if (existingYear) {
    academicYearId = existingYear.id;
    console.log(`   Found existing academic year: ${ACADEMIC_YEAR_NAME}`);
  } else {
    console.log('Creating academic year...');
    const year = await db.insert(academicYears).values({
      schoolId,
      name: ACADEMIC_YEAR_NAME,
      startDate: new Date('2024-09-09'),
      endDate: new Date('2025-07-18'),
      isCurrent: true,
    }).returning({ id: academicYears.id });
    academicYearId = year[0].id;
  }

  console.log('Creating terms...');
  for (const term of TERMS) {
    const existing = await db.select({ id: terms.id }).from(terms)
      .where(and(eq(terms.schoolId, schoolId), eq(terms.academicYearId, academicYearId), eq(terms.termNumber, term.termNumber)))
      .then((r) => r[0] ?? null);
    if (!existing) {
      await db.insert(terms).values({
        schoolId,
        academicYearId,
        termNumber: term.termNumber,
        name: term.name,
        startDate: new Date(term.startDate),
        endDate: new Date(term.endDate),
        isCurrent: term.termNumber === '1',
      });
    }
  }
  console.log(`   Terms: ${TERMS.length} ensured`);

  console.log('Creating grade levels...');
  for (const gl of GRADE_LEVELS) {
    const existing = await db.select({ id: gradeLevels.id }).from(gradeLevels)
      .where(and(eq(gradeLevels.schoolId, schoolId), eq(gradeLevels.code, gl.code)))
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

  const PASSWORD = 'Admin@123';

  async function upsertProfile(email: string, role: string, firstName: string, lastName: string, scopedSchoolId: string | null) {
    const existing = await db.select({ id: profiles.id }).from(profiles)
      .where(and(eq(profiles.email, email), scopedSchoolId ? eq(profiles.schoolId, scopedSchoolId) : eq(profiles.schoolId, null as any)))
      .then((r) => r[0] ?? null);
    if (existing) {
      console.log(`   Skipped ${email} — already exists`);
      return existing.id;
    }
    const row = await db.insert(profiles).values({
      schoolId: scopedSchoolId,
      email,
      passwordHash: hashPassword(PASSWORD),
      role,
      firstName,
      lastName,
      isActive: true,
    }).returning({ id: profiles.id });
    console.log(`   Created ${email} / ${PASSWORD}`);
    return row[0].id;
  }

  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  const systemProfileId = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, SYSTEM_USER_ID)).then((r) => r[0]?.id ?? null);
  if (!systemProfileId) {
    await db.insert(profiles).values({
      id: SYSTEM_USER_ID,
      schoolId: null,
      email: 'system@edunexus.com',
      passwordHash: hashPassword('system'),
      role: 'super_admin',
      firstName: 'System',
      lastName: 'User',
      isActive: true,
    });
    console.log('   Created system profile (system@edunexus.com)');
  } else {
    console.log('   Skipped system profile — already exists');
  }

  console.log('Creating superadmin profile...');
  await upsertProfile('admin@edunexus.com', 'super_admin', 'Super', 'Admin', null);

  console.log('Creating admin profile...');
  await upsertProfile('admin@academy.edunexus.com', 'admin', 'Kofi', 'Asante', schoolId);

  console.log('Creating teacher profile...');
  await upsertProfile('teacher@academy.edunexus.com', 'teacher', 'Ama', 'Mensah', schoolId);

  console.log('Creating student profile...');
  await upsertProfile('student@academy.edunexus.com', 'student', 'Yaw', 'Asare', schoolId);

  console.log('Creating parent profile...');
  const parentProfileId = await upsertProfile('parent@academy.edunexus.com', 'parent', 'Esi', 'Asare', schoolId);

  console.log('Creating student record...');
  let studentId: string;
  const existingStudent = await db.select({ id: students.id }).from(students)
    .where(and(eq(students.schoolId, schoolId), eq(students.studentIdNumber, 'STU2024001')))
    .then((r) => r[0] ?? null);
  if (existingStudent) {
    studentId = existingStudent.id;
    console.log('   Skipped — student record already exists');
  } else {
    const studentRecord = await db.insert(students).values({
      schoolId,
      studentIdNumber: 'STU2024001',
      firstName: 'Yaw',
      lastName: 'Asare',
      gender: 'male',
      dateOfBirth: '2012-05-15',
      enrollmentDate: '2024-09-09',
      status: 'active',
    }).returning({ id: students.id });
    studentId = studentRecord[0].id;
    console.log('   Created student record');
  }

  console.log('Creating guardian record...');
  let guardianId: string;
  const existingGuardian = await db.select({ id: guardians.id }).from(guardians)
    .where(and(eq(guardians.schoolId, schoolId), eq(guardians.phone, '+233241234567')))
    .then((r) => r[0] ?? null);
  if (existingGuardian) {
    guardianId = existingGuardian.id;
    console.log('   Skipped — guardian record already exists');
  } else {
    const guardianRecord = await db.insert(guardians).values({
      schoolId,
      firstName: 'Esi',
      lastName: 'Asare',
      relationship: 'Mother',
      phone: '+233241234567',
      email: 'parent@academy.edunexus.com',
      isPrimary: true,
    }).returning({ id: guardians.id });
    guardianId = guardianRecord[0].id;
    console.log('   Created guardian record');
  }

  console.log('Creating student-guardian link...');
  const existingLink = await db.select({ id: studentGuardians.id }).from(studentGuardians)
    .where(and(eq(studentGuardians.studentId, studentId), eq(studentGuardians.guardianId, guardianId)))
    .then((r) => r[0] ?? null);
  if (!existingLink) {
    await db.insert(studentGuardians).values({
      studentId,
      guardianId,
      relationship: 'Mother',
      isEmergency: true,
    });
    console.log('   Created student-guardian link');
  } else {
    console.log('   Skipped — link already exists');
  }

  console.log('\n✅ Seed complete!');
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
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
