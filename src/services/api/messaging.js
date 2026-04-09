import { supabase } from '../supabaseClient.js';
import {
  SCHOOL_STAFF_PROFILE_ROLES,
  getRolePrimaryActionRoute,
  isSchoolRecipientRole,
} from '../../utils/constants.js';

const EMPTY_LIST = { data: [], error: null, count: 0 };
const SUPPORTED_CHANNELS = ['in_app', 'email', 'sms'];

const toIsoString = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const toLowerSearch = (value) => String(value ?? '').trim().toLowerCase();

const normalizeChannels = (channels = []) => {
  const rows = Array.isArray(channels) ? channels : [channels];
  const normalized = Array.from(
    new Set(rows.map((row) => String(row ?? '').toLowerCase()).filter((row) => SUPPORTED_CHANNELS.includes(row)))
  );

  return normalized.length > 0 ? normalized : ['in_app'];
};

const uniqueById = (rows = []) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

const fullName = (row) => {
  const name = `${row?.first_name ?? ''} ${row?.last_name ?? ''}`.trim();
  return name || row?.role || 'Recipient';
};

const isFutureTimestamp = (value) => {
  const iso = toIsoString(value);
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
};

const normalizeAudience = (audience) => {
  const value = String(audience ?? 'All').trim();
  if (!value) return 'All';

  const lower = value.toLowerCase();
  if (lower === 'students' || lower === 'student') return 'Students';
  if (lower === 'parents' || lower === 'parent') return 'Parents';
  if (lower === 'staff') return 'Staff';
  if (lower === 'class') return 'Class';
  if (lower === 'individual') return 'Individual';
  if (lower === 'custom') return 'Custom';
  return 'All';
};

const summarizeDeliveryRecipients = (rows = []) => {
  const summary = {
    totalRecipients: rows.length,
    delivered: 0,
    queued: 0,
    scheduled: 0,
    failed: 0,
    byChannel: {
      in_app: { delivered: 0, queued: 0, scheduled: 0, failed: 0 },
      email: { delivered: 0, queued: 0, scheduled: 0, failed: 0 },
      sms: { delivered: 0, queued: 0, scheduled: 0, failed: 0 },
    },
  };

  rows.forEach((recipient) => {
    let hasDelivered = false;
    let hasFailed = false;
    let hasQueued = false;
    let hasScheduled = false;

    SUPPORTED_CHANNELS.forEach((channel) => {
      const status = recipient?.channels?.[channel]?.status;
      if (!status) return;

      if (status === 'Delivered') {
        summary.byChannel[channel].delivered += 1;
        hasDelivered = true;
      } else if (status === 'Failed') {
        summary.byChannel[channel].failed += 1;
        hasFailed = true;
      } else if (status === 'Scheduled') {
        summary.byChannel[channel].scheduled += 1;
        hasScheduled = true;
      } else {
        summary.byChannel[channel].queued += 1;
        hasQueued = true;
      }
    });

    if (hasFailed) summary.failed += 1;
    else if (hasScheduled) summary.scheduled += 1;
    else if (hasQueued) summary.queued += 1;
    else if (hasDelivered) summary.delivered += 1;
  });

  return summary;
};

const buildDeliveryReport = ({ recipients = [], channels = [], scheduled = false, deliveredIds = [] } = {}) => {
  const normalizedChannels = normalizeChannels(channels);
  const deliveredSet = new Set(deliveredIds);
  const nowIso = toIsoString();

  const rows = recipients.map((recipient) => {
    const channelStatus = {};

    normalizedChannels.forEach((channel) => {
      if (scheduled) {
        channelStatus[channel] = { status: 'Scheduled', updated_at: nowIso };
        return;
      }

      if (channel === 'in_app') {
        channelStatus[channel] = {
          status: deliveredSet.has(recipient.id) ? 'Delivered' : 'Queued',
          updated_at: nowIso,
        };
        return;
      }

      channelStatus[channel] = { status: 'Queued', updated_at: nowIso };
    });

    return {
      recipient_id: recipient.id,
      recipient_name: fullName(recipient),
      role: recipient.role,
      phone: recipient.phone ?? null,
      channels: channelStatus,
    };
  });

  return {
    generated_at: nowIso,
    recipients: rows,
    summary: summarizeDeliveryRecipients(rows),
  };
};

