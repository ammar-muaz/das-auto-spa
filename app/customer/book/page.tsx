"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Car,
    Camera,
    Trash2,
    Check,
    ChevronRight,
    CarFront,
    Shield,
    Palette,
    Type,
} from "lucide-react";
import supabase from "@/lib/supabase";
import { carTypes } from "@/lib/bookingOptions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function CarDetailsPage() {
    const router = useRouter();

    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
        "idle"
    );

    const [carDetails, setCarDetails] = useState({
        carBrand: "",
        carModel: "",
        carType: "",
        plateNumber: "",
        carColor: "",
    });

    /* ✅ Load from SESSION on mount */
    useEffect(() => {
        const raw = sessionStorage.getItem("booking:car-details");
        if (raw) {
            setCarDetails(JSON.parse(raw));
        }
    }, []);

    const handleChange = (field: string, value: string) => {
        setCarDetails((prev) => {
            const updated = { ...prev, [field]: value };

            // ✅ SAVE DIRECTLY INTO SESSION
            sessionStorage.setItem(
                "booking:car-details",
                JSON.stringify(updated)
            );

            return updated;
        });
    };

    /* ✅ OPTIONAL: Background Supabase autosave */
    useEffect(() => {
        const autoSave = async () => {
            if (!carDetails.carBrand || !carDetails.carModel) return;

            const { data } = await supabase.auth.getUser();
            if (!data.user) return;

            setSaveStatus("saving");

            await supabase.from("booking_drafts").upsert({
                user_id: data.user.id,
                car_brand: carDetails.carBrand,
                car_model: carDetails.carModel,
                car_type: carDetails.carType,
                plate_number: carDetails.plateNumber,
                car_color: carDetails.carColor,
                updated_at: new Date().toISOString(),
            });

            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 1500);
        };

        const t = setTimeout(autoSave, 1000);
        return () => clearTimeout(t);
    }, [carDetails]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push("/customer/book/car-image");
    };

    const handleClearDraft = () => {
        sessionStorage.removeItem("booking:car-details");
        setCarDetails({
            carBrand: "",
            carModel: "",
            carType: "",
            plateNumber: "",
            carColor: "",
        });
    };

    const isValid =
        carDetails.carBrand &&
        carDetails.carModel &&
        carDetails.carType &&
        carDetails.plateNumber;

    const completionPercentage =
        ((carDetails.carBrand ? 20 : 0) +
            (carDetails.carModel ? 20 : 0) +
            (carDetails.carType ? 20 : 0) +
            (carDetails.plateNumber ? 20 : 0) +
            (carDetails.carColor ? 20 : 0)) /
        100;

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-50 to-white p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Progress Header */}
                <div className="mb-8 md:mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                                Vehicle Details
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Step 1 of 4 • Car information
                            </p>
                        </div>
                        <Badge variant="outline" className="gap-2">
                            {saveStatus === "saving" ? (
                                <>
                                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    Saving...
                                </>
                            ) : saveStatus === "saved" ? (
                                <>
                                    <Check className="h-3 w-3" />
                                    Draft saved
                                </>
                            ) : (
                                "Auto-save enabled"
                            )}
                        </Badge>
                    </div>
                    <Progress
                        value={completionPercentage * 100}
                        className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Basic info</span>
                        <span className="font-medium">
                            {Math.round(completionPercentage * 100)}% complete
                        </span>
                        <span>Final review</span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-6 md:p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                                        <Car className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Tell us about your vehicle
                                        </h2>
                                        <p className="text-gray-500">
                                            This helps us provide the best
                                            service
                                        </p>
                                    </div>
                                </div>

                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    {/* Brand & Model Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="carBrand"
                                                className="flex items-center gap-2"
                                            >
                                                <CarFront className="w-4 h-4" />
                                                Car Brand *
                                            </Label>
                                            <Input
                                                id="carBrand"
                                                placeholder="e.g., Toyota, BMW, Tesla"
                                                value={carDetails.carBrand}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "carBrand",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            {carDetails.carBrand && (
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Looks good
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label
                                                htmlFor="carModel"
                                                className="flex items-center gap-2"
                                            >
                                                <Type className="w-4 h-4" />
                                                Model *
                                            </Label>
                                            <Input
                                                id="carModel"
                                                placeholder="e.g., Camry, Model 3, X5"
                                                value={carDetails.carModel}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "carModel",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Car Type */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="carType"
                                            className="flex items-center gap-2"
                                        >
                                            <Shield className="w-4 h-4" />
                                            Vehicle Type *
                                        </Label>
                                        <Select
                                            value={carDetails.carType}
                                            onValueChange={(value) =>
                                                handleChange("carType", value)
                                            }
                                        >
                                            <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                                                <SelectValue placeholder="Select your vehicle type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {carTypes.map((type) => (
                                                    <SelectItem
                                                        key={type}
                                                        value={type}
                                                    >
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {carDetails.carType && (
                                            <p className="text-xs text-gray-500">
                                                Selected:{" "}
                                                <span className="font-medium">
                                                    {carDetails.carType}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    {/* License Plate */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="plateNumber"
                                            className="flex items-center gap-2"
                                        >
                                            <Shield className="w-4 h-4" />
                                            License Plate *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="plateNumber"
                                                placeholder="ABC 123"
                                                value={carDetails.plateNumber}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "plateNumber",
                                                        e.target.value.toUpperCase()
                                                    )
                                                }
                                                required
                                                className="h-12 pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 font-mono tracking-wider uppercase"
                                                maxLength={10}
                                            />
                                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                                <div className="w-6 h-4 border border-gray-300 rounded flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-600">
                                                        PL
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Enter your license plate number
                                            exactly as shown on your
                                            registration
                                        </p>
                                    </div>

                                    {/* Car Color */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="carColor"
                                            className="flex items-center gap-2"
                                        >
                                            <Palette className="w-4 h-4" />
                                            Color (Optional)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="carColor"
                                                placeholder="e.g., Midnight Black, Arctic White"
                                                value={carDetails.carColor}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "carColor",
                                                        e.target.value
                                                    )
                                                }
                                                className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            {carDetails.carColor && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <div
                                                        className="w-6 h-6 rounded-full border"
                                                        style={{
                                                            backgroundColor:
                                                                carDetails.carColor
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        "black"
                                                                    )
                                                                    ? "#1a1a1a"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "white"
                                                                          )
                                                                    ? "#ffffff"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "red"
                                                                          )
                                                                    ? "#dc2626"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "blue"
                                                                          )
                                                                    ? "#2563eb"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "gray"
                                                                          )
                                                                    ? "#6b7280"
                                                                    : "#f3f4f6",
                                                            borderColor:
                                                                "#e5e7eb",
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-4 pt-6 border-t">
                                        <Button
                                            type="submit"
                                            disabled={!isValid}
                                            className="w-full h-14 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
                                        >
                                            <span>Continue to Services</span>
                                            <ChevronRight className="ml-2 w-5 h-5" />
                                        </Button>

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                onClick={handleClearDraft}
                                                variant="outline"
                                                className="flex-1 h-11 border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Clear Form
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 h-11 border-gray-200 text-gray-600"
                                            >
                                                Reload Draft
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Preview & Tips */}
                    <div className="space-y-6">
                        {/* Preview Card */}
                        <Card className="border-0 shadow-lg bg-linear-to-br from-blue-50 to-indigo-50">
                            <CardContent className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4">
                                    Vehicle Preview
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Brand & Model
                                        </span>
                                        <span className="font-medium">
                                            {carDetails.carBrand &&
                                            carDetails.carModel
                                                ? `${carDetails.carBrand} ${carDetails.carModel}`
                                                : "Not specified"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Type
                                        </span>
                                        <Badge variant="secondary">
                                            {carDetails.carType ||
                                                "Not selected"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            License Plate
                                        </span>
                                        <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">
                                            {carDetails.plateNumber || "------"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Color
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {carDetails.carColor ? (
                                                <>
                                                    <div
                                                        className="w-4 h-4 rounded-full border"
                                                        style={{
                                                            backgroundColor:
                                                                carDetails.carColor
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        "black"
                                                                    )
                                                                    ? "#1a1a1a"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "white"
                                                                          )
                                                                    ? "#ffffff"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "red"
                                                                          )
                                                                    ? "#dc2626"
                                                                    : carDetails.carColor
                                                                          .toLowerCase()
                                                                          .includes(
                                                                              "blue"
                                                                          )
                                                                    ? "#2563eb"
                                                                    : "#f3f4f6",
                                                        }}
                                                    />
                                                    <span>
                                                        {carDetails.carColor}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">
                                                    Not specified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tips Card */}
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    Why we need this info
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            <strong>Accurate pricing</strong> -
                                            Different vehicles require different
                                            materials and time
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            <strong>Proper equipment</strong> -
                                            We prepare the right tools for your
                                            vehicle type
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-blue-600" />
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            <strong>
                                                Service customization
                                            </strong>{" "}
                                            - Recommendations based on your
                                            vehicle
                                        </span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Next Steps */}
                        <Card className="border-0 shadow-lg bg-linear-to-br from-gray-900 to-gray-800 text-white">
                            <CardContent className="p-6">
                                <h3 className="font-bold mb-3">Next Step</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            Upload Car Photos
                                        </p>
                                        <p className="text-sm text-gray-300 opacity-90">
                                            Help us assess your vehicle's
                                            condition
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
