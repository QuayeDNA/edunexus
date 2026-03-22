import { useEffect, useState } from 'react';
import { Loader2, Edit2, Trash2, ChevronLeft, User, BookOpen, Heart, Users, Activity, Save, X, Phone, Mail, MapPin, Calendar, Droplets, Award, Clock, Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStudent, useUpdateStudent, useDeleteStudent } from '../../../hooks/useStudents.js';
import { useClasses } from '../../../hooks/useClasses.js';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { GENDER_OPTIONS, BLOOD_TYPES, GHANA_REGIONS, GUARDIAN_RELATIONSHIPS } from '../../../utils/constants.js';
import { formatDate, formatRelativeTime } from '../../../utils/formatters.js';
import { cn } from '../../../utils/cn.js';
import { storageApi } from '../../../services/api/storage.js';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: User },
  { id: 'academic',  label: 'Academic',  icon: BookOpen },
  { id: 'medical',   label: 'Medical',   icon: Heart },
  { id: 'guardian',  label: 'Guardian',  icon: Users },
  { id: 'activity',  label: 'Activity',  icon: Activity },
];

const FIELD_CLS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300 transition-all placeholder:text-text-muted disabled:bg-surface-muted disabled:text-text-muted';
const LABEL_CLS = 'block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5';

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const { data: student, isLoading } = useStudent(id);
  const { data: classesData } = useClasses(schoolId);
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);

  const classes = classesData?.data ?? [];

  useEffect(() => {
    if (student) {
      setForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        other_names: student.other_names || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        nationality: student.nationality || 'Ghanaian',
        religion: student.religion || '',
        blood_type: student.blood_type || '',
        photo_url: student.photo_url || '',
        address: student.address || '',
        city: student.city || '',
        region: student.region || '',
        admission_date: student.admission_date || '',
        admission_number: student.admission_number || '',
        student_id_number: student.student_id_number || '',
        current_class_id: student.current_class_id || '',
        status: student.status || 'Active',
        medical_conditions: student.medical_conditions || '',
        allergies: student.allergies || '',
        doctor_name: student.doctor_name || '',
        doctor_phone: student.doctor_phone || '',
      });
    }
  }, [student]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    try {
      await updateStudent.mutateAsync({
        id,
        data: {
          ...form,
          date_of_birth: form.date_of_birth || null,
          admission_date: form.admission_date || null,
        },
      });
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update student');
    }
  };

  const handleDelete = async () => {
    await deleteStudent.mutateAsync(id);
    navigate('/admin/students');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const { publicUrl } = await storageApi.uploadPublicImage({
        file,
        folder: `students/${schoolId || 'unknown'}/${id || 'record'}`,
      });
      set('photo_url', publicUrl);
      toast.success('Photo uploaded. Click Save to apply changes.');
    } catch (err) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-4">Student not found.</p>
        <Link to="/admin/students" className="btn-primary inline-flex">Back to Students</Link>
      </div>
    );
  }

  const guardian = student.student_guardians?.[0]?.guardians;
  const currentClass = student.classes;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/students" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary truncate">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-sm text-text-secondary">{student.student_id_number || 'No student ID'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={updateStudent.isPending} className="btn-primary">
                {updateStudent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setShowDelete(true)} className="btn-danger">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Hero */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            <Avatar
              src={editing ? form.photo_url : student.photo_url}
              firstName={student.first_name}
              lastName={student.last_name}
              size="2xl"
            />
            <div className={cn(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white',
              student.status === 'Active' ? 'bg-status-success' : 'bg-surface-hover'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-xl font-bold text-text-primary">
                {student.first_name} {student.other_names ? `${student.other_names} ` : ''}{student.last_name}
              </h2>
              <StatusBadge status={student.status || 'Active'} dot />
              {student.gender && (
                <span className={cn('px-2 py-0.5 rounded text-xs font-semibold',
                  student.gender === 'Male' ? 'bg-blue-50 text-blue-700' :
                  student.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'
                )}>{student.gender}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-secondary">
              {currentClass && (
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-text-muted" />{currentClass.name}</span>
              )}
              {student.date_of_birth && (
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-text-muted" />{formatDate(student.date_of_birth)}</span>
              )}
              {student.blood_type && (
                <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-text-muted" />{student.blood_type}</span>
              )}
              {student.nationality && (
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-text-muted" />{student.nationality}</span>
              )}
            </div>
            {editing && (
              <div className="mt-3 space-y-2">
                <label className={LABEL_CLS}>Photo</label>
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
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 text-right flex-shrink-0">
            <div className="text-xs text-text-muted">Admitted</div>
            <div className="text-sm font-medium text-text-primary">{formatDate(student.admission_date)}</div>
            <div className="text-xs text-text-muted mt-1">Created {formatRelativeTime(student.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  tab === t.id
                    ? 'border-brand-600 text-brand-600 bg-brand-50/30'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-muted/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Personal Details</h3>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>First Name *</label>
                        <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={FIELD_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Last Name *</label>
                        <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={FIELD_CLS} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Other Names</label>
                      <input value={form.other_names} onChange={e => set('other_names', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Gender</label>
                        <select value={form.gender} onChange={e => set('gender', e.target.value)} className={FIELD_CLS}>
                          <option value="">—</option>
                          {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Date of Birth</label>
                        <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={FIELD_CLS} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Nationality</label>
                        <input value={form.nationality} onChange={e => set('nationality', e.target.value)} className={FIELD_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Religion</label>
                        <select value={form.religion} onChange={e => set('religion', e.target.value)} className={FIELD_CLS}>
                          <option value="">—</option>
                          {['Christianity', 'Islam', 'Traditional', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Blood Type</label>
                      <select value={form.blood_type} onChange={e => set('blood_type', e.target.value)} className={FIELD_CLS}>
                        <option value="">—</option>
                        {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Full Name" value={`${student.first_name} ${student.other_names || ''} ${student.last_name}`.trim()} icon={User} />
                    <InfoRow label="Gender" value={student.gender} icon={User} />
                    <InfoRow label="Date of Birth" value={formatDate(student.date_of_birth)} icon={Calendar} />
                    <InfoRow label="Nationality" value={student.nationality} icon={Award} />
                    <InfoRow label="Religion" value={student.religion} icon={Award} />
                    <InfoRow label="Blood Type" value={student.blood_type} icon={Droplets} />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Address</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>Street Address</label>
                      <input value={form.address} onChange={e => set('address', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>City</label>
                        <input value={form.city} onChange={e => set('city', e.target.value)} className={FIELD_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Region</label>
                        <select value={form.region} onChange={e => set('region', e.target.value)} className={FIELD_CLS}>
                          <option value="">—</option>
                          {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Street" value={student.address} icon={MapPin} />
                    <InfoRow label="City" value={student.city} icon={MapPin} />
                    <InfoRow label="Region" value={student.region} icon={MapPin} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Academic Tab */}
          {tab === 'academic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Enrollment Details</h3>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className={LABEL_CLS}>Student ID Number</label>
                      <input value={form.student_id_number} onChange={e => set('student_id_number', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Admission Number</label>
                      <input value={form.admission_number} onChange={e => set('admission_number', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Admission Date</label>
                      <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Current Class</label>
                      <select value={form.current_class_id} onChange={e => set('current_class_id', e.target.value)} className={FIELD_CLS}>
                        <option value="">Unassigned</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Status</label>
                      <select value={form.status} onChange={e => set('status', e.target.value)} className={FIELD_CLS}>
                        {['Active', 'Inactive', 'Graduated', 'Transferred', 'Suspended'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Student ID" value={student.student_id_number} icon={Award} />
                    <InfoRow label="Admission No." value={student.admission_number} icon={Award} />
                    <InfoRow label="Admission Date" value={formatDate(student.admission_date)} icon={Calendar} />
                    <InfoRow label="Current Class" value={currentClass?.name} icon={BookOpen} />
                    <InfoRow label="Grade Level" value={currentClass?.grade_levels?.name} icon={BookOpen} />
                    <div className="py-3">
                      <p className="text-xs text-text-muted mb-1">Status</p>
                      <StatusBadge status={student.status || 'Active'} dot />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Academic History</h3>
                <div className="bg-surface-muted/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <BookOpen className="w-8 h-8 text-text-muted mb-2" />
                  <p className="text-sm font-medium text-text-primary">No academic records yet</p>
                  <p className="text-xs text-text-muted mt-1">Grades and assessments will appear here once entered</p>
                </div>
              </div>
            </div>
          )}

          {/* Medical Tab */}
          {tab === 'medical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Health Information</h3>
                <div className="bg-status-dangerBg/40 border border-status-danger/20 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs font-semibold text-status-danger">🔒 Confidential</p>
                  <p className="text-xs text-status-danger/80 mt-0.5">Only visible to authorized medical staff and administrators.</p>
                </div>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className={LABEL_CLS}>Medical Conditions</label>
                      <textarea value={form.medical_conditions} onChange={e => set('medical_conditions', e.target.value)} className={cn(FIELD_CLS, 'resize-none')} rows={4} placeholder="List any known medical conditions..." />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Known Allergies</label>
                      <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)} className={cn(FIELD_CLS, 'resize-none')} rows={4} placeholder="List any known allergies..." />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <p className="text-xs text-text-muted mb-2">Medical Conditions</p>
                      <div className={cn('rounded-lg p-3 text-sm', student.medical_conditions ? 'bg-status-warningBg border border-status-warning/20 text-text-primary' : 'bg-surface-muted text-text-muted')}>
                        {student.medical_conditions || 'None recorded'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-2">Allergies</p>
                      <div className={cn('rounded-lg p-3 text-sm', student.allergies ? 'bg-status-dangerBg border border-status-danger/20 text-text-primary' : 'bg-surface-muted text-text-muted')}>
                        {student.allergies || 'None recorded'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Emergency Doctor</h3>
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className={LABEL_CLS}>Doctor's Name</label>
                      <input value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} className={FIELD_CLS} placeholder="Dr. Mensah" />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Doctor's Phone</label>
                      <input value={form.doctor_phone} onChange={e => set('doctor_phone', e.target.value)} className={FIELD_CLS} placeholder="0244000000" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Doctor's Name" value={student.doctor_name} icon={User} />
                    <InfoRow label="Doctor's Phone" value={student.doctor_phone} icon={Phone} />
                    <InfoRow label="Blood Type" value={student.blood_type} icon={Droplets} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guardian Tab */}
          {tab === 'guardian' && (
            <div>
              {guardian ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Primary Guardian</h3>
                    <div className="flex items-center gap-3 mb-5 p-4 bg-surface-muted/50 rounded-xl border border-border">
                      <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-sm">
                        {guardian.first_name?.[0]}{guardian.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{guardian.first_name} {guardian.last_name}</p>
                        <p className="text-xs text-text-muted">{guardian.relationship || 'Guardian'}</p>
                      </div>
                    </div>
                    <InfoRow label="Phone" value={guardian.phone} icon={Phone} />
                    <InfoRow label="Email" value={guardian.email} icon={Mail} />
                    <InfoRow label="Occupation" value={guardian.occupation} icon={Award} />
                    <InfoRow label="Employer" value={guardian.employer} icon={Award} />
                    <InfoRow label="Address" value={guardian.address} icon={MapPin} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Quick Contact</h3>
                    {guardian.phone && (
                      <a href={`tel:${guardian.phone}`} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-brand-300 hover:bg-brand-50/30 transition-all group mb-3">
                        <div className="w-10 h-10 rounded-lg bg-status-successBg flex items-center justify-center">
                          <Phone className="w-5 h-5 text-status-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">Call Guardian</p>
                          <p className="text-xs text-text-muted">{guardian.phone}</p>
                        </div>
                      </a>
                    )}
                    {guardian.email && (
                      <a href={`mailto:${guardian.email}`} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
                        <div className="w-10 h-10 rounded-lg bg-status-infoBg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-status-info" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">Send Email</p>
                          <p className="text-xs text-text-muted">{guardian.email}</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="font-semibold text-text-primary">No guardian on record</p>
                  <p className="text-sm text-text-muted mt-1">Guardian information wasn't added during enrollment</p>
                  <button className="btn-primary mt-4 text-sm">Add Guardian</button>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {tab === 'activity' && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-muted/50 border border-border">
                  <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Student record created</p>
                    <p className="text-xs text-text-muted">{formatRelativeTime(student.created_at)}</p>
                  </div>
                </div>
                <div className="text-center py-8 text-text-muted text-sm">
                  <Clock className="w-6 h-6 mx-auto mb-2" />
                  <p>More activity will appear here as the student's record is updated</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        loading={deleteStudent.isPending}
        title={`Delete ${student.first_name} ${student.last_name}?`}
        message="This permanently removes the student record, grades, attendance, and all associated data. This cannot be undone."
        confirmLabel="Delete Student"
      />
    </div>
  );
}