import { Bell, BookOpenCheck, CalendarCheck, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useAnnouncements, useMessagingSummary } from '../../hooks/useMessaging.js';
import { useUnreadCount } from '../../hooks/useNotifications.js';
import { formatDate } from '../../utils/formatters.js';

export default function TeacherDashboardPage() {
  const { schoolId, profile } = useAuthContext();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: summary, isLoading: summaryLoading } = useMessagingSummary(schoolId, profile?.id);
  const { data: announcementsResult, isLoading: announcementsLoading } = useAnnouncements({
    schoolId,
    activeOnly: true,
    limit: 6,
  });

  const announcements = announcementsResult?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Classroom updates, communication alerts, and quick teaching actions"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Unread Notifications"
          value={unreadCount}
          icon={Bell}
          color="bg-status-warningBg text-status-warning"
        />
        <StatCard
          title="Messages"
          value={summaryLoading ? null : Number(summary?.totalMessages ?? 0)}
          icon={MessageSquare}
          color="bg-brand-50 text-brand-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Sent Today"
          value={summaryLoading ? null : Number(summary?.sentToday ?? 0)}
          icon={CalendarCheck}
          color="bg-status-successBg text-status-success"
          loading={summaryLoading}
        />
        <StatCard
          title="Active Announcements"
          value={summaryLoading ? null : Number(summary?.activeAnnouncements ?? 0)}
          icon={BookOpenCheck}
          color="bg-status-infoBg text-status-info"
          loading={summaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Announcement Board</h3>
              <p className="text-xs text-text-muted mt-0.5">Pinned school updates for teaching staff</p>
            </div>
            <Link to="/teacher/messaging" className="text-xs text-brand-600 hover:underline font-medium">
              Open messages →
            </Link>
          </div>

          <div className="p-4">
            {announcementsLoading ? (
              <p className="text-sm text-text-muted">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="text-sm text-text-muted">No active announcements right now.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((row) => (
                  <div key={row.id} className="border border-border rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-text-primary">{row.title}</p>
                      <StatusBadge status={row.priority || 'Normal'} size="sm" />
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{row.body}</p>
                    <p className="text-[11px] text-text-muted mt-2">
                      Published {formatDate(row.publish_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Quick Actions</h3>
          </div>
          <div className="p-4 space-y-2.5">
            <Link to="/teacher/attendance" className="btn-secondary w-full h-9 justify-start text-sm">
              <CalendarCheck className="w-4 h-4" />
              Take Attendance
            </Link>
            <Link to="/teacher/grades" className="btn-secondary w-full h-9 justify-start text-sm">
              <BookOpenCheck className="w-4 h-4" />
              Enter Grades
            </Link>
            <Link to="/teacher/messaging" className="btn-primary w-full h-9 justify-start text-sm">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
