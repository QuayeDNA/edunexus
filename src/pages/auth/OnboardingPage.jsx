import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Loader2, Building2, BookOpen, GraduationCap, Shield, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useSchoolStore } from '../../store/schoolStore.js';
import { supabase } from '../../services/supabaseClient.js';
import { schoolsApi } from '../../services/api/schools.js';
import { gradeLevelsApi } from '../../services/api/gradeLevels.js';
import { academicYearsApi } from '../../services/api/academicYears.js';
import { CURRICULUM_DESCRIPTIONS, CURRICULUM_MODES } from '../../utils/constants.js';
import { GRADE_LEVELS_BY_CURRICULUM, generateGhanaTerms } from '../../utils/ghanaCalendar.js';
import { cn } from '../../utils/cn.js';
import { APP_NAME } from '../../utils/constants.js';

const STEPS = [
  { id: 1, label: 'School Info',  icon: Building2 },
  { id: 2, label: 'Curriculum',   icon: BookOpen },
  { id: 3, label: 'Grade Levels', icon: GraduationCap },
  { id: 4, label: 'Admin Setup',  icon: Shield },
  { id: 5, label: 'Done!',        icon: Rocket },
];

// ─── Step 1: School Info ───────────────────────────────────────────────────────
function StepSchoolInfo({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">School name *</label>
        <input className="input-base" placeholder="e.g. Accra Academy Basic School" value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Phone</label>
          <input className="input-base" placeholder="030 000 0000" value={data.phone ?? ''} onChange={e => onChange('phone', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
          <input className="input-base" type="email" placeholder="info@school.edu.gh" value={data.email ?? ''} onChange={e => onChange('email', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Address</label>
        <input className="input-base" placeholder="14 Ring Road Central, Accra" value={data.address ?? ''} onChange={e => onChange('address', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">School motto <span className="text-text-muted font-normal">(optional)</span></label>
        <input className="input-base" placeholder="e.g. Knowledge, Character, Excellence" value={data.motto ?? ''} onChange={e => onChange('motto', e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Website <span className="text-text-muted font-normal">(optional)</span></label>
        <input className="input-base" placeholder="www.yourschool.edu.gh" value={data.website ?? ''} onChange={e => onChange('website', e.target.value)} />
      </div>
    </div>
  );
}

// ─── Step 2: Curriculum Mode ───────────────────────────────────────────────────
function StepCurriculum({ data, onChange }) {
  const curriculums = Object.entries(CURRICULUM_DESCRIPTIONS);
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary mb-4">
        Choose the curriculum that best matches your school. This determines grade levels, report card format, and grading scale.
      </p>
      {curriculums.map(([key, info]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange('curriculum_mode', key)}
          className={cn(
            'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
            data.curriculum_mode === key
              ? 'border-brand-600 bg-brand-50'
              : 'border-border hover:border-brand-200 hover:bg-surface-muted'
          )}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{info.flag}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-text-primary">{info.label}</p>
              {data.curriculum_mode === key && (
                <span className="badge bg-brand-100 text-brand-700">Selected</span>
              )}
            </div>
            <p className="text-xs text-text-secondary">{info.description}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-text-muted">{info.terms}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{info.grading}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Step 3: Grade Levels ──────────────────────────────────────────────────────
function StepGradeLevels({ data, onChange }) {
  const curriculumKey = data.curriculum_mode ?? 'ghana_basic';
  const levels = GRADE_LEVELS_BY_CURRICULUM[curriculumKey] ?? GRADE_LEVELS_BY_CURRICULUM.ghana_basic;
  const selectedNames = data.selectedGrades ?? levels.map(l => l.name);

  const toggle = (name) => {
    const next = selectedNames.includes(name)
      ? selectedNames.filter(n => n !== name)
      : [...selectedNames, name];
    onChange('selectedGrades', next);
  };

  const groupMap = {};
  levels.forEach(l => {
    if (!groupMap[l.group]) groupMap[l.group] = [];
    groupMap[l.group].push(l);
  });

  const groupLabels = {
    nursery: 'Pre-School / Nursery',
    primary: 'Primary',
    jhs: 'Junior High School',
    shs: 'Senior High School',
    eyfs: 'Early Years',
    ks1: 'Key Stage 1',
    ks2: 'Key Stage 2',
    ks3: 'Key Stage 3',
    gcse: 'GCSE Years',
    a_level: 'A-Level',
    preschool: 'Pre-School',
    elementary: 'Elementary',
    middle: 'Middle School',
    high: 'High School',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Select the grade levels your school offers. You can add or remove levels later in Settings.
      </p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">{selectedNames.length} of {levels.length} selected</span>
        <div className="flex gap-2">
          <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => onChange('selectedGrades', levels.map(l => l.name))}>Select all</button>
          <span className="text-xs text-text-muted">·</span>
          <button type="button" className="text-xs text-text-muted hover:underline" onClick={() => onChange('selectedGrades', [])}>Clear</button>
        </div>
      </div>
      {Object.entries(groupMap).map(([group, groupLevels]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{groupLabels[group] ?? group}</p>
          <div className="flex flex-wrap gap-2">
            {groupLevels.map(level => (
              <button
                key={level.name}
                type="button"
                onClick={() => toggle(level.name)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  selectedNames.includes(level.name)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-text-secondary border-border hover:border-brand-300'
                )}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 4: Admin Confirmation ────────────────────────────────────────────────
function StepAdminSetup({ profile }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-surface-muted rounded-xl border border-border">
        <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-brand-700">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </span>
        </div>
        <div>
          <p className="font-semibold text-text-primary">{profile?.first_name} {profile?.last_name}</p>
          <p className="text-sm text-text-secondary">{profile?.email ?? 'Administrator'}</p>
          <span className="badge bg-brand-100 text-brand-700 mt-1">School Administrator</span>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        Your admin account is ready. You can invite additional staff, teachers, and parents once the setup is complete.
      </p>
      <div className="space-y-2">
        {[
          'Manage all students and staff',
          'Configure fees and process payments',
          'Generate report cards and transcripts',
          'Communicate with parents via SMS and email',
          'View analytics and financial reports',
        ].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-sm text-text-secondary">
            <div className="w-4 h-4 rounded-full bg-status-successBg flex items-center justify-center flex-shrink-0">
              <Check className="w-2.5 h-2.5 text-status-success" />
            </div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Done ──────────────────────────────────────────────────────────────
function StepDone({ schoolName }) {
  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-6">
        <svg viewBox="0 0 32 32" fill="none" className="w-12 h-12">
          <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
          <circle cx="16" cy="18" r="3" fill="#10B981" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-text-primary mb-2">You're all set! 🎉</h3>
      <p className="text-text-secondary mb-6">
        <strong>{schoolName}</strong> is ready to go. Start by adding classes and enrolling students.
      </p>
      <div className="grid grid-cols-3 gap-3 text-left">
        {[
          { emoji: '🏫', label: 'School configured' },
          { emoji: '📚', label: 'Curriculum set' },
          { emoji: '🎓', label: 'Grade levels ready' },
        ].map(({ emoji, label }) => (
          <div key={label} className="p-3 bg-status-successBg rounded-xl text-center">
            <p className="text-xl mb-1">{emoji}</p>
            <p className="text-xs font-medium text-status-success">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Onboarding Component ─────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, schoolId, refreshProfile } = useAuthContext();
  const { setSchoolData } = useSchoolStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    motto: '',
    website: '',
    curriculum_mode: 'ghana_basic',
    selectedGrades: null,
  });

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const canProceed = () => {
    if (step === 1) return formData.name?.trim().length >= 3;
    return true;
  };

  const handleNext = async () => {
    if (step < 4) { setStep(s => s + 1); return; }

    // Step 4 → save everything
    setSaving(true);
    try {
      const schoolConfig = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        motto: formData.motto,
        website: formData.website,
        curriculum_mode: formData.curriculum_mode,
        grading_system: formData.curriculum_mode === 'ghana_shs' ? 'ghana_wassce'
          : formData.curriculum_mode === 'british' ? 'british_gcse'
          : formData.curriculum_mode === 'american' ? 'american_gpa'
          : 'ghana_basic',
        calendar_mode: formData.curriculum_mode === 'american' ? 'semester' : 'trimester',
      };

      let school;
      let resolvedSchoolId = schoolId;

      if (!schoolId) {
        // New user (confirmed via email) — create the school via RPC which also
        // links it to the user's profile (bypasses RLS using security definer).
        const { data: newSchoolId, error: rpcError } = await supabase
          .rpc('create_school_for_user', { school_data: schoolConfig });
        if (rpcError) throw new Error(`Failed to create school: ${rpcError.message}`);
        resolvedSchoolId = newSchoolId;
        // Re-fetch the school record so we can pass it to setSchoolData
        school = await schoolsApi.getById(resolvedSchoolId);
      } else {
        // Existing school — update it
        school = await schoolsApi.update(schoolId, schoolConfig);
      }

      setSchoolData(school);

      // 2. Create grade levels
      const allLevels = GRADE_LEVELS_BY_CURRICULUM[formData.curriculum_mode] ?? GRADE_LEVELS_BY_CURRICULUM.ghana_basic;
      const selected = formData.selectedGrades ?? allLevels.map(l => l.name);
      const levelRows = allLevels
        .filter(l => selected.includes(l.name))
        .map(l => ({ school_id: resolvedSchoolId, name: l.name, level_group: l.group, order_index: l.order }));
      await gradeLevelsApi.bulkCreate(levelRows);

      // 3. Create default academic year + terms
      const currentYear = new Date().getFullYear();
      const { data: ay } = await academicYearsApi.create({
        school_id: resolvedSchoolId,
        label: `${currentYear}/${currentYear + 1}`,
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear + 1}-08-31`,
        is_current: true,
      });
      const terms = generateGhanaTerms(ay.id, resolvedSchoolId, `${currentYear}-09-01`);
      await academicYearsApi.createTerms(terms);

      await refreshProfile();
      setStep(5);
      toast.success('School setup complete!');
    } catch (err) {
      toast.error(err.message ?? 'Setup failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stepContent = {
    1: <StepSchoolInfo data={formData} onChange={updateField} />,
    2: <StepCurriculum data={formData} onChange={updateField} />,
    3: <StepGradeLevels data={formData} onChange={updateField} />,
    4: <StepAdminSetup profile={profile} />,
    5: <StepDone schoolName={formData.name} />,
  };

  const stepTitles = {
    1: { title: 'Tell us about your school', sub: 'Basic information visible on report cards and receipts' },
    2: { title: 'Choose your curriculum', sub: 'This can be changed later in Settings' },
    3: { title: 'Select grade levels', sub: 'Choose the grades your school currently offers' },
    4: { title: 'Administrator account', sub: 'Review your admin access permissions' },
    5: { title: 'Setup complete!', sub: 'Your school is ready to use' },
  };

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
              <path d="M8 22L16 10L24 22H8Z" fill="white" opacity="0.9" />
              <circle cx="16" cy="18" r="3" fill="#10B981" />
            </svg>
          </div>
          <span className="text-lg font-bold text-text-primary">{APP_NAME}</span>
          <span className="text-text-muted">·</span>
          <span className="text-sm text-text-secondary">School Setup</span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const isDone = step > s.id;
            const isCurrent = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                    isDone && 'bg-brand-600 border-brand-600',
                    isCurrent && 'bg-white border-brand-600',
                    !isDone && !isCurrent && 'bg-white border-border'
                  )}>
                    {isDone
                      ? <Check className="w-4 h-4 text-white" />
                      : <Icon className={cn('w-4 h-4', isCurrent ? 'text-brand-600' : 'text-text-muted')} />
                    }
                  </div>
                  <span className={cn('text-xs font-medium whitespace-nowrap', isCurrent ? 'text-brand-700' : isDone ? 'text-text-secondary' : 'text-text-muted')}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-px w-12 mx-1 mb-5 transition-all', isDone ? 'bg-brand-600' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">{stepTitles[step]?.title}</h2>
            <p className="text-sm text-text-secondary mt-1">{stepTitles[step]?.sub}</p>
          </div>

          <div className="p-6 max-h-[420px] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {stepContent[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-6 border-t border-border flex items-center justify-between">
            {step > 1 && step < 5 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || saving}
                className="btn-primary"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : step === 4 ? (
                  <>Complete setup <Check className="w-4 h-4" /></>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="btn-primary"
              >
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
