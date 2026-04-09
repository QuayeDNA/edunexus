import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuthContext } from '../../contexts/AuthContext.jsx';
import { useClasses } from '../../hooks/useClasses.js';
import {
  useAnnouncements,
  useMessages,
  useMessagingRecipients,
  useMessagingSummary,
  usePreviewRecipients,
  useSendMessage,
} from '../../hooks/useMessaging.js';
import { formatDate, formatRelativeTime } from '../../utils/formatters.js';

const TEACHER_AUDIENCE_OPTIONS = ['Students', 'Parents', 'Class', 'Individual'];
const CHANNEL_OPTIONS = [
  { key: 'in_app', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

const EMPTY_FORM = {
  subject: '',
  body: '',
  audience: 'Students',
  classId: '',
  individualId: '',
  channels: ['in_app'],
};

const recipientName = (row) => {
  const name = `${row?.first_name ?? ''} ${row?.last_name ?? ''}`.trim();
  return name || row?.role || 'Recipient';
};

const channelsLabel = (channels = []) =>
  channels
    .map((channel) => {
      if (channel === 'in_app') return 'In-App';
      if (channel === 'sms') return 'SMS';
      return 'Email';
    })
    .join(', ');

export default function TeacherMessagingPage() {
  const { schoolId, user } = useAuthContext();

  const [form, setForm] = useState(EMPTY_FORM);
  const [scope, setScope] = useState('mine');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  const roleFilter = useMemo(() => {
    if (form.audience === 'Students') return 'Students';
    if (form.audience === 'Parents') return 'Parents';
    return 'All';
  }, [form.audience]);

  const { data: summary, isLoading: summaryLoading } = useMessagingSummary(schoolId, user?.id);
  const { data: classesResult } = useClasses(schoolId);
  const { data: recipientsResult } = useMessagingRecipients({
    schoolId,
    role: roleFilter,
    classId: form.audience === 'Class' ? form.classId || undefined : undefined,
    search: recipientSearch,
    limit: 300,
  });

  const previewDisabledReason = useMemo(() => {
    if (!user?.id) return 'Sign in to preview recipients';
    if (form.audience === 'Class' && !form.classId) return 'Select a class first';
    if (form.audience === 'Individual' && !form.individualId) return 'Select a recipient first';
    return '';
  }, [form.audience, form.classId, form.individualId, user?.id]);

  const { data: previewResult, isLoading: previewLoading } = usePreviewRecipients({
    schoolId,
    senderId: previewDisabledReason ? null : user?.id,
    audience: form.audience,
    classId: form.audience === 'Class' ? form.classId || undefined : undefined,
    individualId: form.audience === 'Individual' ? form.individualId || undefined : undefined,
  });

  const { data: messagesResult, isLoading: messagesLoading } = useMessages({
    schoolId,
    viewerId: user?.id,
    scope,
    status,
    search,
    limit: 250,
  });

  const { data: announcementsResult, isLoading: announcementsLoading } = useAnnouncements({
    schoolId,
    activeOnly: true,
    limit: 8,
  });

  const sendMessage = useSendMessage();

  const classes = classesResult?.data ?? [];
  const recipients = recipientsResult?.data ?? [];
  const previewRecipients = previewResult?.data ?? [];
  const messages = messagesResult?.data ?? [];
  const announcements = announcementsResult?.data ?? [];

  const toggleChannel = (channelKey) => {
    setForm((prev) => {
      const exists = prev.channels.includes(channelKey);
      if (exists && prev.channels.length === 1) return prev;

      return {
        ...prev,
        channels: exists
          ? prev.channels.filter((channel) => channel !== channelKey)
          : [...prev.channels, channelKey],
      };
    });
  };

  const handleSendMessage = async () => {
    if (!form.body.trim()) {
      toast.error('Message body is required');
      return;
    }

    if (previewDisabledReason) {
      toast.error(previewDisabledReason);
      return;
    }

    await sendMessage.mutateAsync({
      schoolId,
      senderId: user?.id,
      subject: form.subject,
      body: form.body,
      audience: form.audience,
      classId: form.audience === 'Class' ? form.classId : undefined,
      individualId: form.audience === 'Individual' ? form.individualId : undefined,
      channels: form.channels,
    });

    setForm((prev) => ({
      ...EMPTY_FORM,
      audience: prev.audience,
      channels: prev.channels,
    }));
  };

  const messageColumns = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
      {
        accessorKey: 'subject',
        header: 'Message',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.subject || 'No subject'}</p>
            <p className="text-xs text-text-muted line-clamp-2">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: 'audience_label',
        header: 'Audience',
      },
      {
        accessorKey: 'channels',
        header: 'Channels',
        cell: ({ getValue }) => channelsLabel(getValue()),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" dot />,
      },
      {
        accessorKey: 'recipient_count',
        header: 'Recipients',
      },
    ],
    []
  );

  useEffect(() => {
    if (form.audience !== 'Individual' && form.individualId) {
      setForm((prev) => ({ ...prev, individualId: '' }));
    }
    if (form.audience !== 'Class' && form.classId) {
      setForm((prev) => ({ ...prev, classId: '' }));
    }
  }, [form.audience, form.classId, form.individualId]);

  const summaryValues = {
    totalMessages: Number(summary?.totalMessages ?? 0),
    sentToday: Number(summary?.sentToday ?? 0),
    activeAnnouncements: Number(summary?.activeAnnouncements ?? 0),
    unreadNotifications: Number(summary?.unreadNotifications ?? 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle="Communicate with students and parents, and track your sent messages"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Messages"
          value={summaryLoading ? null : summaryValues.totalMessages}
          icon={MessageSquare}
          color="bg-brand-50 text-brand-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Sent Today"
          value={summaryLoading ? null : summaryValues.sentToday}
          icon={Send}
          color="bg-status-successBg text-status-success"
          loading={summaryLoading}
        />
        <StatCard
          title="Announcements"
          value={summaryLoading ? null : summaryValues.activeAnnouncements}
          icon={Bell}
          color="bg-status-infoBg text-status-info"
          loading={summaryLoading}
        />
        <StatCard
          title="Unread"
          value={summaryLoading ? null : summaryValues.unreadNotifications}
          icon={Users}
          color="bg-status-warningBg text-status-warning"
          loading={summaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-text-primary">Compose Message</h2>
            <span className="text-xs text-text-muted">
              Recipient preview: {previewLoading ? 'Loading...' : previewRecipients.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="input-base h-9 text-sm"
                placeholder="Message subject"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Audience</label>
              <select
                value={form.audience}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    audience: e.target.value,
                    classId: '',
                    individualId: '',
                  }))
                }
                className="input-base h-9 text-sm"
              >
                {TEACHER_AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Search Recipients</label>
              <input
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="input-base h-9 text-sm"
                placeholder="Name, role, phone"
              />
            </div>

            {form.audience === 'Class' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
                <select
                  value={form.classId}
                  onChange={(e) => setForm((prev) => ({ ...prev, classId: e.target.value }))}
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select class...</option>
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.audience === 'Individual' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Recipient</label>
                <select
                  value={form.individualId}
                  onChange={(e) => setForm((prev) => ({ ...prev, individualId: e.target.value }))}
                  className="input-base h-9 text-sm"
                >
                  <option value="">Select recipient...</option>
                  {recipients.map((row) => (
                    <option key={row.id} value={row.id}>
                      {recipientName(row)} ({row.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-text-secondary mb-1">Message Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={4}
                className="input-base text-sm min-h-28"
                placeholder="Write your message"
              />
            </div>

            <div className="md:col-span-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-text-secondary">Channels:</span>
                {CHANNEL_OPTIONS.map((channel) => (
                  <label key={channel.key} className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={form.channels.includes(channel.key)}
                      onChange={() => toggleChannel(channel.key)}
                    />
                    {channel.label}
                  </label>
                ))}
              </div>

              <button
                onClick={handleSendMessage}
                disabled={sendMessage.isPending || !!previewDisabledReason}
                className="btn-primary h-9 text-sm"
              >
                {sendMessage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>

          {previewDisabledReason ? (
            <p className="text-xs text-status-warning">{previewDisabledReason}</p>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Announcement Board</h2>
          {announcementsLoading ? (
            <p className="text-xs text-text-muted">Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p className="text-xs text-text-muted">No active announcements right now.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {announcements.map((row) => (
                <div key={row.id} className="border border-border rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary line-clamp-1">{row.title}</p>
                    <StatusBadge status={row.priority} size="sm" />
                  </div>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{row.body}</p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Published {formatDate(row.publish_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={messageColumns}
          data={messages}
          isLoading={messagesLoading}
          searchable={false}
          exportFileName="teacher-messages"
          pageSize={50}
          emptyTitle="No messages"
          emptyMessage="Messages you send or receive will appear here."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages"
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Message scope"
              >
                <option value="mine">Mine</option>
                <option value="inbox">Inbox</option>
                <option value="outbox">Outbox</option>
                <option value="all">All</option>
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Message status"
              >
                <option value="All">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Queued">Queued</option>
              </select>
            </div>
          }
        />
      </div>
    </div>
  );
}
