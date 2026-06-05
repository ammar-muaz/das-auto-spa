"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, CheckCircle } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

interface CustomerReview {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  adminReply: string | null;
  adminReplyAt: string | null;
  createdAt: string;
  serviceName: string;
  scheduledDate: string;
  carDetails: string;
}

interface UnreviewedBooking {
  id: string;
  bookingId: string;
  serviceName: string;
  scheduledDate: string;
  carDetails: string;
}

export default function CustomerReviewsPage() {
  const { userId } = useUser();
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [unreviewedBookings, setUnreviewedBookings] = useState<UnreviewedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"leave" | "mine">("mine");

  const [reviewTarget, setReviewTarget] = useState<UnreviewedBooking | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("id, booking_id, rating, comment, admin_reply, admin_reply_at, created_at, bookings(booking_id, service_name, scheduled_date, car_details)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (reviewRows) {
        setReviews(reviewRows.map((r: any) => ({
          id: r.id,
          bookingId: r.bookings?.booking_id ?? r.booking_id,
          rating: r.rating,
          comment: r.comment,
          adminReply: r.admin_reply,
          adminReplyAt: r.admin_reply_at,
          createdAt: r.created_at,
          serviceName: r.bookings?.service_name ?? "—",
          scheduledDate: r.bookings?.scheduled_date ?? "—",
          carDetails: r.bookings?.car_details ?? "—",
        })));
      }

      const reviewedBookingIds = (reviewRows || []).map((r: any) => r.booking_id);

      const { data: completedRows } = await supabase
        .from("bookings")
        .select("id, booking_id, service_name, scheduled_date, car_details")
        .eq("user_id", userId)
        .eq("status", "Completed")
        .order("scheduled_date", { ascending: false });

      if (completedRows) {
        setUnreviewedBookings(
          completedRows
            .filter((b: any) => !reviewedBookingIds.includes(b.id))
            .map((b: any) => ({
              id: b.id,
              bookingId: b.booking_id,
              serviceName: b.service_name,
              scheduledDate: b.scheduled_date,
              carDetails: b.car_details,
            }))
        );
      }

      setLoading(false);
    };

    load();
  }, [userId]);

  const handleSubmitReview = async () => {
    if (!reviewTarget || ratingValue === 0) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/customer/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ bookingId: reviewTarget.id, rating: ratingValue, comment: ratingComment.trim() || null }),
    });

    if (res.ok) {
      const newReview: CustomerReview = {
        id: crypto.randomUUID(),
        bookingId: reviewTarget.bookingId,
        rating: ratingValue,
        comment: ratingComment.trim() || null,
        adminReply: null,
        adminReplyAt: null,
        createdAt: new Date().toISOString(),
        serviceName: reviewTarget.serviceName,
        scheduledDate: reviewTarget.scheduledDate,
        carDetails: reviewTarget.carDetails,
      };
      setReviews((prev) => [newReview, ...prev]);
      setUnreviewedBookings((prev) => prev.filter((b) => b.id !== reviewTarget.id));
      setReviewTarget(null);
      setRatingValue(0);
      setRatingComment("");
      setActiveTab("mine");
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Reviews</h1>
            <p className="text-gray-500 text-sm mt-0.5">Your ratings and feedback on completed services</p>
          </div>
          {avgRating !== null && (
            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-100 rounded-2xl">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-black text-yellow-600">{avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-400">/ 5</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 shadow-sm">
          <button
            onClick={() => setActiveTab("mine")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "mine" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <Star className="w-4 h-4" />
            My Reviews
            {reviews.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "mine" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                {reviews.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "leave" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <MessageSquare className="w-4 h-4" />
            Leave a Review
            {unreviewedBookings.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "leave" ? "bg-white/20 text-white" : "bg-yellow-100 text-yellow-700"}`}>
                {unreviewedBookings.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Leave a Review tab */}
            {activeTab === "leave" && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                {unreviewedBookings.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold">All caught up!</p>
                    <p className="text-sm text-gray-400 mt-1">You've reviewed all your completed bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreviewedBookings.map((booking) => (
                      <div key={booking.id}>
                        {reviewTarget?.id === booking.id ? (
                          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
                            <div className="mb-4">
                              <p className="font-semibold text-gray-800">{booking.serviceName}</p>
                              <p className="text-xs text-gray-400">{booking.scheduledDate} · {booking.carDetails}</p>
                            </div>
                            <div className="flex gap-1 mb-4">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  onMouseEnter={() => setHovered(s)}
                                  onMouseLeave={() => setHovered(0)}
                                  onClick={() => setRatingValue(s)}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star className={`w-8 h-8 transition-colors ${s <= (hovered || ratingValue) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                                </button>
                              ))}
                              {ratingValue > 0 && (
                                <span className="ml-2 self-center text-sm font-bold text-gray-600">{ratingValue}/5</span>
                              )}
                            </div>
                            <textarea
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Share your experience (optional)..."
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 mb-3"
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={handleSubmitReview}
                                disabled={ratingValue === 0 || submitting}
                                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {submitting ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <><CheckCircle className="w-4 h-4" /> Submit Review</>
                                )}
                              </button>
                              <button
                                onClick={() => { setReviewTarget(null); setRatingValue(0); setRatingComment(""); setHovered(0); }}
                                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between border border-dashed border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-all">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{booking.serviceName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{booking.scheduledDate} · {booking.carDetails}</p>
                            </div>
                            <button
                              onClick={() => { setReviewTarget(booking); setRatingValue(0); setRatingComment(""); setHovered(0); }}
                              className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shrink-0"
                            >
                              Rate Now
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Reviews tab */}
            {activeTab === "mine" && (
              reviews.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                  <MessageSquare className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold text-lg">No reviews yet</p>
                  <p className="text-sm text-gray-400 mt-1">Complete a booking and rate your experience to see it here</p>
                  {unreviewedBookings.length > 0 && (
                    <button
                      onClick={() => setActiveTab("leave")}
                      className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                    >
                      Leave a Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-bold text-gray-800">Your Reviews</h2>
                    <span className="text-xs text-gray-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{r.serviceName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{r.scheduledDate} · {r.carDetails}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">{r.rating}/5</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {new Date(r.createdAt).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-gray-600 italic mb-3">"{r.comment}"</p>
                        )}
                        {r.adminReply && (
                          <div className="ml-4 pl-4 border-l-2 border-gray-200 bg-gray-50 rounded-r-xl p-3">
                            <p className="text-xs font-bold text-gray-900 mb-1">Response from Admin</p>
                            <p className="text-sm text-gray-700">{r.adminReply}</p>
                            {r.adminReplyAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(r.adminReplyAt).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
