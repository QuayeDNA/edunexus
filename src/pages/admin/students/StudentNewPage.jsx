import { useState, useCallback } from 'react';
import { Loader2, ChevronRight, ChevronLeft, Check, User, BookOpen, Heart, Users, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useCreateStudent } from '../../../hooks/useStudents.js';
import { GENDER_OPTIONS, BLOOD_TYPES, GHANA_REGIONS, GUARDIAN_RELATIONSHIPS } from '../../../utils/constants.js';
import { cn } from '../../../utils/cn.js';
import { storageApi } from '../../../services/api/storage.js';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, label: 'Personal Info',  icon: User,      desc: 'Basic student details' },
  { id: 2, label: 'Academic',       icon: BookOpen,  desc: 'Class & enrollment' },
  { id: 3, label: 'Medical',        icon: Heart,     desc: 'Health information' },
  { id: 4, label: 'Guardian',       icon: Users,     desc: 'Parent / guardian' },
];

const FIELD_CLS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300 transition-all placeholder:text-text-muted';
const LABEL_CLS = 'block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5';

function FormField({ label, error, children, required }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}{required && <span className="text-status-danger ml-0.5">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
    </div>
  );
}

export default function StudentNewPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const { data: classesData } = useClasses(schoolId);
  const createStudent = useCreateStudent();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);

  const [form, setForm] = useState({
    // Personal
    first_name: '', last_name: '', other_names: '',
    date_of_birth: '', gender: '', nationality: 'Ghanaian',
    religion: '', blood_type: '', photo_url: '',
    address: '', city: '', region: '', admission_number: '',
    // Academic
    admission_date: new Date().toISOString().split('T')[0],
    current_class_id: '', status: 'Active',
    student_id_number: '',
    // Medical
    medical_conditions: '', allergies: '', doctor_name: '', doctor_phone: '',
    // Guardian (separate - would be created separately in production)
    guardian_first_name: '', guardian_last_name: '',
    guardian_relationship: 'Mother', guardian_phone: '',
    guardian_email: '', guardian_occupation: '',
  });

  const classes = classesData?.data ?? [];

  const set = useCallback((k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  }, [errors]);

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.first_name.trim()) e.first_name = 'First name is required';
      if (!form.last_name.trim()) e.last_name = 'Last name is required';
      if (!form.gender) e.gender = 'Please select a gender';
    }
    if (step === 2) {
      if (!form.admission_date) e.admission_date = 'Admission date is required';
    }
    if (step === 4) {
      if (!form.guardian_first_name.trim()) e.guardian_first_name = 'Guardian first name required';
      if (!form.guardian_last_name.trim()) e.guardian_last_name = 'Guardian last name required';
      if (!form.guardian_phone.trim()) e.guardian_phone = 'Guardian phone required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    try {
      const payload = {
        school_id: schoolId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        other_names: form.other_names.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        nationality: form.nationality || 'Ghanaian',
        religion: form.religion || null,
        blood_type: form.blood_type || null,
        photo_url: form.photo_url || null,
        address: form.address || null,
        city: form.city || null,
        region: form.region || null,
        admission_date: form.admission_date || null,
        admission_number: form.admission_number || null,
        student_id_number: form.student_id_number || null,
        current_class_id: form.current_class_id || null,
        status: form.status,
        medical_conditions: form.medical_conditions || null,
        allergies: form.allergies || null,
        doctor_name: form.doctor_name || null,
        doctor_phone: form.doctor_phone || null,
      };
      const created = await createStudent.mutateAsync(payload);
      navigate(`/admin/students/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create student');
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const { publicUrl } = await storageApi.uploadPublicImage({
        file,
        folder: `students/${schoolId || 'unknown'}`,
      });
      set('photo_url', publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/students" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Enroll New Student</h1>
          <p className="text-sm text-text-secondary">Step {step} of {STEPS.length} — {STEPS[step-1].desc}</p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => done && setStep(s.id)}
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all text-sm font-bold',
                      done && 'bg-brand-600 border-brand-600 cursor-pointer',
                      active && 'bg-white border-brand-600 ring-4 ring-brand-100',
                      !done && !active && 'bg-white border-border text-text-muted'
                    )}
                  >
                    {done ? <Check className="w-4 h-4 text-white" /> : <Icon className={cn('w-4 h-4', active ? 'text-brand-600' : 'text-text-muted')} />}
                  </button>
                  <span className={cn('text-[10px] font-semibold mt-1 whitespace-nowrap', active ? 'text-brand-700' : done ? 'text-text-secondary' : 'text-text-muted')}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 mb-4', done ? 'bg-brand-600' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{STEPS[step-1].label}</h2>
          <p className="text-sm text-text-muted mt-0.5">{STEPS[step-1].desc}</p>
        </div>

        <div className="p-6">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-5">
              <FormField label="Photo">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-surface-hover border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="btn-secondary inline-flex cursor-pointer">
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {photoUploading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={photoUploading}
                      />
                    </label>
                    <input
                      value={form.photo_url}
                      onChange={e => set('photo_url', e.target.value)}
                      className={FIELD_CLS}
                      placeholder="Or paste an image URL"
                    />
                    <p className="text-xs text-text-muted">Uploads to Supabase bucket: student-photos</p>
                  </div>
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="First Name" required error={errors.first_name}>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={cn(FIELD_CLS, errors.first_name && 'border-status-danger')} placeholder="Kofi" />
                </FormField>
                <FormField label="Last Name" required error={errors.last_name}>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={cn(FIELD_CLS, errors.last_name && 'border-status-danger')} placeholder="Mensah" />
                </FormField>
                <FormField label="Other Names">
                  <input value={form.other_names} onChange={e => set('other_names', e.target.value)} className={FIELD_CLS} placeholder="Middle name(s)" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Gender" required error={errors.gender}>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)} className={cn(FIELD_CLS, errors.gender && 'border-status-danger')}>
                    <option value="">Select...</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </FormField>
                <FormField label="Date of Birth">
                  <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={FIELD_CLS} />
                </FormField>
                <FormField label="Nationality">
                  <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={FIELD_CLS} placeholder="Ghanaian" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Religion">
                  <select value={form.religion} onChange={e => set('religion', e.target.value)} className={FIELD_CLS}>
                    <option value="">Select...</option>
                    {['Christianity', 'Islam', 'Traditional', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Blood Type">
                  <select value={form.blood_type} onChange={e => set('blood_type', e.target.value)} className={FIELD_CLS}>
                    <option value="">Select...</option>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Address</p>
                <div className="space-y-4">
                  <FormField label="Street Address">
                    <input value={form.address} onChange={e => set('address', e.target.value)} className={FIELD_CLS} placeholder="14 Ring Road, Accra" />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="City">
                      <input value={form.city} onChange={e => set('city', e.target.value)} className={FIELD_CLS} placeholder="Accra" />
                    </FormField>
                    <FormField label="Region">
                      <select value={form.region} onChange={e => set('region', e.target.value)} className={FIELD_CLS}>
                        <option value="">Select region...</option>
                        {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </FormField>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Academic */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Student ID Number">
                  <input value={form.student_id_number} onChange={e => set('student_id_number', e.target.value)} className={FIELD_CLS} placeholder="STU-2026-0001" />
                </FormField>
                <FormField label="Admission Number">
                  <input value={form.admission_number} onChange={e => set('admission_number', e.target.value)} className={FIELD_CLS} placeholder="ADM-2026-001" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Admission Date" required error={errors.admission_date}>
                  <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} className={cn(FIELD_CLS, errors.admission_date && 'border-status-danger')} />
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={e => set('status', e.target.value)} className={FIELD_CLS}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Transferred">Transferred</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Assign to Class">
                <select value={form.current_class_id} onChange={e => set('current_class_id', e.target.value)} className={FIELD_CLS}>
                  <option value="">Unassigned</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.grade_levels?.name ? `(${c.grade_levels.name})` : ''}</option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-status-warning mt-1.5">
                    No classes found. <Link to="/admin/classes" className="underline">Create a class first</Link>.
                  </p>
                )}
              </FormField>

              <div className="bg-surface-muted/60 rounded-xl p-4 border border-border">
                <p className="text-sm font-medium text-text-primary mb-1">📋 Quick Note</p>
                <p className="text-xs text-text-secondary">Student ID numbers should follow your school's format (e.g., AAB-2026-0001). You can leave it blank to assign later.</p>
              </div>
            </div>
          )}

          {/* Step 3: Medical */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-status-infoBg border border-status-info/20 rounded-xl p-4">
                <p className="text-sm font-medium text-status-info mb-1">🏥 Health Information</p>
                <p className="text-xs text-status-info/80">This information is confidential and only visible to authorized staff.</p>
              </div>

              <FormField label="Known Medical Conditions">
                <textarea
                  value={form.medical_conditions}
                  onChange={e => set('medical_conditions', e.target.value)}
                  className={cn(FIELD_CLS, 'resize-none')}
                  rows={3}
                  placeholder="e.g. Asthma, Diabetes, Epilepsy..."
                />
              </FormField>

              <FormField label="Known Allergies">
                <textarea
                  value={form.allergies}
                  onChange={e => set('allergies', e.target.value)}
                  className={cn(FIELD_CLS, 'resize-none')}
                  rows={3}
                  placeholder="e.g. Peanuts, Penicillin, Latex..."
                />
              </FormField>

              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Emergency Doctor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Doctor's Name">
                    <input value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} className={FIELD_CLS} placeholder="Dr. Mensah" />
                  </FormField>
                  <FormField label="Doctor's Phone">
                    <input value={form.doctor_phone} onChange={e => set('doctor_phone', e.target.value)} className={FIELD_CLS} placeholder="0244000000" />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Guardian */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name" required error={errors.guardian_first_name}>
                  <input value={form.guardian_first_name} onChange={e => set('guardian_first_name', e.target.value)} className={cn(FIELD_CLS, errors.guardian_first_name && 'border-status-danger')} placeholder="Ama" />
                </FormField>
                <FormField label="Last Name" required error={errors.guardian_last_name}>
                  <input value={form.guardian_last_name} onChange={e => set('guardian_last_name', e.target.value)} className={cn(FIELD_CLS, errors.guardian_last_name && 'border-status-danger')} placeholder="Mensah" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Relationship">
                  <select value={form.guardian_relationship} onChange={e => set('guardian_relationship', e.target.value)} className={FIELD_CLS}>
                    {GUARDIAN_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Phone Number" required error={errors.guardian_phone}>
                  <input value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} className={cn(FIELD_CLS, errors.guardian_phone && 'border-status-danger')} placeholder="0244000000" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Email Address">
                  <input type="email" value={form.guardian_email} onChange={e => set('guardian_email', e.target.value)} className={FIELD_CLS} placeholder="parent@email.com" />
                </FormField>
                <FormField label="Occupation">
                  <input value={form.guardian_occupation} onChange={e => set('guardian_occupation', e.target.value)} className={FIELD_CLS} placeholder="Teacher, Trader, etc." />
                </FormField>
              </div>

              {/* Summary Card */}
              <div className="mt-4 border border-border rounded-xl p-5 bg-surface-muted/40">
                <p className="text-sm font-semibold text-text-primary mb-3">📋 Enrollment Summary</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-text-muted">Name: </span><span className="font-medium">{form.first_name} {form.last_name}</span></div>
                  <div><span className="text-text-muted">Gender: </span><span className="font-medium">{form.gender || '—'}</span></div>
                  <div><span className="text-text-muted">Class: </span><span className="font-medium">{classes.find(c => c.id === form.current_class_id)?.name || 'Unassigned'}</span></div>
                  <div><span className="text-text-muted">Status: </span><span className="font-medium">{form.status}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-muted/30">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/students')}
            className="btn-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length ? (
            <button onClick={handleNext} className="btn-primary">
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createStudent.isPending}
              className="btn-primary"
            >
              {createStudent.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" />
              Enroll Student
            </button>
          )}
        </div>
      </div>
    </div>
  );
}