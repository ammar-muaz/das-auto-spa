"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Wallet, Banknote, CheckCircle } from "lucide-react";
import supabase from "@/lib/supabase";

type PaymentMethod = "card" | "ewallet" | "cash";

export default function PaymentPage() {
    const router = useRouter();

    const [amount, setAmount] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
        null
    );
    const [processing, setProcessing] = useState(false);

    // 🔒 prevent double insert
    const hasSubmittedRef = useRef(false);

    /* ================= LOAD AMOUNT FROM SESSION ================= */
    useEffect(() => {
        const serviceRaw = sessionStorage.getItem("booking:service");
        const locationRaw = sessionStorage.getItem("booking:location");

        if (!serviceRaw || !locationRaw) {
            router.push("/customer/book/car-details");
            return;
        }

        const service = JSON.parse(serviceRaw);
        const location = JSON.parse(locationRaw);

        setAmount((service.price ?? 0) + (location.travelFee ?? 0));
    }, [router]);

    /* ================= FINAL SUBMIT ================= */
    const handlePayment = async () => {
        if (!selectedMethod || processing || hasSubmittedRef.current) return;

        setProcessing(true);
        hasSubmittedRef.current = true;

        const car = JSON.parse(sessionStorage.getItem("booking:car-details")!);
        const service = JSON.parse(sessionStorage.getItem("booking:service")!);
        const location = JSON.parse(
            sessionStorage.getItem("booking:location")!
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        const bookingId = `BK-${Date.now()}`;
        const address = `${location.detailedAddress}, ${location.selectedArea}`;
        const totalAmount = (service.price ?? 0) + (location.travelFee ?? 0);

        const { error } = await supabase.from("bookings").insert({
            booking_id: bookingId,
            user_id: user.id,
            customer_name: user.user_metadata?.full_name ?? "Customer",

            service_name: service.name,
            scheduled_date: location.date,
            time_slot: location.timeSlot,
            address,

            car_details: `${car.carBrand} ${car.carModel} (${car.plateNumber})`,
            amount: totalAmount,

            status: "confirmed",
            payment_method: selectedMethod,
            payment_status: selectedMethod === "cash" ? "pending" : "paid",
        });

        if (error) {
            console.error("Booking insert failed:", error);
            hasSubmittedRef.current = false;
            setProcessing(false);
            return;
        }

        // ✅ clear session after success
        sessionStorage.removeItem("booking:car-details");
        sessionStorage.removeItem("booking:service");
        sessionStorage.removeItem("booking:location");

        router.push("/customer/book/confirmation");
    };

    const paymentMethods = [
        {
            id: "card" as PaymentMethod,
            name: "Credit / Debit Card",
            icon: CreditCard,
        },
        {
            id: "ewallet" as PaymentMethod,
            name: "E-Wallet",
            icon: Wallet,
        },
        {
            id: "cash" as PaymentMethod,
            name: "Cash on Service",
            icon: Banknote,
        },
    ];

    /* ================= UI ================= */
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-8 border text-center">
                    <h1 className="text-2xl font-bold">Secure Payment</h1>
                    <p className="text-gray-500">
                        Step 6: Choose payment method
                    </p>
                </div>

                <div className="bg-blue-600 text-white rounded-3xl p-8 text-center">
                    <p className="text-sm uppercase font-bold opacity-80">
                        Total Amount
                    </p>
                    <p className="text-5xl font-black">RM {amount}</p>
                </div>

                <div className="bg-white rounded-3xl border p-6 space-y-3">
                    {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        const active = selectedMethod === method.id;

                        return (
                            <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 ${
                                    active
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-100"
                                }`}
                            >
                                <Icon />
                                <span className="font-bold flex-1 text-left">
                                    {method.name}
                                </span>
                                {active && (
                                    <CheckCircle className="text-blue-600" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handlePayment}
                    disabled={!selectedMethod || processing}
                    className="w-full bg-green-600 text-white py-5 rounded-2xl font-black"
                >
                    {processing
                        ? "Processing..."
                        : `Confirm & Pay RM ${amount}`}
                </button>
            </div>
        </div>
    );
}
