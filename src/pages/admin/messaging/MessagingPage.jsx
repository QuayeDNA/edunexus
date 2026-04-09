import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import StatCard from '../../../components/ui/StatCard.jsx';
import DataTable from '../../../components/ui/DataTable.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../../../components/ui/ConfirmDialog.jsx';
import { useAuthContext } from '../../../contexts/AuthContext.jsx';
import { useClasses } from '../../../hooks/useClasses.js';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useCreateMessageTemplate,
  useDeleteAnnouncement,
  useDeleteMessageTemplate,
  useDispatchScheduledMessages,
  useMessageTemplates,
  useMessages,
  useMessagingRecipients,
  useMessagingSummary,
  usePreviewRecipients,
  useSendMessage,
} from '../../../hooks/useMessaging.js';
import { formatDate, formatRelativeTime } from '../../../utils/formatters.js';

const AUDIENCE_OPTIONS = ['All', 'Students', 'Parents', 'Staff', 'Class', 'Individual', 'Custom'];
const CHANNEL_OPTIONS = [
  { key: 'in_app', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];
const ANNOUNCEMENT_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const ANNOUNCEMENT_AUDIENCE = ['All', 'Students', 'Parents', 'Staff'];

const BULK_PRESETS = [
  {
    id: 'fees',
    label: 'Fee Reminder',
    audience: 'Parents',
    channels: ['sms', 'in_app'],
    subject: 'School Fee Reminder',
    body: 'Dear Parent, this is a reminder to settle outstanding school fees before the due date. Thank you.',
  },
  {
    id: 'exam',
    label: 'Exam Schedule',
    audience: 'Students',
    channels: ['in_app', 'email'],
    subject: 'Exam Timetable Update',
    body: 'Please review the latest exam schedule and be present at least 30 minutes before each paper.',
  },
  {
    id: 'event',
    label: 'School Event',
    audience: 'All',
    channels: ['in_app', 'sms'],
    subject: 'School Event Notice',
    body: 'You are invited to our upcoming school event. Please check details and attendance instructions.',
  },
];

const EMPTY_COMPOSE_FORM = {
  subject: '',
  body: '',
  audience: 'All',
  classId: '',
  individualId: '',
  customRecipientIds: [],
  channels: ['in_app'],
  scheduleAt: '',
};

const EMPTY_TEMPLATE_FORM = {
  name: '',
  category: 'General',
  defaultAudience: 'All',
  defaultChannels: ['in_app'],
  subject: '',
  body: '',
};

const EMPTY_ANNOUNCEMENT_FORM = {
  title: '',
  body: '',
  priority: 'Normal',
  audience: ['All'],
  publishAt: '',
  expiresAt: '',
};

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

const statusText = (value) => {
  if (!value) return '—';
  return value;
};

export default function MessagingPage() {
  const { schoolId, user } = useAuthContext();

  const [composeForm, setComposeForm] = useState(EMPTY_COMPOSE_FORM);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE_FORM);
  const [announcementForm, setAnnouncementForm] = useState(EMPTY_ANNOUNCEMENT_FORM);

  const [messageScope, setMessageScope] = useState('all');
  const [messageStatus, setMessageStatus] = useState('All');
  const [messageSearch, setMessageSearch] = useState('');

  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementStatusFilter, setAnnouncementStatusFilter] = useState('All');

  const [templateSearch, setTemplateSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] = useState(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState(null);

  const { data: summary, isLoading: summaryLoading } = useMessagingSummary(schoolId, user?.id);
  const { data: classesResult } = useClasses(schoolId);

  const recipientsRoleFilter = useMemo(() => {
    if (composeForm.audience === 'Students') return 'Students';
    if (composeForm.audience === 'Parents') return 'Parents';
    if (composeForm.audience === 'Staff') return 'Staff';
    return 'All';
  }, [composeForm.audience]);

  const { data: recipientsResult, isLoading: recipientsLoading } = useMessagingRecipients({
    schoolId,
    role: recipientsRoleFilter,
    classId: composeForm.audience === 'Class' ? composeForm.classId || undefined : undefined,
    search: recipientSearch,
    limit: 400,
  });

  const previewDisabledReason = useMemo(() => {
    if (!user?.id) return 'Sign in to preview recipients';
    if (composeForm.audience === 'Class' && !composeForm.classId) return 'Select a class for class messaging';
    if (composeForm.audience === 'Individual' && !composeForm.individualId) return 'Select an individual recipient';
    if (composeForm.audience === 'Custom' && composeForm.customRecipientIds.length === 0) {
      return 'Select at least one custom recipient';
    }
    return '';
  }, [composeForm.audience, composeForm.classId, composeForm.individualId, composeForm.customRecipientIds, user?.id]);

  const { data: previewRecipientsResult, isLoading: previewLoading } = usePreviewRecipients({
    schoolId,
    senderId: previewDisabledReason ? null : user?.id,
    audience: composeForm.audience,
    classId: composeForm.audience === 'Class' ? composeForm.classId || undefined : undefined,
    individualId: composeForm.audience === 'Individual' ? composeForm.individualId || undefined : undefined,
    recipientIds: composeForm.audience === 'Custom' ? composeForm.customRecipientIds : undefined,
  });

  const { data: messagesResult, isLoading: messagesLoading } = useMessages({
    schoolId,
    viewerId: user?.id,
    scope: messageScope,
    status: messageStatus,
    search: messageSearch,
    limit: 300,
  });

  const { data: announcementsResult, isLoading: announcementsLoading } = useAnnouncements({
    schoolId,
    search: announcementSearch,
    includeExpired: announcementStatusFilter === 'All',
    activeOnly: announcementStatusFilter === 'Active',
    limit: 200,
  });

  const { data: templatesResult, isLoading: templatesLoading } = useMessageTemplates({
    schoolId,
    search: templateSearch,
    limit: 200,
  });

  const sendMessage = useSendMessage();
  const dispatchScheduledMessages = useDispatchScheduledMessages();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const createTemplate = useCreateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();

  const classes = classesResult?.data ?? [];
  const recipients = recipientsResult?.data ?? [];
  const previewRecipients = previewRecipientsResult?.data ?? [];
  const messages = messagesResult?.data ?? [];
  const templates = templatesResult?.data ?? [];

  const announcements = useMemo(() => {
    const rows = announcementsResult?.data ?? [];
    if (announcementStatusFilter === 'All' || announcementStatusFilter === 'Active') return rows;
    return rows.filter((row) => row.effective_status === announcementStatusFilter);
  }, [announcementStatusFilter, announcementsResult?.data]);

  useEffect(() => {
    if (messages.length === 0) {
      if (selectedMessageId) setSelectedMessageId('');
      return;
    }

    const stillExists = messages.some((row) => row.id === selectedMessageId);
    if (!selectedMessageId || !stillExists) {
      setSelectedMessageId(messages[0].id);
    }
  }, [messages, selectedMessageId]);

  const selectedMessage = useMemo(
    () => messages.find((row) => row.id === selectedMessageId) ?? null,
    [messages, selectedMessageId]
  );

  const deliveryRows = selectedMessage?.delivery_report?.recipients ?? [];

  const summaryValues = {
    totalMessages: Number(summary?.totalMessages ?? 0),
    scheduledMessages: Number(summary?.scheduledMessages ?? 0),
    queuedMessages: Number(summary?.queuedMessages ?? 0),
    sentToday: Number(summary?.sentToday ?? 0),
    activeAnnouncements: Number(summary?.activeAnnouncements ?? 0),
    unreadNotifications: Number(summary?.unreadNotifications ?? 0),
  };

  const toggleComposeChannel = (channelKey) => {
    setComposeForm((prev) => {
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

  const toggleTemplateChannel = (channelKey) => {
    setTemplateForm((prev) => {
      const exists = prev.defaultChannels.includes(channelKey);
      if (exists && prev.defaultChannels.length === 1) return prev;

      return {
        ...prev,
        defaultChannels: exists
          ? prev.defaultChannels.filter((channel) => channel !== channelKey)
          : [...prev.defaultChannels, channelKey],
      };
    });
  };

  const toggleAnnouncementAudience = (audience) => {
    setAnnouncementForm((prev) => {
      if (audience === 'All') {
        return { ...prev, audience: ['All'] };
      }

      const current = prev.audience.includes('All') ? [] : [...prev.audience];
      const exists = current.includes(audience);
      const nextAudience = exists
        ? current.filter((row) => row !== audience)
        : [...current, audience];

      return {
        ...prev,
        audience: nextAudience.length > 0 ? nextAudience : ['All'],
      };
    });
  };

  const handleApplyPreset = (preset) => {
    setComposeForm((prev) => ({
      ...prev,
      subject: preset.subject,
      body: preset.body,
      audience: preset.audience,
      classId: '',
      individualId: '',
      customRecipientIds: [],
      channels: preset.channels,
    }));
  };

  const handleApplyTemplate = (template) => {
    setComposeForm((prev) => ({
      ...prev,
      subject: template.subject ?? '',
      body: template.body ?? '',
      audience: template.default_audience || 'All',
      classId: '',
      individualId: '',
      customRecipientIds: [],
      channels: Array.isArray(template.default_channels) && template.default_channels.length > 0
        ? template.default_channels
        : ['in_app'],
    }));
  };

  const handleSendMessage = async () => {
    if (!composeForm.body.trim()) {
      toast.error('Message body is required');
      return;
    }

    if (composeForm.channels.length === 0) {
      toast.error('Select at least one channel');
      return;
    }

    if (previewDisabledReason) {
      toast.error(previewDisabledReason);
      return;
    }

    await sendMessage.mutateAsync({
      schoolId,
      senderId: user?.id,
      subject: composeForm.subject,
      body: composeForm.body,
      audience: composeForm.audience,
      classId: composeForm.audience === 'Class' ? composeForm.classId : undefined,
      individualId: composeForm.audience === 'Individual' ? composeForm.individualId : undefined,
      recipientIds: composeForm.audience === 'Custom' ? composeForm.customRecipientIds : undefined,
      channels: composeForm.channels,
      scheduleAt: composeForm.scheduleAt ? toIsoOrNull(composeForm.scheduleAt) : undefined,
    });

    setComposeForm((prev) => ({
      ...EMPTY_COMPOSE_FORM,
      channels: prev.channels,
    }));
  };

  const handleDispatchScheduled = async () => {
    await dispatchScheduledMessages.mutateAsync({ schoolId, limit: 100 });
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      toast.error('Template name and body are required');
      return;
    }

    await createTemplate.mutateAsync({
      school_id: schoolId,
      name: templateForm.name.trim(),
      category: templateForm.category.trim() || null,
      default_audience: templateForm.defaultAudience,
      default_channels: templateForm.defaultChannels,
      subject: templateForm.subject.trim() || null,
      body: templateForm.body.trim(),
      created_by: user?.id ?? null,
    });

    setTemplateForm((prev) => ({
      ...EMPTY_TEMPLATE_FORM,
      defaultAudience: prev.defaultAudience,
      defaultChannels: prev.defaultChannels,
      category: prev.category,
    }));
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      toast.error('Announcement title and body are required');
      return;
    }

    await createAnnouncement.mutateAsync({
      school_id: schoolId,
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      audience: announcementForm.audience,
      priority: announcementForm.priority,
      publish_at: toIsoOrNull(announcementForm.publishAt) || new Date().toISOString(),
      expires_at: toIsoOrNull(announcementForm.expiresAt),
      created_by: user?.id ?? null,
    });

    setAnnouncementForm((prev) => ({
      ...EMPTY_ANNOUNCEMENT_FORM,
      priority: prev.priority,
      audience: prev.audience,
    }));
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteAnnouncementTarget) return;
    await deleteAnnouncement.mutateAsync({ id: deleteAnnouncementTarget.id, schoolId });
    setDeleteAnnouncementTarget(null);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateTarget) return;
    await deleteTemplate.mutateAsync({ id: deleteTemplateTarget.id, schoolId });
    setDeleteTemplateTarget(null);
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
        cell: ({ getValue }) => <StatusBadge status={getValue()} dot size="sm" />,
      },
      {
        accessorKey: 'recipient_count',
        header: 'Recipients',
      },
      {
        id: 'delivery',
        header: 'Delivery',
        cell: ({ row }) => {
          const summary = row.original.delivery_summary ?? {};
          return (
            <span className="text-xs text-text-secondary">
              D:{summary.delivered ?? 0} Q:{summary.queued ?? 0} S:{summary.scheduled ?? 0} F:{summary.failed ?? 0}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedMessageId(row.original.id)}
            className="btn-secondary h-8 px-2 text-xs"
            aria-label={`View report for ${row.original.subject || 'message'}`}
          >
            View Report
          </button>
        ),
      },
    ],
    []
  );

  const templateColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Template',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.name}</p>
            <p className="text-xs text-text-muted line-clamp-2">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => getValue() || 'General',
      },
      {
        accessorKey: 'default_audience',
        header: 'Default Audience',
      },
      {
        accessorKey: 'default_channels',
        header: 'Channels',
        cell: ({ getValue }) => channelsLabel(getValue()),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => formatRelativeTime(getValue()),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleApplyTemplate(row.original)}
              className="btn-secondary h-8 px-2 text-xs"
              aria-label={`Use template ${row.original.name}`}
            >
              Use
            </button>
            <button
              onClick={() => setDeleteTemplateTarget(row.original)}
              className="btn-ghost h-8 px-2 text-status-danger"
              aria-label={`Delete template ${row.original.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const announcementColumns = useMemo(
    () => [
      {
        accessorKey: 'publish_at',
        header: 'Publish',
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: 'title',
        header: 'Announcement',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-text-primary text-sm">{row.original.title}</p>
            <p className="text-xs text-text-muted line-clamp-2">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" dot />,
      },
      {
        accessorKey: 'audience',
        header: 'Audience',
        cell: ({ getValue }) => Array.isArray(getValue()) ? getValue().join(', ') : 'All',
      },
      {
        accessorKey: 'effective_status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" dot />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => setDeleteAnnouncementTarget(row.original)}
            className="btn-ghost h-8 px-2 text-status-danger"
            aria-label={`Delete announcement ${row.original.title}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ),
      },
    ],
    []
  );

  const deliveryColumns = useMemo(
    () => [
      {
        accessorKey: 'recipient_name',
        header: 'Recipient',
      },
      {
        accessorKey: 'role',
        header: 'Role',
      },
      {
        accessorKey: 'channels',
        header: 'In-App',
        cell: ({ row }) => <StatusBadge size="sm" status={statusText(row.original.channels?.in_app?.status)} />,
      },
      {
        accessorKey: 'channels_email',
        header: 'Email',
        cell: ({ row }) => <StatusBadge size="sm" status={statusText(row.original.channels?.email?.status)} />,
      },
      {
        accessorKey: 'channels_sms',
        header: 'SMS',
        cell: ({ row }) => <StatusBadge size="sm" status={statusText(row.original.channels?.sms?.status)} />,
      },
    ],
    []
  );

  const selectedMessageSummary = selectedMessage?.delivery_summary ?? {
    delivered: 0,
    queued: 0,
    scheduled: 0,
    failed: 0,
    totalRecipients: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messaging"
        subtitle="Compose and schedule school-wide communication with delivery tracking"
        actions={
          <button
            onClick={handleDispatchScheduled}
            disabled={dispatchScheduledMessages.isPending}
            className="btn-secondary h-9 text-sm"
          >
            {dispatchScheduledMessages.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4" />
                Dispatch Scheduled
              </>
            )}
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <StatCard
          title="Messages"
          value={summaryLoading ? null : summaryValues.totalMessages}
          icon={MessageSquare}
          color="bg-brand-50 text-brand-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Scheduled"
          value={summaryLoading ? null : summaryValues.scheduledMessages}
          icon={Clock3}
          color="bg-blue-50 text-blue-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Queued"
          value={summaryLoading ? null : summaryValues.queuedMessages}
          icon={Mail}
          color="bg-amber-50 text-amber-700"
          loading={summaryLoading}
        />
        <StatCard
          title="Sent Today"
          value={summaryLoading ? null : summaryValues.sentToday}
          icon={CheckCircle2}
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
          color="bg-status-dangerBg text-status-danger"
          loading={summaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-border shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-text-primary">Compose Message</h2>
            <div className="text-xs text-text-muted">
              Recipient preview: {previewLoading ? 'Loading...' : previewRecipients.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
              <input
                value={composeForm.subject}
                onChange={(e) => setComposeForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Message subject"
                className="input-base h-9 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Audience</label>
              <select
                value={composeForm.audience}
                onChange={(e) =>
                  setComposeForm((prev) => ({
                    ...prev,
                    audience: e.target.value,
                    classId: '',
                    individualId: '',
                    customRecipientIds: [],
                  }))
                }
                className="input-base h-9 text-sm"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Schedule (optional)</label>
              <input
                type="datetime-local"
                value={composeForm.scheduleAt}
                onChange={(e) => setComposeForm((prev) => ({ ...prev, scheduleAt: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Search Recipients</label>
              <input
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Name, role, phone"
                className="input-base h-9 text-sm"
              />
            </div>

            {composeForm.audience === 'Class' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Class</label>
                <select
                  value={composeForm.classId}
                  onChange={(e) => setComposeForm((prev) => ({ ...prev, classId: e.target.value }))}
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

            {composeForm.audience === 'Individual' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Recipient</label>
                <select
                  value={composeForm.individualId}
                  onChange={(e) => setComposeForm((prev) => ({ ...prev, individualId: e.target.value }))}
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

            {composeForm.audience === 'Custom' && (
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-text-secondary mb-1">Custom Recipients</label>
                <select
                  multiple
                  value={composeForm.customRecipientIds}
                  onChange={(e) => {
                    const selectedIds = Array.from(e.target.selectedOptions).map((row) => row.value);
                    setComposeForm((prev) => ({ ...prev, customRecipientIds: selectedIds }));
                  }}
                  className="input-base text-sm min-h-22"
                >
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
                value={composeForm.body}
                onChange={(e) => setComposeForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Write your message here"
                rows={4}
                className="input-base text-sm min-h-28"
              />
            </div>

            <div className="md:col-span-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-text-secondary">Channels:</span>
                {CHANNEL_OPTIONS.map((channel) => (
                  <label key={channel.key} className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={composeForm.channels.includes(channel.key)}
                      onChange={() => toggleComposeChannel(channel.key)}
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
                    {composeForm.scheduleAt ? 'Schedule Message' : 'Send Message'}
                  </>
                )}
              </button>
            </div>
          </div>

          {previewDisabledReason ? (
            <p className="text-xs text-status-warning">{previewDisabledReason}</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Bulk Message Presets</h2>
            <p className="text-xs text-text-muted">One-click shortcuts for common communication tasks.</p>

            <div className="space-y-2">
              {BULK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full btn-secondary h-9 text-xs justify-start"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Recipient Preview</h2>
            {recipientsLoading || previewLoading ? (
              <p className="text-xs text-text-muted">Loading recipients...</p>
            ) : previewRecipients.length === 0 ? (
              <p className="text-xs text-text-muted">No recipients selected by current audience filter.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {previewRecipients.slice(0, 12).map((row) => (
                  <div key={row.id} className="border border-border rounded-lg px-2.5 py-2">
                    <p className="text-xs font-semibold text-text-primary">{recipientName(row)}</p>
                    <p className="text-[11px] text-text-muted">{row.role}{row.phone ? ` · ${row.phone}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
            {previewRecipients.length > 12 ? (
              <p className="text-[11px] text-text-muted">Showing 12 of {previewRecipients.length} recipients.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <DataTable
          columns={messageColumns}
          data={messages}
          isLoading={messagesLoading}
          searchable={false}
          exportFileName="messages"
          pageSize={50}
          emptyTitle="No messages"
          emptyMessage="Compose and send your first message above."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search messages"
                  className="input-base h-9 text-xs pl-8 min-w-56"
                />
              </div>

              <select
                value={messageScope}
                onChange={(e) => setMessageScope(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                aria-label="Message scope"
              >
                <option value="all">All</option>
                <option value="mine">Mine</option>
                <option value="inbox">Inbox</option>
                <option value="outbox">Outbox</option>
              </select>

              <select
                value={messageStatus}
                onChange={(e) => setMessageStatus(e.target.value)}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Message Templates</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Template Name</label>
              <input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input-base h-9 text-sm"
                placeholder="Fee Reminder"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <input
                value={templateForm.category}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, category: e.target.value }))}
                className="input-base h-9 text-sm"
                placeholder="Finance"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Default Audience</label>
              <select
                value={templateForm.defaultAudience}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, defaultAudience: e.target.value }))}
                className="input-base h-9 text-sm"
              >
                {AUDIENCE_OPTIONS.filter((option) => option !== 'Custom').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
              <input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="input-base h-9 text-sm"
                placeholder="Optional"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Body</label>
              <textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={3}
                className="input-base text-sm min-h-22"
                placeholder="Template body"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-text-secondary">Default Channels:</span>
                {CHANNEL_OPTIONS.map((channel) => (
                  <label key={channel.key} className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={templateForm.defaultChannels.includes(channel.key)}
                      onChange={() => toggleTemplateChannel(channel.key)}
                    />
                    {channel.label}
                  </label>
                ))}
              </div>

              <button
                onClick={handleCreateTemplate}
                disabled={createTemplate.isPending}
                className="btn-primary h-9 text-sm"
              >
                {createTemplate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <DataTable
              columns={templateColumns}
              data={templates}
              isLoading={templatesLoading}
              searchable={false}
              exportFileName="message-templates"
              pageSize={25}
              emptyTitle="No templates"
              emptyMessage="Create reusable templates for frequently sent messages."
              toolbar={
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="search"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates"
                    className="input-base h-9 text-xs pl-8 min-w-52"
                  />
                </div>
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Announcement Board</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
              <input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                className="input-base h-9 text-sm"
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
              <select
                value={announcementForm.priority}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="input-base h-9 text-sm"
              >
                {ANNOUNCEMENT_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Body</label>
              <textarea
                value={announcementForm.body}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={3}
                className="input-base text-sm min-h-22"
                placeholder="Announcement details"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Publish At (optional)</label>
              <input
                type="datetime-local"
                value={announcementForm.publishAt}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, publishAt: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Expire At (optional)</label>
              <input
                type="datetime-local"
                value={announcementForm.expiresAt}
                onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                className="input-base h-9 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Audience</label>
              <div className="flex items-center gap-3 flex-wrap">
                {ANNOUNCEMENT_AUDIENCE.map((audience) => (
                  <label key={audience} className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                    <input
                      type="checkbox"
                      checked={announcementForm.audience.includes(audience)}
                      onChange={() => toggleAnnouncementAudience(audience)}
                    />
                    {audience}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleCreateAnnouncement}
                disabled={createAnnouncement.isPending}
                className="btn-primary h-9 text-sm"
              >
                {createAnnouncement.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Publish Announcement
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <DataTable
              columns={announcementColumns}
              data={announcements}
              isLoading={announcementsLoading}
              searchable={false}
              exportFileName="announcements"
              pageSize={25}
              emptyTitle="No announcements"
              emptyMessage="Publish announcements to pin updates across dashboards."
              toolbar={
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                    <input
                      type="search"
                      value={announcementSearch}
                      onChange={(e) => setAnnouncementSearch(e.target.value)}
                      placeholder="Search announcements"
                      className="input-base h-9 text-xs pl-8 min-w-52"
                    />
                  </div>

                  <select
                    value={announcementStatusFilter}
                    onChange={(e) => setAnnouncementStatusFilter(e.target.value)}
                    className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary h-9"
                    aria-label="Announcement status"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Delivery Report</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {selectedMessage
                ? `${selectedMessage.subject || 'No subject'} · ${formatRelativeTime(selectedMessage.created_at)}`
                : 'Select a message to inspect per-recipient delivery'}
            </p>
          </div>
          {selectedMessage ? (
            <StatusBadge status={selectedMessage.status} dot size="sm" />
          ) : null}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard
            title="Recipients"
            value={selectedMessageSummary.totalRecipients}
            icon={Users}
            color="bg-brand-50 text-brand-600"
          />
          <StatCard
            title="Delivered"
            value={selectedMessageSummary.delivered}
            icon={CheckCircle2}
            color="bg-status-successBg text-status-success"
          />
          <StatCard
            title="Queued"
            value={selectedMessageSummary.queued}
            icon={Clock3}
            color="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="Scheduled"
            value={selectedMessageSummary.scheduled}
            icon={CalendarClock}
            color="bg-status-infoBg text-status-info"
          />
          <StatCard
            title="Failed"
            value={selectedMessageSummary.failed}
            icon={Bell}
            color="bg-status-dangerBg text-status-danger"
          />
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <DataTable
            columns={deliveryColumns}
            data={deliveryRows}
            searchable={false}
            exportFileName="message-delivery"
            pageSize={50}
            emptyTitle="No delivery details"
            emptyMessage="Delivery channels per recipient will appear here after sending."
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteAnnouncementTarget}
        onClose={() => setDeleteAnnouncementTarget(null)}
        onConfirm={handleDeleteAnnouncement}
        title="Delete Announcement"
        message={deleteAnnouncementTarget ? `Delete announcement "${deleteAnnouncementTarget.title}"?` : ''}
        confirmLabel="Delete Announcement"
        loading={deleteAnnouncement.isPending}
      />

      <ConfirmDialog
        open={!!deleteTemplateTarget}
        onClose={() => setDeleteTemplateTarget(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template"
        message={deleteTemplateTarget ? `Delete template "${deleteTemplateTarget.name}"?` : ''}
        confirmLabel="Delete Template"
        loading={deleteTemplate.isPending}
      />
    </div>
  );
}
