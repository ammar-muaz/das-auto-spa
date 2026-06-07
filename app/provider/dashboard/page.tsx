"use client";

import { useEffect, useState } from "react";
import {
  Calendar, Car, Navigation, CheckCircle,
  Clock, Eye, Star,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";
import Link from "next/link";

type BookingStatus = "Pending" | "Confirmed" | "Assigned" | "En Route" | "In Progress" | "Completion Pending" | "Issue/Delayed" | "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  carDetails: string;
  amount: number;
  status: BookingStatus;
  paymentMethod: string;
  paymentStatus: string;
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700 border-green-300";
    case "Confirmed": return "bg-gray-100 text-gray-900 border-gray-300";
    case "Assigned": return "bg-blue-100 text-blue-700 border-blue-300";
    case "En Route": return "bg-purple-100 text-purple-700 border-purple-300";
    case "In Progress": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Completion Pending": return "bg-teal-100 text-teal-700 border-teal-300";
    case "Cancelled": case "Issue/Delayed": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export default function ProviderDashboardPage() {
  const { userId, email, fullName } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsByBookingId, setReviewsByBookingId] = useState<Record<string, number>>({});
  const [dashboardTab, setDashboardTab] = useState<"today" | "all">("today");

  useEffect(() => {
    if (!userId || !email) return;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_id, customer_name, service_name, scheduled_date, time_slot, address, car_details, amount, status, payment_method, payment_status")
        .or(`assigned_provider_id.eq.${userId},assigned_to.ilike.${email}`)
        .order("created_at", { ascending: false });

      if (data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          customerName: row.customer_name,
          service: row.service_name,
          date: row.scheduled_date,
          timeSlot: row.time_slot,
          address: row.address,
          carDetails: row.car_details,
          amount: Number(row.amount),
          status: row.status,
          paymentMethod: row.payment_method || "",
          paymentStatus: row.payment_status || "",
        }));
        setBookings(mapped);

        const ids = mapped.map((b: Booking) => b.id);
        if (ids.length > 0) {
          const { data: reviewRows } = await supabase
            .from("reviews")
            .select("booking_id, rating")
            .in("booking_id", ids);
          if (reviewRows) {
            const map: Record<string, number> = {};
            reviewRows.forEach((r: { booking_id: string; rating: number }) => { map[r.booking_id] = r.rating; });
            setReviewsByBookingId(map);
          }
        }
      }
      setLoading(false);
    };

    load();
  }, [userId, email]);

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const response = await fetch("/api/provider/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (response.ok) {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: newStatus } : b));
    }
  };

  const handleNavigate = (address: string) => {
    const w = window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  };

  const todaysJobs = bookings.filter((b) =>
    b.date === today && ["Assigned", "En Route", "Confirmed", "In Progress", "Completion Pending"].includes(b.status)
  );
  const activeJobs = bookings.filter((b) => !["Completed", "Cancelled"].includes(b.status));
  const inProgressCount = bookings.filter((b) => ["In Progress", "En Route", "Completion Pending"].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "Completed").length;
  const reviewCount = Object.keys(reviewsByBookingId).length;
  const avgRating = reviewCount > 0
    ? Object.values(reviewsByBookingId).reduce((s, r) => s + r, 0) / reviewCount
    : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome, {fullName || "Provider"}!</h1>
            <p className="text-gray-500 mt-1">Manage your service schedule and active jobs.</p>
          </header>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
                <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
                  <CardHeader>
                    <CardDescription>Today&apos;s Jobs</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">{todaysJobs.length}</CardTitle>
                    <CardAction><Calendar className="w-5 h-5 text-muted-foreground" /></CardAction>
                  </CardHeader>
                  <CardFooter className="text-sm text-muted-foreground">Scheduled for today</CardFooter>
                </Card>
                <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
                  <CardHeader>
                    <CardDescription>In Progress</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">{inProgressCount}</CardTitle>
                    <CardAction><Clock className="w-5 h-5 text-muted-foreground" /></CardAction>
                  </CardHeader>
                  <CardFooter className="text-sm text-muted-foreground">Currently active jobs</CardFooter>
                </Card>
                <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
                  <CardHeader>
                    <CardDescription>Completed</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">{completedCount}</CardTitle>
                    <CardAction><CheckCircle className="w-5 h-5 text-muted-foreground" /></CardAction>
                  </CardHeader>
                  <CardFooter className="text-sm text-muted-foreground">Total jobs finished</CardFooter>
                </Card>
                <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
                  <CardHeader>
                    <CardDescription>My Rating</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                      {avgRating !== null ? `${avgRating.toFixed(1)} / 5` : "N/A"}
                    </CardTitle>
                    <CardAction><Star className="w-5 h-5 text-muted-foreground" /></CardAction>
                  </CardHeader>
                  <CardFooter className="text-sm text-muted-foreground">
                    {reviewCount > 0 ? `Based on ${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "No reviews yet"}
                  </CardFooter>
                </Card>
              </div>

              {/* Job tabs */}
              <section className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6 gap-1">
                  <button
                    onClick={() => setDashboardTab("today")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${dashboardTab === "today" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Calendar className="w-4 h-4" />
                    Today's Jobs
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${dashboardTab === "today" ? "bg-white/20 text-white" : "bg-yellow-400/20 text-yellow-700"}`}>
                      {todaysJobs.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setDashboardTab("all")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${dashboardTab === "all" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Car className="w-4 h-4" />
                    Active Jobs
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${dashboardTab === "all" ? "bg-white/20 text-white" : "bg-yellow-400/20 text-yellow-700"}`}>
                      {activeJobs.length}
                    </span>
                  </button>
                </div>

                {dashboardTab === "today" && (
                  todaysJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Calendar className="w-7 h-7 text-gray-200" />
                      <p className="text-sm text-gray-400">No bookings scheduled for today.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaysJobs.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100/60 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900">{b.service}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusColor(b.status)}`}>{b.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timeSlot}</span>
                              <span className="flex items-center gap-1"><Car className="w-3 h-3" />{b.carDetails}</span>
                              <button onClick={() => handleNavigate(b.address)} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
                                <Navigation className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{b.address}</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/provider/jobs/${b.id}`} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {dashboardTab === "all" && (
                  activeJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Car className="w-7 h-7 text-gray-200" />
                      <p className="text-sm text-gray-400">No active jobs assigned.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {activeJobs.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-medium text-sm text-gray-900 truncate">{b.service}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusColor(b.status)}`}>{b.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                              <span className="font-mono text-[10px]">{b.bookingId}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timeSlot}</span>
                            </div>
                          </div>
                          <Link href={`/provider/jobs/${b.id}`} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 transition-all shrink-0">
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </section>

        </div>
      </main>
    </div>
  );
}