const normalizeDeliveryReport = ({ report, fallbackRecipients = [], channels = [] } = {}) => {
  if (report && typeof report === 'object' && Array.isArray(report.recipients)) {
    const rows = report.recipients.map((recipient) => ({
      recipient_id: recipient.recipient_id,
      recipient_name: recipient.recipient_name,
      role: recipient.role,
      phone: recipient.phone ?? null,
      channels: recipient.channels ?? {},
    }));

    return {
      generated_at: report.generated_at ?? toIsoString(),
      recipients: rows,
      summary: report.summary ?? summarizeDeliveryRecipients(rows),
    };
  }

  return buildDeliveryReport({ recipients: fallbackRecipients, channels, scheduled: false, deliveredIds: [] });
};

const formatAudienceLabel = (row) => {
  const audience = normalizeAudience(row?.audience_type);
  if (audience === 'Class') {
    return row?.classes?.name ? `Class: ${row.classes.name}` : 'Class';
  }
  return audience;
};

const getProfilesByIds = async (ids = []) => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, first_name, last_name, phone')
    .in('id', uniqueIds);

  if (error) return { data: [], error };
  return { data: data ?? [], error: null };
};

const listSchoolProfiles = async ({ schoolId, role = 'All', limit } = {}) => {
  if (!schoolId) return EMPTY_LIST;

  const normalizedRole = normalizeAudience(role);

  let query = supabase
    .from('profiles')
    .select('id, school_id, role, first_name, last_name, phone', { count: 'exact' })
    .eq('school_id', schoolId)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true });

  if (normalizedRole === 'Students') {
    query = query.eq('role', 'student');
  } else if (normalizedRole === 'Parents') {
    query = query.eq('role', 'parent');
  } else if (normalizedRole === 'Staff') {
    query = query.in('role', SCHOOL_STAFF_PROFILE_ROLES);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error, count } = await query;
  if (error) return { data: [], error, count: 0 };

  return {
    data: (data ?? []).filter((row) => isSchoolRecipientRole(row.role)),
    error: null,
    count: count ?? (data ?? []).length,
  };
};

const listClassStudentProfiles = async ({ schoolId, classId, limit } = {}) => {
  if (!schoolId || !classId) return EMPTY_LIST;

  let studentQuery = supabase
    .from('students')
    .select('id, profile_id, first_name, last_name, student_id_number, current_class_id, classes(id, name)')
    .eq('school_id', schoolId)
    .eq('current_class_id', classId)
    .not('profile_id', 'is', null)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (limit) {
    studentQuery = studentQuery.limit(limit);
  }

  const { data: students, error: studentsError } = await studentQuery;
  if (studentsError) return { data: [], error: studentsError, count: 0 };

  const profileIds = (students ?? []).map((row) => row.profile_id).filter(Boolean);
  const { data: profiles, error: profilesError } = await getProfilesByIds(profileIds);
  if (profilesError) return { data: [], error: profilesError, count: 0 };

  const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]));

  const rows = (students ?? [])
    .map((student) => {
      const profile = profileMap.get(student.profile_id);
      if (!profile?.id) return null;

      return {
        id: profile.id,
        role: profile.role ?? 'student',
        first_name: profile.first_name ?? student.first_name,
        last_name: profile.last_name ?? student.last_name,
        phone: profile.phone ?? null,
        class_name: student.classes?.name ?? null,
        student_id_number: student.student_id_number ?? null,
      };
    })
    .filter(Boolean);

  return { data: rows, error: null, count: rows.length };
};

