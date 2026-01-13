"use client";

import { useEffect, useState } from "react";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

import supabase from "@/lib/supabase";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type DirtLevel = "Clean" | "Moderate" | "Very Dirty";

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
    status:
        | "Pending"
        | "Confirmed"
        | "Assigned"
        | "En Route"
        | "In Progress"
        | "Completed"
        | "Cancelled"
        | "Issue/Delayed";
    paymentStatus: string;
    assignedTo?: string;
    aiAnalysis?: { dirtLevel: DirtLevel } | null;
}

interface BookingRow {
    id: string;
    booking_id: string;
    customer_name: string;
    service_name: string;
    scheduled_date: string;
    time_slot: string;
    address: string;
    car_details: string;
    amount: number;
    status: Booking["status"];
    payment_status: string | null;
    assigned_to: string | null;
    ai_dirt_level: DirtLevel | null;
}

export default function Page() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [providers, setProviders] = useState<
        Array<{ email: string; name: string }>
    >([]);
    const [loading, setLoading] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const mapBooking = (row: BookingRow): Booking => ({
        id: row.id,
        bookingId: row.booking_id,
        customerName: row.customer_name,
        service: row.service_name,
        date: row.scheduled_date,
        timeSlot: row.time_slot,
        address: row.address,
        carDetails: row.car_details,
        amount: Number(row.amount),
        status: row.status,
        paymentStatus: row.payment_status ?? "Pending",
        assignedTo: row.assigned_to ?? undefined,
        aiAnalysis: row.ai_dirt_level ? { dirtLevel: row.ai_dirt_level } : null,
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) return;

            const { data: bookingsData } = await supabase
                .from("bookings")
                .select("*")
                .order("created_at", { ascending: false });

            if (bookingsData) {
                setBookings(bookingsData.map(mapBooking));
            }

            const { data: providerData } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("role", "serviceProvider");

            if (providerData) {
                setProviders(
                    providerData.map((p) => ({
                        email: p.email,
                        name: p.full_name,
                    }))
                );
            }

            setLoading(false);
        };

        load();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
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

    const handleAssignProvider = async (id: string, email: string) => {
        if (!email) {
            await supabase
                .from("bookings")
                .update({ assigned_to: null, assigned_provider_id: null })
                .eq("id", id);
            return;
        }

        const { data: provider } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (!provider) return;

        await supabase
            .from("bookings")
            .update({
                assigned_to: email,
                assigned_provider_id: provider.id,
                status: "Assigned",
            })
            .eq("id", id);

        setBookings((prev) =>
            prev.map((b) =>
                b.id === id
                    ? { ...b, assignedTo: email, status: "Assigned" }
                    : b
            )
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading admin dashboard...
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* MAIN */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-3xl font-bold mb-6">Admin Overview</h1>
                    <div className="bg-white rounded-2xl border overflow-x-auto">
                        <Table>
                            <TableCaption>
                                Latest bookings overview
                            </TableCaption>

                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assign</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {bookings.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-mono text-blue-600">
                                            {b.bookingId}
                                        </TableCell>

                                        <TableCell>{b.customerName}</TableCell>

                                        <TableCell>{b.service}</TableCell>

                                        <TableCell>
                                            <Select
                                                value={b.status}
                                                onValueChange={(value) =>
                                                    handleUpdateStatus(
                                                        b.id,
                                                        value as Booking["status"]
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {[
                                                        "Pending",
                                                        "Confirmed",
                                                        "Assigned",
                                                        "En Route",
                                                        "In Progress",
                                                        "Completed",
                                                        "Cancelled",
                                                    ].map((status) => (
                                                        <SelectItem
                                                            key={status}
                                                            value={status}
                                                        >
                                                            {status}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell>
                                            <Select
                                                value={
                                                    b.assignedTo ?? "unassigned"
                                                }
                                                onValueChange={(value) =>
                                                    handleAssignProvider(
                                                        b.id,
                                                        value === "unassigned"
                                                            ? ""
                                                            : value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Assign provider" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    <SelectItem value="unassigned">
                                                        Unassigned
                                                    </SelectItem>

                                                    {providers.map((p) => (
                                                        <SelectItem
                                                            key={p.email}
                                                            value={p.email}
                                                        >
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </main>
            </div>
        </div>
    );
}
