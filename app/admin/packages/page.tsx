"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2, Clock, Check } from "lucide-react";
import supabase from "@/lib/supabase";

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  features: string[];
  is_active: boolean;
}

type FormState = {
  name: string;
  description: string;
  duration: string;
  price: string;
  features: string[];
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  duration: "",
  price: "",
  features: [""],
  is_active: true,
};

export default function AdminPackagesPage() {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServicePackage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServicePackage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) {
      setServices(data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        duration: row.duration || "",
        price: Number(row.price),
        features: row.features || [],
        is_active: row.is_active,
      })));
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (svc: ServicePackage) => {
    setEditTarget(svc);
    setForm({
      name: svc.name,
      description: svc.description,
      duration: svc.duration,
      price: svc.price.toString(),
      features: svc.features.length > 0 ? [...svc.features] : [""],
      is_active: svc.is_active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      duration: form.duration.trim(),
      price: parseFloat(form.price) || 0,
      features: form.features.map((f) => f.trim()).filter(Boolean),
      is_active: form.is_active,
    };
    if (editTarget) {
      const { error } = await supabase.from("services").update(payload).eq("id", editTarget.id);
      if (!error) {
        setServices((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...payload } : s));
      }
    } else {
      const { data, error } = await supabase.from("services").insert([payload]).select().single();
      if (!error && data) {
        setServices((prev) => [...prev, { id: data.id, ...payload }]);
      }
    }
    setSaving(false);
    closeModal();
  };

  const handleToggle = async (svc: ServicePackage) => {
    setTogglingId(svc.id);
    const { error } = await supabase
      .from("services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (!error) {
      setServices((prev) => prev.map((s) => s.id === svc.id ? { ...s, is_active: !svc.is_active } : s));
    }
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("services").delete().eq("id", deleteTarget.id);
    if (!error) {
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const updateFeature = (i: number, val: string) =>
    setForm((f) => ({ ...f, features: f.features.map((ft, idx) => (idx === i ? val : ft)) }));

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ""] }));

  const removeFeature = (i: number) =>
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = services.filter((s) => !s.is_active).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Packages</h1>
              <p className="text-gray-500 text-sm mt-1">Manage your service offerings and pricing</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-sm w-fit"
            >
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Services", val: services.length },
              { label: "Active", val: activeCount },
              { label: "Inactive", val: inactiveCount },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
              <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No services yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first service package to get started</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${!svc.is_active ? "opacity-60 border-gray-100" : "border-gray-100"}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900">{svc.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${svc.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {svc.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {svc.description && <p className="text-sm text-gray-500 mt-1">{svc.description}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-bold text-gray-900">RM {svc.price}</p>
                      </div>
                    </div>

                    {svc.duration && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{svc.duration}</span>
                      </div>
                    )}

                    {svc.features.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        {svc.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                            <Check className="w-3 h-3 text-green-500 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                      <button
                        onClick={() => openEdit(svc)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggle(svc)}
                        disabled={togglingId === svc.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 ${svc.is_active ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-700 border-green-200 hover:bg-green-50"}`}
                      >
                        {svc.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(svc)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-8 pb-4 border-b border-gray-50 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{editTarget ? "Edit Service" : "Add Service"}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{editTarget ? "Update this service package" : "Create a new service package"}</p>
            </div>

            <div className="overflow-y-auto p-8 pt-5 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Service Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Premium Wash"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of the service"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Price (RM) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Duration</label>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 30 minutes"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-600">Features</label>
                  <button onClick={addFeature} className="text-xs text-gray-500 hover:text-gray-900 font-semibold flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.features.map((feat, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={feat}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        placeholder={`Feature ${i + 1}`}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-400 focus:bg-white"
                      />
                      {form.features.length > 1 && (
                        <button onClick={() => removeFeature(i)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-700">Status</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${form.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                >
                  {form.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="p-8 pt-4 border-t border-gray-50 flex gap-3 shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.price}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : editTarget ? "Save Changes" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Delete Service</h2>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
