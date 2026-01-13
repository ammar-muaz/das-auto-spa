"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Sparkles, X } from "lucide-react";
import supabase from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/supabaseStorage";

type DirtLevel = "Clean" | "Moderate" | "Very Dirty";

export default function Page() {
    const router = useRouter();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [loadingDraft, setLoadingDraft] = useState(false);
    const AI_SESSION_KEY = "booking:ai-analysis";

    /* ================= LOAD DRAFT ================= */
    useEffect(() => {
        const loadDraft = async () => {
            setLoadingDraft(true);

            /* 1️⃣ sessionStorage */
            const cached = sessionStorage.getItem(AI_SESSION_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                setSelectedImage(parsed.imageUrl);
                setLoadingDraft(false);
                return;
            }

            /* 2️⃣ Supabase fallback */
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) {
                router.push("/login");
                return;
            }

            const { data } = await supabase
                .from("booking_drafts")
                .select("ai_image_url, ai_dirt_level")
                .eq("user_id", auth.user.id)
                .single();

            if (data?.ai_image_url) {
                setSelectedImage(data.ai_image_url);

                sessionStorage.setItem(
                    AI_SESSION_KEY,
                    JSON.stringify({
                        imageUrl: data.ai_image_url,
                        dirtLevel: data.ai_dirt_level,
                    })
                );
            }

            setLoadingDraft(false);
        };

        loadDraft();
    }, [router]);

    /* ================= HANDLERS ================= */
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setSelectedImage(URL.createObjectURL(file));
        setUploadError("");
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setAnalyzing(true);
        setUploadError("");

        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user) return;

            const publicUrl = await uploadPublicImage(
                "car-images",
                selectedFile,
                "ai-analysis"
            );

            const levels: DirtLevel[] = ["Clean", "Moderate", "Very Dirty"];
            const randomLevel =
                levels[Math.floor(Math.random() * levels.length)];

            /* 1️⃣ Save to Supabase */
            await supabase.from("booking_drafts").upsert({
                user_id: auth.user.id,
                ai_image_url: publicUrl,
                ai_dirt_level: randomLevel,
                updated_at: new Date().toISOString(),
            });

            /* 2️⃣ Save to sessionStorage */
            sessionStorage.setItem(
                AI_SESSION_KEY,
                JSON.stringify({
                    imageUrl: publicUrl,
                    dirtLevel: randomLevel,
                })
            );

            router.push("/customer/book/service");
        } catch (err) {
            console.error(err);
            setUploadError("Upload failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRemoveImage = () => {
        if (selectedImage?.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImage);
        }

        sessionStorage.removeItem(AI_SESSION_KEY);

        setSelectedImage(null);
        setSelectedFile(null);
    };

    /* ================= UI ================= */
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-lg border p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI Car Analysis</h1>
                        <p className="text-gray-500">
                            Step 2: Upload car image for smart recommendation
                        </p>
                    </div>
                </div>

                {!selectedImage ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-blue-400 transition">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-10 h-10 text-gray-400" />
                            </div>
                            <p className="text-lg font-bold">
                                Click to Upload Image
                            </p>
                            <p className="text-sm text-gray-500">
                                JPG / PNG (max 10MB)
                            </p>
                        </label>
                    </div>
                ) : (
                    <div className="mb-6">
                        <div className="relative rounded-3xl overflow-hidden border shadow">
                            <img
                                src={selectedImage}
                                alt="Car preview"
                                className="w-full h-72 object-cover"
                            />
                            <button
                                onClick={handleRemoveImage}
                                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow hover:bg-red-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing || loadingDraft}
                            className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {analyzing ? "Analyzing..." : "Analyze Car with AI"}
                        </button>

                        {uploadError && (
                            <p className="mt-4 text-sm text-red-600 text-center">
                                {uploadError}
                            </p>
                        )}
                    </div>
                )}

                <button
                    onClick={() => router.push("/customer/book/service")}
                    disabled={analyzing}
                    className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 border"
                >
                    Skip AI & Choose Package Manually
                </button>
            </div>
        </div>
    );
}
