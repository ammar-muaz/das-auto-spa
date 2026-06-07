"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Shield, UserX, Trash2, X, CheckCircle2, AlertCircle, Copy, Eye, User as UserIcon } from "lucide-react";
import supabase from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "customer" | "serviceProvider" | "admin";
  status: "Active" | "Inactive";
  registeredDate: string;
  totalBookings: number;
}

const getRoleBadge = (role: User["role"]) => {
  switch (role) {
    case "admin": return "bg-purple-100 text-purple-700 border-purple-300";
    case "serviceProvider": return "bg-gray-100 text-gray-900 border-gray-300";
    case "customer": return "bg-green-100 text-green-700 border-green-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getRoleLabel = (role: User["role"]) => {
  if (role === "serviceProvider") return "Provider";
  if (role === "admin") return "Admin";
  return "Customer";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", phone: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState<{ name: string } | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<{ name: string; status: "Active" | "Inactive" } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabaseAdmin.from("profiles").select("*");
    const { data: bookingData } = await supabaseAdmin.from("bookings").select("user_id");
    const totals: Record<string, number> = {};
    if (bookingData) bookingData.forEach((row: any) => { totals[row.user_id] = (totals[row.user_id] || 0) + 1; });
    if (data) {
      setUsers(data.map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name || "",
        phone: row.phone || "",
        role: row.role,
        status: row.status === "Inactive" ? "Inactive" : "Active",
        registeredDate: row.created_at || "",
        totalBookings: totals[row.id] || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus = filterStatus === "all" || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDeactivate = async (email: string) => {
    const user = users.find((u) => u.email === email);
    const { error } = await supabase.from("profiles").update({ status: "Inactive" }).eq("email", email);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.email === email ? { ...u, status: "Inactive" } : u));
      setStatusSuccess({ name: user?.fullName || email, status: "Inactive" });
    }
  };

  const handleActivate = async (email: string) => {
    const user = users.find((u) => u.email === email);
    const { error } = await supabase.from("profiles").update({ status: "Active" }).eq("email", email);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.email === email ? { ...u, status: "Active" } : u));
      setStatusSuccess({ name: user?.fullName || email, status: "Active" });
    }
  };

  const handleCreateProvider = async () => {
    setIsCreating(true);
    setCreateError("");
    try {
      const tempPassword = "Welcome123";
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, role: "serviceProvider", tempPassword }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error || "Failed to create provider."); return; }
      await loadUsers();
      setShowCreateModal(false);
      setNewUser({ fullName: "", email: "", phone: "" });
      setSuccessInfo({ name: newUser.fullName, email: newUser.email, tempPassword });
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setIsRemoving(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) { setDeleteError(json.error || "Failed to delete user."); return; }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser((prev) => prev?.id === userId ? null : prev);
      setDeleteSuccess({ name: user?.fullName || "User" });
    } catch {
      setDeleteError("An unexpected error occurred.");
    } finally {
      setIsRemoving(false);
      setPendingDeleteId(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-8 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Manage Users</h1>
            <p className="text-gray-500">Directory of customers, providers, and administrators</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">
            <UserPlus className="w-5 h-5" /> Create Service Provider
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
            <CardHeader>
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{users.length}</CardTitle>
              <CardAction><UserIcon className="w-5 h-5 text-muted-foreground" /></CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">All registered accounts</CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
            <CardHeader>
              <CardDescription>Customers</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{users.filter((u) => u.role === "customer").length}</CardTitle>
              <CardAction><UserIcon className="w-5 h-5 text-muted-foreground" /></CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Registered customers</CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
            <CardHeader>
              <CardDescription>Providers</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{users.filter((u) => u.role === "serviceProvider").length}</CardTitle>
              <CardAction><UserIcon className="w-5 h-5 text-muted-foreground" /></CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">Active service providers</CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs">
            <CardHeader>
              <CardDescription>Admins</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{users.filter((u) => u.role === "admin").length}</CardTitle>
              <CardAction><Shield className="w-5 h-5 text-muted-foreground" /></CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">System administrators</CardFooter>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none">
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="serviceProvider">Service Provider</option>
              <option value="admin">Admin</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none">
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Search className="w-12 h-12 text-gray-200 mb-4" />
              <p className="font-semibold text-gray-500">No users match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">User Info</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Registered</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 text-gray-900 rounded-full flex items-center justify-center font-bold border border-gray-100">
                            {user.fullName.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{user.fullName || "—"}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.registeredDate ? new Date(user.registeredDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSelectedUser(user)} className="p-2 text-gray-900 hover:bg-gray-50 rounded-lg transition-all" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.role !== "admin" && (
                            <button
                              onClick={() => user.status === "Active" ? handleDeactivate(user.email) : handleActivate(user.email)}
                              className={`p-2 rounded-lg transition-all ${user.status === "Active" ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}
                              title={user.status === "Active" ? "Deactivate" : "Activate"}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setPendingDeleteId(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
                {selectedUser.fullName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{selectedUser.fullName || "—"}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(selectedUser.role)}`}>{getRoleLabel(selectedUser.role)}</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Email", value: selectedUser.email },
                { label: "Phone", value: selectedUser.phone || "—" },
                { label: "Status", value: selectedUser.status },
                { label: "Total Bookings", value: String(selectedUser.totalBookings) },
                { label: "Registered", value: new Date(selectedUser.registeredDate).toLocaleDateString("en-MY", { year: "numeric", month: "short", day: "numeric" }) },
              ].map((field) => (
                <div key={field.label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{field.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Provider Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => { setShowCreateModal(false); setCreateError(""); }} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create Service Provider</h2>
            <div className="space-y-4 mb-6">
              {[
                { label: "Full Name", key: "fullName", placeholder: "e.g., Ahmad Bin Ali" },
                { label: "Email Address", key: "email", placeholder: "provider@email.com" },
                { label: "Phone Number", key: "phone", placeholder: "+60 12-345 6789" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
                  <input
                    type={field.key === "email" ? "email" : "text"}
                    value={(newUser as any)[field.key]}
                    onChange={(e) => setNewUser((p) => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              ))}
              {createError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {createError}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateModal(false); setCreateError(""); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreateProvider}
                disabled={!newUser.fullName || !newUser.email || isCreating}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
              >
                {isCreating ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setSuccessInfo(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Provider Account Created</h2>
              <p className="text-sm text-gray-500 mt-1">Share these credentials with <span className="font-semibold text-gray-700">{successInfo.name}</span></p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Email</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 break-all">{successInfo.email}</p>
                  <button onClick={() => copyToClipboard(successInfo.email, "email")} className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-all">
                    {copiedField === "email" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Temporary Password</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-bold text-white tracking-widest">{successInfo.tempPassword}</p>
                  <button onClick={() => copyToClipboard(successInfo.tempPassword, "password")} className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-all">
                    {copiedField === "password" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setSuccessInfo(null)} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all">Done</button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h2>
            <p className="text-sm text-gray-500 mb-8">This action cannot be undone. All data associated with this user will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeleteId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={() => handleDeleteUser(pendingDeleteId)} disabled={isRemoving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">
                {isRemoving ? "Removing..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {deleteSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">User Deleted</h2>
              <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">{deleteSuccess.name}</span> has been removed from the system.</p>
            </div>
            <button onClick={() => setDeleteSuccess(null)} className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Status Change Success Modal */}
      {statusSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${statusSuccess.status === "Active" ? "bg-green-100" : "bg-red-100"}`}>
              <CheckCircle2 className={`w-9 h-9 ${statusSuccess.status === "Active" ? "text-green-600" : "text-red-500"}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {statusSuccess.status === "Active" ? "User Activated" : "User Deactivated"}
              </h2>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{statusSuccess.name}</span> is now{" "}
                <span className={`font-semibold ${statusSuccess.status === "Active" ? "text-green-600" : "text-red-500"}`}>{statusSuccess.status}</span>.
              </p>
            </div>
            <button onClick={() => setStatusSuccess(null)} className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold hover:bg-gray-800 transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Delete Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Action Failed</h2>
            <p className="text-sm text-gray-500 mb-6">{deleteError}</p>
            <button onClick={() => setDeleteError("")} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all">OK</button>
          </div>
        </div>
      )}
    </main>
  );
}
