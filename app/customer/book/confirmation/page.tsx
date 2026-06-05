"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, Calendar, Clock, MapPin, Car, DollarSign, Home, Sparkles,
} from "lucide-react";
import supabase from "@/lib/supabase";

interface ConfirmationData {
  bookingId: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  carDetails: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
}

export default function BookingConfirmationPage() {
  const router = useRouter();
  const [localConfirmation, setLocalConfirmation] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const confirmationRaw = sessionStorage.getItem("booking:confirmation");
    if (confirmationRaw) {
      setLocalConfirmation(JSON.parse(confirmationRaw));
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data[0]) {
        const row = data[0];
        setLocalConfirmation({
          bookingId: row.booking_id,
          service: row.service_name,
          date: row.scheduled_date,
          timeSlot: row.time_slot,
          address: row.address,
          carDetails: row.car_details,
          amount: Number(row.amount),
          paymentMethod: row.payment_method || "cash",
          paymentStatus: row.payment_status || "Pending",
        });
      }
      setLoading(false);
    };

    load();
  }, [router]);

  if (!localConfirmation) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{loading ? "Loading confirmation..." : "No booking found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-100">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 font-medium">Your detailing experience is officially scheduled.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gray-900 p-4 flex justify-between items-center text-white">
            <span className="text-sm font-bold uppercase tracking-widest opacity-80">Reference ID</span>
            <span className="font-mono text-lg font-bold">{localConfirmation.bookingId}</span>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-50 rounded-lg"><Car className="w-5 h-5 text-gray-900" /></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">Service</p><p className="font-bold text-gray-800">{localConfirmation.service}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-50 rounded-lg"><Car className="w-5 h-5 text-purple-600" /></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">Vehicle</p><p className="font-bold text-gray-800">{localConfirmation.carDetails}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-red-50 rounded-lg"><Calendar className="w-5 h-5 text-red-600" /></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">Date</p><p className="font-bold text-gray-800">{localConfirmation.date}</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
                <div><p className="text-xs font-bold text-gray-400 uppercase">Time Slot</p><p className="font-bold text-gray-800">{localConfirmation.timeSlot}</p></div>
              </div>
            </div>
            <div className="flex items-start gap-4 pt-4 border-t border-gray-50">
              <div className="p-2 bg-indigo-50 rounded-lg"><MapPin className="w-5 h-5 text-indigo-600" /></div>
              <div><p className="text-xs font-bold text-gray-400 uppercase">Service Location</p><p className="font-medium text-gray-700 leading-relaxed">{localConfirmation.address}</p></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-green-600" /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Amount</p>
              <p className="text-2xl font-black text-gray-900">RM {localConfirmation.amount}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">{localConfirmation.paymentStatus}</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
          <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5" /> What's Next?</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-blue-800 font-medium">
              <span className="bg-gray-200 text-gray-900 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
              Our team will arrive at your location within the scheduled time window.
            </li>
            <li className="flex items-start gap-3 text-sm text-blue-800 font-medium">
              <span className="bg-gray-200 text-gray-900 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
              You can track your detailer's status in the "Booking History" section.
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => router.push("/customer/dashboard")} className="w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> Go to Dashboard
          </button>
          <button onClick={() => router.push("/customer/history")} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-100">
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
