import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStudent, useUpdateStudent, useDeleteStudent } from '../../../hooks/useStudents.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Avatar from '../../../components/ui/Avatar.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: student, isLoading } = useStudent(id);
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (student) {
      setForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        other_names: student.other_names || '',
        phone: student.phone || '',
        address: student.address || '',
        status: student.status || 'Active',
      });
    }
  }, [student]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    await updateStudent.mutateAsync({ id, data: form });
  };

  const onDelete = async () => {
    await deleteStudent.mutateAsync(id);
    navigate('/admin/students');
  };

  if (isLoading) {
    return (
      <div className="h-60 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Student not found.</p>
        <Link to="/admin/students" className="btn-primary inline-flex">Back to Students</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Profile"
        subtitle={`${student.student_id_number || 'No ID'} · ${student.classes?.name || 'Unassigned class'}`}
        actions={
          <>
            <Link to="/admin/students" className="btn-secondary">Back</Link>
            <button className="btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <Avatar src={student.photo_url} firstName={student.first_name} lastName={student.last_name} size="lg" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {student.first_name} {student.last_name}
            </h2>
            <div className="mt-1">
              <StatusBadge status={student.status || 'Active'} />
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary">First Name</label>
            <input name="first_name" value={form.first_name || ''} onChange={onChange} className="input-base mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Last Name</label>
            <input name="last_name" value={form.last_name || ''} onChange={onChange} className="input-base mt-1" required />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Other Names</label>
            <input name="other_names" value={form.other_names || ''} onChange={onChange} className="input-base mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Status</label>
            <select name="status" value={form.status || 'Active'} onChange={onChange} className="input-base mt-1">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
              <option value="Transferred">Transferred</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-text-primary">Address</label>
            <input name="address" value={form.address || ''} onChange={onChange} className="input-base mt-1" />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={updateStudent.isPending}>
              {updateStudent.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={onDelete}
        loading={deleteStudent.isPending}
        title="Delete student?"
        message="This action removes the student record permanently and cannot be undone."
        confirmLabel="Delete Student"
      />
    </div>
  );
}
