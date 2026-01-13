"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    MapPin,
    Car,
    Clock,
    DollarSign,
    CheckCircle,
    AlertCircle,
    MoreVertical,
    Filter,
    Search,
    Download,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import supabase from "@/lib/supabase";

// --- Types ---
interface Booking {
    id: string;
    bookingId: string;
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
        | "Completion Pending"
        | "Issue/Delayed"
        | "Completed"
        | "Cancelled";
    paymentStatus: string;
    serviceType?: "basic" | "premium" | "ultimate";
}

interface BookingRow {
    id: string;
    booking_id: string;
    service_name: string;
    scheduled_date: string;
    time_slot: string;
    address: string;
    car_details: string;
    amount: number;
    status: Booking["status"];
    payment_status: string | null;
    created_at: string;
}

export default function BookingHistoryPage() {
    const router = useRouter();
    const [localBookings, setLocalBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [localName, setLocalName] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [activeTab, setActiveTab] = useState("upcoming");

    // --- Actions ---

    const handleBookNow = () => {
        router.push("/customer/book/car-details");
    };

    const handleCancelBooking = async (id: string) => {
        const confirmCancel = window.confirm(
            "Are you sure you want to cancel this booking?"
        );
        if (!confirmCancel) return;

        // 1. Optimistic UI Update
        setLocalBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" } : b))
        );

        // 2. DB Update
        const { error } = await supabase
            .from("bookings")
            .update({ status: "Cancelled" })
            .eq("id", id);

        if (error) {
            console.error("Error cancelling booking:", error);
            // Revert on error (optional, usually fetch again)
            alert("Failed to cancel booking. Please try again.");
            loadBookings(); // Reload data to be safe
        }
    };

    const loadBookings = async () => {
        setLoading(true);

        /* 1️⃣ AUTH GUARD */
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (!user || authError) {
            router.push("/login");
            return;
        }

        /* 2️⃣ LOAD USER PROFILE */
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        if (profile?.full_name) {
            setLocalName(profile.full_name);
        }

        /* 3️⃣ FETCH BOOKINGS */
        const { data, error } = await supabase
            .from("bookings")
            .select(
                `
                id,
                booking_id,
                service_name,
                scheduled_date,
                time_slot,
                address,
                car_details,
                amount,
                status,
                payment_status,
                created_at
            `
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch bookings:", error);
            setLocalBookings([]);
            setLoading(false);
            return;
        }

        /* 4️⃣ MAP DB → UI MODEL */
        const mapped: Booking[] = data.map((row: BookingRow) => ({
            id: row.id,
            bookingId: row.booking_id,
            service: row.service_name,
            date: new Date(row.scheduled_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
            timeSlot: row.time_slot,
            address: row.address,
            carDetails: row.car_details,
            amount: Number(row.amount),
            status: row.status,
            paymentStatus: row.payment_status || "Pending",
            serviceType: row.service_name.toLowerCase().includes("premium")
                ? "premium"
                : row.service_name.toLowerCase().includes("ultimate")
                ? "ultimate"
                : "basic",
        }));

        setLocalBookings(mapped);
        setLoading(false);
    };

    useEffect(() => {
        loadBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Helpers ---

    const getStatusColor = (status: Booking["status"]) => {
        switch (status) {
            case "Completed":
                return {
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                    dot: "bg-emerald-500",
                    icon: CheckCircle,
                };
            case "Confirmed":
            case "Assigned":
                return {
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                    dot: "bg-blue-500",
                    icon: Clock,
                };
            case "En Route":
                return {
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                    dot: "bg-purple-500",
                    icon: Car,
                };
            case "In Progress":
                return {
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                    dot: "bg-amber-500",
                    icon: RefreshCw,
                };
            case "Completion Pending":
                return {
                    bg: "bg-teal-50",
                    text: "text-teal-700",
                    dot: "bg-teal-500",
                    icon: Clock,
                };
            case "Issue/Delayed":
            case "Cancelled":
                return {
                    bg: "bg-red-50",
                    text: "text-red-700",
                    dot: "bg-red-500",
                    icon: AlertCircle,
                };
            default:
                return {
                    bg: "bg-gray-50",
                    text: "text-gray-700",
                    dot: "bg-gray-500",
                    icon: Clock,
                };
        }
    };

    const getServiceTypeColor = (type?: string) => {
        switch (type) {
            case "premium":
                return {
                    border: "border-l-amber-500",
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                };
            case "ultimate":
                return {
                    border: "border-l-purple-500",
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                };
            default:
                return {
                    border: "border-l-blue-500",
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                };
        }
    };

    const filteredBookings = localBookings.filter((booking) => {
        const matchesSearch =
            searchTerm === "" ||
            booking.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.bookingId
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            booking.carDetails.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" || booking.status === statusFilter;

        const isUpcoming = [
            "Pending",
            "Confirmed",
            "Assigned",
            "En Route",
            "In Progress",
            "Completion Pending",
        ].includes(booking.status);
        const matchesTab = activeTab === "upcoming" ? isUpcoming : !isUpcoming;

        return matchesSearch && matchesStatus && matchesTab;
    });

    const stats = {
        total: localBookings.length,
        upcoming: localBookings.filter((b) =>
            [
                "Pending",
                "Confirmed",
                "Assigned",
                "En Route",
                "In Progress",
                "Completion Pending",
            ].includes(b.status)
        ).length,
        completed: localBookings.filter((b) => b.status === "Completed").length,
        totalSpent: localBookings
            .filter((b) => b.status !== "Cancelled")
            .reduce((sum, b) => sum + b.amount, 0),
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="container px-4 md:px-8 py-6">
                <div className="gap-6">
                    {/* Main Content */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search bookings..."
                            className="pl-9 w-64 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="lg:col-span-3 space-y-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                <CardContent className="p-4">
                                    <div className="text-sm font-medium text-blue-600 mb-1">
                                        Total Bookings
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {stats.total}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        All time
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                                <CardContent className="p-4">
                                    <div className="text-sm font-medium text-amber-600 mb-1">
                                        Upcoming
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {stats.upcoming}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Awaiting service
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                                <CardContent className="p-4">
                                    <div className="text-sm font-medium text-emerald-600 mb-1">
                                        Completed
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {stats.completed}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Served & happy
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                <CardContent className="p-4">
                                    <div className="text-sm font-medium text-purple-600 mb-1">
                                        Total Spent
                                    </div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        RM {stats.totalSpent.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        On car care
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Main Card */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-gray-900">
                                            Booking History
                                        </CardTitle>
                                        <CardDescription>
                                            View and manage your past and
                                            upcoming bookings
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Filter className="mr-2 h-4 w-4" />
                                                    Filter
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuLabel>
                                                    Status
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setStatusFilter("all")
                                                    }
                                                >
                                                    All Statuses
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setStatusFilter(
                                                            "Confirmed"
                                                        )
                                                    }
                                                >
                                                    Confirmed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setStatusFilter(
                                                            "Completed"
                                                        )
                                                    }
                                                >
                                                    Completed
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setStatusFilter(
                                                            "Cancelled"
                                                        )
                                                    }
                                                >
                                                    Cancelled
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button variant="outline" size="sm">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <Tabs
                                    defaultValue="upcoming"
                                    className="w-full"
                                    onValueChange={setActiveTab}
                                >
                                    <TabsList className="grid w-full md:w-auto grid-cols-2">
                                        <TabsTrigger
                                            value="upcoming"
                                            className="flex items-center gap-2"
                                        >
                                            <Clock className="h-4 w-4" />
                                            Upcoming ({stats.upcoming})
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="past"
                                            className="flex items-center gap-2"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Past (
                                            {localBookings.length -
                                                stats.upcoming}
                                            )
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="mt-6">
                                        {loading ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3].map((i) => (
                                                    <Skeleton
                                                        key={i}
                                                        className="h-40 w-full rounded-2xl"
                                                    />
                                                ))}
                                            </div>
                                        ) : filteredBookings.length === 0 ? (
                                            <Card className="border-dashed">
                                                <CardContent className="p-12 text-center">
                                                    <Car className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                                        No bookings found
                                                    </h3>
                                                    <p className="text-gray-500 mb-4">
                                                        {searchTerm
                                                            ? "Try a different search term"
                                                            : "Start by booking your first car wash!"}
                                                    </p>
                                                    <Button
                                                        onClick={handleBookNow}
                                                    >
                                                        <Car className="mr-2 h-4 w-4" />
                                                        Book Now
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Render content based on filtered results */}
                                                <TabsContent
                                                    value="upcoming"
                                                    className="mt-0 space-y-4"
                                                >
                                                    {filteredBookings.map(
                                                        (booking) => (
                                                            <BookingCard
                                                                key={booking.id}
                                                                booking={
                                                                    booking
                                                                }
                                                                getStatusColor={
                                                                    getStatusColor
                                                                }
                                                                getServiceTypeColor={
                                                                    getServiceTypeColor
                                                                }
                                                                onCancelBooking={
                                                                    handleCancelBooking
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </TabsContent>
                                                <TabsContent
                                                    value="past"
                                                    className="mt-0 space-y-4"
                                                >
                                                    {filteredBookings.map(
                                                        (booking) => (
                                                            <BookingCard
                                                                key={booking.id}
                                                                booking={
                                                                    booking
                                                                }
                                                                getStatusColor={
                                                                    getStatusColor
                                                                }
                                                                getServiceTypeColor={
                                                                    getServiceTypeColor
                                                                }
                                                                onCancelBooking={
                                                                    handleCancelBooking
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </TabsContent>
                                            </div>
                                        )}
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Booking Card Component
function BookingCard({
    booking,
    getStatusColor,
    getServiceTypeColor,
    onCancelBooking,
}: {
    booking: Booking;
    getStatusColor: (status: Booking["status"]) => any;
    getServiceTypeColor: (type?: string) => any;
    onCancelBooking: (id: string) => void;
}) {
    const statusColors = getStatusColor(booking.status);
    const serviceTypeColors = getServiceTypeColor(booking.serviceType);
    const StatusIcon = statusColors.icon;

    return (
        <Card
            className={`overflow-hidden ${serviceTypeColors.border} border-l-4 hover:shadow-md transition-all`}
        >
            <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge
                                        variant="outline"
                                        className={`${serviceTypeColors.bg} ${serviceTypeColors.text} border-transparent`}
                                    >
                                        {booking.serviceType?.toUpperCase() ||
                                            "BASIC"}
                                    </Badge>
                                    <span className="text-sm font-mono text-gray-400">
                                        #{booking.bookingId}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {booking.service}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {booking.carDetails}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Badge
                                    className={`${statusColors.bg} ${statusColors.text} gap-1.5 hover:bg-opacity-80`}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {booking.status}
                                </Badge>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            Reschedule
                                        </DropdownMenuItem>
                                        {booking.status !== "Completed" &&
                                            booking.status !== "Cancelled" && (
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() =>
                                                        onCancelBooking(
                                                            booking.id
                                                        )
                                                    }
                                                >
                                                    Cancel Booking
                                                </DropdownMenuItem>
                                            )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Date & Time
                                    </p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {booking.date}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {booking.timeSlot}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <MapPin className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Location
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                        {booking.address}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Car className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Vehicle
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                        {booking.carDetails}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Payment
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-bold text-gray-900">
                                            RM {booking.amount}
                                        </p>
                                        <Badge
                                            variant={
                                                booking.paymentStatus === "Paid"
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className="text-xs"
                                        >
                                            {booking.paymentStatus || "Pending"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {booking.status === "Issue/Delayed" && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <p className="text-sm font-medium text-red-700">
                                Service Delay - Our team will contact you
                                shortly
                            </p>
                        </div>
                    </div>
                )}

                {["Confirmed", "Assigned", "En Route"].includes(
                    booking.status
                ) && (
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <Button variant="outline" size="sm">
                            <Clock className="mr-2 h-4 w-4" />
                            Track Service
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onCancelBooking(booking.id)}
                        >
                            Cancel Booking
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
