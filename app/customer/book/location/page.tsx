"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Clock, AlertCircle, Truck } from "lucide-react";
import {
    timeSlots,
    KVALLEY_AREAS,
    KVALLEY_AREA_OPTIONS,
    getTravelFee,
} from "@/lib/bookingOptions";
import supabase from "@/lib/supabase";

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

    const fallback = KVALLEY_AREA_OPTIONS.find((a) => address.includes(a.name));

    return {
        selectedArea: fallback?.name || "",
        detailedAddress: address,
    };
};

export default function LocationDatePage() {
    const router = useRouter();

    const [data, setData] = useState({
        selectedArea: "",
        detailedAddress: "",
        date: "",
        timeSlot: "",
        travelFee: 0,
    });

    const [loading, setLoading] = useState(true);
    const [isLocationValid, setIsLocationValid] = useState<boolean | null>(
        null
    );
    const [validationMessage, setValidationMessage] = useState("");
    const LOCATION_SESSION_KEY = "booking:location";

    /* ================= LOAD DRAFT ================= */
    useEffect(() => {
        const loadDraft = async () => {
            /* 1️⃣ sessionStorage first */
            const cached = sessionStorage.getItem(LOCATION_SESSION_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                setData(parsed);
                setLoading(false);
                return;
            }

            /* 2️⃣ Supabase fallback */
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) {
                router.push("/login");
                return;
            }

            const { data: draft } = await supabase
                .from("booking_drafts")
                .select(
                    "service_address, scheduled_date, time_slot, travel_fee"
                )
                .eq("user_id", auth.user.id)
                .single();

            if (draft) {
                const parsed = parseDraftAddress(draft.service_address || "");
                setData({
                    selectedArea: parsed.selectedArea,
                    detailedAddress: parsed.detailedAddress,
                    date: draft.scheduled_date || "",
                    timeSlot: draft.time_slot || "",
                    travelFee:
                        typeof draft.travel_fee === "number"
                            ? draft.travel_fee
                            : getTravelFee(parsed.selectedArea),
                });
            }

            setLoading(false);
        };

        loadDraft();
    }, [router]);

    /* ================= EFFECTS ================= */
    useEffect(() => {
        if (data.selectedArea) {
            setIsLocationValid(true);
            setValidationMessage("");
        } else {
            setIsLocationValid(null);
            setValidationMessage("");
        }
    }, [data.selectedArea]);

    useEffect(() => {
        setData((prev) => ({
            ...prev,
            travelFee: getTravelFee(prev.selectedArea),
        }));
    }, [data.selectedArea]);

    /* ================= HANDLERS ================= */
    const handleChange = (field: string, value: string) => {
        setData((prev) => {
            const updated = { ...prev, [field]: value };

            if (field === "selectedArea") {
                updated.travelFee = getTravelFee(value);
            }

            sessionStorage.setItem(
                LOCATION_SESSION_KEY,
                JSON.stringify(updated)
            );

            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        const combinedAddress =
            `${data.detailedAddress}, ${data.selectedArea}`.trim();

        await supabase.from("booking_drafts").upsert({
            user_id: auth.user.id,
            service_address: combinedAddress,
            scheduled_date: data.date,
            time_slot: data.timeSlot,
            travel_fee: data.travelFee,
            updated_at: new Date().toISOString(),
        });

        router.push("/customer/book/summary");
    };

    const isValid =
        data.selectedArea &&
        data.detailedAddress.trim() &&
        data.date &&
        data.timeSlot &&
        isLocationValid === true;

    const today = new Date().toISOString().split("T")[0];

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading...
            </div>
        );
    }

    /* ================= UI ================= */
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-lg border p-8">
                <h1 className="text-2xl font-bold mb-1">Location & Date</h1>
                <p className="text-gray-500 mb-6">
                    Step 4: Where and when should we detail your ride?
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* AREA */}
                    <div>
                        <label className="flex items-center gap-2 mb-3 text-sm font-bold uppercase text-gray-700">
                            <MapPin className="w-4 h-4" /> Service Area
                        </label>
                        <select
                            value={data.selectedArea}
                            onChange={(e) =>
                                handleChange("selectedArea", e.target.value)
                            }
                            className="w-full px-5 py-4 border-2 rounded-2xl bg-gray-50 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select your city/district</option>
                            {KVALLEY_AREAS.map((zone) => (
                                <optgroup
                                    key={zone.zone}
                                    label={`${zone.zone} (${zone.distanceRange}) - RM ${zone.fee}`}
                                >
                                    {zone.areas.map((area) => (
                                        <option key={area} value={area}>
                                            {area}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* ADDRESS */}
                    <div>
                        <label className="flex items-center gap-2 mb-3 text-sm font-bold uppercase text-gray-700">
                            <MapPin className="w-4 h-4" /> Detailed Address
                        </label>
                        <textarea
                            value={data.detailedAddress}
                            onChange={(e) =>
                                handleChange("detailedAddress", e.target.value)
                            }
                            rows={3}
                            className="w-full px-5 py-4 border-2 rounded-2xl bg-gray-50 focus:border-blue-500 outline-none"
                        />

                        {isLocationValid === false && (
                            <div className="mt-4 flex gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-sm font-medium">
                                    {validationMessage}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* TRAVEL FEE */}
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 font-semibold text-blue-700">
                            <Truck className="w-5 h-5" />
                            Travel Fee
                        </div>
                        <div className="font-bold text-blue-900">
                            {data.selectedArea
                                ? `RM ${data.travelFee}`
                                : "Select an area"}
                        </div>
                    </div>

                    {/* DATE */}
                    <div>
                        <label className="flex items-center gap-2 mb-3 text-sm font-bold uppercase text-gray-700">
                            <Calendar className="w-4 h-4" /> Scheduled Date
                        </label>
                        <input
                            type="date"
                            min={today}
                            value={data.date}
                            onChange={(e) =>
                                handleChange("date", e.target.value)
                            }
                            className="w-full px-5 py-4 border-2 rounded-2xl bg-gray-50 focus:border-blue-500 outline-none"
                        />
                    </div>

                    {/* TIME SLOT */}
                    {data.date && (
                        <div>
                            <label className="flex items-center gap-2 mb-4 text-sm font-bold uppercase text-gray-700">
                                <Clock className="w-4 h-4" /> Time Slot
                            </label>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {timeSlots.map((slot) => (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() =>
                                            handleChange("timeSlot", slot)
                                        }
                                        className={`px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                            data.timeSlot === slot
                                                ? "bg-blue-600 border-blue-600 text-white"
                                                : "bg-gray-50 border-gray-100 text-gray-600 hover:border-blue-200"
                                        }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!isValid}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black hover:bg-blue-700 disabled:bg-gray-200"
                    >
                        Continue
                    </button>
                </form>
            </div>
        </div>
    );
}
