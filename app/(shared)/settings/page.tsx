"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff, Moon, Sun } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";
import { useTheme } from "next-themes";
import { useLanguage, type Language } from "@/lib/language-context";
import { useFontSize, type FontSize } from "@/lib/font-size-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type SettingsTab = "profile" | "security" | "preferences" | "language";

export default function SettingsPage() {
  const { fullName: ctxName, email: ctxEmail, refreshProfile } = useUser();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { fontSize, setFontSize } = useFontSize();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [formData, setFormData] = useState({ fullName: "", phone: "", address: "" });
  const [profileEmail, setProfileEmail] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; body: string } | null>(null);

  const [pwData, setPwData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwMessage, setPwMessage] = useState<{ type: "error"; text: string } | null>(null);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
      if (data) {
        setFormData({ fullName: data.full_name || "", phone: data.phone || "", address: data.address || "" });
        setProfileEmail(data.email || authData.user.email || "");
        setProfileRole(data.role || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = "Full name is required.";
    if (!formData.phone.trim()) e.phone = "Phone number is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setMessage(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { error } = await supabase.from("profiles")
      .update({ full_name: formData.fullName, phone: formData.phone, address: formData.address })
      .eq("id", authData.user.id);
    if (error) { setMessage({ type: "error", text: "Failed to update profile." }); return; }
    await refreshProfile();
    setSuccessModal({ title: "Profile Updated", body: "Your profile information has been saved successfully." });
  };

  const validatePw = () => {
    const e: Record<string, string> = {};
    if (!pwData.currentPassword) e.currentPassword = "Current password is required.";
    if (!pwData.newPassword || pwData.newPassword.length < 6) e.newPassword = "Password must be at least 6 characters.";
    if (pwData.newPassword !== pwData.confirmPassword) e.confirmPassword = "Passwords do not match.";
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePw()) return;
    setPwMessage(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.email) return;
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: authData.user.email, password: pwData.currentPassword });
    if (reauthError) { setPwMessage({ type: "error", text: "Current password is incorrect." }); return; }
    const { error } = await supabase.auth.updateUser({ password: pwData.newPassword });
    if (error) { setPwMessage({ type: "error", text: error.message }); return; }
    setPwData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setSuccessModal({ title: "Password Updated", body: "Your password has been changed successfully." });
  };

  const displayName = formData.fullName || ctxName || "User";
  const initials = displayName.replace(/\s*\(.*?\)/g, "").trim()
    .split(" ").filter((p) => /^[a-zA-Z]/.test(p)).slice(0, 2)
    .map((p) => p[0]?.toUpperCase()).join("") || "U";

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "security", label: "Security" },
    { key: "preferences", label: "Preferences" },
    { key: "language", label: "Language" },
  ];

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
  ];

  const rowClass = "flex items-start justify-between gap-8 py-4 border-b border-gray-100";
  const labelClass = "text-sm text-gray-600 pt-0.5 shrink-0 w-40";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <main className="px-10 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

        <div className="relative">
          {/* Vertical tabs on the left */}
          <nav className="absolute left-0 top-0 w-44">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content — centered with max-w-xl matching Vite */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl">

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <form onSubmit={handleSaveProfile}>
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Profile</h2>
                  <p className="text-sm text-gray-400 mb-5">Manage your personal information</p>

                  <div className={rowClass}>
                    <span className={labelClass}>Avatar</span>
                    <Avatar className="h-9 w-9 rounded-full">
                      <AvatarFallback className="rounded-full bg-gray-900 text-white text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className={rowClass}>
                    <label className={labelClass}>Full Name</label>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => { setFormData((p) => ({ ...p, fullName: e.target.value })); if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" })); }}
                        className={`w-full text-sm text-gray-900 bg-white border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 transition-all ${errors.fullName ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-gray-400"}`}
                      />
                      {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                    </div>
                  </div>

                  <div className={rowClass}>
                    <span className={labelClass}>Email</span>
                    <span className="text-sm text-gray-500">{profileEmail || ctxEmail}</span>
                  </div>

                  <div className={rowClass}>
                    <label className={labelClass}>Phone Number</label>
                    <div className="flex-1">
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => { setFormData((p) => ({ ...p, phone: e.target.value })); if (errors.phone) setErrors((p) => ({ ...p, phone: "" })); }}
                        className={`w-full text-sm text-gray-900 bg-white border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 transition-all ${errors.phone ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-gray-400"}`}
                      />
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  {profileRole === "customer" && (
                    <div className={rowClass}>
                      <label className={labelClass}>Address</label>
                      <div className="flex-1">
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                          rows={3}
                          className="w-full text-sm text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {message?.type === "error" && (
                    <div className="mt-4 p-3 rounded-lg flex items-start gap-2 text-sm bg-red-50 text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {message.text}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button type="submit" className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <form onSubmit={handleChangePassword}>
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Security</h2>
                  <p className="text-sm text-gray-400 mb-5">Manage your password and account security</p>

                  {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field, i) => {
                    const labels = ["Current Password", "New Password", "Confirm New Password"];
                    const showKey = (["current", "new", "confirm"] as const)[i];
                    return (
                      <div key={field} className={rowClass}>
                        <label className={`${labelClass} font-normal`}>{labels[i]}</label>
                        <div className="flex-1">
                          <div className="relative">
                            <input
                              type={showPw[showKey] ? "text" : "password"}
                              value={pwData[field]}
                              onChange={(e) => { setPwData((p) => ({ ...p, [field]: e.target.value })); if (pwErrors[field]) setPwErrors((p) => ({ ...p, [field]: "" })); }}
                              className={`w-full text-sm bg-white border rounded-lg px-3 pr-10 py-2 focus:outline-none focus:ring-1 transition-all ${pwErrors[field] ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-gray-400"}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw((p) => ({ ...p, [showKey]: !p[showKey] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPw[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {pwErrors[field] && <p className="text-xs text-red-500 mt-1">{pwErrors[field]}</p>}
                        </div>
                      </div>
                    );
                  })}

                  {pwMessage?.type === "error" && (
                    <div className="mt-4 p-3 rounded-lg flex items-start gap-2 text-sm bg-red-50 text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {pwMessage.text}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button type="submit" className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* PREFERENCES TAB */}
              {activeTab === "preferences" && (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Preferences</h2>
                  <p className="text-sm text-gray-400 mb-5">Customize your appearance and display settings</p>

                  <div className={rowClass}>
                    <span className={labelClass}>Appearance</span>
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
                      <button
                        onClick={() => setTheme("light")}
                        title="Light mode"
                        className={`p-2 rounded-md transition-all ${theme === "light" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                      >
                        <Sun className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        title="Dark mode"
                        className={`p-2 rounded-md transition-all ${theme === "dark" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                      >
                        <Moon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className={rowClass}>
                    <span className={labelClass}>Font Size</span>
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-0.5">
                      {fontSizeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFontSize(opt.value)}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all ${fontSize === opt.value ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LANGUAGE TAB */}
              {activeTab === "language" && (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-1">Language</h2>
                  <p className="text-sm text-gray-400 mb-5">Choose your preferred interface language</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: "en" as Language, label: "English", code: "US", sub: "English (US)" },
                      { value: "bm" as Language, label: "Bahasa Melayu", code: "MY", sub: "Bahasa Malaysia" },
                    ]).map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => setLanguage(lang.value)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all bg-white ${language === lang.value ? "border-gray-900" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {lang.code}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{lang.label}</p>
                          <p className="text-xs text-gray-400">{lang.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {successModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{successModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{successModal.body}</p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
