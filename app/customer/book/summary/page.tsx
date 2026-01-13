"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Car,
    Wrench,
    MapPin,
    Calendar,
    Clock,
    DollarSign,
    Edit,
    Truck,
    X,
} from "lucide-react";
import {
    services,
    carTypes,
    timeSlots,
    KVALLEY_AREAS,
    KVALLEY_AREA_OPTIONS,
    getTravelFee,
} from "@/lib/bookingOptions";
import supabase from "@/lib/supabase";

interface BookingData {
    carDetails: {
        carBrand: string;
        carModel: string;
        carType: string;
        plateNumber: string;
        carColor: string;
    };
    service: {
        id: string;
        name: string;
        description: string;
        duration: string;
        price: number;
        features: string[];
    } | null;
    location: {
        address: string;
        date: string;
        timeSlot: string;
        travelFee: number;
        selectedArea: string;
    };
}

const parseDraftAddress = (address: string) => {
    if (!address) return { selectedArea: "", detailedAddress: "" };
    const matched = KVALLEY_AREA_OPTIONS.find((a) =>
        address.endsWith(`, ${a.name}`)
    );
    if (matched) {
        return {
            selectedArea: matched.name,
            detailedAddress: address.slice(0, -(matched.name.length + 2)),
        };
    }
    return { selectedArea: "", detailedAddress: address };
};

