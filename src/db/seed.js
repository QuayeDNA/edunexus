/**
 * EduNexus Development Seed Data
 * Run with: npm run seed
 *
 * This seeds your Supabase database with realistic Ghanaian school data.
 * IDEMPOTENT: Safe to run multiple times - skips existing data.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

// CRITICAL: Use service_role key to bypass RLS during seeding
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const SEED_EMAIL = 'admin@edunexus.demo';
const SEED_PASSWORD = 'Demo1234!';
const SCHOOL_NAME = 'Accra Academy Basic School';

async function seed() {
  console.log('🌱 Starting EduNexus seed...\n');

  // ─── 1. Create or Get School ────────────────────────────────────────────────
  console.log('Checking for existing school...');
  let { data: existingSchool } = await supabase
    .from('schools')
    .select('*')
    .eq('name', SCHOOL_NAME)
    .single();

  let school;
  if (existingSchool) {
    console.log(`✅ Using existing school: ${existingSchool.name} (${existingSchool.id})`);
    school = existingSchool;
  } else {
    console.log('Creating new school...');
    const { data: newSchool, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: SCHOOL_NAME,
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
    console.log(`✅ School created: ${newSchool.name} (${newSchool.id})`);
    school = newSchool;
  }

  // ─── 2. Create or Get Academic Year ─────────────────────────────────────────
  let { data: existingYear } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', school.id)
    .eq('label', '2024/2025')
    .single();

  let academicYear;
  if (existingYear) {
    console.log('✅ Using existing academic year: 2024/2025');
    academicYear = existingYear;
  } else {
    console.log('Creating academic year...');
    const { data: newYear, error: yearError } = await supabase
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

    if (yearError) {
      console.error('❌ Academic year error:', yearError.message);
      process.exit(1);
    }
    academicYear = newYear;
    console.log('✅ Academic year created');
  }

  // ─── 3. Create Terms ────────────────────────────────────────────────────────
  let { data: existingTerms } = await supabase
    .from('terms')
    .select('*')
    .eq('school_id', school.id)
    .eq('academic_year_id', academicYear.id);

  let terms;
  if (existingTerms && existingTerms.length > 0) {
    console.log(`✅ Using existing ${existingTerms.length} terms`);
    terms = existingTerms;
  } else {
    const { data: newTerms, error: termsError } = await supabase
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

    if (termsError) {
      console.error('❌ Terms error:', termsError.message);
      process.exit(1);
    }
    terms = newTerms;
    console.log('✅ 3 terms created');
  }

  // ─── 4. Create Grade Levels ─────────────────────────────────────────────────
  let { data: existingGradeLevels } = await supabase
    .from('grade_levels')
    .select('*')
    .eq('school_id', school.id);

  let gradeLevels;
  if (existingGradeLevels && existingGradeLevels.length > 0) {
    console.log(`✅ Using existing ${existingGradeLevels.length} grade levels`);
    gradeLevels = existingGradeLevels;
  } else {
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

    console.log('Creating grade levels...');
    const { data: newGradeLevels, error: gradeLevelsError } = await supabase
      .from('grade_levels')
      .insert(gradeLevelData.map(g => ({
        school_id: school.id,
        name: g.name,
        order_index: g.order,
        level_group: g.group,
      })))
      .select();

    if (gradeLevelsError) {
      console.error('❌ Grade levels error:', gradeLevelsError.message);
      process.exit(1);
    }
    gradeLevels = newGradeLevels;
    console.log(`✅ ${gradeLevels.length} grade levels created`);
  }

  const glMap = Object.fromEntries(gradeLevels.map(g => [g.name, g.id]));

  // ─── 5. Create Classes ──────────────────────────────────────────────────────
  let { data: existingClasses } = await supabase
    .from('classes')
    .select('*')
    .eq('school_id', school.id)
    .eq('academic_year_id', academicYear.id);

  let classes;
  if (existingClasses && existingClasses.length > 0) {
    console.log(`✅ Using existing ${existingClasses.length} classes`);
    classes = existingClasses;
  } else {
    const classData = [
      { name: 'KG 1A',      grade_level_id: glMap['KG 1'] },
      { name: 'Primary 3A', grade_level_id: glMap['Primary 3'] },
      { name: 'Primary 6A', grade_level_id: glMap['Primary 6'] },
      { name: 'JHS 1A',     grade_level_id: glMap['JHS 1'] },
      { name: 'JHS 3A',     grade_level_id: glMap['JHS 3'] },
    ];

    console.log('Creating classes...');
    const { data: newClasses, error: classesError } = await supabase
      .from('classes')
      .insert(classData.map(c => ({
        ...c,
        school_id: school.id,
        academic_year_id: academicYear.id,
        capacity: 35,
      })))
      .select();

    if (classesError) {
      console.error('❌ Classes error:', classesError.message);
      process.exit(1);
    }
    classes = newClasses;
    console.log(`✅ ${classes.length} classes created`);
  }

  const classMap = Object.fromEntries(classes.map(c => [c.name, c.id]));

  // ─── 6. Create Students ─────────────────────────────────────────────────────
  let { data: existingStudents } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', school.id);

  if (existingStudents && existingStudents.length > 0) {
    console.log(`✅ Using existing ${existingStudents.length} students`);
  } else {
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

    console.log('Creating students...');
    const { data: newStudents, error: studentsError } = await supabase
      .from('students')
      .insert(studentRows)
      .select();

    if (studentsError) {
      console.error('❌ Students error:', studentsError.message);
      process.exit(1);
    }

    console.log(`✅ ${newStudents.length} students created`);
  }

  // ─── 7. Create Admin Auth User ──────────────────────────────────────────────
  console.log('Checking for admin user...');
  
  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const adminExists = existingUsers?.users?.find(u => u.email === SEED_EMAIL);

  if (adminExists) {
    console.log(`✅ Admin user already exists: ${SEED_EMAIL}`);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminExists.id)
      .single();

    if (!existingProfile) {
      console.log('Creating profile for existing admin user...');
      await supabase.from('profiles').insert({
        id: adminExists.id,
        school_id: school.id,
        role: 'admin',
        first_name: 'Demo',
        last_name: 'Admin',
        is_active: true,
      });
      console.log('✅ Admin profile created');
    }
  } else {
    console.log('Creating admin user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      email_confirm: true,
    });

    if (authError) {
      console.warn('⚠️  Could not create auth user:', authError.message);
      console.warn('Please enable email provider in Supabase Authentication settings');
    } else {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        school_id: school.id,
        role: 'admin',
        first_name: 'Demo',
        last_name: 'Admin',
        is_active: true,
      });

      if (profileError) {
        console.error('❌ Profile error:', profileError.message);
      } else {
        console.log(`✅ Admin user created: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
      }
    }
  }

  console.log('\n✅ Seed complete!');
  console.log(`\n📋 School ID: ${school.id}`);
  console.log(`🔑 Login: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});