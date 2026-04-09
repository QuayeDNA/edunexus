import { useState } from 'react';
import { AlertTriangle, Loader2, Search, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInvitePlatformUser,
  useSetPlatformUserStatus,
  useSuperAdminSchools,
  useSuperAdminUsers,
} from '../../hooks/useSuperAdmin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { ROLES } from '../../utils/constants.js';
import { formatRelativeTime } from '../../utils/formatters.js';

const ROLE_BADGE_STYLES = {
  super_admin: 'bg-brand-100 text-brand-700',
  admin: 'bg-status-infoBg text-status-info',
  teacher: 'bg-status-successBg text-status-success',
  student: 'bg-surface-muted text-text-secondary',
  parent: 'bg-surface-muted text-text-secondary',
};

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState('');
  const [usersCursor, setUsersCursor] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLES.ADMIN,
    schoolId: '',
  });

  const inviteUserMutation = useInvitePlatformUser();
  const setUserStatusMutation = useSetPlatformUserStatus();

  const schoolsQuery = useSuperAdminSchools({
    limit: 200,
    status: 'active',
  });

  const usersQuery = useSuperAdminUsers({
    search: search.trim() || undefined,
    limit: 50,
    cursor: usersCursor,
  });

  const users = usersQuery.data?.items ?? [];
  const schools = schoolsQuery.data?.items ?? [];

  const needsSchool = inviteForm.role !== ROLES.SUPER_ADMIN;

  const handleInviteUser = async (event) => {
    event.preventDefault();

    if (needsSchool && !inviteForm.schoolId) {
      toast.error('Select a school for this role.');
      return;
    }

    await inviteUserMutation.mutateAsync({
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      schoolId: needsSchool ? inviteForm.schoolId : null,
      firstName: inviteForm.firstName.trim() || null,
      lastName: inviteForm.lastName.trim() || null,
    });

    setInviteForm((prev) => ({
      ...prev,
      firstName: '',
      lastName: '',
      email: '',
      schoolId: '',
    }));
  };

  const handleToggleUserStatus = async (user) => {
    if (!user?.id) return;

    await setUserStatusMutation.mutateAsync({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-School Users"
        subtitle="Manage platform operators and school-level user lifecycles"
      />

      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleInviteUser}>
          <input
            value={inviteForm.firstName}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="First name (optional)"
            className="input-base"
          />
          <input
            value={inviteForm.lastName}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Last name (optional)"
            className="input-base"
          />
          <input
            value={inviteForm.email}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email address"
            className="input-base"
            type="email"
            required
          />

          <select
            value={inviteForm.role}
            onChange={(event) => setInviteForm((prev) => ({
              ...prev,
              role: event.target.value,
              schoolId: event.target.value === ROLES.SUPER_ADMIN ? '' : prev.schoolId,
            }))}
            className="input-base"
          >
            <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.TEACHER}>Teacher</option>
            <option value={ROLES.STUDENT}>Student</option>
            <option value={ROLES.PARENT}>Parent</option>
          </select>

          <select
            value={inviteForm.schoolId}
            onChange={(event) => setInviteForm((prev) => ({ ...prev, schoolId: event.target.value }))}
            className="input-base"
            disabled={!needsSchool}
            required={needsSchool}
          >
            <option value="">{needsSchool ? 'Select school' : 'No school required'}</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={inviteUserMutation.isPending || !inviteForm.email.trim()}
            >
              {inviteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Send Invite
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setUsersCursor(null);
            }}
            placeholder="Search users"
            className="input-base pl-9"
          />
        </label>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted">
            {usersQuery.data?.count ?? users.length} users
          </p>
          {usersCursor && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setUsersCursor(null)}
              disabled={usersQuery.isLoading}
            >
              First page
            </button>
          )}
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => setUsersCursor(usersQuery.data?.nextCursor ?? null)}
            disabled={!usersQuery.data?.nextCursor || usersQuery.isLoading}
          >
            Next page
          </button>
        </div>
      </div>

      {usersQuery.data?.pendingIntegration && (
        <div className="bg-status-warningBg border border-status-warning/30 rounded-xl p-4 text-sm text-status-warning">
          {usersQuery.data.integrationHint}
        </div>
      )}

      {usersQuery.isError && (
        <div className="bg-status-dangerBg border border-status-danger/30 rounded-xl p-4 text-sm text-status-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{usersQuery.error?.message ?? 'Failed to load users.'}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="p-12 flex items-center justify-center text-text-muted gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
              <UserCog className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No users returned</h2>
            <p className="text-sm text-text-secondary max-w-xl mx-auto">
              Deploy the service-role backend to load cross-school user lifecycle data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-muted text-text-secondary">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">School</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Last Sign-in</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = String(user.role ?? 'unknown').toLowerCase();
                  return (
                    <tr key={user.id ?? `${user.email}-${user.fullName}`} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="text-text-primary font-medium">{user.fullName}</p>
                        <p className="text-xs text-text-muted">{user.email ?? 'No email'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${ROLE_BADGE_STYLES[role] ?? 'bg-surface-muted text-text-secondary'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{user.schoolName ?? 'Platform'}</td>
                      <td className="px-4 py-3 text-text-secondary">{user.isActive ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {user.lastSignInAt ? formatRelativeTime(user.lastSignInAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={setUserStatusMutation.isPending || !user.id}
                          onClick={() => handleToggleUserStatus(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
