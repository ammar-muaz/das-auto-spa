"use client";

import { useEffect, useState } from "react";
import {
  CalendarOff, Plus, X, CheckCircle, AlertCircle, Clock, Trash2, FileText,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";

interface LeaveRequest {
  id: string;
  date: string;
  reason: string;
  notes?: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNotes?: string;
  createdAt: string;
}

export default function ProviderLeavePage() {
  const { userId } = useUser();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveFilter, setLeaveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showModal, setShowModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("Medical Leave");
  const [leaveNotes, setLeaveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("leave_requests")
      .select("*")
      .eq("provider_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLeaveRequests(data.map((row: any) => ({
            id: row.id,
            date: row.date,
            reason: row.reason,
            notes: row.notes || undefined,
            status: row.status,
            adminNotes: row.admin_notes || undefined,
            createdAt: row.created_at,
          })));
        }
        setLoading(false);
      });
  }, [userId]);

  const handleSubmit = async () => {
    if (!leaveDate || !leaveReason || !userId) return;
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSubmitting(false);
      return;
    }
    const response = await fetch("/api/provider/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        date: leaveDate,
        reason: leaveReason,
        notes: leaveNotes || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    const data = payload.request;

    if (response.ok && data) {
      setLeaveRequests((prev) => [{
        id: data.id, date: data.date, reason: data.reason,
        notes: data.notes || undefined, status: data.status, createdAt: data.created_at,
      }, ...prev]);
      setShowModal(false);
      setLeaveDate("");
      setLeaveReason("Medical Leave");
      setLeaveNotes("");
      setShowSuccessModal(true);
    }
    setSubmitting(false);
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);
    if (!error) setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    setCancellingId(null);
  };

  const reasonColor = (reason: string) =>
    reason === "Medical Leave" ? "bg-red-100 text-red-700 border-red-200" :
    reason === "Emergency Leave" ? "bg-orange-100 text-orange-700 border-orange-200" :
    reason === "Annual Leave" ? "bg-blue-100 text-blue-700 border-blue-200" :
    "bg-gray-100 text-gray-700 border-gray-200";

  const statusConfig = (status: string) => ({
    Approved: { pill: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    Rejected: { pill: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="w-3.5 h-3.5" /> },
    Pending: { pill: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="w-3.5 h-3.5" /> },
  }[status] ?? { pill: "bg-gray-100 text-gray-700 border-gray-200", icon: null });

  const filtered = leaveRequests.filter((r) =>
    leaveFilter === "all" ? true : r.status.toLowerCase() === leaveFilter
  );

  const pendingCount = leaveRequests.filter((r) => r.status === "Pending").length;
  const approvedCount = leaveRequests.filter((r) => r.status === "Approved").length;
  const rejectedCount = leaveRequests.filter((r) => r.status === "Rejected").length;

  const tomorrowStr = (() => {
    const d = new Date(Date.now() + 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
              <p className="text-gray-500 text-sm mt-1">Submit and track your leave requests</p>
            </div>
            <button
              onClick={() => { setLeaveDate(""); setLeaveReason("Medical Leave"); setLeaveNotes(""); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Request Leave
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[
              { label: "Pending", count: pendingCount, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100" },
              { label: "Approved", count: approvedCount, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
              { label: "Rejected", count: rejectedCount, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-4`}>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLeaveFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${leaveFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
              <CalendarOff className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {leaveFilter === "all" ? "No leave requests yet" : `No ${leaveFilter} requests`}
              </p>
              {leaveFilter === "all" && <p className="text-gray-400 text-sm mt-1">Click "Request Leave" to submit one</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((req) => {
                const d = new Date(req.date + "T00:00:00");
                const dayNum = d.toLocaleDateString("en-MY", { day: "numeric" });
                const month = d.toLocaleDateString("en-MY", { month: "short" });
                const weekday = d.toLocaleDateString("en-MY", { weekday: "long" });
                const year = d.getFullYear();
                const submittedOn = new Date(req.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
                const sc = statusConfig(req.status);
                return (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-5">
                    {/* Date block */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl px-4 py-3 shrink-0 min-w-[64px] border border-gray-100">
                      <span className="text-xs font-semibold text-gray-400 uppercase">{month}</span>
                      <span className="text-3xl font-bold text-gray-900 leading-none">{dayNum}</span>
                      <span className="text-xs text-gray-400">{year}</span>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{weekday}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${sc.pill}`}>
                              {sc.icon}{req.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${reasonColor(req.reason)}`}>{req.reason}</span>
                          </div>
                        </div>
                        {req.status === "Pending" && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={cancellingId === req.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                            {cancellingId === req.id ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                      </div>
                      {req.notes && (
                        <div className="mt-2.5 flex items-start gap-1.5 text-sm text-gray-500">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-300" />
                          {req.notes}
                        </div>
                      )}
                      {req.adminNotes && (
                        <div className={`mt-2 flex items-start gap-1.5 text-xs px-3 py-2 rounded-lg ${req.status === "Rejected" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span><span className="font-semibold">Admin:</span> {req.adminNotes}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-300 mt-2">Submitted {submittedOn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Request Leave</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={leaveDate}
                  min={tomorrowStr}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type</label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white outline-none transition-all"
                >
                  <option>Medical Leave</option>
                  <option>Emergency Leave</option>
                  <option>Annual Leave</option>
                  <option>Personal Leave</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder="e.g. Doctor's appointment in the morning..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-500 focus:bg-white outline-none resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!leaveDate || submitting}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border-4 border-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Leave Request Submitted</h2>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                Your leave request has been sent to the admin for review.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-800 transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
