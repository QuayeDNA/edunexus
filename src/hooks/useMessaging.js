import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { messagingApi } from '../services/api/messaging.js';

export const MESSAGING_SUMMARY_KEY = (schoolId, viewerId) => [
  'messaging-summary',
  schoolId,
  viewerId ?? 'none',
];

export const MESSAGES_KEY = ({ schoolId, viewerId, scope, status, search, limit } = {}) => [
  'messages',
  schoolId,
  viewerId ?? 'none',
  scope ?? 'all',
  status ?? 'all',
  search ?? '',
  limit ?? 'all',
];

export const ANNOUNCEMENTS_KEY = ({ schoolId, search, activeOnly, includeExpired, limit } = {}) => [
  'announcements',
  schoolId,
  search ?? '',
  activeOnly ? 'active-only' : 'all',
  includeExpired ? 'include-expired' : 'hide-expired',
  limit ?? 'all',
];

export const MESSAGE_TEMPLATES_KEY = ({ schoolId, search, limit } = {}) => [
  'message-templates',
  schoolId,
  search ?? '',
  limit ?? 'all',
];

export const MESSAGE_RECIPIENTS_KEY = ({ schoolId, role, classId, search, limit } = {}) => [
  'message-recipients',
  schoolId,
  role ?? 'all',
  classId ?? 'all',
  search ?? '',
  limit ?? 'all',
];

export const MESSAGE_PREVIEW_RECIPIENTS_KEY = ({
  schoolId,
  senderId,
  audience,
  classId,
  individualId,
  recipientIds,
} = {}) => [
  'message-preview-recipients',
  schoolId,
  senderId ?? 'none',
  audience ?? 'all',
  classId ?? 'all',
  individualId ?? 'none',
  Array.isArray(recipientIds) ? recipientIds.join(',') : 'none',
];

export const useMessagingSummary = (schoolId, viewerId) =>
  useQuery({
    queryKey: MESSAGING_SUMMARY_KEY(schoolId, viewerId),
    queryFn: () => messagingApi.getMessagingSummary({ schoolId, viewerId }),
    enabled: !!schoolId,
    staleTime: 20_000,
  });

export const useMessages = ({ schoolId, viewerId, scope = 'all', status, search, limit } = {}) =>
  useQuery({
    queryKey: MESSAGES_KEY({ schoolId, viewerId, scope, status, search, limit }),
    queryFn: async () => {
      const result = await messagingApi.listMessages({ schoolId, viewerId, scope, status, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 15_000,
  });

export const useAnnouncements = ({ schoolId, search, activeOnly = false, includeExpired = false, limit } = {}) =>
  useQuery({
    queryKey: ANNOUNCEMENTS_KEY({ schoolId, search, activeOnly, includeExpired, limit }),
    queryFn: async () => {
      const result = await messagingApi.listAnnouncements({
        schoolId,
        search,
        activeOnly,
        includeExpired,
        limit,
      });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 15_000,
  });

export const useMessageTemplates = ({ schoolId, search, limit } = {}) =>
  useQuery({
    queryKey: MESSAGE_TEMPLATES_KEY({ schoolId, search, limit }),
    queryFn: async () => {
      const result = await messagingApi.listMessageTemplates({ schoolId, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const useMessagingRecipients = ({ schoolId, role, classId, search, limit } = {}) =>
  useQuery({
    queryKey: MESSAGE_RECIPIENTS_KEY({ schoolId, role, classId, search, limit }),
    queryFn: async () => {
      const result = await messagingApi.listRecipients({ schoolId, role, classId, search, limit });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

export const usePreviewRecipients = ({ schoolId, senderId, audience, classId, individualId, recipientIds } = {}) =>
  useQuery({
    queryKey: MESSAGE_PREVIEW_RECIPIENTS_KEY({ schoolId, senderId, audience, classId, individualId, recipientIds }),
    queryFn: async () => {
      const result = await messagingApi.previewRecipients({
        schoolId,
        senderId,
        audience,
        classId,
        individualId,
        recipientIds,
      });
      if (result.error) throw result.error;
      return { data: result.data ?? [], count: result.count ?? 0 };
    },
    enabled: !!schoolId && !!senderId,
    staleTime: 10_000,
  });

export const useSendMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const result = await messagingApi.sendMessage(payload);
      if (result.error) throw result.error;
      return { schoolId: payload.schoolId, data: result.data };
    },
    onSuccess: ({ schoolId, data }) => {
      qc.invalidateQueries({ queryKey: ['messages', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['message-preview-recipients', schoolId] });
      qc.invalidateQueries({ queryKey: ['notifications'] });

      const recipients = data?.recipient_count ?? 0;
      const audience = data?.audience_type ?? 'All';
      toast.success(`Message sent to ${recipients} recipient${recipients === 1 ? '' : 's'} (${audience})`);
    },
    onError: (err) => toast.error(err.message ?? 'Failed to send message'),
  });
};

export const useDispatchScheduledMessages = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, limit }) => {
      const result = await messagingApi.dispatchScheduledMessages({ schoolId, limit });
      if (result.error) throw result.error;
      return { schoolId, data: result.data };
    },
    onSuccess: ({ schoolId, data }) => {
      qc.invalidateQueries({ queryKey: ['messages', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      qc.invalidateQueries({ queryKey: ['notifications'] });

      const count = Number(data?.processedCount ?? 0);
      if (count > 0) {
        toast.success(`Dispatched ${count} scheduled message${count === 1 ? '' : 's'}`);
      } else {
        toast.success('No scheduled messages were due');
      }
    },
    onError: (err) => toast.error(err.message ?? 'Failed to dispatch scheduled messages'),
  });
};

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await messagingApi.createAnnouncement(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['announcements', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      toast.success('Announcement published');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to create announcement'),
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await messagingApi.deleteAnnouncement(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['announcements', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      toast.success('Announcement deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete announcement'),
  });
};

export const useCreateMessageTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await messagingApi.createMessageTemplate(payload);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const schoolId = data?.school_id;
      qc.invalidateQueries({ queryKey: ['message-templates', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      toast.success('Message template saved');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to save template'),
  });
};

export const useDeleteMessageTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, schoolId }) => {
      const { error } = await messagingApi.deleteMessageTemplate(id);
      if (error) throw error;
      return { schoolId };
    },
    onSuccess: ({ schoolId }) => {
      qc.invalidateQueries({ queryKey: ['message-templates', schoolId] });
      qc.invalidateQueries({ queryKey: ['messaging-summary', schoolId] });
      toast.success('Template deleted');
    },
    onError: (err) => toast.error(err.message ?? 'Failed to delete template'),
  });
};
