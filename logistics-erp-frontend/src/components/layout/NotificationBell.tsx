import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "../../types/entities";
import { useApp } from "../../context/AppContext";

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleOpen() {
    setOpen((prev) => !prev);
  }

  async function handleClickNotification(n: AppNotification) {
    setActionError(null);
    if (!n.read) {
      try {
        await markNotificationRead(n._id);
      } catch {
        setActionError("Couldn't mark this as read. Please try again.");
        return;
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    setActionError(null);
    try {
      await markAllNotificationsRead();
    } catch {
      setActionError("Couldn't mark all as read. Please try again.");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[calc(100vw-2rem)] max-w-80 rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                Mark all read
              </button>
            )}
          </div>
          {actionError && <p className="border-b border-border px-4 py-2 text-xs text-danger-600">{actionError}</p>}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-text-secondary">No notifications yet.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClickNotification(n)}
                className={`block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-surface-muted ${
                  n.read ? "" : "bg-brand-50/50"
                }`}
              >
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                {n.message && <p className="mt-0.5 text-xs text-text-secondary">{n.message}</p>}
                <p className="mt-0.5 text-[11px] text-text-secondary">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
