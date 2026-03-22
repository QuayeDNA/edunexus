import { useState, useCallback } from 'react';
import { Loader2, ChevronRight, ChevronLeft, Check, User, Briefcase, DollarSign, FileText, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useCreateStaff } from '../../../hooks/useStaff.js';
import { GENDER_OPTIONS, BLOOD_TYPES, GHANA_REGIONS, STAFF_ROLES, EMPLOYMENT_TYPES } from '../../../utils/constants.js';
import { cn } from '../../../utils/cn.js';
import { storageApi } from '../../../services/api/storage.js';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, label: 'Personal',    icon: User,        desc: 'Basic personal details' },
  { id: 2, label: 'Employment',  icon: Briefcase,   desc: 'Role & work details' },
  { id: 3, label: 'Payroll',     icon: DollarSign,  desc: 'Salary & banking' },
  { id: 4, label: 'Documents',   icon: FileText,    desc: 'ID & qualifications' },
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

export default function StaffNewPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const createStaff = useCreateStaff();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);

  const [form, setForm] = useState({
    // Personal
    first_name: '', last_name: '', date_of_birth: '',
    gender: '', photo_url: '', phone: '', email: '',
    address: '', region: '', nationality: 'Ghanaian',
    // Employment
    role: 'Teacher', department: '', qualification: '',
    specialization: '', employment_type: 'Full-time',
    employment_status: 'Active', start_date: new Date().toISOString().split('T')[0],
    staff_id_number: '',
    // Payroll
    salary: '', housing_allowance: '', transport_allowance: '',
    other_allowances: '', bank_name: '', bank_account: '',
    social_security_number: '', tin_number: '',
    // Documents
    // (metadata fields - not separate files in this form)
  });

  const set = useCallback((k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: undefined }));
  }, [errors]);

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.first_name.trim()) e.first_name = 'First name required';
      if (!form.last_name.trim()) e.last_name = 'Last name required';
      if (!form.phone.trim()) e.phone = 'Phone number required';
    }
    if (step === 2) {
      if (!form.role) e.role = 'Role is required';
      if (!form.start_date) e.start_date = 'Start date required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) setStep(s => s + 1); };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        school_id: schoolId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        photo_url: form.photo_url || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address || null,
        region: form.region || null,
        nationality: form.nationality || 'Ghanaian',
        role: form.role,
        department: form.department || null,
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        employment_type: form.employment_type || 'Full-time',
        employment_status: form.employment_status || 'Active',
        start_date: form.start_date || null,
        staff_id_number: form.staff_id_number || null,
        salary: form.salary ? Number(form.salary) : null,
        housing_allowance: form.housing_allowance ? Number(form.housing_allowance) : 0,
        transport_allowance: form.transport_allowance ? Number(form.transport_allowance) : 0,
        other_allowances: form.other_allowances ? Number(form.other_allowances) : 0,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        social_security_number: form.social_security_number || null,
        tin_number: form.tin_number || null,
      };
      const created = await createStaff.mutateAsync(payload);
      navigate(`/admin/staff/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create staff member');
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const { publicUrl } = await storageApi.uploadPublicImage({
        file,
        folder: `staff/${schoolId || 'unknown'}`,
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

  const grossSalary = [form.salary, form.housing_allowance, form.transport_allowance, form.other_allowances]
    .map(v => Number(v) || 0)
    .reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/staff" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Add Staff Member</h1>
          <p className="text-sm text-text-secondary">Step {step} of {STEPS.length} — {STEPS[step-1].desc}</p>
        </div>
      </div>

      {/* Progress */}
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
                      'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                      done && 'bg-brand-600 border-brand-600 cursor-pointer',
                      active && 'bg-white border-brand-600 ring-4 ring-brand-100',
                      !done && !active && 'bg-white border-border'
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
          {/* Step 1: Personal */}
          {step === 1 && (
            <div className="space-y-5">
              <FormField label="Photo">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-surface-hover border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-text-muted" />}
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
                    <input value={form.photo_url} onChange={e => set('photo_url', e.target.value)} className={FIELD_CLS} placeholder="Or paste an image URL" />
                    <p className="text-xs text-text-muted">Uploads to Supabase bucket: student-photos</p>
                  </div>
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First Name" required error={errors.first_name}>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={cn(FIELD_CLS, errors.first_name && 'border-status-danger')} placeholder="Kwame" />
                </FormField>
                <FormField label="Last Name" required error={errors.last_name}>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={cn(FIELD_CLS, errors.last_name && 'border-status-danger')} placeholder="Mensah" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Gender">
                  <select value={form.gender} onChange={e => set('gender', e.target.value)} className={FIELD_CLS}>
                    <option value="">Select...</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </FormField>
                <FormField label="Date of Birth">
                  <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={FIELD_CLS} />
                </FormField>
                <FormField label="Nationality">
                  <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={FIELD_CLS} />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone Number" required error={errors.phone}>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} className={cn(FIELD_CLS, errors.phone && 'border-status-danger')} placeholder="0244000000" />
                </FormField>
                <FormField label="Email Address">
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={FIELD_CLS} placeholder="staff@school.edu.gh" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Address">
                  <input value={form.address} onChange={e => set('address', e.target.value)} className={FIELD_CLS} placeholder="14 Ring Road, Accra" />
                </FormField>
                <FormField label="Region">
                  <select value={form.region} onChange={e => set('region', e.target.value)} className={FIELD_CLS}>
                    <option value="">Select region...</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {/* Step 2: Employment */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Staff ID Number">
                  <input value={form.staff_id_number} onChange={e => set('staff_id_number', e.target.value)} className={FIELD_CLS} placeholder="STF-2026-001" />
                </FormField>
                <FormField label="Employment Type">
                  <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={FIELD_CLS}>
                    {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Role / Position" required error={errors.role}>
                  <select value={form.role} onChange={e => set('role', e.target.value)} className={cn(FIELD_CLS, errors.role && 'border-status-danger')}>
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Department">
                  <input value={form.department} onChange={e => set('department', e.target.value)} className={FIELD_CLS} placeholder="Mathematics, Sciences, Admin..." />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Qualification">
                  <input value={form.qualification} onChange={e => set('qualification', e.target.value)} className={FIELD_CLS} placeholder="B.Ed., B.Sc., etc." />
                </FormField>
                <FormField label="Specialization">
                  <input value={form.specialization} onChange={e => set('specialization', e.target.value)} className={FIELD_CLS} placeholder="Mathematics, English, etc." />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start Date" required error={errors.start_date}>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={cn(FIELD_CLS, errors.start_date && 'border-status-danger')} />
                </FormField>
                <FormField label="Employment Status">
                  <select value={form.employment_status} onChange={e => set('employment_status', e.target.value)} className={FIELD_CLS}>
                    {['Active', 'On Leave', 'Terminated', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {/* Step 3: Payroll */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-brand-700">💰 Salary Calculator</p>
                <p className="text-xs text-brand-600 mt-0.5">All amounts in Ghana Cedis (GH₵). Gross = Basic + all allowances.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Basic Salary (GHS)">
                  <input type="number" min="0" step="0.01" value={form.salary} onChange={e => set('salary', e.target.value)} className={FIELD_CLS} placeholder="0.00" />
                </FormField>
                <FormField label="Housing Allowance (GHS)">
                  <input type="number" min="0" step="0.01" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)} className={FIELD_CLS} placeholder="0.00" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Transport Allowance (GHS)">
                  <input type="number" min="0" step="0.01" value={form.transport_allowance} onChange={e => set('transport_allowance', e.target.value)} className={FIELD_CLS} placeholder="0.00" />
                </FormField>
                <FormField label="Other Allowances (GHS)">
                  <input type="number" min="0" step="0.01" value={form.other_allowances} onChange={e => set('other_allowances', e.target.value)} className={FIELD_CLS} placeholder="0.00" />
                </FormField>
              </div>

              {/* Gross Summary */}
              <div className="bg-surface-muted/50 rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Estimated Gross Salary</p>
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    GH₵ {grossSalary.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-text-muted mt-1">SSNIT (5.5%) = GH₵ {(grossSalary * 0.055).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Est. Net (approx.)</p>
                  <p className="text-lg font-semibold text-status-success">
                    GH₵ {(grossSalary * 0.93).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Banking Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Bank Name">
                    <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={FIELD_CLS} placeholder="GCB, Fidelity, Ecobank..." />
                  </FormField>
                  <FormField label="Account Number">
                    <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} className={FIELD_CLS} placeholder="Account number" />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Social Security (SSNIT)">
                  <input value={form.social_security_number} onChange={e => set('social_security_number', e.target.value)} className={FIELD_CLS} placeholder="SSNIT number" />
                </FormField>
                <FormField label="TIN Number">
                  <input value={form.tin_number} onChange={e => set('tin_number', e.target.value)} className={FIELD_CLS} placeholder="Tax Identification Number" />
                </FormField>
              </div>

              {/* Summary */}
              <div className="mt-4 border border-border rounded-xl p-5 bg-surface-muted/40">
                <p className="text-sm font-semibold text-text-primary mb-3">📋 Staff Summary</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-text-muted">Name: </span><span className="font-medium">{form.first_name} {form.last_name}</span></div>
                  <div><span className="text-text-muted">Role: </span><span className="font-medium">{form.role}</span></div>
                  <div><span className="text-text-muted">Department: </span><span className="font-medium">{form.department || '—'}</span></div>
                  <div><span className="text-text-muted">Type: </span><span className="font-medium">{form.employment_type}</span></div>
                  <div><span className="text-text-muted">Start Date: </span><span className="font-medium">{form.start_date || '—'}</span></div>
                  <div><span className="text-text-muted">Basic Salary: </span><span className="font-medium">GH₵ {Number(form.salary || 0).toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-muted/30">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/staff')}
            className="btn-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length ? (
            <button onClick={handleNext} className="btn-primary">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={createStaff.isPending} className="btn-primary">
              {createStaff.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" />
              Add Staff Member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}