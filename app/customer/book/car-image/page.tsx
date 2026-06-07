"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, Sparkles, X } from "lucide-react";
import supabase from "@/lib/supabase";
import { uploadPublicImage } from "@/lib/storage";
import { useUser } from "@/hooks/user-provider";

type DirtLevel = "Clean" | "Moderate" | "Very Dirty";
const AI_SESSION_KEY = "booking:ai-analysis";

export default function CarImagePage() {
  const router = useRouter();
  const { userId } = useUser();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<{ dirtLevel: DirtLevel; imageUrl: string } | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      const cached = sessionStorage.getItem(AI_SESSION_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.imageUrl && parsed.dirtLevel) {
            setAnalysisResult({ dirtLevel: parsed.dirtLevel, imageUrl: parsed.imageUrl });
            setSelectedImage(parsed.imageUrl);
          }
        } catch { /* ignore */ }
        setLoadingDraft(false);
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("booking_drafts")
        .select("ai_image_url, ai_dirt_level")
        .eq("user_id", auth.user.id)
        .single();

      if (data?.ai_image_url && data?.ai_dirt_level) {
        setSelectedImage(data.ai_image_url);
        setAnalysisResult({ dirtLevel: data.ai_dirt_level as DirtLevel, imageUrl: data.ai_image_url });
        sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify({ imageUrl: data.ai_image_url, dirtLevel: data.ai_dirt_level }));
      }
      setLoadingDraft(false);
    };
    loadDraft();
  }, [router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setSelectedImage(URL.createObjectURL(file));
    setAnalysisResult(null);
    setUploadError("");
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setUploadError("");

    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const aiRes = await fetch("/api/analyze-car", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: selectedFile.type }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      const { dirtLevel } = await aiRes.json() as { dirtLevel: DirtLevel };

      const publicUrl = await uploadPublicImage("car-images", selectedFile, "ai-analysis");

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("booking_drafts").upsert({
          user_id: auth.user.id,
          ai_image_url: publicUrl,
          ai_dirt_level: dirtLevel,
          updated_at: new Date().toISOString(),
        });
      }

      sessionStorage.setItem(AI_SESSION_KEY, JSON.stringify({ imageUrl: publicUrl, dirtLevel }));
      setAnalysisResult({ dirtLevel, imageUrl: publicUrl });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    if (selectedImage?.startsWith("blob:")) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setSelectedFile(null);
    setAnalysisResult(null);
    sessionStorage.removeItem(AI_SESSION_KEY);
  };

  const handleUseRecommendation = () => {
    router.push("/customer/book/service");
  };

  const handleSkip = () => {
    router.push("/customer/book/service");
  };

  if (loadingDraft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto">
        <button onClick={() => router.push("/customer/book")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /><span>Back</span>
        </button>
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">AI Car Analysis</h1>
              <p className="text-gray-500">Step 2: Analysis for smart recommendation</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 mb-8">
            <h3 className="text-purple-900 font-bold mb-2">How it works</h3>
            <ul className="space-y-2 text-sm text-purple-700">
              <li className="flex items-start gap-2"><span>•</span><span>Upload a clear photo of your vehicle&apos;s exterior.</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>Our AI detects the dirt level.</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>Get a personalized package recommendation instantly.</span></li>
            </ul>
          </div>

          {/* State 3: Analysis result */}
          {analysisResult ? (
            <div className="mb-8">
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl mb-6">
                <img src={analysisResult.imageUrl} alt="Analyzed car" className="w-full h-56 object-cover" />
              </div>

              <div className={`rounded-2xl border-2 p-5 mb-6 ${
                analysisResult.dirtLevel === "Clean" ? "bg-green-50 border-green-200"
                : analysisResult.dirtLevel === "Moderate" ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
              }`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Analysis Result</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-3xl font-extrabold ${
                    analysisResult.dirtLevel === "Clean" ? "text-green-600"
                    : analysisResult.dirtLevel === "Moderate" ? "text-yellow-600"
                    : "text-red-600"
                  }`}>
                    {analysisResult.dirtLevel}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    analysisResult.dirtLevel === "Clean" ? "bg-green-100 text-green-700"
                    : analysisResult.dirtLevel === "Moderate" ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                  }`}>
                    {analysisResult.dirtLevel === "Clean" ? "Minimal dust detected"
                    : analysisResult.dirtLevel === "Moderate" ? "Noticeable dirt or grime"
                    : "Heavy mud or thick stains"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {analysisResult.dirtLevel === "Clean"
                    ? "Your car looks well-maintained. A basic wash should be sufficient."
                    : analysisResult.dirtLevel === "Moderate"
                    ? "Your car has visible dirt. A standard wash is recommended."
                    : "Your car needs a thorough cleaning. A premium wash package is recommended."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUseRecommendation}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Use Recommendation
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="w-full bg-white text-gray-700 py-3.5 rounded-2xl font-semibold hover:bg-gray-50 transition-all border border-gray-200"
                >
                  Re-analyze
                </button>
              </div>
            </div>
          ) : !selectedImage ? (
            /* State 1: Upload prompt */
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-6 md:p-12 text-center mb-8 hover:border-blue-400 hover:bg-gray-50/30 transition-all group">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Camera className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-bold text-gray-800 mb-1">Click to Upload Image</p>
                <p className="text-sm text-gray-500">Supports: JPG, PNG (Max 10MB)</p>
              </label>
            </div>
          ) : (
            /* State 2: Image selected, ready to analyze */
            <div className="mb-8">
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-xl group">
                <img src={selectedImage} alt="Car preview" className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full p-2 shadow-lg hover:bg-red-500 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || loadingDraft}
                className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-gray-100 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI is analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Analyze Car with AI</span>
                  </>
                )}
              </button>
              {uploadError && (
                <p className="mt-4 text-sm text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">{uploadError}</p>
              )}
            </div>
          )}

          {!analysisResult && (
            <button
              onClick={handleSkip}
              disabled={analyzing}
              className="w-full bg-gray-50 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
            >
              Skip AI &amp; Choose Package Manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
