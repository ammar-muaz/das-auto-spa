"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  booking_id: string;
  bookings: { customer_name: string; service_name: string } | null;
}

export default function ProviderReviewsPage() {
  const { userId, email } = useUser();
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId || !email) return;
    const load = async () => {
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id")
        .or(`assigned_provider_id.eq.${userId},assigned_to.ilike.${email}`);

      if (!bookingRows || bookingRows.length === 0) {
        setLoading(false);
        return;
      }

      const ids = bookingRows.map((b: { id: string }) => b.id);
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("id, rating, comment, admin_reply, admin_reply_at, created_at, booking_id, bookings(customer_name, service_name)")
        .in("booking_id", ids)
        .order("created_at", { ascending: false });

      if (reviewRows) setReviews(reviewRows as unknown as ProviderReview[]);
      setLoading(false);
    };
    load();
  }, [userId, email, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel('provider-reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ));

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const filteredReviews = reviews
    .filter((r) => ratingFilter === "all" || r.rating === ratingFilter)
    .sort((a, b) => {
      if (reviewSort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (reviewSort === "highest") return b.rating - a.rating;
      if (reviewSort === "lowest") return a.rating - b.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Reviews</h1>
              <p className="text-gray-500 text-sm mt-0.5">Customer ratings from your completed jobs</p>
            </div>
            {avgRating !== null && (
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-100 rounded-2xl">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-xl font-black text-yellow-600">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
              <MessageSquare className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold text-lg">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">Customer ratings will appear here after completed jobs</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
              {/* Rating distribution */}
              <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-50">
                <div className="flex flex-col items-center justify-center bg-yellow-50 rounded-2xl px-8 py-6 shrink-0">
                  <p className="text-5xl font-black text-yellow-500">{avgRating!.toFixed(1)}</p>
                  <div className="flex gap-0.5 my-2">{renderStars(avgRating!)}</div>
                  <p className="text-sm text-gray-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-2.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length;
                    const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <button
                          onClick={() => setRatingFilter(ratingFilter === star ? "all" : star)}
                          className={`flex items-center gap-0.5 text-xs font-bold w-8 shrink-0 transition-colors ${ratingFilter === star ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500"}`}
                        >
                          {star}<Star className="w-3 h-3 fill-current" />
                        </button>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                          <div className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter & sort */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1 flex-wrap">
                  {(["all", 5, 4, 3, 2, 1] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setRatingFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ratingFilter === f ? "bg-yellow-400 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      {f === "all" ? "All" : `${f}★`}
                    </button>
                  ))}
                </div>
                <select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
                  className="sm:ml-auto px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest">Highest ★</option>
                  <option value="lowest">Lowest ★</option>
                </select>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  Reviews{ratingFilter !== "all" && <span className="text-yellow-500 ml-1">{ratingFilter}★</span>}
                </h2>
                <span className="text-xs text-gray-400">{filteredReviews.length} shown</span>
              </div>

              {filteredReviews.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No reviews match this filter.</p>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((r) => (
                    <div key={r.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{r.bookings?.customer_name ?? "Customer"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.bookings?.service_name}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex gap-0.5">{renderStars(r.rating)}</div>
                            <span className="text-xs text-gray-400">{r.rating}/5</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(r.created_at).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 italic mb-3">"{r.comment}"</p>}
                      {r.admin_reply && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-200 bg-gray-50 rounded-r-xl p-3">
                          <p className="text-xs font-bold text-gray-900 mb-1">Response from Admin</p>
                          <p className="text-sm text-gray-700">{r.admin_reply}</p>
                          {r.admin_reply_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(r.admin_reply_at).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
