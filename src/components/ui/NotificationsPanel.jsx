import { X, Bell, CheckCheck, BellOff } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters.js';
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from '../../hooks/useNotifications.js';
import { useUiStore } from '../../store/uiStore.js';
import { cn } from '../../utils/cn.js';

const TYPE_ICONS = {
  fee_reminder:   '💳',
  grade_posted:   '📊',
  attendance:     '📋',
  message:        '✉️',
  system:         '🔔',
  behavior:       '⭐',
  wellness:       '🌱',
};

export default function NotificationsPanel() {
  const { notificationsPanelOpen, toggleNotificationsPanel } = useUiStore();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkNotificationRead();

  const unread = notifications.filter(n => !n.is_read);

  if (!notificationsPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={toggleNotificationsPanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-white shadow-modal flex flex-col animate-slide-in no-print">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
            {unread.length > 0 && (
              <span className="bg-brand-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unread.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="btn-ghost text-xs gap-1.5"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
            <button
              onClick={toggleNotificationsPanel}
              className="btn-ghost p-1.5"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-surface-hover flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-hover rounded w-3/4" />
                    <div className="h-2 bg-surface-hover rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center">
                <BellOff className="w-7 h-7 text-text-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">All caught up!</p>
                <p className="text-xs text-text-muted mt-1">No new notifications</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markRead.mutate(n.id);
                    if (n.action_url) window.location.href = n.action_url;
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-muted transition-colors',
                    !n.is_read && 'bg-brand-50/40'
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0',
                    n.is_read ? 'bg-surface-muted' : 'bg-brand-50'
                  )}>
                    {TYPE_ICONS[n.type] ?? '🔔'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm leading-snug',
                      n.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'
                    )}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
