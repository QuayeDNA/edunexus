/**
 * EduNexus Development Seed Data
 * Run with: npm run seed
 *
 * This seeds your Supabase database with realistic Ghanaian school data.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const SEED_EMAIL = 'admin@edunexus.demo';
const SEED_PASSWORD = 'Demo1234!';

async function seed() {
  console.log('🌱 Starting EduNexus seed...\n');

  // ─── 1. Create School ───────────────────────────────────────────────────────
  console.log('Creating school...');
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .insert({
      name: 'Accra Academy Basic School',
      address: '14 Ring Road Central, Accra',
      phone: '030 277 0000',
      email: 'info@accraabc.edu.gh',
      website: 'www.accraabc.edu.gh',
      motto: 'Knowledge, Character, Excellence',
      curriculum_mode: 'ghana_basic',
      calendar_mode: 'trimester',
      grading_system: 'ghana_basic',
      currency_code: 'GHS',
      timezone: 'Africa/Accra',
      country: 'GH',
    })
    .select()
    .single();

  if (schoolError) {
    console.error('❌ School error:', schoolError.message);
    process.exit(1);
  }
  console.log(`✅ School: ${school.name} (${school.id})`);

  // ─── 2. Create Academic Year ────────────────────────────────────────────────
  console.log('Creating academic year...');
  const { data: academicYear } = await supabase
    .from('academic_years')
    .insert({
      school_id: school.id,
      label: '2024/2025',
      start_date: '2024-09-02',
      end_date: '2025-08-01',
      is_current: true,
    })
    .select()
    .single();

  // ─── 3. Create Terms ────────────────────────────────────────────────────────
  const { data: terms } = await supabase
    .from('terms')
    .insert([
      {
        school_id: school.id,
        academic_year_id: academicYear.id,
        label: 'First Term',
        term_number: 1,
        start_date: '2024-09-02',
        end_date: '2024-12-20',
        is_current: true,
      },
      {
        school_id: school.id,
        academic_year_id: academicYear.id,
        label: 'Second Term',
        term_number: 2,
        start_date: '2025-01-13',
        end_date: '2025-04-11',
        is_current: false,
      },
      {
        school_id: school.id,
        academic_year_id: academicYear.id,
        label: 'Third Term',
        term_number: 3,
        start_date: '2025-04-28',
        end_date: '2025-08-01',
        is_current: false,
      },
    ])
    .select();

  console.log('✅ Academic year + 3 terms created');

  // ─── 4. Create Grade Levels ─────────────────────────────────────────────────
  const gradeLevelData = [
    { name: 'Crèche',    group: 'nursery', order: 1 },
    { name: 'Nursery 1', group: 'nursery', order: 2 },
    { name: 'Nursery 2', group: 'nursery', order: 3 },
    { name: 'KG 1',      group: 'nursery', order: 4 },
    { name: 'KG 2',      group: 'nursery', order: 5 },
    { name: 'Primary 1', group: 'primary', order: 6 },
    { name: 'Primary 2', group: 'primary', order: 7 },
    { name: 'Primary 3', group: 'primary', order: 8 },
    { name: 'Primary 4', group: 'primary', order: 9 },
    { name: 'Primary 5', group: 'primary', order: 10 },
    { name: 'Primary 6', group: 'primary', order: 11 },
    { name: 'JHS 1',     group: 'jhs',     order: 12 },
    { name: 'JHS 2',     group: 'jhs',     order: 13 },
    { name: 'JHS 3',     group: 'jhs',     order: 14 },
  ];

  const { data: gradeLevels } = await supabase
    .from('grade_levels')
    .insert(gradeLevelData.map(g => ({
      ...g,
      school_id: school.id,
      order_index: g.order,
      level_group: g.group,
    })))
    .select();

  console.log(`✅ ${gradeLevels.length} grade levels created`);

  const glMap = Object.fromEntries(gradeLevels.map(g => [g.name, g.id]));

  // ─── 5. Create 5 Classes ────────────────────────────────────────────────────
  const classData = [
    { name: 'KG 1A',      grade_level_id: glMap['KG 1'] },
    { name: 'Primary 3A', grade_level_id: glMap['Primary 3'] },
    { name: 'Primary 6A', grade_level_id: glMap['Primary 6'] },
    { name: 'JHS 1A',     grade_level_id: glMap['JHS 1'] },
    { name: 'JHS 3A',     grade_level_id: glMap['JHS 3'] },
  ];

  const { data: classes } = await supabase
    .from('classes')
    .insert(classData.map(c => ({
      ...c,
      school_id: school.id,
      academic_year_id: academicYear.id,
      capacity: 35,
    })))
    .select();

  console.log(`✅ ${classes.length} classes created`);

  const classMap = Object.fromEntries(classes.map(c => [c.name, c.id]));

  // ─── 6. Create 30 Students ──────────────────────────────────────────────────
  const ghanaFirstNames = ['Kofi', 'Ama', 'Kwame', 'Abena', 'Yaw', 'Akosua', 'Kojo', 'Adwoa',
    'Fiifi', 'Efua', 'Kweku', 'Akua', 'Nana', 'Adjoa', 'Kwabena', 'Araba'];
  const ghanaLastNames = ['Mensah', 'Asante', 'Boateng', 'Owusu', 'Darko', 'Amoah', 'Gyasi',
    'Frimpong', 'Amponsah', 'Acheampong', 'Ofori', 'Antwi', 'Adjei', 'Kumi'];

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const studentRows = [];
  const classIds = Object.values(classMap);
  let seq = 1;

  for (let i = 0; i < 30; i++) {
    const firstName = rand(ghanaFirstNames);
    const lastName = rand(ghanaLastNames);
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    const classId = classIds[i % classIds.length];
    const year = 2024;
    studentRows.push({
      school_id: school.id,
      student_id_number: `AAB-${year}-${String(seq++).padStart(4, '0')}`,
      first_name: firstName,
      last_name: lastName,
      gender,
      nationality: 'Ghanaian',
      date_of_birth: `${randInt(2008, 2018)}-${String(randInt(1, 12)).padStart(2,'0')}-${String(randInt(1, 28)).padStart(2,'0')}`,
      admission_date: '2024-09-02',
      current_class_id: classId,
      status: 'Active',
      region: rand(['Greater Accra', 'Ashanti', 'Eastern']),
    });
  }

  const { data: students } = await supabase
    .from('students')
    .insert(studentRows)
    .select();

  console.log(`✅ ${students.length} students created`);

  // ─── 7. Create Admin Auth User ──────────────────────────────────────────────
  console.log('Creating admin user...');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.warn('⚠️  Could not create auth user (may already exist):', authError.message);
  } else {
    await supabase.from('profiles').insert({
      id: authUser.user.id,
      school_id: school.id,
      role: 'admin',
      first_name: 'Demo',
      last_name: 'Admin',
      is_active: true,
    });
    console.log(`✅ Admin user: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`\n📋 School ID: ${school.id}`);
  console.log(`🔑 Login: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
