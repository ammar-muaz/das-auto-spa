"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle, ChevronLeft, Lock, CreditCard, Building2, Upload, FileText, X } from "lucide-react";
import Image from "next/image";
import supabase from "@/lib/supabase";

type PaymentMethod = "online" | "cash" | "online_banking";
type Stage = "select" | "mock-payment" | "online-banking" | "processing";

export default function PaymentPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [serviceName, setServiceName] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    const serviceRaw = sessionStorage.getItem("booking:service");
    const locationRaw = sessionStorage.getItem("booking:location");
    if (!serviceRaw || !locationRaw) { router.push("/customer/book"); return; }
    const service = JSON.parse(serviceRaw);
    const location = JSON.parse(locationRaw);
    setAmount((service.price ?? 0) + (location.travelFee ?? 0));
    setServiceName(service.name ?? "");
  }, [router]);

  const createBooking = async (paymentMethod: PaymentMethod, paymentReceiptUrl?: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setProcessing(true);

    const carRaw = sessionStorage.getItem("booking:car-details");
    const serviceRaw = sessionStorage.getItem("booking:service");
    const locationRaw = sessionStorage.getItem("booking:location");

    if (!carRaw || !serviceRaw || !locationRaw) { router.push("/customer/book"); return; }

    const car = JSON.parse(carRaw);
    const service = JSON.parse(serviceRaw);
    const location = JSON.parse(locationRaw);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { router.push("/login"); return; }

    const address = location.address || `${location.detailedAddress}, ${location.selectedArea}`;
    const totalAmount = (service.price ?? 0) + (location.travelFee ?? 0);
    const carDetails = `${car.carBrand} ${car.carModel} (${car.plateNumber})`;
    const aiAnalysisRaw = sessionStorage.getItem("booking:ai-analysis");
    const aiAnalysis = aiAnalysisRaw ? JSON.parse(aiAnalysisRaw) : null;

    const response = await fetch("/api/customer/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        customerName: user.user_metadata?.full_name ?? "Customer",
        serviceName: service.name,
        scheduledDate: location.date,
        timeSlot: location.timeSlot,
        paymentMethod,
        paymentReceiptUrl: paymentReceiptUrl || null,
        aiDirtLevel: aiAnalysis?.dirtLevel ?? null,
        aiImageUrl: aiAnalysis?.imageUrl ?? null,
        carDetails,
        amount: totalAmount,
        address,
      }),
    });

    if (!response.ok) {
      hasSubmittedRef.current = false;
      setProcessing(false);
      setStage("select");
      return;
    }

    const payload = await response.json();
    const bookingId = payload.booking?.booking_id;

    sessionStorage.setItem("booking:confirmation", JSON.stringify({
      bookingId,
      service: service.name,
      date: location.date,
      timeSlot: location.timeSlot,
      address,
      carDetails,
      amount: totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === "cash" ? "Pending" : paymentMethod === "online_banking" ? "Pending Verification" : "Paid",
    }));

    sessionStorage.removeItem("booking:car-details");
    sessionStorage.removeItem("booking:service");
    sessionStorage.removeItem("booking:location");
    sessionStorage.removeItem("booking:ai-analysis");

    router.push("/customer/book/confirmation");
  };

  const handleMethodConfirm = () => {
    if (!selectedMethod) return;
    if (selectedMethod === "cash") createBooking("cash");
    else if (selectedMethod === "online") setStage("mock-payment");
    else setStage("online-banking");
  };

  const handleMockPay = async () => {
    if (!cardNumber || !expiry || !cvv || !cardName) return;
    setStage("processing");
    await new Promise((r) => setTimeout(r, 2000));
    await createBooking("online");
  };

  const handleOnlineBankingSubmit = async () => {
    if (!receiptFile) return;
    setUploadingReceipt(true);

    try {
      const ext = receiptFile.name.split(".").pop() || "jpg";
      const path = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (uploadError) {
        console.error("[upload error]", uploadError);
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(uploadData.path);
      const receiptUrl = urlData.publicUrl;

      setUploadingReceipt(false);
      setStage("processing");
      await createBooking("online_banking", receiptUrl);
    } catch (err: any) {
      setUploadingReceipt(false);
      alert(`Upload failed: ${err?.message || "Please try again."}`);
    }
  };

  const formatCardNumber = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (val: string) =>
    val.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

  // ── Processing ──
  if (stage === "processing") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-gray-800">Processing...</h1>
          <p className="text-gray-500 text-sm">Please wait while we confirm your booking.</p>
        </div>
      </div>
    );
  }

  // ── Online Banking ──
  if (stage === "online-banking") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => setStage("select")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /><span>Back</span>
          </button>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center space-y-2">
            <h1 className="text-xl font-bold text-gray-800">Online Banking</h1>
            <p className="text-gray-500 text-sm">Scan the QR code below to pay RM {amount}</p>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-4">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white text-center px-6 py-2 rounded-full text-sm font-bold">
              RM {amount} — Das Auto Spa
            </div>
            <div className="border-4 border-gray-900 rounded-2xl p-2">
              <Image
                src="/QR Code Payment.jpg"
                alt="Payment QR Code"
                width={220}
                height={220}
                className="rounded-xl"
              />
            </div>
            <p className="text-xs text-gray-400 text-center">Scan with any Malaysian banking app · DuitNow</p>
          </div>

          {/* Receipt Upload */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-800">Upload Payment Receipt</h3>
            <p className="text-sm text-gray-500">After paying, upload your receipt (image or PDF) as proof of payment.</p>

            {receiptFile ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl">
                <FileText className="w-8 h-8 text-gray-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{receiptFile.name}</p>
                  <p className="text-xs text-gray-400">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setReceiptFile(null)} className="p-1 text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all">
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Click to upload receipt</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 5 * 1024 * 1024) setReceiptFile(f);
                    else if (f) alert("File must be under 5MB.");
                  }}
                />
              </label>
            )}
          </div>

          <button
            onClick={handleOnlineBankingSubmit}
            disabled={!receiptFile || uploadingReceipt}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center gap-2"
          >
            {uploadingReceipt && <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />}
            {uploadingReceipt ? "Uploading..." : "Submit Booking"}
          </button>
        </div>
      </div>
    );
  }

  // ── Mock card payment ──
  if (stage === "mock-payment") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => setStage("select")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /><span>Back</span>
          </button>

          <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs opacity-60 uppercase tracking-widest">Das Auto Spa</p>
                <p className="text-sm font-bold mt-1">Secure Payment</p>
              </div>
              <CreditCard className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-xl font-mono tracking-widest mb-6">{cardNumber || "•••• •••• •••• ••••"}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-60 uppercase">Card Holder</p>
                <p className="text-sm font-bold">{cardName || "YOUR NAME"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60 uppercase">Expires</p>
                <p className="text-sm font-bold">{expiry || "MM/YY"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60 uppercase">Amount</p>
                <p className="text-lg font-black">RM {amount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">Secured with 256-bit encryption</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Number</label>
              <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gray-900 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Card Holder Name</label>
              <input type="text" placeholder="Name as on card" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gray-900 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                <input type="text" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gray-900 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">CVV</label>
                <input type="password" placeholder="•••" value={cvv} maxLength={3} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-gray-900 outline-none font-mono" />
              </div>
            </div>
          </div>

          <button onClick={handleMockPay} disabled={!cardNumber || !expiry || !cvv || !cardName} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            Pay RM {amount}
          </button>
        </div>
      </div>
    );
  }

  // ── Method selection ──
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => router.push("/customer/book/summary")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /><span>Back</span>
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Secure Payment</h1>
          <p className="text-gray-500">Step 6: Select your preferred payment method</p>
        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl shadow-xl p-8 text-white text-center">
          <p className="text-sm opacity-80 uppercase font-black tracking-widest mb-1">Total Amount</p>
          <p className="text-5xl font-black">RM {amount}</p>
          {serviceName && <p className="text-sm opacity-60 mt-2">{serviceName}</p>}
        </div>

        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <h3 className="text-gray-800 font-bold mb-6">Select Payment Method</h3>
          <div className="space-y-3">
            {[
              { id: "online" as PaymentMethod, name: "Credit / Debit Card", icon: CreditCard, description: "Visa, Mastercard, E-Wallet" },
              { id: "online_banking" as PaymentMethod, name: "Online Banking", icon: Building2, description: "FPX / DuitNow QR — upload receipt after paying" },
              { id: "cash" as PaymentMethod, name: "Cash on Service", icon: Banknote, description: "Pay when detailing is done" },
            ].map((method) => {
              const Icon = method.icon;
              const isActive = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={processing}
                  className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                    isActive ? "border-gray-900 bg-gray-50/50 ring-4 ring-gray-100" : "border-gray-100 hover:border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? "bg-gray-900 text-white shadow-lg" : "bg-white text-gray-400"}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-bold">{method.name}</p>
                    <p className="text-xs text-gray-500 font-medium">{method.description}</p>
                  </div>
                  {isActive && <CheckCircle className="w-6 h-6 text-gray-900" />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleMethodConfirm}
          disabled={!selectedMethod || processing}
          className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-gray-800 disabled:bg-gray-200 transition-all shadow-xl flex items-center justify-center gap-3"
        >
          {processing && <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />}
          <span>{processing ? "Processing..." : `Confirm & Pay RM ${amount}`}</span>
        </button>
      </div>
    </div>
  );
}
