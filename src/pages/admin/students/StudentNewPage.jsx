import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import { useCreateStudent } from '../../../hooks/useStudents.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';

export default function AddStudentPage() {
  const navigate = useNavigate();
  const { schoolId } = useAuthContext();
  const { data: classesData } = useClasses(schoolId);
  const createStudent = useCreateStudent();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    other_names: '',
    gender: '',
    date_of_birth: '',
    admission_date: new Date().toISOString().split('T')[0],
    current_class_id: '',
    status: 'Active',
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await createStudent.mutateAsync({ ...form, school_id: schoolId });
    navigate('/admin/students');
  };

  const classes = classesData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Student"
        subtitle="Create a new student record"
        actions={
          <Link to="/admin/students" className="btn-secondary">
            Back to Students
          </Link>
        }
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
            <label className="text-sm font-medium text-text-primary">Other Names</label>
            <input name="other_names" value={form.other_names} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Gender</label>
            <select name="gender" value={form.gender} onChange={onChange} className="input-base mt-1">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Date of Birth</label>
            <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Admission Date</label>
            <input name="admission_date" type="date" value={form.admission_date} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Current Class</label>
            <select name="current_class_id" value={form.current_class_id} onChange={onChange} className="input-base mt-1">
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Status</label>
            <select name="status" value={form.status} onChange={onChange} className="input-base mt-1">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Transferred">Transferred</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link to="/admin/students" className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={createStudent.isPending}>
            {createStudent.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Student
          </button>
        </div>
      </form>
    </div>
  );
}
