"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle,
    Calendar,
    Clock,
    MapPin,
    Car,
    DollarSign,
    Home,
} from "lucide-react";

interface ConfirmationData {
    bookingId: string;
    service: string;
    date: string;
    timeSlot: string;
    address: string;
    carDetails: string;
    amount: number;
}

export default function BookingConfirmationPage() {
    const router = useRouter();

    const [data, setData] = useState<ConfirmationData | null>(null);

    /* ================= LOAD FROM SESSION ================= */
    useEffect(() => {
        const carRaw = sessionStorage.getItem("booking:car-details");
        const serviceRaw = sessionStorage.getItem("booking:service");
        const locationRaw = sessionStorage.getItem("booking:location");

        if (!carRaw || !serviceRaw || !locationRaw) {
            router.push("/customer/book");
            return;
        }

        const car = JSON.parse(carRaw);
        const service = JSON.parse(serviceRaw);
        const location = JSON.parse(locationRaw);

        const bookingId = `BK-${Date.now()}`;
        const address = `${location.detailedAddress}, ${location.selectedArea}`;
        const amount = (service.price ?? 0) + (location.travelFee ?? 0);

        setData({
            bookingId,
            service: service.name,
            date: location.date,
            timeSlot: location.timeSlot,
            address,
            carDetails: `${car.carBrand} ${car.carModel} (${car.plateNumber})`,
            amount,
        });
    }, [router]);

    if (!data) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading booking preview...
            </div>
        );
    }

    /* ================= UI ================= */
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* HEADER */}
                <div className="bg-white rounded-3xl p-8 text-center border">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-black">Review Your Booking</h1>
                    <p className="text-gray-500">
                        Please review before continuing to payment
                    </p>
                </div>

                {/* DETAILS */}
                <div className="bg-white rounded-3xl border overflow-hidden">
                    <div className="bg-blue-600 text-white p-4 flex justify-between">
                        <span>Reference ID</span>
                        <span className="font-mono font-bold">
                            {data.bookingId}
                        </span>
                    </div>

                    <div className="p-6 space-y-4">
                        <Detail icon={<Car />} label="Service">
                            {data.service}
                        </Detail>
                        <Detail icon={<Calendar />} label="Date">
                            {data.date}
                        </Detail>
                        <Detail icon={<Clock />} label="Time">
                            {data.timeSlot}
                        </Detail>
                        <Detail icon={<MapPin />} label="Location">
                            {data.address}
                        </Detail>
                    </div>
                </div>

                {/* TOTAL */}
                <div className="bg-white rounded-3xl p-6 border flex justify-between">
                    <div className="flex items-center gap-3">
                        <DollarSign />
                        <span className="font-bold">Total</span>
                    </div>
                    <span className="text-2xl font-black">
                        RM {data.amount}
                    </span>
                </div>

                {/* ACTIONS */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push("/dashboard/customer")}
                        className="btn-outline"
                    >
                        <Home /> Cancel
                    </button>

                    <button
                        onClick={() => router.push("/customer/book/payment")}
                        className="btn-primary"
                    >
                        Continue to Payment
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================= HELPER ================= */

function Detail({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
            <div>
                <p className="text-xs uppercase text-gray-400">{label}</p>
                <p className="font-medium">{children}</p>
            </div>
        </div>
    );
}
