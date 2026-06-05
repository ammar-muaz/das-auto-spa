"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  booking_id?: string;
  created_at: string;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "booking": return "📋";
    case "assignment": return "👷";
    case "status": return "🔔";
    case "cancellation": return "❌";
    case "payment": return "💳";
    default: return "📣";
  }
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
};

const groupByDay = (notifications: Notification[]) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: { label: string; items: Notification[] }[] = [];
  const todayItems = notifications.filter((n) => new Date(n.created_at) >= today);
  const yesterdayItems = notifications.filter((n) => { const d = new Date(n.created_at); return d >= yesterday && d < today; });
  const earlierItems = notifications.filter((n) => new Date(n.created_at) < yesterday);
  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });
  return groups;
};

export default function NotificationsPage() {
  const { userId } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDay(notifications);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-100 border border-gray-200">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Bell className="w-14 h-14 mb-4 text-gray-200" />
          <p className="font-semibold text-gray-500 text-lg">No notifications yet</p>
          <p className="text-sm mt-1">We&apos;ll notify you when something happens.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{group.label}</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {group.items.map((n) => (
                  <button key={n.id} onClick={() => markRead(n.id)}
                    className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4 ${!n.read ? "bg-blue-50/30" : ""}`}
                  >
                    <span className="text-xl mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm text-gray-900 leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatTime(n.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
