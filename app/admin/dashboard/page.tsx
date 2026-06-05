"use client";

import { useEffect, useState } from "react";
import {
  Calendar, DollarSign, ClipboardList, Clock, AlertCircle,
  Sparkles, Mail, Phone, MapPin
} from "lucide-react";
import Link from "next/link";
import supabase from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";

type BookingStatus = "Pending" | "Confirmed" | "Assigned" | "En Route" | "In Progress" | "Completion Pending" | "Issue/Delayed" | "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  timeSlot: string;
  carDetails: string;
  amount: number;
  travelFee?: number;
  status: BookingStatus;
  paymentStatus: string;
  assignedTo?: string;
}

interface Provider {
  id: string;
  email: string;
  name: string;
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700 border-green-300";
    case "Confirmed": case "Assigned": return "bg-gray-100 text-gray-900 border-gray-300";
    case "Issue/Delayed": case "Cancelled": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getPaymentBadgeStyle = (status: string) => {
  if (status === "Paid") return "bg-green-100 text-green-700 border-green-300";
  if (status === "Refund Required") return "bg-red-100 text-red-700 border-red-300";
  if (status === "Refunded") return "bg-purple-100 text-purple-700 border-purple-300";
  return "bg-yellow-100 text-yellow-700 border-yellow-300";
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [todayLeaveProviderIds, setTodayLeaveProviderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : undefined,
      });
      const dashboardData = response.ok ? await response.json() : null;
      let bookingData = dashboardData?.bookings;
      let providerData = dashboardData?.providers;
      let leaveData = dashboardData?.leaves?.filter((leave: any) => leave.date === today);

      if (!bookingData) {
        const { data } = await supabase
          .from("bookings")
          .select("id, booking_id, customer_name, service_name, scheduled_date, time_slot, car_details, amount, status, payment_status, assigned_to")
          .order("created_at", { ascending: false });
        bookingData = data;
      }

