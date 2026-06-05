"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Wrench, MapPin, Calendar, Clock, DollarSign, Edit, Truck, X, ChevronLeft } from "lucide-react";
import { services, carTypes, timeSlots, KVALLEY_AREAS, KVALLEY_AREA_OPTIONS, getTravelFee } from "@/lib/bookingOptions";
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
  };
  location: {
    address: string;
    date: string;
    timeSlot: string;
    travelFee: number;
    selectedArea: string;
  };
}

const parseSavedAddress = (address: string) => {
  if (!address) return { selectedArea: "" };
  const matched = KVALLEY_AREA_OPTIONS.find((area) => address.endsWith(`, ${area.name}`));
  if (matched) return { selectedArea: matched.name };
  const fallback = KVALLEY_AREA_OPTIONS.find((area) => address.includes(area.name));
  return { selectedArea: fallback?.name || "" };
};

export default function BookingSummaryPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingData | null>(null);
  const [editing, setEditing] = useState({ car: false, service: false, location: false });
  const [detailedAddress, setDetailedAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDraft = async () => {
      const carRaw = sessionStorage.getItem("booking:car-details");
      const serviceRaw = sessionStorage.getItem("booking:service");
      const locationRaw = sessionStorage.getItem("booking:location");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      const { data: savedDraft } = await supabase
        .from("booking_drafts")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      const carDetails = carRaw
        ? JSON.parse(carRaw)
        : savedDraft
          ? {
              carBrand: savedDraft.car_brand || "",
              carModel: savedDraft.car_model || "",
              carType: savedDraft.car_type || "",
              plateNumber: savedDraft.plate_number || "",
              carColor: savedDraft.car_color || "",
            }
          : null;

      if (!carDetails?.carBrand || !carDetails?.carModel || !carDetails?.carType || !carDetails?.plateNumber) {
        router.push("/customer/book");
        return;
      }

      const serviceParsed = serviceRaw ? JSON.parse(serviceRaw) : null;
      const service =
        serviceParsed
          ? (services.find((s) => s.id === serviceParsed.id) ?? services[0])
          : savedDraft?.service_id
            ? (services.find((s) => s.id === savedDraft.service_id) ?? {
                id: savedDraft.service_id,
                name: savedDraft.service_name || "Selected Service",
                description: savedDraft.service_description || "",
                duration: savedDraft.service_duration || "",
                price: Number(savedDraft.service_price || 0),
                features: Array.isArray(savedDraft.service_features) ? savedDraft.service_features : [],
              })
            : services[0];

      const parsedLocation = locationRaw ? JSON.parse(locationRaw) : null;
      const parsedSavedAddress = parseSavedAddress(savedDraft?.service_address || "");
      const location = parsedLocation
        ? {
            ...parsedLocation,
            address:
              parsedLocation.address ||
              `${parsedLocation.detailedAddress || ""}, ${parsedLocation.selectedArea || ""}`.trim().replace(/^, /, ""),
          }
        : {
            address: savedDraft?.service_address || "",
            date: savedDraft?.scheduled_date || "",
            timeSlot: savedDraft?.time_slot || "",
            travelFee: Number(savedDraft?.travel_fee || 0),
            selectedArea: parsedSavedAddress.selectedArea,
          };

      setDraft({ carDetails, service, location });
      setDetailedAddress(
        location.selectedArea && location.address?.endsWith(`, ${location.selectedArea}`)
          ? location.address.slice(0, -(location.selectedArea.length + 2))
          : location.address || ""
      );
      sessionStorage.setItem("booking:car-details", JSON.stringify(carDetails));
      sessionStorage.setItem("booking:service", JSON.stringify({ id: service.id, name: service.name, price: service.price }));
      sessionStorage.setItem("booking:location", JSON.stringify(location));
      setLoading(false);
    };

    loadDraft();
  }, [router]);

  if (loading || !draft) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const travelFee = draft.location.travelFee ?? 0;
  const totalAmount = draft.service.price + travelFee;
  const isEditing = editing.car || editing.service || editing.location;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const canSaveCar = Boolean(draft.carDetails.carBrand && draft.carDetails.carModel && draft.carDetails.carType && draft.carDetails.plateNumber);
  const canSaveLocation = Boolean(draft.location.selectedArea && detailedAddress.trim() && draft.location.date && draft.location.timeSlot);

  const saveCar = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("booking_drafts").update({
        car_brand: draft.carDetails.carBrand, car_model: draft.carDetails.carModel,
        car_type: draft.carDetails.carType, plate_number: draft.carDetails.plateNumber,
        car_color: draft.carDetails.carColor, updated_at: new Date().toISOString(),
      }).eq("user_id", auth.user.id);
    }
    sessionStorage.setItem("booking:car-details", JSON.stringify(draft.carDetails));
    setEditing((p) => ({ ...p, car: false }));
  };

  const saveService = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("booking_drafts").update({
        service_id: draft.service.id, service_name: draft.service.name,
        service_price: draft.service.price, updated_at: new Date().toISOString(),
      }).eq("user_id", auth.user.id);
    }
    sessionStorage.setItem("booking:service", JSON.stringify({ id: draft.service.id, name: draft.service.name, price: draft.service.price }));
    setEditing((p) => ({ ...p, service: false }));
  };

  const saveLocation = async () => {
    const combinedAddress = `${detailedAddress}, ${draft.location.selectedArea}`.trim().replace(/^, /, "");
    const updated = { ...draft.location, address: combinedAddress };
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("booking_drafts").update({
        service_address: combinedAddress, scheduled_date: draft.location.date,
        time_slot: draft.location.timeSlot, travel_fee: draft.location.travelFee,
        updated_at: new Date().toISOString(),
      }).eq("user_id", auth.user.id);
    }
    sessionStorage.setItem("booking:location", JSON.stringify(updated));
    setDraft((p) => p ? { ...p, location: updated } : p);
    setEditing((p) => ({ ...p, location: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => router.push("/customer/book/location")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /><span>Back</span>
        </button>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Booking Summary</h1>
          <p className="text-gray-500">Step 5: Final review before secure payment</p>
        </div>

        {/* Vehicle Card */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-gray-900">
              <Car className="w-6 h-6" />
              <h3 className="font-bold text-lg">Vehicle Information</h3>
            </div>
            <button onClick={() => setEditing((p) => ({ ...p, car: true }))} className="flex items-center gap-1 text-sm font-bold text-gray-900 hover:underline">
              <Edit className="w-4 h-4" /> Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs font-bold text-gray-400 uppercase">Brand</p><p className="font-medium">{draft.carDetails.carBrand}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Model</p><p className="font-medium">{draft.carDetails.carModel}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Type</p><p className="font-medium">{draft.carDetails.carType}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Plate</p><p className="font-medium">{draft.carDetails.plateNumber}</p></div>
            <div><p className="text-xs font-bold text-gray-400 uppercase">Color</p><p className="font-medium">{draft.carDetails.carColor || "-"}</p></div>
          </div>
        </div>

        {/* Service Card */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 text-green-600">
              <Wrench className="w-6 h-6" />
              <h3 className="font-bold text-lg">Selected Service</h3>
            </div>
            <button onClick={() => setEditing((p) => ({ ...p, service: true }))} className="flex items-center gap-1 text-sm font-bold text-gray-900 hover:underline">
              <Edit className="w-4 h-4" /> Edit
            </button>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between mb-2">
              <p className="font-bold text-gray-800">{draft.service.name}</p>
              <p className="font-black text-gray-900">RM {draft.service.price}</p>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{draft.service.description}</p>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-red-500">
              <MapPin className="w-6 h-6" />
              <h3 className="font-bold text-lg">Location & Time</h3>
            </div>
            <button onClick={() => setEditing((p) => ({ ...p, location: true }))} className="flex items-center gap-1 text-sm font-bold text-gray-900 hover:underline">
              <Edit className="w-4 h-4" /> Edit
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Address</p>
              <p className="text-gray-800">{draft.location.address}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Service Area</p>
              <p className="text-gray-800">{draft.location.selectedArea || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Date</p>
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <Calendar className="w-4 h-4 text-gray-400" /> {formatDate(draft.location.date)}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Time</p>
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <Clock className="w-4 h-4 text-gray-400" /> {draft.location.timeSlot}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Travel Fee</p>
              <div className="flex items-center gap-2 font-medium text-gray-800">
                <Truck className="w-4 h-4 text-gray-400" /> RM {travelFee}
              </div>
            </div>
          </div>
        </div>

        {/* Total Amount Card */}
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-900">
              <DollarSign className="w-6 h-6" />
              <h3 className="font-bold text-lg">Total Amount</h3>
            </div>
            <div className="text-2xl font-black text-gray-900">RM {totalAmount}</div>
          </div>
          <p className="mt-2 text-sm text-gray-500">RM {draft.service.price} service + RM {travelFee} travel fee</p>
        </div>

        <button
          onClick={() => router.push("/customer/book/payment")}
          disabled={isEditing}
          className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-xl shadow-green-100"
        >
          Proceed to Payment
        </button>
      </div>

      {/* Edit Car Modal */}
      {editing.car && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Edit Vehicle Information</h2>
              <button onClick={() => setEditing((p) => ({ ...p, car: false }))} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Brand</p>
                <input type="text" value={draft.carDetails.carBrand}
                  onChange={(e) => setDraft((p) => p ? { ...p, carDetails: { ...p.carDetails, carBrand: e.target.value } } : p)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Model</p>
                <input type="text" value={draft.carDetails.carModel}
                  onChange={(e) => setDraft((p) => p ? { ...p, carDetails: { ...p.carDetails, carModel: e.target.value } } : p)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Type</p>
                <select value={draft.carDetails.carType}
                  onChange={(e) => setDraft((p) => p ? { ...p, carDetails: { ...p.carDetails, carType: e.target.value } } : p)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none">
                  <option value="">Select car type</option>
                  {carTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Plate</p>
                <input type="text" value={draft.carDetails.plateNumber}
                  onChange={(e) => setDraft((p) => p ? { ...p, carDetails: { ...p.carDetails, plateNumber: e.target.value.toUpperCase() } } : p)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none uppercase font-mono" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Color</p>
                <input type="text" value={draft.carDetails.carColor}
                  onChange={(e) => setDraft((p) => p ? { ...p, carDetails: { ...p.carDetails, carColor: e.target.value } } : p)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setEditing((p) => ({ ...p, car: false }))} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={saveCar} disabled={!canSaveCar} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editing.service && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Edit Service</h2>
              <button onClick={() => setEditing((p) => ({ ...p, service: false }))} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <select
                value={draft.service.id}
                onChange={(e) => { const next = services.find((s) => s.id === e.target.value); if (next) setDraft((p) => p ? { ...p, service: next } : p); }}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
              >
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} - RM {s.price}</option>)}
              </select>
              <div className="flex justify-between">
                <p className="font-bold text-gray-800">{draft.service.name}</p>
                <p className="font-black text-gray-900">RM {draft.service.price}</p>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{draft.service.description}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setEditing((p) => ({ ...p, service: false }))} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={saveService} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editing.location && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Edit Location & Time</h2>
              <button onClick={() => setEditing((p) => ({ ...p, location: false }))} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Service Area</p>
                <select
                  value={draft.location.selectedArea}
                  onChange={(e) => { const area = e.target.value; setDraft((p) => p ? { ...p, location: { ...p.location, selectedArea: area, travelFee: getTravelFee(area) } } : p); }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                >
                  <option value="">Select your city/district</option>
                  {KVALLEY_AREAS.map((zone) => (
                    <optgroup key={zone.zone} label={`${zone.zone} (${zone.distanceRange}) - RM ${zone.fee}`}>
                      {zone.areas.map((area) => <option key={area} value={area}>{area}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Detailed Address</p>
                <textarea
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Date</p>
                  <input type="date" value={draft.location.date}
                    onChange={(e) => setDraft((p) => p ? { ...p, location: { ...p.location, date: e.target.value } } : p)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Time Slot</p>
                  <select value={draft.location.timeSlot}
                    onChange={(e) => setDraft((p) => p ? { ...p, location: { ...p.location, timeSlot: e.target.value } } : p)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 outline-none">
                    <option value="">Select a time slot</option>
                    {timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Travel Fee</p>
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <Truck className="w-4 h-4 text-gray-400" /> RM {draft.location.travelFee}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setEditing((p) => ({ ...p, location: false }))} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={saveLocation} disabled={!canSaveLocation} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
