"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Trash2 } from "lucide-react";
import supabase from "@/lib/supabase";
import { carTypes } from "@/lib/bookingOptions";

interface SavedCar {
  id: string;
  carBrand: string;
  carModel: string;
  carType: string;
  plateNumber: string;
  carColor: string;
}

export default function CarDetailsPage() {
  const router = useRouter();

  const [carDetails, setCarDetails] = useState({
    carBrand: "",
    carModel: "",
    carType: "",
    plateNumber: "",
    carColor: "",
  });
  const [savedCars, setSavedCars] = useState<SavedCar[]>([]);
  const [saveCar, setSaveCar] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const cached = sessionStorage.getItem("booking:car-details");
      if (cached) setCarDetails(JSON.parse(cached));

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const { data: carsData } = await supabase
        .from("saved_cars")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (carsData) {
        setSavedCars(carsData.map((c: any) => ({
          id: c.id,
          carBrand: c.car_brand,
          carModel: c.car_model,
          carType: c.car_type,
          plateNumber: c.plate_number,
          carColor: c.car_color || "",
        })));
      }

      if (!cached) {
        const { data: draft } = await supabase
          .from("booking_drafts")
          .select("car_brand, car_model, car_type, plate_number, car_color")
          .eq("user_id", auth.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draft) {
          setCarDetails({
            carBrand: draft.car_brand || "",
            carModel: draft.car_model || "",
            carType: draft.car_type || "",
            plateNumber: draft.plate_number || "",
            carColor: draft.car_color || "",
          });
        }
      }

      setLoading(false);
    };
    load();
  }, [router]);

  const handleChange = (field: string, value: string) => {
    setCarDetails((prev) => {
      const updated = { ...prev, [field]: value };
      sessionStorage.setItem("booking:car-details", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectSavedCar = (car: SavedCar) => {
    const updated = {
      carBrand: car.carBrand,
      carModel: car.carModel,
      carType: car.carType,
      plateNumber: car.plateNumber,
      carColor: car.carColor,
    };
    setCarDetails(updated);
    sessionStorage.setItem("booking:car-details", JSON.stringify(updated));
  };

  const handleDeleteSavedCar = async (carId: string) => {
    setDeletingCarId(carId);
    await supabase.from("saved_cars").delete().eq("id", carId);
    setSavedCars((prev) => prev.filter((c) => c.id !== carId));
    setDeletingCarId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("booking_drafts").upsert({
        user_id: auth.user.id,
        car_brand: carDetails.carBrand,
        car_model: carDetails.carModel,
        car_type: carDetails.carType,
        plate_number: carDetails.plateNumber,
        car_color: carDetails.carColor,
        updated_at: new Date().toISOString(),
      });

      if (saveCar) {
        const alreadySaved = savedCars.some(
          (c) => c.plateNumber.toUpperCase() === carDetails.plateNumber.toUpperCase()
        );
        if (!alreadySaved) {
          const { data: newCar } = await supabase
            .from("saved_cars")
            .insert({
              user_id: auth.user.id,
              car_brand: carDetails.carBrand,
              car_model: carDetails.carModel,
              car_type: carDetails.carType,
              plate_number: carDetails.plateNumber,
              car_color: carDetails.carColor,
            })
            .select()
            .single();
          if (newCar) {
            setSavedCars((prev) => [{
              id: newCar.id,
              carBrand: newCar.car_brand,
              carModel: newCar.car_model,
              carType: newCar.car_type,
              plateNumber: newCar.plate_number,
              carColor: newCar.car_color || "",
            }, ...prev]);
          }
        }
      }
    }
    router.push("/customer/book/car-image");
  };

  const handleClearDraft = async () => {
    sessionStorage.removeItem("booking:car-details");
    setCarDetails({ carBrand: "", carModel: "", carType: "", plateNumber: "", carColor: "" });
    setSaveCar(false);
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("booking_drafts").delete().eq("user_id", auth.user.id);
    }
  };

  const isValid = carDetails.carBrand && carDetails.carModel && carDetails.carType && carDetails.plateNumber;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {savedCars.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">My Saved Cars</p>
            <div className="space-y-2">
              {savedCars.map((car) => (
                <div key={car.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSelectSavedCar(car)}
                    className="flex-1 flex items-start gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <Car className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{car.carBrand} {car.carModel}</p>
                      <p className="text-xs text-gray-500">{car.plateNumber} · {car.carType}{car.carColor ? ` · ${car.carColor}` : ""}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedCar(car.id)}
                    disabled={deletingCarId === car.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Car className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Car Details</h1>
              <p className="text-gray-500">Tell us about your vehicle</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Car Brand *</label>
                <input
                  type="text"
                  value={carDetails.carBrand}
                  onChange={(e) => handleChange("carBrand", e.target.value)}
                  placeholder="Toyota"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Car Model *</label>
                <input
                  type="text"
                  value={carDetails.carModel}
                  onChange={(e) => handleChange("carModel", e.target.value)}
                  placeholder="Camry"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Car Type *</label>
              <select
                value={carDetails.carType}
                onChange={(e) => handleChange("carType", e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none"
              >
                <option value="">Select car type</option>
                {carTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">License Plate Number *</label>
              <input
                type="text"
                value={carDetails.plateNumber}
                onChange={(e) => handleChange("plateNumber", e.target.value.toUpperCase())}
                placeholder="WXY 2003"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Car Color <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={carDetails.carColor}
                onChange={(e) => handleChange("carColor", e.target.value)}
                placeholder="White"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="saveCar"
                checked={saveCar}
                onChange={(e) => setSaveCar(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="saveCar" className="text-sm text-gray-600 cursor-pointer select-none">
                Save this car for future bookings
              </label>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={!isValid}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg shadow-gray-100"
              >
                Next: Select Service
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                className="w-full text-gray-500 py-3 font-medium hover:text-gray-700 transition-colors"
              >
                Clear form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
