import { useApp } from "../../context/AppContext";
import { NotificationBell } from "./NotificationBell";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useApp();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-b-brand-700/10 bg-surface px-4 shadow-[0_1px_0_rgba(16,34,56,0.04)] sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary sm:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <div className="hidden sm:block" />
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-text-primary">{user?.name}</p>
          <p className="text-xs text-text-secondary">{user?.email}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={logout}
          className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-danger-300 hover:text-danger-600 sm:px-3"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
