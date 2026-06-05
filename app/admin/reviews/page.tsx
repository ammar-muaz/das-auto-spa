"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

interface ReviewWithBooking {
  id: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  booking_id: string;
  bookings: {
    customer_name: string;
    service_name: string;
    assigned_to: string | null;
    assigned_provider_id: string | null;
  } | null;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithBooking[]>([]);
  const [providerMap, setProviderMap] = useState<Record<string, string>>({});
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id, rating, comment, admin_reply, admin_reply_at, created_at, booking_id, bookings(customer_name, service_name, assigned_to, assigned_provider_id)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReviews(data as unknown as ReviewWithBooking[]);
      });

    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "serviceProvider")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((p: { id: string; full_name: string }) => { map[p.id] = p.full_name; });
          setProviderMap(map);
        }
      });
  }, []);

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ));

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("reviews")
        .update({ admin_reply: replyText.trim(), admin_reply_at: now })
        .eq("id", reviewId);
      if (!error) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, admin_reply: replyText.trim(), admin_reply_at: now } : r
          )
        );
        setReplyingToId(null);
        setReplyText("");
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const overallAvgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const providerRatingStats = Object.entries(
    reviews.reduce((acc, r) => {
      const pid = r.bookings?.assigned_provider_id;
      if (!pid) return acc;
      if (!acc[pid]) acc[pid] = { total: 0, count: 0 };
      acc[pid].total += r.rating;
      acc[pid].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>)
  )
    .map(([id, s]) => ({ id, name: providerMap[id] || "Unknown Provider", avg: s.total / s.count, count: s.count }))
    .sort((a, b) => b.avg - a.avg);

  const filteredReviews = reviews
    .filter((r) => ratingFilter === "all" || r.rating === ratingFilter)
    .filter((r) => providerFilter === "all" || r.bookings?.assigned_provider_id === providerFilter)
    .sort((a, b) => {
      if (reviewSort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (reviewSort === "highest") return b.rating - a.rating;
      if (reviewSort === "lowest") return a.rating - b.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Reviews & Ratings</h1>
              <p className="text-gray-500 text-sm mt-0.5">Manage customer feedback and post replies</p>
            </div>
            {overallAvgRating !== null && (
              <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-100 rounded-2xl">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-xl font-black text-yellow-600">{overallAvgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
            )}
          </div>

          {/* Rating Overview */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-800">Overall Rating</h2>
              <span className="text-xs text-gray-400">{reviews.length} review{reviews.length !== 1 ? "s" : ""} total</span>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-10">
                <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No reviews yet</p>
                <p className="text-sm text-gray-300">Customer reviews will appear here after completed bookings</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center justify-center bg-yellow-50 rounded-2xl px-10 py-8 shrink-0">
                  <p className="text-6xl font-black text-yellow-500">{overallAvgRating!.toFixed(1)}</p>
                  <div className="flex gap-0.5 my-2">{renderStars(overallAvgRating!)}</div>
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
                        <span className="text-xs text-gray-400 w-10 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Service Provider Performance */}
          {providerRatingStats.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">Service Provider Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold">
                    <tr>
                      <th className="px-6 py-3">Service Provider</th>
                      <th className="px-6 py-3">Reviews</th>
                      <th className="px-6 py-3">Avg. Rating</th>
                      <th className="px-6 py-3">Stars</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {providerRatingStats.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-800">{p.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{p.count}</td>
                        <td className="px-6 py-4 text-sm font-bold text-yellow-600">{p.avg.toFixed(1)}</td>
                        <td className="px-6 py-4"><div className="flex gap-0.5">{renderStars(p.avg)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reviews Feed */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              {/* Filter & sort controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                <div className="flex gap-2 sm:ml-auto">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="all">All Providers</option>
                    {Object.entries(providerMap).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as typeof reviewSort)}
                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="highest">Highest ★</option>
                    <option value="lowest">Lowest ★</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  Reviews{ratingFilter !== "all" && <span className="text-yellow-500 ml-1">{ratingFilter}★</span>}
                </h2>
                <span className="text-xs text-gray-400">{filteredReviews.length} shown</span>
              </div>

              {filteredReviews.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No reviews match this filter.</p>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((r) => (
                    <div key={r.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{r.bookings?.customer_name ?? "Customer"}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex gap-0.5">{renderStars(r.rating)}</div>
                            <span className="text-xs text-gray-400">{r.rating}/5</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(r.created_at).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {r.bookings?.service_name && (
                          <span className="text-xs px-2 py-1 bg-gray-50 text-gray-900 rounded-lg font-medium">{r.bookings.service_name}</span>
                        )}
                        {r.bookings?.assigned_provider_id && providerMap[r.bookings.assigned_provider_id] && (
                          <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-lg font-medium">
                            {providerMap[r.bookings.assigned_provider_id]}
                          </span>
                        )}
                      </div>

                      {r.comment && <p className="text-sm text-gray-600 italic mb-3">"{r.comment}"</p>}

                      {r.admin_reply ? (
                        <div className="ml-4 pl-4 border-l-2 border-gray-200 bg-gray-50 rounded-r-xl p-3">
                          <p className="text-xs font-bold text-gray-900 mb-1">Response from Admin</p>
                          <p className="text-sm text-blue-800">{r.admin_reply}</p>
                          {r.admin_reply_at && (
                            <p className="text-xs text-blue-400 mt-1">
                              {new Date(r.admin_reply_at).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          )}
                        </div>
                      ) : replyingToId === r.id ? (
                        <div className="mt-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply to this review..."
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all resize-none"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { setReplyingToId(null); setReplyText(""); }}
                              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={!replyText.trim() || submittingReply}
                              onClick={() => handleReply(r.id)}
                              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                            >
                              {submittingReply ? "Posting..." : "Post Reply"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReplyingToId(r.id); setReplyText(""); }}
                          className="text-xs text-gray-900 font-medium hover:underline transition-colors mt-1"
                        >
                          Reply to review
                        </button>
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
