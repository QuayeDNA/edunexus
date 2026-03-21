import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStaffMember, useUpdateStaff, useDeleteStaff } from '../../../hooks/useStaff.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { formatGHS } from '../../../utils/formatters.js';

export default function StaffProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: staff, isLoading } = useStaffMember(id);
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (staff) {
      setForm({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        role: staff.role || '',
        department: staff.department || '',
        phone: staff.phone || '',
        email: staff.email || '',
        employment_status: staff.employment_status || 'Active',
        salary: staff.salary || '',
      });
    }
  }, [staff]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    await updateStaff.mutateAsync({
      id,
      data: {
        ...form,
        salary: form.salary === '' ? null : Number(form.salary),
      },
    });
  };

  const onDelete = async () => {
    await deleteStaff.mutateAsync(id);
    navigate('/admin/staff');
  };

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Staff member not found.</p>
        <Link to="/admin/staff" className="btn-primary inline-flex">Back to Staff</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Profile"
        subtitle={`${staff.staff_id_number || 'No staff ID'} · ${staff.department || 'No department'}`}
        actions={
          <>
            <Link to="/admin/staff" className="btn-secondary">Back</Link>
            <button className="btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <Avatar src={staff.photo_url} firstName={staff.first_name} lastName={staff.last_name} size="lg" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {staff.first_name} {staff.last_name}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={staff.employment_status || 'Active'} />
              <span className="text-xs text-text-muted">{staff.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary">First Name</label>
            <input name="first_name" value={form.first_name || ''} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Last Name</label>
            <input name="last_name" value={form.last_name || ''} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Role</label>
            <input name="role" value={form.role || ''} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Department</label>
            <input name="department" value={form.department || ''} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Email</label>
            <input type="email" name="email" value={form.email || ''} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Phone</label>
            <input name="phone" value={form.phone || ''} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Employment Status</label>
            <select name="employment_status" value={form.employment_status || 'Active'} onChange={onChange} className="input-base mt-1">
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Salary (GHS)</label>
            <input type="number" name="salary" value={form.salary || ''} onChange={onChange} className="input-base mt-1" />
            <p className="text-xs text-text-muted mt-1">
              Current display: {formatGHS(form.salary ? Number(form.salary) : 0)}
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={updateStaff.isPending}>
              {updateStaff.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
        loading={deleteStaff.isPending}
        title="Delete staff member?"
        message="This action removes the staff record permanently and cannot be undone."
        confirmLabel="Delete Staff"
      />
    </div>
  );
}
