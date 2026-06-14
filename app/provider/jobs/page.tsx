"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, History, Star } from "lucide-react";
import Link from "next/link";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

type BookingStatus = "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  service: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700 border-green-300";
    case "Cancelled": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

export default function ProviderJobsPage() {
  const { userId, email } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyFilterDate, setHistoryFilterDate] = useState("");
  const [reviewsByBookingId, setReviewsByBookingId] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId || !email) return;
    supabase
      .from("bookings")
      .select("id, booking_id, service_name, scheduled_date, time_slot, status")
      .or(`assigned_provider_id.eq.${userId},assigned_to.ilike.${email}`)
      .in("status", ["Completed", "Cancelled"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setBookings(data.map((row: any) => ({
            id: row.id,
            bookingId: row.booking_id,
            service: row.service_name,
            date: row.scheduled_date,
            timeSlot: row.time_slot,
            status: row.status,
          })));
        }
        setLoading(false);
      });
  }, [userId, email, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel('provider-jobs-history-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (bookings.length === 0) return;
    const bookingIds = bookings.map((b) => b.id);
    supabase
      .from("reviews")
      .select("booking_id, rating")
      .in("booking_id", bookingIds)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach((r: { booking_id: string; rating: number }) => {
            map[r.booking_id] = r.rating;
          });
          setReviewsByBookingId(map);
        }
      });
  }, [bookings]);

  const historyBookings = bookings.filter(
    (b) => !historyFilterDate || b.date === historyFilterDate
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Job History</h1>
            <p className="text-gray-500 text-sm mt-1">Your completed and cancelled jobs</p>
          </div>

          <div className="flex items-center justify-end gap-2 mb-4">
            <input
              type="date"
              value={historyFilterDate}
              onChange={(e) => setHistoryFilterDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
            />
            {historyFilterDate && (
              <button
                onClick={() => setHistoryFilterDate("")}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : historyBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <History className="w-7 h-7 text-gray-200" />
                <p className="text-sm text-gray-400">
                  {historyFilterDate ? "No jobs on this date." : "No completed or cancelled jobs yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 truncate">{b.service}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusColor(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                        <span className="font-mono text-[10px]">{b.bookingId}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timeSlot}</span>
                      </div>
                    </div>
                    {b.status === "Completed" && reviewsByBookingId[b.id] !== undefined && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= reviewsByBookingId[b.id] ? "text-amber-400 fill-amber-400" : "text-gray-100 fill-gray-100"}`}
                          />
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/provider/jobs/${b.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg bg-white hover:border-gray-300 hover:shadow-sm transition-all shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
