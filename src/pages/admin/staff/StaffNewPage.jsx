import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useCreateStaff } from '../../../hooks/useStaff.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';

export default function AddStaffPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const createStaff = useCreateStaff();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    role: 'Teacher',
    department: '',
    email: '',
    phone: '',
    employment_status: 'Active',
    start_date: new Date().toISOString().split('T')[0],
    salary: '',
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await createStaff.mutateAsync({
      ...form,
      school_id: schoolId,
      salary: form.salary ? Number(form.salary) : null,
    });
    navigate('/admin/staff');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Staff"
        subtitle="Create a new staff profile"
        actions={<Link to="/admin/staff" className="btn-secondary">Back to Staff</Link>}
      />

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-border shadow-card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary">First Name</label>
            <input name="first_name" value={form.first_name} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Last Name</label>
            <input name="last_name" value={form.last_name} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Role</label>
            <input name="role" value={form.role} onChange={onChange} required className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Department</label>
            <input name="department" value={form.department} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Employment Status</label>
            <select name="employment_status" value={form.employment_status} onChange={onChange} className="input-base mt-1">
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Start Date</label>
            <input type="date" name="start_date" value={form.start_date} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Salary (GHS)</label>
            <input type="number" min="0" step="0.01" name="salary" value={form.salary} onChange={onChange} className="input-base mt-1" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/admin/staff" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={createStaff.isPending}>
            {createStaff.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Staff Member
          </button>
        </div>
      </form>
    </div>
  );
}
