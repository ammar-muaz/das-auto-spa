"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { use } from "react";
import {
  ChevronLeft, User, Car, Package, MapPin, Calendar, Clock,
  Camera, Upload, CheckCircle, AlertTriangle, X, FileText,
  Navigation, Star,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";
import Link from "next/link";

type BookingStatus = "Pending" | "Confirmed" | "Assigned" | "En Route" | "In Progress" | "Completion Pending" | "Issue/Delayed" | "Completed" | "Cancelled";

interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  carDetails: string;
  amount: number;
  status: BookingStatus;
  specialInstructions?: string;
  proofOfCompletion?: string;
  aiAnalysis?: { dirtLevel: "Clean" | "Moderate" | "Very Dirty" } | null;
  issueReport?: { reason: string; remarks: string; reportedAt: string };
}

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "Completed": return "bg-green-100 text-green-700 border-green-300";
    case "In Progress": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Issue/Delayed": return "bg-red-100 text-red-700 border-red-300";
    default: return "bg-gray-100 text-gray-900 border-gray-300";
  }
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parseSlotStart = (timeSlot: string): Date | null => {
  const part = timeSlot.split(" - ")[0]?.trim();
  if (!part) return null;
  const m = part.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  const result = new Date();
  result.setHours(h, min, 0, 0);
  return result;
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { userId } = useUser();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobReview, setJobReview] = useState<{ rating: number; comment: string | null } | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const isSubmittingRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBooking({
            id: data.id,
            bookingId: data.booking_id,
            customerName: data.customer_name,
            service: data.service_name,
            date: data.scheduled_date,
            timeSlot: data.time_slot,
            address: data.address,
            carDetails: data.car_details,
            amount: Number(data.amount),
            status: data.status,
            specialInstructions: data.special_instructions || undefined,
            proofOfCompletion: data.proof_of_completion_url || undefined,
            aiAnalysis: data.ai_dirt_level ? { dirtLevel: data.ai_dirt_level } : null,
            issueReport: data.issue_reason ? {
              reason: data.issue_reason,
              remarks: data.issue_remarks || "",
              reportedAt: data.issue_reported_at || "",
            } : undefined,
          });
          setProofImage(data.proof_of_completion_url || null);
        }
        setLoading(false);
      });
  }, [id, refreshKey]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`provider-job-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!booking?.id || !["Completed", "Completion Pending"].includes(booking.status)) return;
    supabase.from("reviews").select("rating, comment").eq("booking_id", booking.id).single().then(({ data }) => {
      if (data) setJobReview(data);
    });
  }, [booking?.id, booking?.status]);

  const handleUpdateStatus = async (newStatus: BookingStatus) => {
    if (!booking) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const response = await fetch("/api/provider/bookings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: booking.id, status: newStatus }),
    });
    if (response.ok) setBooking((prev) => prev ? { ...prev, status: newStatus } : prev);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const compressAndUpload = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? res(reader.result) : rej(new Error("Read failed"));
      reader.onerror = () => rej(reader.error);
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Image load failed"));
      i.src = dataUrl;
    });
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();
    const uploadFile = new File([blob], "proof.jpg", { type: "image/jpeg" });
    const filePath = `proofs/${id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("completion-proofs").upload(filePath, uploadFile);
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage.from("completion-proofs").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSubmitCompletion = async () => {
    if (!booking || isSubmittingRef.current) return;
    if (!proofFile && !proofImage) {
      setUploadError("Please select a proof photo first.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setUploadError("");
    setSubmitStatus("Uploading proof...");
    try {
      const fileToUpload = proofFile ?? (proofImage ? new File([await (await fetch(proofImage)).blob()], "proof.jpg", { type: "image/jpeg" }) : null);
      if (!fileToUpload) throw new Error("No proof file available.");
      const publicUrl = await compressAndUpload(fileToUpload);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please log in again.");
      const response = await fetch("/api/provider/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, status: "Completion Pending", proofUrl: publicUrl }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to submit proof.");
      }
      setBooking((prev) => prev ? { ...prev, status: "Completion Pending", proofOfCompletion: publicUrl } : prev);
      setSubmitStatus("Submitted successfully.");
      setShowSuccessModal(true);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const canProgressStatus = booking && ["Assigned", "En Route", "Confirmed"].includes(booking.status);

  const getNextStatus = (): BookingStatus => {
    if (!booking) return "Pending";
    if (booking.status === "Assigned" || booking.status === "Confirmed") return "En Route";
    if (booking.status === "En Route") return "In Progress";
    return booking.status;
  };

  const getNextStatusLabel = () => {
    if (!booking) return "";
    if (booking.status === "Assigned" || booking.status === "Confirmed") return "Start Journey (En Route)";
    if (booking.status === "En Route") return "Begin Detailing (In Progress)";
    return "";
  };

  const isActionable = (): boolean => {
    if (!booking) return false;
    const todayStr = getTodayStr();
    if (booking.date > todayStr) return false;
    if (booking.date === todayStr) {
      const slotStart = parseSlotStart(booking.timeSlot);
      if (slotStart && new Date() < slotStart) return false;
    }
    return true;
  };

  const getScheduleLockMessage = (): string => {
    if (!booking) return "";
    const todayStr = getTodayStr();
    if (booking.date > todayStr) return `Actions available on ${booking.date}`;
    if (booking.date === todayStr) return `Actions available from ${booking.timeSlot.split(" - ")[0]?.trim()}`;
    return "";
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 font-medium">Booking not found.</p>
        <Link href="/provider/jobs" className="text-sm font-semibold text-gray-900 hover:underline">← Back to Jobs</Link>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back link */}
          <Link href="/provider/jobs" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-semibold text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />Back to Jobs
          </Link>

          {/* Header */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Booking ID: {booking.bookingId}</p>
              <h1 className="text-2xl font-bold text-gray-900">Job Detail Summary</h1>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer & Vehicle */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5 text-gray-900">
                <User className="w-5 h-5" />
                <h2 className="font-bold text-base">Customer & Vehicle</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Customer Name</p>
                  <p className="text-gray-800 font-medium">{booking.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Vehicle Details</p>
                  <div className="flex items-center gap-2 text-gray-800">
                    <Car className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium">{booking.carDetails}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Package */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5 text-gray-900">
                <Package className="w-5 h-5" />
                <h2 className="font-bold text-base">Service Package</h2>
              </div>
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-800">{booking.service}</span>
                  <span className="text-xl font-black text-gray-900">RM {booking.amount}</span>
                </div>
                {booking.aiAnalysis && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-bold">
                    AI Dirt Level: {booking.aiAnalysis.dirtLevel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location & Schedule */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 text-red-500">
              <MapPin className="w-5 h-5" />
              <h2 className="font-bold text-base">Location & Schedule</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Service Location</p>
                <p className="text-gray-800 font-medium leading-relaxed mb-3">{booking.address}</p>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 font-semibold text-sm hover:text-gray-900 transition-colors">
                  <Navigation className="w-4 h-4" />Open in Google Maps
                </a>
              </div>
              <div className="space-y-4 md:border-l md:border-gray-100 md:pl-8">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Scheduled Date</p>
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Calendar className="w-4 h-4 text-gray-400" />{booking.date}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Time Slot</p>
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Clock className="w-4 h-4 text-gray-400" />{booking.timeSlot}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {booking.specialInstructions && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 text-orange-500">
                <FileText className="w-5 h-5" />
                <h2 className="font-bold text-base">Special Instructions</h2>
              </div>
              <p className="text-gray-700 bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm italic">
                "{booking.specialInstructions}"
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            {canProgressStatus && (
              isActionable() ? (
                <button
                  onClick={() => handleUpdateStatus(getNextStatus())}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />{getNextStatusLabel()}
                </button>
              ) : (
                <div className="space-y-3">
                  <button disabled className="w-full py-4 bg-gray-100 text-gray-400 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />{getNextStatusLabel()}
                  </button>
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    {getScheduleLockMessage()}
                  </div>
                </div>
              )
            )}

            {booking.status === "In Progress" && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gray-900" />Submit Job Completion
                </h3>
                {proofImage ? (
                  <div className="relative">
                    <img src={proofImage} alt="Proof" className="w-full h-64 object-cover rounded-xl border-2 border-gray-200" />
                    <button
                      onClick={() => { setProofImage(null); setProofFile(null); }}
                      className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-xl"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="job-proof-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-bold text-gray-500">Click to capture work proof</p>
                    <input
                      id="job-proof-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                <button
                  onClick={handleSubmitCompletion}
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${isSubmitting ? "bg-gray-100 text-gray-400" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                >
                  {isSubmitting ? "Submitting... Please Wait" : "Complete & Submit Verification"}
                </button>
                {submitStatus && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{submitStatus}</div>
                )}
                {uploadError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{uploadError}</div>
                )}
              </div>
            )}

            {booking.proofOfCompletion && booking.status === "Completion Pending" && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />Proof Submitted — Awaiting Verification
                </h3>
                <img src={booking.proofOfCompletion} alt="Submitted proof" className="w-full h-64 object-cover rounded-xl border-2 border-gray-200" />
              </div>
            )}
          </div>

          {/* Customer Rating */}
          {jobReview && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />Customer Rating
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-6 h-6 ${s <= jobReview.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`} />
                ))}
                <span className="ml-1 text-sm font-bold text-gray-700">{jobReview.rating} / 5</span>
              </div>
              {jobReview.comment && (
                <p className="text-sm text-gray-600 italic">"{jobReview.comment}"</p>
              )}
            </div>
          )}

          {/* Issue Report */}
          {booking.issueReport && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-red-700 font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />Active Issue Report
              </h3>
              <p className="text-sm text-red-600"><strong>Reason:</strong> {booking.issueReport.reason}</p>
              {booking.issueReport.remarks && (
                <p className="text-sm text-red-600 mt-1"><strong>Remarks:</strong> {booking.issueReport.remarks}</p>
              )}
              <p className="text-[10px] text-red-400 mt-2 italic">
                Reported on {new Date(booking.issueReport.reportedAt).toLocaleString()}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border-4 border-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Submitted Successfully!</h2>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">Your proof has been sent for verification.</p>
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