export default function BookingSummaryPage() {
    const router = useRouter();

    const [draft, setDraft] = useState<BookingData | null>(null);
    const [editing, setEditing] = useState({
        car: false,
        service: false,
        location: false,
    });
    const [detailedAddress, setDetailedAddress] = useState("");
    const [loading, setLoading] = useState(true);

    /* ================= LOAD DRAFT ================= */
    useEffect(() => {
        const carRaw = sessionStorage.getItem("booking:car-details");
        const serviceRaw = sessionStorage.getItem("booking:service");
        const locationRaw = sessionStorage.getItem("booking:location");

        if (!carRaw) {
            router.push("/customer/book/car-details");
            return;
        }

        const carDetails = JSON.parse(carRaw);

        const service = serviceRaw
            ? {
                  ...JSON.parse(serviceRaw),
                  description:
                      services.find((s) => s.id === JSON.parse(serviceRaw).id)
                          ?.description ?? "",
                  duration:
                      services.find((s) => s.id === JSON.parse(serviceRaw).id)
                          ?.duration ?? "",
                  features:
                      services.find((s) => s.id === JSON.parse(serviceRaw).id)
                          ?.features ?? [],
              }
            : null;

        const location = locationRaw
            ? JSON.parse(locationRaw)
            : {
                  address: "",
                  date: "",
                  timeSlot: "",
                  travelFee: 0,
                  selectedArea: "",
              };

        setDraft({
            carDetails,
            service,
            location,
        });

        setDetailedAddress(location.address ?? "");
        setLoading(false);
    }, [router]);

    if (loading || !draft) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading...
            </div>
        );
    }

    const travelFee = draft.location.travelFee ?? 0;
    const servicePrice = draft.service?.price ?? 0;
    const totalAmount = servicePrice + travelFee;

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

    const isEditing = editing.car || editing.service || editing.location;

    /* ================= SAVE HANDLERS ================= */
    const saveCar = async () => {
        if (!draft) return;

        await supabase
            .from("booking_drafts")
            .update({
                car_brand: draft.carDetails.carBrand,
                car_model: draft.carDetails.carModel,
                car_type: draft.carDetails.carType,
                plate_number: draft.carDetails.plateNumber,
                car_color: draft.carDetails.carColor,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

        setEditing((p) => ({ ...p, car: false }));
    };

    const saveService = async () => {
        if (!draft?.service) return;

        await supabase
            .from("booking_drafts")
            .update({
                service_id: draft.service.id,
                service_name: draft.service.name,
                service_price: draft.service.price,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

        setEditing((p) => ({ ...p, service: false }));
    };

    const saveLocation = async () => {
        if (!draft) return;

        const combined =
            `${detailedAddress}, ${draft.location.selectedArea}`.trim();

        await supabase
            .from("booking_drafts")
            .update({
                service_address: combined,
                scheduled_date: draft.location.date,
                time_slot: draft.location.timeSlot,
                travel_fee: draft.location.travelFee,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

        setDraft((p) =>
            p
                ? {
                      ...p,
                      location: { ...p.location, address: combined },
                  }
                : p
        );

        setEditing((p) => ({ ...p, location: false }));
    };

    /* ================= UI ================= */
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-8 border">
                    <h1 className="text-2xl font-bold">Booking Summary</h1>
                    <p className="text-gray-500">
                        Step 5: Final review before payment
                    </p>
                </div>

                {/* VEHICLE */}
                <Section
                    title="Vehicle Information"
                    icon={<Car className="w-6 h-6" />}
                    onEdit={() => setEditing((p) => ({ ...p, car: true }))}
                >
                    <InfoGrid
                        items={[
                            ["Brand", draft.carDetails.carBrand],
                            ["Model", draft.carDetails.carModel],
                            ["Type", draft.carDetails.carType],
                            ["Plate", draft.carDetails.plateNumber],
                            ["Color", draft.carDetails.carColor || "-"],
                        ]}
                    />
                </Section>

                {/* SERVICE */}
                <Section
                    title="Selected Service"
                    icon={<Wrench className="w-6 h-6" />}
                    onEdit={() => setEditing((p) => ({ ...p, service: true }))}
                >
                    <div className="flex justify-between">
                        <p className="font-bold">
                            {draft.service?.name ?? "Service not selected"}
                        </p>
                        <p className="font-black text-blue-600">
                            RM {draft.service?.price ?? 0}
                        </p>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                        {draft.service?.description ??
                            "Please select a service to continue"}
                    </p>
                </Section>

                {/* LOCATION */}
                <Section
                    title="Location & Time"
                    icon={<MapPin className="w-6 h-6" />}
                    onEdit={() => setEditing((p) => ({ ...p, location: true }))}
                >
                    <p>{draft.location.address}</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <p>
                            <Calendar className="inline w-4 h-4 mr-1" />
                            {formatDate(draft.location.date)}
                        </p>
                        <p>
                            <Clock className="inline w-4 h-4 mr-1" />
                            {draft.location.timeSlot}
                        </p>
                    </div>
                    <p className="mt-2">
                        <Truck className="inline w-4 h-4 mr-1" /> RM {travelFee}
                    </p>
                </Section>

                {/* TOTAL */}
                <div className="bg-white rounded-3xl p-6 border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6" />
                        <h3 className="font-bold">Total Amount</h3>
                    </div>
                    <div className="text-2xl font-black">RM {totalAmount}</div>
                </div>

                <button
                    onClick={() => router.push("/customer/book/confirmation")}
                    disabled={isEditing}
                    className="w-full bg-green-600 text-white py-5 rounded-2xl font-black hover:bg-green-700 disabled:bg-gray-200"
                >
                    Confirm & Continue
                </button>
            </div>

            {/* MODALS */}
            {editing.car && (
                <Modal
                    title="Edit Vehicle"
                    onClose={() => setEditing((p) => ({ ...p, car: false }))}
                >
                    <input
                        value={draft.carDetails.carBrand}
                        onChange={(e) =>
                            setDraft((p) =>
                                p
                                    ? {
                                          ...p,
                                          carDetails: {
                                              ...p.carDetails,
                                              carBrand: e.target.value,
                                          },
                                      }
                                    : p
                            )
                        }
                        className="input"
                    />
                    <button onClick={saveCar} className="btn-primary">
                        Save
                    </button>
                </Modal>
            )}

            {editing.service && (
                <Modal
                    title="Edit Service"
                    onClose={() =>
                        setEditing((p) => ({ ...p, service: false }))
                    }
                >
                    <select
                        value={draft.service?.id ?? ""}
                        onChange={(e) => {
                            const next = services.find(
                                (s) => s.id === e.target.value
                            );

                            if (!next) return;

                            setDraft((p) => (p ? { ...p, service: next } : p));
                        }}
                        className="input"
                    >
                        <option value="" disabled>
                            Select a service
                        </option>

                        {services.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} - RM {s.price}
                            </option>
                        ))}
                    </select>

                    <button onClick={saveService} className="btn-primary">
                        Save
                    </button>
                </Modal>
            )}

            {editing.location && (
                <Modal
                    title="Edit Location"
                    onClose={() =>
                        setEditing((p) => ({ ...p, location: false }))
                    }
                >
                    <textarea
                        value={detailedAddress}
                        onChange={(e) => setDetailedAddress(e.target.value)}
                        className="input"
                    />
                    <button onClick={saveLocation} className="btn-primary">
                        Save
                    </button>
                </Modal>
            )}
        </div>
    );
}

/* ================= HELPERS ================= */

function Section({
    title,
    icon,
    onEdit,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-3xl p-6 border">
            <div className="flex justify-between mb-4">
                <div className="flex items-center gap-3 text-blue-600">
                    {icon}
                    <h3 className="font-bold">{title}</h3>
                </div>
                <button
                    onClick={onEdit}
                    className="text-sm text-blue-600 font-bold"
                >
                    <Edit className="inline w-4 h-4 mr-1" />
                    Edit
                </button>
            </div>
            {children}
        </div>
    );
}

function InfoGrid({ items }: { items: [string, string][] }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {items.map(([k, v]) => (
                <div key={k}>
                    <p className="text-xs uppercase text-gray-400">{k}</p>
                    <p className="font-medium">{v}</p>
                </div>
            ))}
        </div>
    );
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full">
                <div className="flex justify-between mb-4">
                    <h2 className="font-bold text-lg">{title}</h2>
                    <button onClick={onClose}>
                        <X />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