      if (bookingData) {
        setBookings(bookingData.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          customerName: row.customer_name,
          service: row.service_name,
          date: row.scheduled_date,
          timeSlot: row.time_slot,
          carDetails: row.car_details || "",
          amount: Number(row.amount),
          status: row.status,
          paymentStatus: row.payment_status || "Pending",
          assignedTo: row.assigned_to || undefined,
        })));
      }

      if (!providerData) {
        const { data } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("role", "serviceProvider");
        providerData = data;
      }

      if (providerData) {
        setProviders(providerData.map((row: any) => ({ id: row.id, email: row.email, name: row.full_name })));
      }

      if (!leaveData) {
        const { data } = await supabase
          .from("leave_requests")
          .select("provider_id")
          .eq("date", today)
          .eq("status", "Approved");
        leaveData = data;
      }

      if (leaveData) {
        setTodayLeaveProviderIds(new Set(leaveData.map((l: any) => l.provider_id)));
      }
    };

    load();
  }, []);

  const todaysBookings = bookings.filter((b) => b.date === today);
  const totalRevenue = bookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + b.amount + (b.travelFee || 0), 0);
  const pendingBookings = bookings.filter((b) => b.status === "Pending").length;
  const unassignedToday = todaysBookings.filter((b) => !b.assignedTo && b.status !== "Cancelled" && b.status !== "Completed").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
            <p className="text-gray-500 mt-1">System-wide monitoring and operational management</p>
          </header>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Bookings", val: bookings.length, icon: ClipboardList, desc: "All time bookings" },
              { label: "Today's Bookings", val: todaysBookings.length, icon: Calendar, desc: "Scheduled for today" },
              { label: "Pending", val: pendingBookings, icon: Clock, desc: "Awaiting confirmation" },
              { label: "Unassigned Today", val: unassignedToday, icon: AlertCircle, desc: "Need a provider", urgent: unassignedToday > 0 },
              { label: "Total Revenue", val: `RM ${totalRevenue}`, icon: DollarSign, desc: "From completed bookings" },
            ].map((stat, i) => (
              <Card key={i} className={`bg-gradient-to-t from-primary/5 to-card shadow-xs ${(stat as any).urgent ? "border-orange-200 from-orange-50" : ""}`}>
                <CardHeader>
                  <CardDescription className={(stat as any).urgent ? "text-orange-600" : ""}>{stat.label}</CardDescription>
                  <CardTitle className={`text-2xl font-semibold tabular-nums ${(stat as any).urgent ? "text-orange-600" : ""}`}>{stat.val}</CardTitle>
                  <CardAction>
                    <stat.icon className={`w-5 h-5 ${(stat as any).urgent ? "text-orange-400" : "text-muted-foreground"}`} />
                  </CardAction>
                </CardHeader>
                <CardFooter className="text-sm text-muted-foreground">{stat.desc}</CardFooter>
              </Card>
            ))}
          </div>

          {/* PROVIDER AVAILABILITY */}
          {providers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Provider Availability Today</p>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => {
                  const isOnLeave = todayLeaveProviderIds.has(provider.id);
                  const jobsToday = todaysBookings.filter((b) => b.assignedTo === provider.email && b.status !== "Cancelled").length;
                  return (
                    <div key={provider.email} className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${isOnLeave ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isOnLeave ? "bg-amber-400" : "bg-green-400"}`} />
                      <span className="text-sm font-medium text-gray-800">{provider.name}</span>
                      {isOnLeave
                        ? <span className="text-xs font-semibold text-amber-600">On Leave</span>
                        : <span className="text-xs text-gray-400">{jobsToday} job{jobsToday !== 1 ? "s" : ""}</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NEEDS ATTENTION BANNER */}
          {unassignedToday > 0 && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-orange-900 text-sm">{unassignedToday} booking{unassignedToday > 1 ? "s" : ""} today need a provider assigned</p>
                  <p className="text-xs text-orange-600">Assign providers to avoid delays</p>
                </div>
              </div>
              <Link href="/admin/bookings" className="shrink-0 text-xs font-semibold bg-orange-600 text-white px-4 py-2 rounded-xl hover:bg-orange-700 transition-colors">
                Assign Now
              </Link>
            </div>
          )}

          {/* TODAY'S BOOKINGS */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Today's Bookings</h2>
                <p className="text-sm text-gray-400 mt-0.5">{todaysBookings.length} booking{todaysBookings.length !== 1 ? "s" : ""} today</p>
              </div>
              <Link href="/admin/bookings" className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                View all →
              </Link>
            </div>
            {todaysBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Calendar className="w-10 h-10 mb-3 text-gray-200" />
                <p className="font-medium text-sm">No bookings scheduled for today</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todaysBookings
                  .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                  .map((booking) => (
                    <div key={booking.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors ${!booking.assignedTo ? "border-l-4 border-orange-400" : "border-l-4 border-transparent"}`}>
                      <div className="w-20 shrink-0">
                        <p className="text-xs font-bold text-gray-900">{booking.timeSlot}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.customerName}</p>
                        <p className="text-xs text-gray-400 truncate">{booking.service} · {booking.carDetails}</p>
                      </div>
                      <div className="shrink-0">
                        {!booking.assignedTo ? (
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">Unassigned</span>
                        ) : (
                          <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full truncate max-w-[120px] block text-center">{booking.assignedTo}</span>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className={`text-xs font-semibold py-1 rounded-full border text-center w-32 ${getStatusColor(booking.status)}`}>{booking.status}</span>
                        <span className={`text-xs font-semibold py-1 rounded-full border text-center w-32 ${getPaymentBadgeStyle(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* RECENT BOOKINGS */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Recent Bookings</h2>
              <p className="text-sm text-gray-400 mt-0.5">Latest activity across the system</p>
            </div>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mb-3 text-gray-200" />
                <p className="font-medium text-sm">No bookings yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {bookings.slice(0, 8).map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.customerName}</p>
                        <span className="text-xs text-gray-300 font-mono shrink-0">{booking.bookingId}</span>
                      </div>
                      <p className="text-xs text-gray-400">{booking.service} · {booking.date} {booking.timeSlot}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-xs font-semibold py-1 rounded-full border text-center w-32 ${getStatusColor(booking.status)}`}>{booking.status}</span>
                      <span className={`text-xs font-semibold py-1 rounded-full border text-center w-32 ${getPaymentBadgeStyle(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-gray-100 pt-12 pb-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-3 gap-12 border-b border-gray-900/50 pb-12 mb-6">
          <div>
            <div className="flex items-center gap-2 text-white mb-4">
              <Sparkles className="w-6 h-6 text-gray-300" />
              <span className="text-xl font-bold">Das Auto Spa</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200">Premium door-to-door car wash and detailing services.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-300" /> support@dasautospa.com</li>
              <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-300" /> 011-222 3333</li>
              <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-300" /> Mon-Sun: 8AM-8PM</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Service Areas</h4>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
              <p className="leading-relaxed text-gray-200">Currently serving metropolitan areas within 50 miles radius.</p>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-300/70">&copy; 2026 Das Auto Spa. All rights reserved.</div>
      </footer>
    </div>
  );
}
