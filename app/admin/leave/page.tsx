"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Check, X, Clock, ChevronDown, ChevronUp, AlertTriangle, Users, BarChart3 } from "lucide-react";
import supabase from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";

interface LeaveRequest {
  id: string;
  providerId: string;
  providerName: string;
  date: string;
  reason: string;
  notes?: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNotes?: string;
  createdAt: string;
}

const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const thisMonthStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const formatDate = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

const formatRelative = (isoStr: string) => {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const reasonColor = (reason: string) => {
  if (reason === "Medical Leave") return "bg-red-100 text-red-700 border-red-200";
  if (reason === "Emergency Leave") return "bg-orange-100 text-orange-700 border-orange-200";
  if (reason === "Annual Leave") return "bg-blue-100 text-blue-700 border-blue-200";
  if (reason === "Personal Leave") return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

const providerInitials = (name: string) =>
  name.split(" ").filter((w) => /^[a-zA-Z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function AdminLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/leave", {
        cache: "no-store",
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : undefined,
      });
      if (response.ok) {
        const payload = await response.json();
        setRequests((payload.requests ?? []).map((row: any) => ({
          id: row.id,
          providerId: row.provider_id,
          providerName: row.provider_name,
          date: row.date,
          reason: row.reason,
          notes: row.notes || undefined,
          status: row.status,
          adminNotes: row.admin_notes || undefined,
          createdAt: row.created_at,
        })));
      }
      setLoading(false);
    };
    loadRequests();
  }, []);

  const patchLeave = async (body: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/leave", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  };

  const handleApprove = async (req: LeaveRequest) => {
    setProcessingId(req.id);
    const ok = await patchLeave({ id: req.id, status: "Approved" });
    if (ok) {
      setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "Approved" } : r));
      setActiveTab("approved");
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    const ok = await patchLeave({ id: rejectTarget.id, status: "Rejected", adminNotes: rejectNote || "" });
    if (ok) {
      setRequests((prev) => prev.map((r) => r.id === rejectTarget.id ? { ...r, status: "Rejected", adminNotes: rejectNote || undefined } : r));
      setActiveTab("rejected");
    }
    setRejectTarget(null);
    setRejectNote("");
    setProcessingId(null);
  };

  const pendingList = requests.filter((r) => r.status === "Pending");
  const approvedList = requests.filter((r) => r.status === "Approved");
  const rejectedList = requests.filter((r) => r.status === "Rejected");

  const onLeaveToday = approvedList.filter((r) => r.date === todayStr);
  const upcomingApproved = approvedList.filter((r) => r.date > todayStr);
  const thisMonthTotal = requests.filter((r) => r.date.startsWith(thisMonthStr));

  const filteredApproved = approvedList.filter((r) => {
    const matchProvider = !filterProvider || r.providerName.toLowerCase().includes(filterProvider.toLowerCase());
    const matchDate = !filterDate || r.date === filterDate;
    return matchProvider && matchDate;
  });

  const filteredRejected = rejectedList.filter((r) => {
    const matchProvider = !filterProvider || r.providerName.toLowerCase().includes(filterProvider.toLowerCase());
    const matchDate = !filterDate || r.date === filterDate;
    return matchProvider && matchDate;
  });

  const renderCard = (req: LeaveRequest, showActions: boolean) => {
    const isExpanded = expandedId === req.id;
    const isToday = req.date === todayStr;
    const isPast = req.date < todayStr;

    return (
      <div key={req.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isToday && req.status === "Approved" ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-100"}`}>
        {isToday && req.status === "Approved" && (
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-700">On leave today</span>
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isPast && req.status === "Approved" ? "bg-gray-200 text-gray-500" : "bg-gray-900 text-white"}`}>
              {providerInitials(req.providerName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-semibold ${isPast && req.status === "Approved" ? "text-gray-500" : "text-gray-900"}`}>{req.providerName}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${reasonColor(req.reason)}`}>{req.reason}</span>
                {req.status === "Approved" && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${isPast ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-green-100 text-green-700 border-green-200"}`}>
                    {isPast ? "Past" : "Upcoming"}
                  </span>
                )}
              </div>
              <p className={`text-sm font-medium mt-1 ${isPast && req.status === "Approved" ? "text-gray-400" : "text-gray-700"}`}>{formatDate(req.date)}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Submitted {formatRelative(req.createdAt)}
              </p>
            </div>
            {req.notes && (
              <button onClick={() => setExpandedId(isExpanded ? null : req.id)} className="text-gray-400 hover:text-gray-700 transition-colors mt-1">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {isExpanded && req.notes && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Provider Notes</p>
              <p className="text-sm text-gray-600">{req.notes}</p>
            </div>
          )}

          {req.adminNotes && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Admin Note</p>
              <p className="text-sm text-gray-600">{req.adminNotes}</p>
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex border-t border-gray-100">
            <button onClick={() => handleApprove(req)} disabled={processingId === req.id} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" /> Approve
            </button>
            <div className="w-px bg-gray-100" />
            <button onClick={() => { setRejectTarget(req); setRejectNote(""); }} disabled={processingId === req.id} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50">
              <X className="w-4 h-4" /> Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFilters = () => (
    <div className="flex gap-3 mb-4">
      <input type="text" placeholder="Filter by provider name..." value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400" />
      <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400" />
      {(filterProvider || filterDate) && (
        <button onClick={() => { setFilterProvider(""); setFilterDate(""); }} className="px-4 py-2.5 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium">Clear</button>
      )}
    </div>
  );

  const renderApprovedGroups = (list: LeaveRequest[]) => {
    const upcoming = list.filter((r) => r.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const past = list.filter((r) => r.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));
    if (list.length === 0) return (
      <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
        <CalendarOff className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">No approved leaves{filterProvider || filterDate ? " matching your filters" : ""}</p>
      </div>
    );
    return (
      <div className="space-y-6">
        {upcoming.length > 0 && (<div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Upcoming & Today ({upcoming.length})</p><div className="space-y-3">{upcoming.map((r) => renderCard(r, false))}</div></div>)}
        {past.length > 0 && (<div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past ({past.length})</p><div className="space-y-3 opacity-70">{past.map((r) => renderCard(r, false))}</div></div>)}
      </div>
    );
  };

  return (
    <main className="p-4 md:p-8">
      <div>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Leave Management</h1>
          <p className="text-gray-500">Review and approve service provider leave requests</p>
        </div>

        {/* On leave today banner */}
        {onLeaveToday.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">
                {onLeaveToday.length} provider{onLeaveToday.length !== 1 ? "s" : ""} on leave today
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {onLeaveToday.map((r) => r.providerName).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "On Leave Today", val: onLeaveToday.length, icon: Users, desc: `provider${onLeaveToday.length !== 1 ? "s" : ""} absent`, urgent: onLeaveToday.length > 0 },
            { label: "Pending", val: pendingList.length, icon: Clock, desc: "awaiting review", pending: pendingList.length > 0 },
            { label: "Upcoming", val: upcomingApproved.length, icon: CalendarOff, desc: "approved leaves ahead" },
            { label: "This Month", val: thisMonthTotal.length, icon: BarChart3, desc: "total requests" },
          ].map((stat, i) => (
            <Card key={i} className={`bg-gradient-to-t from-primary/5 to-card shadow-xs ${(stat as any).urgent ? "border-amber-200 from-amber-50" : (stat as any).pending ? "border-orange-200 from-orange-50" : ""}`}>
              <CardHeader>
                <CardDescription className={(stat as any).urgent ? "text-amber-600" : (stat as any).pending ? "text-orange-600" : ""}>{stat.label}</CardDescription>
                <CardTitle className={`text-2xl font-semibold tabular-nums ${(stat as any).urgent ? "text-amber-600" : (stat as any).pending ? "text-orange-600" : ""}`}>{stat.val}</CardTitle>
                <CardAction>
                  <stat.icon className={`w-5 h-5 ${(stat as any).urgent ? "text-amber-400" : (stat as any).pending ? "text-orange-400" : "text-muted-foreground"}`} />
                </CardAction>
              </CardHeader>
              <CardFooter className="text-sm text-muted-foreground">{stat.desc}</CardFooter>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 shadow-sm mb-6">
          <button onClick={() => setActiveTab("pending")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "pending" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            Pending
            {pendingList.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "pending" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600"}`}>{pendingList.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("approved")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "approved" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            Approved
            {approvedList.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "approved" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}>{approvedList.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("rejected")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "rejected" ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
            Rejected
            {rejectedList.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === "rejected" ? "bg-red-400 text-white" : "bg-red-100 text-red-600"}`}>{rejectedList.length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              pendingList.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
                  <CalendarOff className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No pending leave requests</p>
                </div>
              ) : (
                <div className="space-y-3">{pendingList.map((r) => renderCard(r, true))}</div>
              )
            )}
            {activeTab === "approved" && (<>{renderFilters()}{renderApprovedGroups(filteredApproved)}</>)}
            {activeTab === "rejected" && (
              <>{renderFilters()}
              {filteredRejected.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
                  <CalendarOff className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No rejected requests{filterProvider || filterDate ? " matching your filters" : ""}</p>
                </div>
              ) : (
                <div className="space-y-3">{filteredRejected.map((r) => renderCard(r, false))}</div>
              )}</>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Reject Leave Request</h2>
            <p className="text-sm text-gray-500 mb-6">{rejectTarget.providerName} · {formatDate(rejectTarget.date)}</p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (optional)</label>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Add a note explaining the rejection..." rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRejectTarget(null); setRejectNote(""); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleReject} disabled={processingId === rejectTarget.id} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
