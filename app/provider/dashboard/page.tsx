"use client";

import { useEffect, useState } from "react";
import {
    MapPin,
    Calendar,
    Car,
    Navigation,
    CheckCircle,
    Clock,
    Eye,
} from "lucide-react";
import React from "react";
import supabase from "@/lib/supabase";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Booking {
    id: string;
    bookingId: string;
    userId: string;
    customerName: string;
    service: string;
    date: string;
    timeSlot: string;
    address: string;
    carDetails: string;
    amount: number;
    status:
        | "Pending"
        | "Confirmed"
        | "Assigned"
        | "En Route"
        | "In Progress"
        | "Completed"
        | "Cancelled"
        | "Issue/Delayed";
    paymentMethod: string;
    paymentStatus: string;
    assignedTo?: string;
}

export default function Page() {
    const [providerName, setProviderName] = useState("");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(
        null
    );
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            let { data: auth } = await supabase.auth.getUser();
            if (!auth.user) {
                await supabase.auth.refreshSession();
                ({ data: auth } = await supabase.auth.getUser());
            }
            if (!auth.user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", auth.user.id)
                .single();

            setProviderName(profile?.full_name || "Provider");

            const email = profile?.email || auth.user.email || "";

            const { data } = await supabase
                .from("bookings")
                .select("*")
                .or(
                    `assigned_provider_id.eq.${auth.user.id},assigned_to.ilike.${email}`
                )
                .order("created_at", { ascending: false });

            if (data) {
                setBookings(
                    data.map((row: any) => ({
                        id: row.id,
                        bookingId: row.booking_id,
                        userId: row.user_id,
                        customerName: row.customer_name,
                        service: row.service_name,
                        date: row.scheduled_date,
                        timeSlot: row.time_slot,
                        address: row.address,
                        carDetails: row.car_details,
                        amount: Number(row.amount),
                        status: row.status,
                        paymentMethod: row.payment_method || "",
                        paymentStatus: row.payment_status || "",
                        assignedTo: row.assigned_to || undefined,
                    }))
                );
            }

            setLoading(false);
        };

        load();
    }, []);

    const updateStatus = async (id: string, status: Booking["status"]) => {
        await supabase.from("bookings").update({ status }).eq("id", id);

        setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status } : b))
        );
    };

    const handleUpdateStatus = async (
        id: string,
        status: Booking["status"]
    ) => {
        await supabase.from("bookings").update({ status }).eq("id", id);
        setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status } : b))
        );
    };

    const navigate = (address: string) => {
        window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                address
            )}`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const today = new Date().toLocaleDateString("en-CA");

    const todaysBookings = bookings.filter(
        (b) =>
            b.date >= today &&
            [
                "Assigned",
                "Confirmed",
                "En Route",
                "In Progress",
                "Completion Pending",
            ].includes(b.status)
    );
    const todayJobs = bookings.filter((b) => b.date === today);
    const upcomingJobs = bookings.filter((b) => b.date > today);

    const inProgressCount = bookings.filter((b) =>
        ["In Progress", "En Route", "Completion Pending"].includes(b.status)
    ).length;

    const completedCount = bookings.filter(
        (b) => b.status === "Completed"
    ).length;

    const statusColor = (status: Booking["status"]) => {
        switch (status) {
            case "Completed":
                return "bg-green-100 text-green-700";
            case "Confirmed":
                return "bg-blue-100 text-blue-700";
            case "In Progress":
                return "bg-yellow-100 text-yellow-700";
            case "Cancelled":
            case "Issue/Delayed":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const submitCompletion = async () => {
        if (!selectedBooking || !proofImage) return;

        setUploading(true);

        const filePath = `proofs/${selectedBooking.id}-${Date.now()}.jpg`;

        await supabase.storage
            .from("completion-proofs")
            .upload(filePath, proofImage);

        await supabase
            .from("bookings")
            .update({
                status: "Completion Pending",
                proof_of_completion_url: filePath,
            })
            .eq("id", selectedBooking.id);

        setBookings((prev) =>
            prev.map((b) =>
                b.id === selectedBooking.id ? { ...b, status: "Completed" } : b
            )
        );

        setUploading(false);
        setSelectedBooking(null);
        setProofImage(null);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                Loading dashboard...
            </div>
        );
    }

    return (
        <main className="min-h-screen p-6">
            <Dialog
                open={!!selectedBooking}
                onOpenChange={() => setSelectedBooking(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Job Actions</DialogTitle>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-4">
                            <p className="font-semibold">
                                {selectedBooking.service}
                            </p>

                            {selectedBooking.status === "Assigned" && (
                                <button
                                    onClick={() =>
                                        updateStatus(
                                            selectedBooking.id,
                                            "En Route"
                                        )
                                    }
                                    className="w-full bg-blue-600 text-white py-2 rounded-xl"
                                >
                                    Start Journey
                                </button>
                            )}

                            {selectedBooking.status === "En Route" && (
                                <button
                                    onClick={() =>
                                        updateStatus(
                                            selectedBooking.id,
                                            "In Progress"
                                        )
                                    }
                                    className="w-full bg-yellow-600 text-white py-2 rounded-xl"
                                >
                                    Begin Detailing
                                </button>
                            )}

                            {selectedBooking.status === "In Progress" && (
                                <>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setProofImage(
                                                e.target.files?.[0] || null
                                            )
                                        }
                                    />

                                    <button
                                        onClick={submitCompletion}
                                        disabled={uploading || !proofImage}
                                        className="w-full bg-green-600 text-white py-2 rounded-xl disabled:opacity-50"
                                    >
                                        {uploading
                                            ? "Submitting..."
                                            : "Submit Verification"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold">
                        Welcome, {providerName}!
                    </h1>
                    <p className="text-gray-500">
                        Manage your service schedule and active jobs.
                    </p>
                </header>

                {/* STATS */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <Stat
                        title="Today's Jobs"
                        value={todaysBookings.length}
                        icon={<Calendar />}
                    />
                    <Stat
                        title="In Progress"
                        value={inProgressCount}
                        icon={<Clock />}
                    />
                    <Stat
                        title="Completed"
                        value={completedCount}
                        icon={<CheckCircle />}
                    />
                </div>

                {/* TODAY */}
                <section className="bg-white rounded-3xl shadow p-6 mb-10">
                    <h2 className="text-xl font-bold mb-6">
                        Today's Active Schedule
                    </h2>

                    {todaysBookings.length === 0 ? (
                        <p className="text-center text-gray-400 py-10">
                            No bookings today.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {todaysBookings.map((b) => (
                                <div
                                    key={b.id}
                                    className="border rounded-2xl p-5"
                                >
                                    <div className="flex justify-between mb-3">
                                        <h3 className="font-bold">
                                            {b.service}
                                        </h3>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(
                                                b.status
                                            )}`}
                                        >
                                            {b.status}
                                        </span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3 text-sm mb-4">
                                        <div className="flex gap-2">
                                            <Car className="w-4 h-4" />{" "}
                                            {b.carDetails}
                                        </div>
                                        <div className="flex gap-2">
                                            <Clock className="w-4 h-4" />{" "}
                                            {b.timeSlot}
                                        </div>
                                        <div className="flex gap-2 md:col-span-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="flex-1 truncate">
                                                {b.address}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    navigate(b.address)
                                                }
                                                className="text-blue-600 flex items-center gap-1"
                                            >
                                                <Navigation className="w-4 h-4" />{" "}
                                                Navigate
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {b.status === "Assigned" && (
                                            <Button
                                                onClick={() =>
                                                    updateStatus(
                                                        b.id,
                                                        "En Route"
                                                    )
                                                }
                                                className="flex-1 bg-blue-600"
                                            >
                                                Start Journey
                                            </Button>
                                        )}

                                        {b.status === "En Route" && (
                                            <Button
                                                onClick={() =>
                                                    updateStatus(
                                                        b.id,
                                                        "In Progress"
                                                    )
                                                }
                                                className="flex-1 bg-yellow-600"
                                            >
                                                Begin Detailing
                                            </Button>
                                        )}

                                        {b.status === "In Progress" && (
                                            <Button
                                                onClick={() =>
                                                    updateStatus(
                                                        b.id,
                                                        "Completed"
                                                    )
                                                }
                                                className="flex-1 bg-green-600"
                                            >
                                                Complete Job
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setSelectedBooking(b)
                                            }
                                        >
                                            <Eye className="w-4 h-4 mr-1" />{" "}
                                            Details
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function Stat({
    title,
    value,
    icon,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 flex items-center justify-center rounded-xl">
                {icon}
            </div>
            <div>
                <p className="text-xs uppercase text-gray-400">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}
