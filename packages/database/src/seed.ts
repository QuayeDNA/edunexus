import 'dotenv/config';
import { createClient } from './client';
import {
  schools,
  academicYears,
  terms,
  gradeLevels,
} from './schema/index';

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

  const schoolId = school[0].id;
  console.log(`   School ID: ${schoolId}`);

  console.log('Creating academic year...');
  const year = await db.insert(academicYears).values({
    schoolId: schoolId,
    name: ACADEMIC_YEAR_NAME,
    startDate: new Date('2024-09-09'),
    endDate: new Date('2025-07-18'),
    isCurrent: true,
  }).returning({ id: academicYears.id });

  const academicYearId = year[0].id;

  console.log('Creating terms...');
  for (const term of TERMS) {
    await db.insert(terms).values({
      schoolId: schoolId,
      academicYearId: academicYearId,
      termNumber: term.termNumber,
      name: term.name,
      startDate: new Date(term.startDate),
      endDate: new Date(term.endDate),
      isCurrent: term.termNumber === '1',
    });
  }

  console.log('Creating grade levels...');
  for (const gl of GRADE_LEVELS) {
    await db.insert(gradeLevels).values({
      schoolId: schoolId,
      code: gl.code,
      name: gl.name,
      level: gl.level,
      category: gl.category,
      sortOrder: gl.sortOrder,
    });
  }

  console.log('\n✅ Seed complete!');
  console.log(`   School: ${SCHOOL_NAME} (${SCHOOL_SLUG})`);
  console.log(`   Academic Year: ${ACADEMIC_YEAR_NAME}`);
  console.log(`   Terms: ${TERMS.length}`);
  console.log(`   Grade Levels: ${GRADE_LEVELS.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
