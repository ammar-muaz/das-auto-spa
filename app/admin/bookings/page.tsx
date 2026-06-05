"use client";

import { useEffect, useState } from "react";
import {
  Search, Filter, Calendar, AlertCircle, CheckCircle2, Clock,
  Loader2, Banknote, CalendarOff, Receipt, ExternalLink
} from "lucide-react";
import supabase from "@/lib/supabase";

type BookingStatus = "Pending" | "Confirmed" | "Assigned" | "En Route" | "In Progress" | "Completion Pending" | "Issue/Delayed" | "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  amount: number;
  travelFee?: number;
  status: BookingStatus;
  paymentStatus: string;
  paymentMethod?: string;
  assignedTo?: string;
  paymentReceiptUrl?: string;
}

interface Provider {
  id: string;
  email: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 border-green-300",
  Confirmed: "bg-gray-100 text-gray-900 border-gray-300",
  Assigned: "bg-blue-100 text-blue-700 border-blue-300",
  "En Route": "bg-purple-100 text-purple-700 border-purple-300",
  "In Progress": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Completion Pending": "bg-teal-100 text-teal-700 border-teal-300",
  "Issue/Delayed": "bg-red-100 text-red-700 border-red-300",
  Pending: "bg-orange-100 text-orange-700 border-orange-300",
  Cancelled: "bg-red-100 text-red-700 border-red-300",
};

const getPaymentBadgeStyle = (status: string) => {
  if (status === "Paid") return "bg-green-100 text-green-700 border-green-300";
  if (status === "Refund Required") return "bg-red-100 text-red-700 border-red-300";
  if (status === "Refunded") return "bg-purple-100 text-purple-700 border-purple-300";
  return "bg-yellow-100 text-yellow-700 border-yellow-300";
};

