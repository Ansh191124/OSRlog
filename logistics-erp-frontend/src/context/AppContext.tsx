import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../api/client";
import { connectSocket, disconnectSocket, getSocket } from "../api/socket";
import { notificationApi } from "../api/entities";
import type { AuthUser, LoginResponse } from "../types/user";
import type { Scope } from "../types/roles";
import type { AppNotification } from "../types/entities";

interface AppContextValue {
  user: AuthUser | null;
  scope: Scope | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // The full notification list lives here (not just NotificationBell) so the
  // Sidebar can light up a per-section dot next to whichever nav items have
  // an unread notification pointing at them.
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications);
    } catch {
      // Not authenticated yet, or a transient failure — the socket listener
      // and manual reloads will keep things eventually consistent.
    }
  }, []);

  // Live-append incoming notifications so both the bell dropdown and the
  // Sidebar's per-section dots stay current without a refetch.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function onNotification(notification: AppNotification) {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    }
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [user]);

  useEffect(() => {
    const storedToken = localStorage.getItem("osr_token");
    const storedUser = localStorage.getItem("osr_user");
    const storedScope = localStorage.getItem("osr_scope") as Scope | null;

    if (storedToken && storedUser && storedScope) {
      setUser(JSON.parse(storedUser));
      setScope(storedScope);
      connectSocket(JSON.parse(storedUser)._id, storedScope);
      loadNotifications();
    }
    setIsLoading(false);
  }, [loadNotifications]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", { email, password });
      localStorage.setItem("osr_token", data.token);
      localStorage.setItem("osr_user", JSON.stringify(data.user));
      localStorage.setItem("osr_scope", data.scope);
      setUser(data.user);
      setScope(data.scope);
      connectSocket(data.user._id, data.scope);
      await loadNotifications();
    },
    [loadNotifications]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("osr_token");
    localStorage.removeItem("osr_user");
    localStorage.removeItem("osr_scope");
    disconnectSocket();
    setUser(null);
    setScope(null);
    setNotifications([]);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    await notificationApi.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      scope,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      notifications,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [user, scope, isLoading, login, logout, notifications, unreadCount, markNotificationRead, markAllNotificationsRead]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
