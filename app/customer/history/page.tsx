"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, MapPin, Car, Clock, X, Star, CheckCircle2 } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

type BookingStatus = "Pending" | "Confirmed" | "Assigned" | "En Route" | "In Progress" | "Completion Pending" | "Issue/Delayed" | "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  carDetails: string;
  amount: number;
  status: BookingStatus;
  paymentStatus: string;
  proofOfCompletion?: string;
}

const timeSlots = [
  "08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
];

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700";
    case "Confirmed": case "Assigned": return "bg-gray-100 text-gray-900";
    case "En Route": return "bg-purple-100 text-purple-700";
    case "In Progress": return "bg-yellow-100 text-yellow-700";
    case "Completion Pending": return "bg-teal-100 text-teal-700";
    case "Issue/Delayed": case "Cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const reschedulableStatuses: BookingStatus[] = ["Pending", "Confirmed", "Assigned"];

export default function BookingHistoryPage() {
  const { userId } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");

  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [ratingTarget, setRatingTarget] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratedBookingIds, setRatedBookingIds] = useState<Set<string>>(new Set());
  const [reviewDataByBookingId, setReviewDataByBookingId] = useState<Record<string, { rating: number; comment: string | null; admin_reply: string | null }>>({});

  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<{ service: string; bookingId: string; needsRefund: boolean } | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ oldDate: string; oldTimeSlot: string; newDate: string; newTimeSlot: string } | null>(null);

  const showToast = useCallback((oldDate: string, oldTimeSlot: string, newDate: string, newTimeSlot: string) => {
    setToast({ oldDate, oldTimeSlot, newDate, newTimeSlot });
  }, []);

  useEffect(() => {
    if (!rescheduleDate || !rescheduleTarget) { setBookedSlots(new Set()); return; }
    supabase
      .from("bookings")
      .select("time_slot")
      .eq("scheduled_date", rescheduleDate)
      .neq("status", "Cancelled")
      .neq("id", rescheduleTarget.id)
      .then(({ data }) => {
        setBookedSlots(new Set((data ?? []).map((r: any) => r.time_slot)));
      });
  }, [rescheduleDate, rescheduleTarget]);

  const isPastSlot = (slot: string, date: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) return false;
    const startPart = slot.split(" - ")[0];
    const [time, period] = startPart.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const slotTime = new Date(); slotTime.setHours(h, m, 0, 0);
    return slotTime < new Date();
  };

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_id, service_name, scheduled_date, time_slot, address, car_details, amount, status, payment_status, proof_of_completion_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        setBookings(data.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          service: row.service_name,
          date: row.scheduled_date,
          timeSlot: row.time_slot,
          address: row.address,
          carDetails: row.car_details,
          amount: Number(row.amount),
          status: row.status,
          paymentStatus: row.payment_status || "",
          proofOfCompletion: row.proof_of_completion_url || undefined,
        })));
      }

      const { data: reviewData } = await supabase
        .from("reviews")
        .select("booking_id, rating, comment, admin_reply")
        .eq("user_id", userId);

      if (reviewData) {
        const ids = new Set<string>();
        const map: Record<string, { rating: number; comment: string | null; admin_reply: string | null }> = {};
        reviewData.forEach((r: any) => {
          ids.add(r.booking_id);
          map[r.booking_id] = { rating: r.rating, comment: r.comment, admin_reply: r.admin_reply };
        });
        setRatedBookingIds(ids);
        setReviewDataByBookingId(map);
      }

      setLoading(false);
    };

    load();
  }, [userId, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel('customer-history-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sortedBookings = [...bookings]
    .filter((b) => !filterDate || b.date === filterDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const minRescheduleDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTimeSlot) return;
    setRescheduling(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/customer/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id: rescheduleTarget.id, newDate: rescheduleDate, newTimeSlot: rescheduleTimeSlot }),
    });
    if (res.ok) {
      const oldDate = rescheduleTarget.date;
      const oldTimeSlot = rescheduleTarget.timeSlot;
      setBookings((prev) =>
        prev.map((b) => b.id === rescheduleTarget.id ? { ...b, date: rescheduleDate, timeSlot: rescheduleTimeSlot } : b)
      );
      setRescheduleTarget(null);
      showToast(oldDate, oldTimeSlot, rescheduleDate, rescheduleTimeSlot);
    }
    setRescheduling(false);
  };

  const handleSubmitRating = async () => {
    if (!ratingTarget || ratingValue === 0) return;
    setSubmittingRating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/customer/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ bookingId: ratingTarget.id, rating: ratingValue, comment: ratingComment.trim() || null }),
    });
    if (res.ok) {
      setRatedBookingIds((prev) => new Set([...prev, ratingTarget.id]));
      setReviewDataByBookingId((prev) => ({
        ...prev,
        [ratingTarget.id]: { rating: ratingValue, comment: ratingComment.trim() || null, admin_reply: null },
      }));
      setRatingTarget(null);
    }
    setSubmittingRating(false);
  };

  const handleCancelConfirmed = async (id: string) => {
    const booking = bookings.find((b) => b.id === id);
    setCancelConfirmId(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/customer/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const { needsRefund } = await res.json();
      setBookings((prev) => prev.map((b) => b.id === id
        ? { ...b, status: "Cancelled", paymentStatus: needsRefund ? "Refund Required" : b.paymentStatus }
        : b
      ));
      if (booking) setCancelSuccess({ service: booking.service, bookingId: booking.bookingId, needsRefund });
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Booking History</h1>
          <p className="text-gray-500">View and manage your past and upcoming bookings</p>
        </div>

        <div className="flex items-center justify-end gap-2 mb-4">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-all"
            >
              Clear
            </button>
          )}
        </div>

        {sortedBookings.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
            <Car className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {loading ? "Loading bookings..." : filterDate ? "No bookings on this date" : "No bookings yet"}
            </p>
            <p className="text-sm text-gray-400">{loading || filterDate ? "" : "Your car wash journey starts here!"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{booking.service}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                    </div>
                    <p className="text-sm font-mono text-gray-400">ID: {booking.bookingId}</p>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">RM {booking.amount}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-700 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Schedule</p>
                      <p className="text-sm text-gray-700 font-medium">{booking.date}</p>
                      <p className="text-xs text-gray-500">{booking.timeSlot}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Location</p>
                      <p className="text-sm text-gray-700 font-medium">{booking.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Vehicle</p>
                      <p className="text-sm text-gray-700 font-medium">{booking.carDetails}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${booking.paymentStatus === "Paid" ? "bg-green-500" : "bg-yellow-500"}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase">Payment</p>
                      <p className="text-sm text-gray-700 font-medium">{booking.paymentStatus || "Unpaid"}</p>
                    </div>
                  </div>
                </div>

                {booking.proofOfCompletion && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Proof of Completion</p>
                    <img src={booking.proofOfCompletion} alt="Proof of completion" className="w-full max-w-sm rounded-xl border border-gray-100 object-cover" />
                  </div>
                )}

                {reschedulableStatuses.includes(booking.status) && (
                  <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => { setRescheduleTarget(booking); setRescheduleDate(booking.date); setRescheduleTimeSlot(booking.timeSlot); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-all"
                    >
                      <Clock className="w-4 h-4" /> Reschedule
                    </button>
                    <button
                      onClick={() => setCancelConfirmId(booking.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}

                {booking.status === "Completed" && !ratedBookingIds.has(booking.id) && (
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => { setRatingTarget(booking); setRatingValue(0); setRatingComment(""); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 text-yellow-600 text-sm font-semibold hover:bg-yellow-100 transition-all"
                    >
                      <Star className="w-4 h-4" /> Rate this wash
                    </button>
                  </div>
                )}

                {booking.status === "Completed" && ratedBookingIds.has(booking.id) && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 text-sm font-semibold w-fit">
                      <Star className="w-4 h-4 fill-green-500" /> Reviewed
                    </span>
                    {reviewDataByBookingId[booking.id]?.admin_reply && (
                      <div className="mt-3 ml-2 pl-4 border-l-2 border-gray-200 bg-gray-50 rounded-r-xl p-3">
                        <p className="text-xs font-bold text-gray-900 mb-1">Owner's Reply</p>
                        <p className="text-sm text-blue-800">{reviewDataByBookingId[booking.id].admin_reply}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Reschedule Booking</h2>
            <p className="text-sm text-gray-500 mb-6">ID: {rescheduleTarget.bookingId} · {rescheduleTarget.service}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={minRescheduleDate}
                  onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTimeSlot(""); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Time Slot</label>
                <select
                  value={rescheduleTimeSlot}
                  onChange={(e) => setRescheduleTimeSlot(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all"
                >
                  <option value="">Select a time slot</option>
                  {timeSlots.map((slot) => {
                    const past = isPastSlot(slot, rescheduleDate);
                    const booked = bookedSlots.has(slot);
                    const disabled = past || booked;
                    return (
                      <option key={slot} value={slot} disabled={disabled}>
                        {slot}{past ? "  — past" : booked ? "  — unavailable" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRescheduleTarget(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                disabled={!rescheduleDate || !rescheduleTimeSlot || rescheduling}
                onClick={handleReschedule}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                {rescheduling ? "Rescheduling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Rate Your Experience</h2>
            <p className="text-sm text-gray-500 mb-6">{ratingTarget.service} · {ratingTarget.bookingId}</p>
            <div className="flex gap-2 justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRatingValue(star)} className="focus:outline-none transition-transform hover:scale-110">
                  <Star className={`w-10 h-10 transition-all ${star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Comments <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRatingTarget(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                Skip
              </button>
              <button
                disabled={ratingValue === 0 || submittingRating}
                onClick={handleSubmitRating}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                {submittingRating ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmId && (() => {
        const booking = bookings.find((b) => b.id === cancelConfirmId);
        if (!booking) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-5">
                <X className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Cancel Booking?</h2>
              <p className="text-sm text-gray-500 text-center mb-1">{booking.service}</p>
              <p className="text-sm font-mono text-gray-400 text-center mb-6">ID: {booking.bookingId}</p>
              <p className="text-sm text-gray-600 text-center mb-8">This action cannot be undone. Your booking will be permanently cancelled.</p>
              <div className="flex gap-3">
                <button onClick={() => setCancelConfirmId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                  Keep Booking
                </button>
                <button onClick={() => handleCancelConfirmed(cancelConfirmId)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all">
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {cancelSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <X className="w-9 h-9 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Booking Cancelled</h2>
              <p className="text-sm text-gray-500 mb-4">{cancelSuccess.service} · {cancelSuccess.bookingId}</p>
              {cancelSuccess.needsRefund && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left">
                  <p className="text-sm font-semibold text-amber-800">Refund in progress</p>
                  <p className="text-xs text-amber-600 mt-0.5">Your payment will be refunded by our team shortly.</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setCancelSuccess(null)}
              className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Booking Rescheduled!</h2>
              <div className="space-y-3 text-sm text-left bg-gray-50 rounded-2xl p-4">
                <div className="flex gap-3">
                  <span className="text-gray-400 font-medium w-8 shrink-0">From</span>
                  <span className="text-gray-600">{toast.oldDate} · {toast.oldTimeSlot}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex gap-3">
                  <span className="text-gray-400 font-medium w-8 shrink-0">To</span>
                  <span className="text-gray-900 font-bold">{toast.newDate} · {toast.newTimeSlot}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
