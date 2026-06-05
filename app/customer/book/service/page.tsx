"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Clock, Sparkles, Star } from "lucide-react";
import { services } from "@/lib/bookingOptions";
import supabase from "@/lib/supabase";

type DirtLevel = "Clean" | "Moderate" | "Very Dirty";

interface Service {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: number;
    features: string[];
}

export default function ServiceSelectionPage() {
    const router = useRouter();

    const [selectedService, setSelectedService] = useState<Service | null>(
        null
    );
    const [aiAnalysis, setAiAnalysis] = useState<{
        dirtLevel: DirtLevel;
        imageUrl: string;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const SERVICE_SESSION_KEY = "booking:service";

    /* ================= LOAD DRAFT ================= */
    useEffect(() => {
        const loadDraft = async () => {
            /* 1️⃣ LOAD AI ANALYSIS (IMAGE + DIRT LEVEL) */
            const aiCached = sessionStorage.getItem("booking:ai-analysis");
            if (aiCached) {
                setAiAnalysis(JSON.parse(aiCached));
            }

            /* 2️⃣ LOAD SELECTED SERVICE (IF ANY) */
            const serviceCached = sessionStorage.getItem(SERVICE_SESSION_KEY);
            if (serviceCached) {
                const parsed = JSON.parse(serviceCached);
                const found = services.find((s) => s.id === parsed.id);
                if (found) setSelectedService(found);
            }

            setLoading(false);
        };

        loadDraft();
    }, []);

    /* ================= HELPERS ================= */
    const getRecommendedServiceId = () => {
        if (!aiAnalysis) return null;
        switch (aiAnalysis.dirtLevel) {
            case "Clean":
                return "basic";
            case "Moderate":
                return "premium";
            case "Very Dirty":
                return "full";
            default:
                return null;
        }
    };

    const recommendedServiceId = getRecommendedServiceId();

    /* ================= ACTION ================= */
    const handleContinue = async () => {
        if (!selectedService) return;

        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        await supabase.from("booking_drafts").upsert({
            user_id: auth.user.id,
            service_id: selectedService.id,
            service_name: selectedService.name,
            service_price: selectedService.price,
            updated_at: new Date().toISOString(),
        });

        router.push("/customer/book/location");
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => router.push("/customer/book/car-image")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4">
                    <ChevronLeft className="w-4 h-4" /><span>Back</span>
                </button>
                {/* HEADER */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Select Service</h1>
                    <p className="text-gray-500">
                        Step 3: Choose the best care for your vehicle
                    </p>
                </div>

                {/* AI RECOMMENDATION */}
                {aiAnalysis && (
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-3xl shadow-lg p-6 mb-8 text-white flex flex-col md:flex-row items-center gap-6">
                        <img
                            src={aiAnalysis.imageUrl}
                            alt="AI Analysis"
                            className="w-32 h-32 rounded-2xl object-cover border-4 border-white/20"
                        />
                        <div>
                            <h2 className="text-xl font-bold mb-1">
                                AI Recommendation
                            </h2>
                            <p className="text-purple-100 mb-2">
                                Detected{" "}
                                <span className="font-bold underline">
                                    {aiAnalysis.dirtLevel}
                                </span>{" "}
                                dirt level
                            </p>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                AI Analysis Complete
                            </span>
                        </div>
                    </div>
                )}

                {/* SERVICES */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {services.map((service) => {
                        const isSelected = selectedService?.id === service.id;
                        const isRecommended =
                            recommendedServiceId === service.id;

                        return (
                            <div
                                key={service.id}
                                onClick={() => {
                                    setSelectedService(service);

                                    sessionStorage.setItem(
                                        SERVICE_SESSION_KEY,
                                        JSON.stringify({
                                            id: service.id,
                                            name: service.name,
                                            price: service.price,
                                            aiAnalysis,
                                        })
                                    );
                                }}
                                className={`bg-white rounded-3xl p-6 cursor-pointer border-2 transition-all relative
                  ${
                      isSelected
                          ? "border-blue-500 ring-4 ring-blue-50"
                          : isRecommended
                          ? "border-purple-300 shadow-md"
                          : "border-gray-100 hover:border-gray-300"
                  }`}
                            >
                                {isRecommended && (
                                    <div className="absolute -top-3 right-6 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-white" />
                                        Recommended
                                    </div>
                                )}

                                <div className="flex justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold">
                                            {service.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {service.description}
                                        </p>
                                    </div>
                                    <div
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            isSelected
                                                ? "bg-gray-800 border-blue-500"
                                                : "border-gray-200"
                                        }`}
                                    >
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 mb-6">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <Clock className="w-4 h-4" />
                                        {service.duration}
                                    </div>
                                    <div className="text-gray-900 font-black text-xl">
                                        RM {service.price}
                                    </div>
                                </div>

                                <ul className="space-y-2">
                                    {service.features.map((f, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2 text-sm text-gray-600"
                                        >
                                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase">
                            Selected Service
                        </p>
                        <p className="text-lg font-bold">
                            {selectedService?.name ?? "None selected"}
                        </p>
                    </div>
                    <button
                        onClick={handleContinue}
                        disabled={!selectedService}
                        className="w-full sm:w-auto px-12 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg shadow-gray-100"
                    >
                        Continue: Date & Time
                    </button>
                </div>
            </div>
        </div>
    );
}
