import { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, Edit2, Trash2, Save, X, User, Briefcase, DollarSign, FileText, Phone, Mail, MapPin, Calendar, Building2, Award, TrendingUp, Clock, Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStaffMember, useUpdateStaff, useDeleteStaff } from '../../../hooks/useStaff.js';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import { GENDER_OPTIONS, STAFF_ROLES, EMPLOYMENT_TYPES, GHANA_REGIONS } from '../../../utils/constants.js';
import { formatDate, formatGHS, formatRelativeTime } from '../../../utils/formatters.js';
import { calculatePayslip } from '../../../utils/ghanaPayroll.js';
import { cn } from '../../../utils/cn.js';
import { storageApi } from '../../../services/api/storage.js';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'employment', label: 'Employment', icon: Briefcase },
  { id: 'payroll',    label: 'Payroll',    icon: DollarSign },
  { id: 'documents',  label: 'Documents',  icon: FileText },
];

const FIELD_CLS = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-300 transition-all placeholder:text-text-muted disabled:bg-surface-muted disabled:text-text-muted';
const LABEL_CLS = 'block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5';

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

function PaylineItem({ label, value, positive = true, bold = false }) {
  return (
    <div className={cn('flex justify-between items-center py-2.5 border-b border-border/50 last:border-0', bold && 'border-border')}>
      <span className={cn('text-sm', bold ? 'font-semibold text-text-primary' : 'text-text-secondary')}>{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', bold ? 'text-text-primary text-base' : positive ? 'text-text-primary' : 'text-status-danger')}>
        {positive ? '' : '- '}{formatGHS(value)}
      </span>
    </div>
  );
}

export default function StaffDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const { data: staff, isLoading } = useStaffMember(id);
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        date_of_birth: staff.date_of_birth || '',
        gender: staff.gender || '',
        phone: staff.phone || '',
        email: staff.email || '',
        address: staff.address || '',
        region: staff.region || '',
        nationality: staff.nationality || 'Ghanaian',
        photo_url: staff.photo_url || '',
        // Employment
        role: staff.role || 'Teacher',
        department: staff.department || '',
        qualification: staff.qualification || '',
        specialization: staff.specialization || '',
        employment_type: staff.employment_type || 'Full-time',
        employment_status: staff.employment_status || 'Active',
        start_date: staff.start_date || '',
        end_date: staff.end_date || '',
        staff_id_number: staff.staff_id_number || '',
        // Payroll
        salary: staff.salary || '',
        housing_allowance: staff.housing_allowance || '',
        transport_allowance: staff.transport_allowance || '',
        other_allowances: staff.other_allowances || '',
        bank_name: staff.bank_name || '',
        bank_account: staff.bank_account || '',
        // Documents
        social_security_number: staff.social_security_number || '',
        tin_number: staff.tin_number || '',
      });
    }
  }, [staff]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    try {
      await updateStaff.mutateAsync({
        id,
        data: {
          ...form,
          date_of_birth: form.date_of_birth || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          salary: form.salary ? Number(form.salary) : null,
          housing_allowance: form.housing_allowance ? Number(form.housing_allowance) : 0,
          transport_allowance: form.transport_allowance ? Number(form.transport_allowance) : 0,
          other_allowances: form.other_allowances ? Number(form.other_allowances) : 0,
        },
      });
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update staff');
    }
  };

  const handleDelete = async () => {
    await deleteStaff.mutateAsync(id);
    navigate('/admin/staff');
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      const { publicUrl } = await storageApi.uploadPublicImage({
        file,
        folder: `staff/${schoolId || 'unknown'}/${id || 'record'}`,
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

  if (!staff) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-4">Staff member not found.</p>
        <Link to="/admin/staff" className="btn-primary inline-flex">Back to Staff</Link>
      </div>
    );
  }

  const payslip = calculatePayslip({
    salary: Number(staff.salary || 0),
    housing_allowance: Number(staff.housing_allowance || 0),
    transport_allowance: Number(staff.transport_allowance || 0),
    other_allowances: Number(staff.other_allowances || 0),
  });

  const ROLE_COLOR_MAP = {
    Teacher: 'bg-brand-50 text-brand-700',
    'Head Teacher': 'bg-purple-50 text-purple-700',
    Admin: 'bg-orange-50 text-orange-700',
    Accountant: 'bg-green-50 text-green-700',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/staff" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-text-primary">{staff.first_name} {staff.last_name}</h1>
          <p className="text-sm text-text-secondary">{staff.staff_id_number || 'No staff ID'} · {staff.department || 'No department'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /> Cancel</button>
              <button onClick={handleSave} disabled={updateStaff.isPending} className="btn-primary">
                {updateStaff.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary"><Edit2 className="w-4 h-4" /> Edit</button>
              <button onClick={() => setShowDelete(true)} className="btn-danger"><Trash2 className="w-4 h-4" /> Remove</button>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar src={editing ? form.photo_url : staff.photo_url} firstName={staff.first_name} lastName={staff.last_name} size="2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-xl font-bold text-text-primary">{staff.first_name} {staff.last_name}</h2>
              <StatusBadge status={staff.employment_status || 'Active'} dot />
              <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', ROLE_COLOR_MAP[staff.role] || 'bg-surface-hover text-text-muted')}>
                {staff.role}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-secondary">
              {staff.department && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-text-muted" />{staff.department}</span>}
              {staff.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-text-muted" />{staff.phone}</span>}
              {staff.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-text-muted" />{staff.email}</span>}
              {staff.employment_type && <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-text-muted" />{staff.employment_type}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-text-muted">Gross Salary</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">{formatGHS(payslip.gross)}</div>
            <div className="text-xs text-text-muted mt-1">Started {formatDate(staff.start_date)}</div>
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
                  tab === t.id ? 'border-brand-600 text-brand-600 bg-brand-50/30' : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-muted/50'
                )}
              >
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Personal Details</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL_CLS}>First Name</label><input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={FIELD_CLS} /></div>
                      <div><label className={LABEL_CLS}>Last Name</label><input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={FIELD_CLS} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Gender</label>
                        <select value={form.gender} onChange={e => set('gender', e.target.value)} className={FIELD_CLS}>
                          <option value="">—</option>
                          {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div><label className={LABEL_CLS}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={FIELD_CLS} /></div>
                    </div>
                    <div><label className={LABEL_CLS}>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Address</label><input value={form.address} onChange={e => set('address', e.target.value)} className={FIELD_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>Region</label>
                      <select value={form.region} onChange={e => set('region', e.target.value)} className={FIELD_CLS}>
                        <option value="">—</option>
                        {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
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
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Full Name" value={`${staff.first_name} ${staff.last_name}`} icon={User} />
                    <InfoRow label="Gender" value={staff.gender} icon={User} />
                    <InfoRow label="Date of Birth" value={formatDate(staff.date_of_birth)} icon={Calendar} />
                    <InfoRow label="Nationality" value={staff.nationality} icon={Award} />
                    <InfoRow label="Phone" value={staff.phone} icon={Phone} />
                    <InfoRow label="Email" value={staff.email} icon={Mail} />
                    <InfoRow label="Address" value={staff.address} icon={MapPin} />
                    <InfoRow label="Region" value={staff.region} icon={MapPin} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {staff.phone && (
                    <a href={`tel:${staff.phone}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-status-successBg flex items-center justify-center"><Phone className="w-4 h-4 text-status-success" /></div>
                      <div><p className="text-sm font-medium text-text-primary">Call</p><p className="text-xs text-text-muted">{staff.phone}</p></div>
                    </a>
                  )}
                  {staff.email && (
                    <a href={`mailto:${staff.email}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-status-infoBg flex items-center justify-center"><Mail className="w-4 h-4 text-status-info" /></div>
                      <div><p className="text-sm font-medium text-text-primary">Email</p><p className="text-xs text-text-muted">{staff.email}</p></div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {tab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Work Details</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div><label className={LABEL_CLS}>Staff ID</label><input value={form.staff_id_number} onChange={e => set('staff_id_number', e.target.value)} className={FIELD_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>Role</label>
                      <select value={form.role} onChange={e => set('role', e.target.value)} className={FIELD_CLS}>
                        {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div><label className={LABEL_CLS}>Department</label><input value={form.department} onChange={e => set('department', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Qualification</label><input value={form.qualification} onChange={e => set('qualification', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Specialization</label><input value={form.specialization} onChange={e => set('specialization', e.target.value)} className={FIELD_CLS} /></div>
                    <div>
                      <label className={LABEL_CLS}>Employment Type</label>
                      <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className={FIELD_CLS}>
                        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={LABEL_CLS}>Start Date</label><input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={FIELD_CLS} /></div>
                      <div><label className={LABEL_CLS}>End Date</label><input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={FIELD_CLS} /></div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Status</label>
                      <select value={form.employment_status} onChange={e => set('employment_status', e.target.value)} className={FIELD_CLS}>
                        {['Active', 'On Leave', 'Terminated', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Staff ID" value={staff.staff_id_number} icon={Award} />
                    <InfoRow label="Role" value={staff.role} icon={Briefcase} />
                    <InfoRow label="Department" value={staff.department} icon={Building2} />
                    <InfoRow label="Qualification" value={staff.qualification} icon={Award} />
                    <InfoRow label="Specialization" value={staff.specialization} icon={Award} />
                    <InfoRow label="Employment Type" value={staff.employment_type} icon={Briefcase} />
                    <InfoRow label="Start Date" value={formatDate(staff.start_date)} icon={Calendar} />
                    <InfoRow label="End Date" value={formatDate(staff.end_date)} icon={Calendar} />
                    <div className="py-3"><p className="text-xs text-text-muted mb-1">Status</p><StatusBadge status={staff.employment_status || 'Active'} dot /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payroll Tab */}
          {tab === 'payroll' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Salary Components</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div><label className={LABEL_CLS}>Basic Salary (GHS)</label><input type="number" min="0" step="0.01" value={form.salary} onChange={e => set('salary', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Housing Allowance (GHS)</label><input type="number" min="0" step="0.01" value={form.housing_allowance} onChange={e => set('housing_allowance', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Transport Allowance (GHS)</label><input type="number" min="0" step="0.01" value={form.transport_allowance} onChange={e => set('transport_allowance', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>Other Allowances (GHS)</label><input type="number" min="0" step="0.01" value={form.other_allowances} onChange={e => set('other_allowances', e.target.value)} className={FIELD_CLS} /></div>
                    <div className="border-t border-border pt-3">
                      <label className={LABEL_CLS}>Bank Name</label><input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={FIELD_CLS} />
                    </div>
                    <div><label className={LABEL_CLS}>Account Number</label><input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} className={FIELD_CLS} /></div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Basic Salary" value={formatGHS(staff.salary)} icon={DollarSign} />
                    <InfoRow label="Housing Allowance" value={formatGHS(staff.housing_allowance || 0)} icon={DollarSign} />
                    <InfoRow label="Transport Allowance" value={formatGHS(staff.transport_allowance || 0)} icon={DollarSign} />
                    <InfoRow label="Other Allowances" value={formatGHS(staff.other_allowances || 0)} icon={DollarSign} />
                    <InfoRow label="Bank Name" value={staff.bank_name} icon={Award} />
                    <InfoRow label="Account Number" value={staff.bank_account} icon={Award} />
                  </div>
                )}
              </div>

              {/* Payslip Preview */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Monthly Payslip Preview</h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-brand-600 text-white px-4 py-3">
                    <p className="text-xs font-semibold opacity-70">ESTIMATED NET PAY</p>
                    <p className="text-2xl font-bold mt-0.5">{formatGHS(payslip.net)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-3">Earnings</p>
                    <PaylineItem label="Basic Salary" value={payslip.basic} />
                    <PaylineItem label="Housing Allowance" value={payslip.housingAllowance} />
                    <PaylineItem label="Transport Allowance" value={payslip.transportAllowance} />
                    <PaylineItem label="Other Allowances" value={payslip.otherAllowances} />
                    <PaylineItem label="Gross Salary" value={payslip.gross} bold />
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-text-muted uppercase mb-3">Deductions</p>
                      <PaylineItem label="SSNIT (Employee 5.5%)" value={payslip.ssnitEmployee} positive={false} />
                      <PaylineItem label="Income Tax (PAYE)" value={payslip.incomeTax} positive={false} />
                      <PaylineItem label="Total Deductions" value={payslip.totalDeductions} positive={false} bold />
                    </div>
                    <div className="mt-3 pt-3 border-t-2 border-border">
                      <PaylineItem label="NET PAY" value={payslip.net} bold />
                    </div>
                    <p className="text-[10px] text-text-muted mt-3">* SSNIT employer contribution: {formatGHS(payslip.ssnitEmployer)} (not deducted from net)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {tab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Government IDs</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div><label className={LABEL_CLS}>SSNIT Number</label><input value={form.social_security_number} onChange={e => set('social_security_number', e.target.value)} className={FIELD_CLS} /></div>
                    <div><label className={LABEL_CLS}>TIN Number</label><input value={form.tin_number} onChange={e => set('tin_number', e.target.value)} className={FIELD_CLS} /></div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="SSNIT Number" value={staff.social_security_number} icon={FileText} />
                    <InfoRow label="TIN Number" value={staff.tin_number} icon={FileText} />
                    <InfoRow label="Qualification" value={staff.qualification} icon={Award} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Record Details</h3>
                <div>
                  <InfoRow label="Record Created" value={formatRelativeTime(staff.created_at)} icon={Clock} />
                  <InfoRow label="Staff ID" value={staff.staff_id_number} icon={Award} />
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
        loading={deleteStaff.isPending}
        title={`Remove ${staff.first_name} ${staff.last_name}?`}
        message="This permanently removes the staff record and all employment data. This cannot be undone."
        confirmLabel="Remove Staff"
      />
    </div>
  );
}