const resolveAudienceRecipients = async ({
  schoolId,
  audience,
  classId,
  individualId,
  recipientIds,
  senderId,
} = {}) => {
  if (!schoolId) return { data: [], error: new Error('School is required') };

  const normalizedAudience = normalizeAudience(audience);

  if (normalizedAudience === 'Class' && !classId) {
    return { data: [], error: new Error('Select a class for class messaging') };
  }

  if (normalizedAudience === 'Individual' && !individualId && (!Array.isArray(recipientIds) || recipientIds.length === 0)) {
    return { data: [], error: new Error('Select an individual recipient') };
  }

  let rows = [];

  if (normalizedAudience === 'Class') {
    const result = await listClassStudentProfiles({ schoolId, classId, limit: 500 });
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else if (normalizedAudience === 'Individual') {
    const ids = individualId ? [individualId] : recipientIds;
    const result = await getProfilesByIds(ids);
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else if (normalizedAudience === 'Custom') {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return { data: [], error: new Error('Select at least one recipient') };
    }

    const result = await getProfilesByIds(recipientIds);
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else if (normalizedAudience === 'Students') {
    const result = await listSchoolProfiles({ schoolId, role: 'Students', limit: 500 });
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else if (normalizedAudience === 'Parents') {
    const result = await listSchoolProfiles({ schoolId, role: 'Parents', limit: 500 });
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else if (normalizedAudience === 'Staff') {
    const result = await listSchoolProfiles({ schoolId, role: 'Staff', limit: 500 });
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  } else {
    const result = await listSchoolProfiles({ schoolId, role: 'All', limit: 1000 });
    if (result.error) return { data: [], error: result.error };
    rows = result.data ?? [];
  }

  const recipients = uniqueById(rows)
    .filter((row) => row.id !== senderId)
    .filter((row) => isSchoolRecipientRole(row.role));

  return { data: recipients, error: null };
};

const sendInAppNotifications = async ({ recipients = [], subject, body } = {}) => {
  if (recipients.length === 0) {
    return { deliveredIds: [], error: null };
  }

  const notificationRows = recipients.map((recipient) => ({
    user_id: recipient.id,
    title: subject?.trim() || 'New message',
    body: body?.trim() || null,
    type: 'message',
    action_url: getRolePrimaryActionRoute(recipient.role),
    is_read: false,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationRows)
    .select('user_id');

  if (error) return { deliveredIds: [], error };

  return {
    deliveredIds: (data ?? []).map((row) => row.user_id).filter(Boolean),
    error: null,
  };
};

const withMessageSearch = (rows = [], search) => {
  const query = toLowerSearch(search);
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.subject,
      row.body,
      row.audience_label,
      row.sender_profile?.first_name,
      row.sender_profile?.last_name,
      row.classes?.name,
      row.delivery_report?.recipients?.map((recipient) => recipient.recipient_name).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
};

const withAnnouncementSearch = (rows = [], search) => {
  const query = toLowerSearch(search);
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [row.title, row.body, row.priority, ...(row.audience ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
};

const withTemplateSearch = (rows = [], search) => {
  const query = toLowerSearch(search);
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [row.name, row.category, row.subject, row.body, row.default_audience]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
};

export const messagingApi = {
  listRecipients: async ({ schoolId, role = 'All', classId, search, limit = 250 } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let result;

    if (classId) {
      result = await listClassStudentProfiles({ schoolId, classId, limit });
    } else {
      result = await listSchoolProfiles({ schoolId, role, limit });
    }

    if (result.error) return { data: [], error: result.error, count: 0 };

    const query = toLowerSearch(search);
    const filtered = query
      ? (result.data ?? []).filter((row) => {
          const haystack = `${row.first_name ?? ''} ${row.last_name ?? ''} ${row.phone ?? ''} ${row.role ?? ''}`
            .toLowerCase();
          return haystack.includes(query);
        })
      : result.data ?? [];

    return {
      data: filtered,
      error: null,
      count: filtered.length,
    };
  },

  previewRecipients: async ({ schoolId, audience, classId, individualId, recipientIds, senderId } = {}) => {
    const result = await resolveAudienceRecipients({ schoolId, audience, classId, individualId, recipientIds, senderId });
    if (result.error) return { data: [], error: result.error, count: 0 };

    return {
      data: result.data ?? [],
      error: null,
      count: result.data?.length ?? 0,
    };
  },

  listMessageTemplates: async ({ schoolId, search, limit = 200 } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('message_templates')
      .select('id, school_id, name, category, default_audience, default_channels, subject, body, created_by, created_at, creator_profile:profiles!message_templates_created_by_fkey(id, first_name, last_name, role)', {
        count: 'exact',
      })
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const filtered = withTemplateSearch(data ?? [], search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createMessageTemplate: (payload) =>
    supabase
      .from('message_templates')
      .insert(payload)
      .select('id, school_id, name, category, default_audience, default_channels, subject, body, created_by, created_at, creator_profile:profiles!message_templates_created_by_fkey(id, first_name, last_name, role)')
      .single(),

  deleteMessageTemplate: (id) =>
    supabase
      .from('message_templates')
      .delete()
      .eq('id', id),

  listAnnouncements: async ({ schoolId, search, activeOnly = false, includeExpired = false, limit = 200 } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    const nowIso = toIsoString();

    let query = supabase
      .from('announcements')
      .select('id, school_id, title, body, audience, priority, publish_at, expires_at, created_by, created_at, creator_profile:profiles!announcements_created_by_fkey(id, first_name, last_name, role)', {
        count: 'exact',
      })
      .eq('school_id', schoolId)
      .order('publish_at', { ascending: false });

    if (activeOnly) {
      query = query
        .lte('publish_at', nowIso)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    } else if (!includeExpired) {
      query = query.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    const rows = (data ?? []).map((row) => {
      const publishAt = row.publish_at ? new Date(row.publish_at) : null;
      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const now = Date.now();

      let effective_status = 'Active';
      if (publishAt && publishAt.getTime() > now) effective_status = 'Scheduled';
      else if (expiresAt && expiresAt.getTime() <= now) effective_status = 'Expired';

      return {
        ...row,
        effective_status,
      };
    });

    const filtered = withAnnouncementSearch(rows, search);
    return { data: filtered, error: null, count: filtered.length };
  },

  createAnnouncement: (payload) =>
    supabase
      .from('announcements')
      .insert(payload)
      .select('id, school_id, title, body, audience, priority, publish_at, expires_at, created_by, created_at, creator_profile:profiles!announcements_created_by_fkey(id, first_name, last_name, role)')
      .single(),

  deleteAnnouncement: (id) =>
    supabase
      .from('announcements')
      .delete()
      .eq('id', id),

  listMessages: async ({ schoolId, viewerId, scope = 'all', status, search, limit = 250 } = {}) => {
    if (!schoolId) return EMPTY_LIST;

    let query = supabase
      .from('messages')
      .select('id, school_id, subject, body, sender_id, recipient_ids, channels, status, sent_at, delivery_report, audience_type, class_id, scheduled_for, created_at, sender_profile:profiles!messages_sender_id_fkey(id, first_name, last_name, role), classes(id, name)', {
        count: 'exact',
      })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (status && status !== 'All') {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return { data: [], error, count: 0 };

    let rows = data ?? [];

    if (viewerId && scope === 'inbox') {
      rows = rows.filter((row) => Array.isArray(row.recipient_ids) && row.recipient_ids.includes(viewerId));
    } else if (viewerId && scope === 'outbox') {
      rows = rows.filter((row) => row.sender_id === viewerId);
    } else if (viewerId && scope === 'mine') {
      rows = rows.filter(
        (row) => row.sender_id === viewerId || (Array.isArray(row.recipient_ids) && row.recipient_ids.includes(viewerId))
      );
    }

    const allRecipientIds = Array.from(
      new Set(rows.flatMap((row) => (Array.isArray(row.recipient_ids) ? row.recipient_ids : [])).filter(Boolean))
    );

    const recipientsResult = await getProfilesByIds(allRecipientIds);
    if (recipientsResult.error) return { data: [], error: recipientsResult.error, count: 0 };

    const recipientMap = new Map((recipientsResult.data ?? []).map((row) => [row.id, row]));

    const enriched = rows.map((row) => {
      const channels = normalizeChannels(row.channels ?? []);
      const fallbackRecipients = (row.recipient_ids ?? []).map((id) => recipientMap.get(id) || { id });
      const deliveryReport = normalizeDeliveryReport({
        report: row.delivery_report,
        fallbackRecipients,
        channels,
      });

      return {
        ...row,
        channels,
        audience_type: normalizeAudience(row.audience_type),
        audience_label: formatAudienceLabel(row),
        recipient_count: Array.isArray(row.recipient_ids) ? row.recipient_ids.length : 0,
        delivery_report: deliveryReport,
        delivery_summary: deliveryReport.summary,
      };
    });

    const filtered = withMessageSearch(enriched, search);
    return { data: filtered, error: null, count: filtered.length };
  },

  sendMessage: async ({
    schoolId,
    senderId,
    subject,
    body,
    audience = 'All',
    classId,
    individualId,
    recipientIds,
    channels,
    scheduleAt,
  } = {}) => {
    if (!schoolId || !senderId) {
      return { data: null, error: new Error('School and sender are required') };
    }

    if (!body?.trim()) {
      return { data: null, error: new Error('Message body is required') };
    }

    const normalizedAudience = normalizeAudience(audience);
    const normalizedChannels = normalizeChannels(channels);

    const recipientResult = await resolveAudienceRecipients({
      schoolId,
      audience: normalizedAudience,
      classId,
      individualId,
      recipientIds,
      senderId,
    });

    if (recipientResult.error) {
      return { data: null, error: recipientResult.error };
    }

    const recipients = recipientResult.data ?? [];
    if (recipients.length === 0) {
      return { data: null, error: new Error('No recipients matched this audience') };
    }

    const scheduled = scheduleAt ? isFutureTimestamp(scheduleAt) : false;
    const nowIso = toIsoString();

    let deliveredIds = [];

    // TODO(future-feature): move Email/SMS dispatch to a secure server-side worker
    // (Supabase Edge Function or backend job) using provider secrets that are never
    // exposed to the browser. The client should only enqueue messages and track state.
    if (!scheduled && normalizedChannels.includes('in_app')) {
      const notifyResult = await sendInAppNotifications({ recipients, subject, body });
      if (notifyResult.error && normalizedChannels.length === 1) {
        return { data: null, error: notifyResult.error };
      }
      deliveredIds = notifyResult.deliveredIds ?? [];
    }

    const report = buildDeliveryReport({
      recipients,
      channels: normalizedChannels,
      scheduled,
      deliveredIds,
    });

    let status = scheduled ? 'Scheduled' : 'Sent';
    if (!scheduled && normalizedChannels.includes('in_app') && deliveredIds.length === 0 && normalizedChannels.length === 1) {
      status = 'Queued';
    }

    const insertPayload = {
      school_id: schoolId,
      subject: subject?.trim() || null,
      body: body.trim(),
      sender_id: senderId,
      recipient_ids: recipients.map((row) => row.id),
      channels: normalizedChannels,
      status,
      sent_at: scheduled ? null : nowIso,
      delivery_report: report,
      audience_type: normalizedAudience,
      class_id: normalizedAudience === 'Class' ? classId : null,
      scheduled_for: scheduled ? toIsoString(scheduleAt) : null,
      created_at: nowIso,
    };

    const { data: created, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('id, school_id, subject, body, sender_id, recipient_ids, channels, status, sent_at, delivery_report, audience_type, class_id, scheduled_for, created_at, sender_profile:profiles!messages_sender_id_fkey(id, first_name, last_name, role), classes(id, name)')
      .single();

    if (error) return { data: null, error };

    return {
      data: {
        ...created,
        channels: normalizedChannels,
        audience_type: normalizedAudience,
        audience_label: formatAudienceLabel(created),
        recipient_count: recipients.length,
        delivery_report: report,
        delivery_summary: report.summary,
      },
      error: null,
    };
  },

  dispatchScheduledMessages: async ({ schoolId, limit = 100 } = {}) => {
    if (!schoolId) {
      return { data: { processedCount: 0, messageIds: [] }, error: new Error('School is required') };
    }

    const nowIso = toIsoString();

    const { data: dueMessages, error: dueError } = await supabase
      .from('messages')
      .select('id, school_id, subject, body, sender_id, recipient_ids, channels, status, sent_at, delivery_report, audience_type, class_id, scheduled_for, created_at')
      .eq('school_id', schoolId)
      .in('status', ['Scheduled', 'Queued'])
      .or(`scheduled_for.lte.${nowIso},scheduled_for.is.null`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (dueError) return { data: { processedCount: 0, messageIds: [] }, error: dueError };

    const rows = dueMessages ?? [];
    if (rows.length === 0) {
      return { data: { processedCount: 0, messageIds: [] }, error: null };
    }

    const recipientIds = Array.from(
      new Set(rows.flatMap((row) => (Array.isArray(row.recipient_ids) ? row.recipient_ids : [])).filter(Boolean))
    );

    const recipientsResult = await getProfilesByIds(recipientIds);
    if (recipientsResult.error) return { data: { processedCount: 0, messageIds: [] }, error: recipientsResult.error };

    const recipientMap = new Map((recipientsResult.data ?? []).map((row) => [row.id, row]));

    const processedIds = [];

    // TODO(future-feature): scheduled dispatch should be executed by a trusted server-side
    // scheduler/worker (e.g., pg_cron -> Edge Function) that sends Email via Resend and
    // SMS via Africa's Talking, then writes delivery_report updates (Delivered/Failed)
    // back to messages for each recipient/channel.
    for (const row of rows) {
      const channels = normalizeChannels(row.channels ?? []);
      const fallbackRecipients = (row.recipient_ids ?? []).map((id) => recipientMap.get(id) || { id });
      const existingReport = normalizeDeliveryReport({ report: row.delivery_report, fallbackRecipients, channels });

      let deliveredSet = new Set(
        (existingReport.recipients ?? [])
          .filter((recipient) => recipient.channels?.in_app?.status === 'Delivered')
          .map((recipient) => recipient.recipient_id)
      );

      if (channels.includes('in_app')) {
        const pendingRecipients = fallbackRecipients.filter((recipient) => !deliveredSet.has(recipient.id));
        if (pendingRecipients.length > 0) {
          const notifyResult = await sendInAppNotifications({
            recipients: pendingRecipients,
            subject: row.subject,
            body: row.body,
          });

          if (!notifyResult.error) {
            deliveredSet = new Set([...deliveredSet, ...(notifyResult.deliveredIds ?? [])]);
          }
        }
      }

      const nextRecipients = (existingReport.recipients ?? []).map((recipient) => {
        const nextChannels = { ...(recipient.channels ?? {}) };

        channels.forEach((channel) => {
          const prevStatus = nextChannels[channel]?.status;

          if (channel === 'in_app') {
            if (deliveredSet.has(recipient.recipient_id)) {
              nextChannels[channel] = { status: 'Delivered', updated_at: nowIso };
            } else if (prevStatus === 'Failed') {
              nextChannels[channel] = { status: 'Failed', updated_at: nowIso };
            } else {
              nextChannels[channel] = { status: 'Queued', updated_at: nowIso };
            }
            return;
          }

          if (prevStatus === 'Scheduled') {
            nextChannels[channel] = { status: 'Queued', updated_at: nowIso };
          } else if (!prevStatus) {
            nextChannels[channel] = { status: 'Queued', updated_at: nowIso };
          }
        });

        return {
          ...recipient,
          channels: nextChannels,
        };
      });

      const nextReport = {
        generated_at: nowIso,
        recipients: nextRecipients,
        summary: summarizeDeliveryRecipients(nextRecipients),
      };

      const inAppFailures = nextReport.summary.byChannel.in_app.failed;
      const status = channels.includes('in_app') && inAppFailures > 0 ? 'Queued' : 'Sent';

      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status,
          sent_at: row.sent_at ?? nowIso,
          delivery_report: nextReport,
        })
        .eq('id', row.id);

      if (!updateError) {
        processedIds.push(row.id);
      }
    }

    return {
      data: {
        processedCount: processedIds.length,
        messageIds: processedIds,
      },
      error: null,
    };
  },

  getMessagingSummary: async ({ schoolId, viewerId } = {}) => {
    if (!schoolId) {
      return {
        totalMessages: 0,
        scheduledMessages: 0,
        queuedMessages: 0,
        sentToday: 0,
        activeAnnouncements: 0,
        templates: 0,
        unreadNotifications: 0,
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso = toIsoString(todayStart);
    const nowIso = toIsoString();

    const [
      totalMessagesResult,
      scheduledResult,
      queuedResult,
      sentTodayResult,
      activeAnnouncementsResult,
      templatesResult,
      unreadNotificationsResult,
    ] = await Promise.all([
      supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId),
      supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId)
        .eq('status', 'Scheduled'),
      supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId)
        .eq('status', 'Queued'),
      supabase
        .from('messages')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId)
        .eq('status', 'Sent')
        .gte('sent_at', todayStartIso),
      supabase
        .from('announcements')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId)
        .lte('publish_at', nowIso)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
      supabase
        .from('message_templates')
        .select('id', { head: true, count: 'exact' })
        .eq('school_id', schoolId),
      viewerId
        ? supabase
            .from('notifications')
            .select('id', { head: true, count: 'exact' })
            .eq('user_id', viewerId)
            .eq('is_read', false)
        : Promise.resolve({ count: 0, error: null }),
    ]);

    const firstError = [
      totalMessagesResult.error,
      scheduledResult.error,
      queuedResult.error,
      sentTodayResult.error,
      activeAnnouncementsResult.error,
      templatesResult.error,
      unreadNotificationsResult.error,
    ].find(Boolean);

    if (firstError) throw firstError;

    return {
      totalMessages: totalMessagesResult.count ?? 0,
      scheduledMessages: scheduledResult.count ?? 0,
      queuedMessages: queuedResult.count ?? 0,
      sentToday: sentTodayResult.count ?? 0,
      activeAnnouncements: activeAnnouncementsResult.count ?? 0,
      templates: templatesResult.count ?? 0,
      unreadNotifications: unreadNotificationsResult.count ?? 0,
    };
  },
};