const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const todayLabel = new Date().toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<Record<string, Set<string>>>({});
  const [activeTab, setActiveTab] = useState<"today" | "all">("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/bookings", {
        cache: "no-store",
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : undefined,
      });
      if (!response.ok) return;
      const payload = await response.json();
      const bookingData = payload.bookings;

      if (bookingData) {
        setBookings(bookingData.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          customerName: row.customer_name,
          service: row.service_name,
          date: row.scheduled_date,
          timeSlot: row.time_slot,
          address: row.address,
          amount: Number(row.amount),
          status: row.status,
          paymentStatus: row.payment_status || "Pending",
          paymentMethod: row.payment_method || undefined,
          assignedTo: row.assigned_to || undefined,
          paymentReceiptUrl: row.payment_receipt_url || undefined,
        })));
      }

      const providerData = payload.providers;

      if (providerData) {
        setProviders(providerData.map((row: any) => ({ id: row.id, email: row.email, name: row.full_name })));
      }

      const leaveData = payload.leaves;

      if (leaveData) {
        const leaveMap: Record<string, Set<string>> = {};
        leaveData.forEach((row: any) => {
          const dateStr = row.date.split("T")[0];
          if (!leaveMap[row.provider_id]) leaveMap[row.provider_id] = new Set();
          leaveMap[row.provider_id].add(dateStr);
        });
        setApprovedLeaves(leaveMap);
      }
    };

    load();
  }, []);

  const adminPatch = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  };

  const getTotal = (b: Booking) => b.amount + (b.travelFee || 0);

  const isProviderOnLeave = (providerEmail: string, dateStr: string) => {
    const p = providers.find((p) => p.email === providerEmail);
    if (!p) return false;
    return approvedLeaves[p.id]?.has(dateStr) ?? false;
  };

  const getProviderWorkload = (providerEmail: string, dateStr: string) =>
    bookings.filter((b) => b.assignedTo === providerEmail && b.date === dateStr && !["Cancelled", "Completed"].includes(b.status)).length;

  const providerInitials = (name: string) =>
    name.split(" ").filter((w) => /^[a-zA-Z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  const handleUpdateStatus = async (id: string, newStatus: BookingStatus) => {
    const booking = bookings.find((b) => b.id === id);
    const ok = await adminPatch({ action: "updateStatus", id, status: newStatus, paymentStatus: booking?.paymentStatus });
    if (ok) {
      setBookings((prev) => prev.map((b) => b.id === id ? {
        ...b, status: newStatus,
        paymentStatus: newStatus === "Cancelled" && b.paymentStatus === "Paid" ? "Refund Required" : b.paymentStatus,
      } : b));
    }
  };

  const handleAssignProvider = async (id: string, providerEmail: string) => {
    const normalizedEmail = providerEmail.trim().toLowerCase();
    const status = normalizedEmail ? "Assigned" : "Pending";
    const ok = await adminPatch({ action: "assignProvider", id, providerEmail: normalizedEmail });
    if (ok) {
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, assignedTo: normalizedEmail || undefined, status } : b));
    }
  };

  const handleConfirmCashPayment = async (id: string) => {
    const ok = await adminPatch({ action: "paymentStatus", id, paymentStatus: "Paid" });
    if (ok) setBookings((prev) => prev.map((b) => b.id === id ? { ...b, paymentStatus: "Paid" } : b));
  };

  const handleMarkRefundProcessed = async (id: string) => {
    const ok = await adminPatch({ action: "paymentStatus", id, paymentStatus: "Refunded" });
    if (ok) setBookings((prev) => prev.map((b) => b.id === id ? { ...b, paymentStatus: "Refunded" } : b));
  };

  const handleVerifyPayment = async (id: string) => {
    const ok = await adminPatch({ action: "verifyPayment", id });
    if (ok) setBookings((prev) => prev.map((b) => b.id === id ? { ...b, paymentStatus: "Paid" } : b));
  };

  const todayBookings = bookings.filter((b) => b.date === todayStr).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  const todayUnassigned = todayBookings.filter((b) => !b.assignedTo && !["Completed", "Cancelled"].includes(b.status)).length;
  const todayAssigned = todayBookings.filter((b) => b.assignedTo && !["Completed", "Cancelled"].includes(b.status)).length;
  const todayInProgress = todayBookings.filter((b) => ["In Progress", "En Route"].includes(b.status)).length;
  const todayCompleted = todayBookings.filter((b) => b.status === "Completed").length;

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) || b.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    const matchesDate = !filterDate || b.date.includes(filterDate);
    const matchesProvider = filterProvider === "all" || (filterProvider === "unassigned" && !b.assignedTo) || b.assignedTo === filterProvider;
    return matchesSearch && matchesStatus && matchesDate && matchesProvider;
  });

  const ProviderCards = ({ booking }: { booking: Booking }) => (
    <div className="space-y-1.5">
      {providers.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No providers registered.</p>
      ) : (
        providers.map((p) => {
          const isAssigned = booking.assignedTo === p.email;
          const onLeave = approvedLeaves[p.id]?.has(booking.date) ?? false;
          const workload = getProviderWorkload(p.email, booking.date);
          const isOff = onLeave && !isAssigned;
          const statusLabel = onLeave ? "On Leave" : "Available";
          const dotColor = onLeave ? "bg-amber-400" : "bg-green-500";
          const labelColor = isAssigned ? (onLeave ? "text-amber-300" : "text-green-300") : (onLeave ? "text-amber-600" : "text-green-600");
          return (
            <button
              key={p.email}
              onClick={() => !isOff && handleAssignProvider(booking.id, isAssigned ? "" : p.email)}
              disabled={isOff}
              title={onLeave ? `${p.name} is on approved leave on this date` : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                isAssigned ? "bg-gray-900 text-white" : isOff ? "bg-gray-50 border border-gray-100 cursor-not-allowed opacity-40" : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isAssigned ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
                {providerInitials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className={`flex items-center gap-1 text-[10px] font-bold ${labelColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                  {statusLabel}
                  <span className={`font-normal ${isAssigned ? "text-white/50" : "text-gray-400"}`}>· {workload} job{workload !== 1 ? "s" : ""}</span>
                </p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Manage Bookings</h1>
          <p className="text-gray-500">Dispatch service providers to customer orders</p>
        </div>

        {/* TABS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 shadow-sm mb-6">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "today" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <Calendar className="w-4 h-4" />
            Today's Bookings
            {todayUnassigned > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "today" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"}`}>{todayUnassigned}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "all" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <Filter className="w-4 h-4" />
            All Bookings
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>{bookings.length}</span>
          </button>
        </div>

        {/* TODAY TAB */}
        {activeTab === "today" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base leading-tight">{todayLabel}</p>
                <p className="text-xs text-gray-400">{todayBookings.length} booking{todayBookings.length !== 1 ? "s" : ""} today</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-orange-400 shrink-0" />
                <div><p className="text-2xl font-bold text-orange-700">{todayUnassigned}</p><p className="text-xs text-orange-500 font-medium">Unassigned</p></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-blue-400 shrink-0" />
                <div><p className="text-2xl font-bold text-blue-700">{todayAssigned}</p><p className="text-xs text-blue-500 font-medium">Assigned</p></div>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-center gap-3">
                <Loader2 className="w-8 h-8 text-yellow-400 shrink-0" />
                <div><p className="text-2xl font-bold text-yellow-700">{todayInProgress}</p><p className="text-xs text-yellow-500 font-medium">In Progress</p></div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                <div><p className="text-2xl font-bold text-green-700">{todayCompleted}</p><p className="text-xs text-green-500 font-medium">Completed</p></div>
              </div>
            </div>

            {providers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Provider Roster — Today</p>
                <div className="flex flex-wrap gap-3">
                  {providers.map((p) => {
                    const onLeave = approvedLeaves[p.id]?.has(todayStr) ?? false;
                    const jobs = getProviderWorkload(p.email, todayStr);
                    return (
                      <div key={p.email} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm ${onLeave ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {providerInitials(p.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-xs leading-tight">{p.name}</p>
                          <p className={`text-[10px] font-bold ${onLeave ? "text-amber-600" : "text-green-600"}`}>{onLeave ? "On Leave" : "Available"}</p>
                        </div>
                        <div className="ml-1 text-right">
                          <p className="text-lg font-bold text-gray-800 leading-none">{jobs}</p>
                          <p className="text-[10px] text-gray-400">job{jobs !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {todayBookings.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
                <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No bookings scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((booking) => {
                  const isUnassigned = !booking.assignedTo && !["Completed", "Cancelled"].includes(booking.status);
                  const isLocked = (booking.status === "Completed" && booking.paymentStatus === "Paid") || (booking.status === "Cancelled" && booking.paymentStatus !== "Refund Required");
                  return (
                    <div key={booking.id} className={`rounded-2xl border shadow-sm transition-all ${isLocked ? "bg-gray-50 border-gray-200 opacity-60" : isUnassigned ? "bg-white border-orange-200 ring-1 ring-orange-100" : "bg-white border-gray-100"}`}>
                      <div className={`flex items-center gap-3 px-5 py-3 border-b ${isLocked ? "border-gray-200 bg-gray-100/50 rounded-t-2xl" : isUnassigned ? "border-orange-100 bg-orange-50/50 rounded-t-2xl" : "border-gray-50"}`}>
                        <Clock className={`w-4 h-4 shrink-0 ${isLocked ? "text-gray-300" : isUnassigned ? "text-orange-400" : "text-gray-400"}`} />
                        <span className={`font-bold text-sm ${isLocked ? "text-gray-400" : "text-gray-900"}`}>{booking.timeSlot}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{booking.status}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPaymentBadgeStyle(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                        {booking.assignedTo && isProviderOnLeave(booking.assignedTo, booking.date) && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-300 flex items-center gap-1">
                            <CalendarOff className="w-3 h-3" /> Provider on Leave
                          </span>
                        )}
                        {isLocked && <span className="ml-auto text-xs font-medium text-gray-400">Closed</span>}
                        {!isLocked && isUnassigned && <span className="ml-auto text-xs font-bold text-orange-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Needs assignment</span>}
                      </div>
                      <div className="flex flex-col lg:flex-row gap-0">
                        <div className="flex-1 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-mono text-xs text-gray-400 font-bold">{booking.bookingId}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Customer</p><p className={`text-sm font-semibold ${isLocked ? "text-gray-400" : "text-gray-800"}`}>{booking.customerName}</p></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Service</p><p className={`text-sm ${isLocked ? "text-gray-400" : "text-gray-700"}`}>{booking.service}</p></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Location</p><p className={`text-sm truncate ${isLocked ? "text-gray-400" : "text-gray-600"}`}>{booking.address}</p></div>
                            <div><p className="text-[10px] text-gray-400 font-bold uppercase">Amount</p><p className={`text-sm font-bold ${isLocked ? "text-gray-400" : "text-gray-900"}`}>RM {getTotal(booking)}</p></div>
                          </div>
                        </div>
                        <div className={`lg:w-96 p-5 lg:border-l border-t lg:border-t-0 ${isLocked ? "border-gray-200" : "border-gray-100"}`}>
                          {isLocked ? (
                            <p className="text-xs text-gray-400 italic mt-1">This booking is closed and cannot be edited.</p>
                          ) : (
                            <div className="flex gap-4 items-start">
                              <div className="flex-1 min-w-0">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Assign Provider</label>
                                <ProviderCards booking={booking} />
                              </div>
                              <div className="w-36 shrink-0 space-y-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Status</label>
                                  <select value={booking.status} onChange={(e) => handleUpdateStatus(booking.id, e.target.value as BookingStatus)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none">
                                    {["Pending", "Confirmed", "Assigned", "En Route", "In Progress", "Completion Pending", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                {booking.paymentMethod === "online_banking" && booking.paymentStatus === "Pending Verification" && (
                                  <div className="space-y-1.5">
                                    {booking.paymentReceiptUrl && (
                                      <a href={booking.paymentReceiptUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">
                                        <Receipt className="w-3 h-3" /> View Receipt <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                    <button onClick={() => handleVerifyPayment(booking.id)} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors">
                                      <CheckCircle2 className="w-3 h-3" /> Verify Payment
                                    </button>
                                  </div>
                                )}
                                {booking.status === "Completed" && booking.paymentMethod === "cash" && booking.paymentStatus === "Pending" && (
                                  <button onClick={() => handleConfirmCashPayment(booking.id)} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors">
                                    <Banknote className="w-3 h-3" /> Confirm Cash
                                  </button>
                                )}
                                {booking.status === "Cancelled" && booking.paymentStatus === "Refund Required" && (
                                  <button onClick={() => handleMarkRefundProcessed(booking.id)} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">
                                    <Banknote className="w-3 h-3" /> Mark Refund Done
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ALL BOOKINGS TAB */}
        {activeTab === "all" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-bold text-gray-800">Operational Filters</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search order/customer..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500">
                  <option value="all">All Statuses</option>
                  {["Pending", "Confirmed", "Assigned", "En Route", "In Progress", "Completion Pending", "Issue/Delayed", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500" />
                <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500">
                  <option value="all">All Providers</option>
                  <option value="unassigned">Unassigned Only</option>
                  {providers.map((p) => <option key={p.email} value={p.email}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
                <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No bookings match your current filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const isLocked = (booking.status === "Completed" && booking.paymentStatus === "Paid") || (booking.status === "Cancelled" && booking.paymentStatus !== "Refund Required");
                  return (
                    <div key={booking.id} className={`rounded-2xl border p-6 shadow-sm transition-all ${isLocked ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-100 hover:shadow-md"}`}>
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className={`font-mono font-bold ${isLocked ? "text-gray-400" : "text-gray-900"}`}>{booking.bookingId}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{booking.status}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPaymentBadgeStyle(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                            {booking.assignedTo && isProviderOnLeave(booking.assignedTo, booking.date) && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-700 border-amber-300 flex items-center gap-1">
                                <CalendarOff className="w-3 h-3" /> Provider on Leave
                              </span>
                            )}
                            {isLocked && <span className="ml-auto text-xs text-gray-400 italic">Closed — read only</span>}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div><p className="text-xs text-gray-400 font-bold uppercase">Customer</p><p className={`text-sm font-semibold ${isLocked ? "text-gray-400" : ""}`}>{booking.customerName}</p></div>
                            <div><p className="text-xs text-gray-400 font-bold uppercase">Service</p><p className={`text-sm ${isLocked ? "text-gray-400" : ""}`}>{booking.service}</p></div>
                            <div><p className="text-xs text-gray-400 font-bold uppercase">Schedule</p><p className={`text-sm ${isLocked ? "text-gray-400" : ""}`}>{booking.date} · {booking.timeSlot}</p></div>
                            <div className="col-span-2"><p className="text-xs text-gray-400 font-bold uppercase">Location</p><p className={`text-sm truncate ${isLocked ? "text-gray-400" : ""}`}>{booking.address}</p></div>
                            <div><p className="text-xs text-gray-400 font-bold uppercase">Amount</p><p className={`text-sm font-bold ${isLocked ? "text-gray-400" : "text-gray-900"}`}>RM {getTotal(booking)}</p></div>
                          </div>
                        </div>
                        <div className={`lg:w-72 lg:border-l lg:pl-6 space-y-4 ${isLocked ? "border-gray-200" : ""}`}>
                          {isLocked ? (
                            <p className="text-xs text-gray-400 italic pt-1">This booking is closed and cannot be edited.</p>
                          ) : (
                            <>
                              <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Provider Assignment</label>
                                <ProviderCards booking={booking} />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
                                <select value={booking.status} onChange={(e) => handleUpdateStatus(booking.id, e.target.value as BookingStatus)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none">
                                  {["Pending", "Confirmed", "Assigned", "En Route", "In Progress", "Completion Pending", "Issue/Delayed", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              {booking.paymentMethod === "online_banking" && booking.paymentStatus === "Pending Verification" && (
                                <div className="space-y-2">
                                  {booking.paymentReceiptUrl && (
                                    <a href={booking.paymentReceiptUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors">
                                      <Receipt className="w-4 h-4" /> View Receipt <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <button onClick={() => handleVerifyPayment(booking.id)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">
                                    <CheckCircle2 className="w-4 h-4" /> Verify Payment
                                  </button>
                                </div>
                              )}
                              {booking.status === "Completed" && booking.paymentMethod === "cash" && booking.paymentStatus === "Pending" && (
                                <button onClick={() => handleConfirmCashPayment(booking.id)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors">
                                  <Banknote className="w-4 h-4" /> Confirm Cash Received
                                </button>
                              )}
                              {booking.status === "Cancelled" && booking.paymentStatus === "Refund Required" && (
                                <button onClick={() => handleMarkRefundProcessed(booking.id)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors">
                                  <Banknote className="w-4 h-4" /> Mark Refund Processed
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
