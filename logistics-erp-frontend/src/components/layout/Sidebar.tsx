import { NavLink } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { NAV_BY_SCOPE } from "../../config/navigation";
import { SCOPE_LABELS } from "../../types/roles";
import type { AppNotification } from "../../types/entities";
import osrLogo from "../../assets/OSR-logo-Blue.png";

// A nav item lights up if some unread notification points at it (or a page
// beneath it, e.g. a loading-slip detail link still dots "Loading Slips").
// "/" (Overview) only lights up for a notification linking there exactly —
// otherwise every notification would dot it, since "/" prefixes every path.
function hasUnreadFor(path: string, notifications: AppNotification[]) {
  return notifications.some((n) => {
    if (n.read || !n.link) return false;
    if (path === "/") return n.link === "/";
    return n.link === path || n.link.startsWith(`${path}/`);
  });
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { scope, notifications } = useApp();
  const items = scope ? NAV_BY_SCOPE[scope] : [];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 sm:hidden"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 sm:static sm:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img src={osrLogo} alt="OSR Logistics" className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <p className="text-sm font-semibold text-text-primary">OSR Logistics</p>
              {scope && <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{SCOPE_LABELS[scope]}</p>}
            </div>
          </div>
          <div className="mt-4 h-0.5 w-10 rounded-full bg-accent-500" aria-hidden="true" />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const dotted = hasUnreadFor(item.path, notifications);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-accent-500 bg-brand-700 text-white"
                      : "border-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                  }`
                }
              >
                <span>{item.label}</span>
                {dotted && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-danger-500" aria-label="Unread notification" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
