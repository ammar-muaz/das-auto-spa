"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Clock, AlertCircle, Truck, Info, Trash2, ChevronLeft } from "lucide-react";
import { timeSlots, KVALLEY_AREAS, KVALLEY_AREA_OPTIONS, getTravelFee } from "@/lib/bookingOptions";
import supabase from "@/lib/supabase";

interface SavedAddress {
  id: string;
  label: string;
  detailedAddress: string;
  selectedArea: string;
}

const parseDraftAddress = (address: string) => {
  if (!address) return { selectedArea: "", detailedAddress: "" };
  const matched = KVALLEY_AREA_OPTIONS.find((a) => address.endsWith(`, ${a.name}`));
  if (matched) {
    return { selectedArea: matched.name, detailedAddress: address.slice(0, -(matched.name.length + 2)) };
  }
  const fallback = KVALLEY_AREA_OPTIONS.find((a) => address.includes(a.name));
  return { selectedArea: fallback?.name || "", detailedAddress: address };
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
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(true);

  const LOCATION_SESSION_KEY = "booking:location";

  useEffect(() => {
    const load = async () => {
      const cached = sessionStorage.getItem(LOCATION_SESSION_KEY);
      if (cached) setData(JSON.parse(cached));

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const { data: addrData } = await supabase
        .from("saved_addresses")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (addrData) {
        setSavedAddresses(addrData.map((a: any) => ({
          id: a.id,
          label: a.label,
          detailedAddress: a.detailed_address,
          selectedArea: a.selected_area,
        })));
      }

      if (!cached) {
        const { data: draft } = await supabase
          .from("booking_drafts")
          .select("service_address, scheduled_date, time_slot, travel_fee")
          .eq("user_id", auth.user.id)
          .maybeSingle();

        if (draft) {
          const parsed = parseDraftAddress(draft.service_address || "");
          setData({
            selectedArea: parsed.selectedArea,
            detailedAddress: parsed.detailedAddress,
            date: draft.scheduled_date || "",
            timeSlot: draft.time_slot || "",
            travelFee: typeof draft.travel_fee === "number" ? draft.travel_fee : getTravelFee(parsed.selectedArea),
          });
        }
      }

      setLoading(false);
    };
    load();
  }, [router]);

  useEffect(() => {
    if (data.selectedArea) {
      setIsLocationValid(true);
    } else {
      setIsLocationValid(null);
    }
  }, [data.selectedArea]);

  useEffect(() => {
    if (!data.date) { setBookedSlots(new Set()); return; }
    let cancelled = false;
    setLoadingSlots(true);
    supabase
      .from("bookings")
      .select("time_slot")
      .eq("scheduled_date", data.date)
      .not("status", "eq", "Cancelled")
      .then(({ data: rows }) => {
        if (cancelled) return;
        if (rows) {
          const booked = new Set<string>(rows.map((r: any) => r.time_slot));
          setBookedSlots(booked);
          setData((prev) => ({ ...prev, timeSlot: booked.has(prev.timeSlot) ? "" : prev.timeSlot }));
        } else {
          setBookedSlots(new Set());
        }
        setLoadingSlots(false);
      });
    return () => { cancelled = true; };
  }, [data.date]);

  const handleChange = (field: string, value: string) => {
    setData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "selectedArea") updated.travelFee = getTravelFee(value);
      const sessionLocation = {
        ...updated,
        address: `${updated.detailedAddress}, ${updated.selectedArea}`.trim().replace(/^, /, ""),
      };
      sessionStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(sessionLocation));
      return updated;
    });
  };

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setData((prev) => {
      const updated = { ...prev, selectedArea: addr.selectedArea, detailedAddress: addr.detailedAddress, travelFee: getTravelFee(addr.selectedArea) };
      sessionStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify({
        ...updated,
        address: `${updated.detailedAddress}, ${updated.selectedArea}`.trim().replace(/^, /, ""),
      }));
      return updated;
    });
  };

  const handleDeleteSavedAddress = async (id: string) => {
    setDeletingAddressId(id);
    await supabase.from("saved_addresses").delete().eq("id", id);
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeletingAddressId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const combinedAddress = `${data.detailedAddress}, ${data.selectedArea}`.trim();
    const sessionLocation = {
      ...data,
      address: combinedAddress,
    };

    await supabase.from("booking_drafts").upsert({
      user_id: auth.user.id,
      service_address: combinedAddress,
      scheduled_date: data.date,
      time_slot: data.timeSlot,
      travel_fee: data.travelFee,
      updated_at: new Date().toISOString(),
    });

    if (saveAddress && data.selectedArea && data.detailedAddress.trim()) {
      const alreadySaved = savedAddresses.some(
        (a) => a.selectedArea === data.selectedArea && a.detailedAddress.trim() === data.detailedAddress.trim()
      );
      if (!alreadySaved) {
        const { data: newAddr } = await supabase
          .from("saved_addresses")
          .insert({ user_id: auth.user.id, label: data.selectedArea, detailed_address: data.detailedAddress, selected_area: data.selectedArea })
          .select()
          .single();
        if (newAddr) {
          setSavedAddresses((prev) => [{
            id: newAddr.id, label: newAddr.label,
            detailedAddress: newAddr.detailed_address, selectedArea: newAddr.selected_area,
          }, ...prev]);
        }
      }
    }

    sessionStorage.setItem(LOCATION_SESSION_KEY, JSON.stringify(sessionLocation));
    router.push("/customer/book/summary");
  };

  const today = new Date().toISOString().split("T")[0];
  const isTodaySelected = data.date === today;
  const disableBefore = new Date(Date.now() + 60 * 60 * 1000);

  const getSlotStartDate = (slot: string, dateStr: string) => {
    const [start] = slot.split(" - ");
    if (!start) return null;
    const [time, meridian] = start.split(" ");
    if (!time || !meridian) return null;
    const [hoursStr, minutesStr] = time.split(":");
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return null;
    let hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const isSlotBooked = (slot: string) => bookedSlots.has(slot);
  const isSlotPast = (slot: string) => {
    if (!isTodaySelected) return false;
    const slotStart = getSlotStartDate(slot, data.date);
    return slotStart ? slotStart.getTime() < disableBefore.getTime() : false;
  };
  const isSlotDisabled = (slot: string) => loadingSlots || isSlotBooked(slot) || isSlotPast(slot);
  const allSlotsUnavailable = Boolean(data.date) && !loadingSlots && timeSlots.every((slot) => isSlotBooked(slot) || isSlotPast(slot));
  const isValid = data.selectedArea && data.detailedAddress.trim() && data.date && data.timeSlot && isLocationValid === true;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push("/customer/book/service")} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /><span>Back</span>
        </button>
        {savedAddresses.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Saved Addresses</p>
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <div key={addr.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="flex-1 flex items-start gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <MapPin className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{addr.selectedArea}</p>
                      <p className="text-xs text-gray-500">{addr.detailedAddress}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedAddress(addr.id)}
                    disabled={deletingAddressId === addr.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Location & Date</h1>
          <p className="text-gray-500 mb-6">Step 4: Where and when should we detail your ride?</p>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-900 mt-0.5" />
              <div>
                <h3 className="text-blue-900 font-bold mb-1">Service Coverage</h3>
                <p className="text-sm text-gray-900 leading-relaxed">
                  We currently provide mobile detailing across <strong>Klang Valley</strong>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left column — Location */}
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <MapPin className="w-4 h-4" /> Service Area
                  </label>
                  <select
                    value={data.selectedArea}
                    onChange={(e) => handleChange("selectedArea", e.target.value)}
                    required
                    className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none transition-all ${
                      isLocationValid === false
                        ? "border-red-200 bg-red-50/30 focus:border-red-400"
                        : isLocationValid === true
                        ? "border-green-200 bg-green-50/30 focus:border-green-400"
                        : "border-gray-100 bg-gray-50 focus:border-blue-500"
                    }`}
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
                  <label className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <MapPin className="w-4 h-4" /> Detailed Address
                  </label>
                  <textarea
                    value={data.detailedAddress}
                    onChange={(e) => handleChange("detailedAddress", e.target.value)}
                    placeholder="Unit number, building name, street address"
                    required
                    rows={3}
                    className="w-full px-5 py-4 border-2 rounded-2xl focus:outline-none transition-all resize-none border-gray-100 bg-gray-50 focus:border-blue-500"
                  />
                  {isLocationValid === false && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">Please select a valid service area first.</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <Truck className="w-5 h-5" />
                    <span>Travel Fee</span>
                  </div>
                  <div className="text-blue-900 font-bold">
                    {data.selectedArea ? `RM ${data.travelFee}` : "Select an area"}
                  </div>
                </div>

                <div className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="saveAddress" className="text-sm text-gray-600 cursor-pointer select-none">
                    Save this address for future bookings
                  </label>
                </div>
              </div>

              {/* Right column — Date & Time */}
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <Calendar className="w-4 h-4" /> Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={data.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                    min={today}
                    required
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                {data.date && (
                  <div>
                    <label className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-700 uppercase tracking-wider">
                      <Clock className="w-4 h-4" /> Select Time Slot
                      {loadingSlots && (
                        <span className="text-xs font-normal text-gray-400 normal-case">Checking availability...</span>
                      )}
                    </label>
                    {allSlotsUnavailable ? (
                      <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                        <Info className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">No available slots for this date. Please choose another date.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {timeSlots.map((slot) => {
                          const disabled = isSlotDisabled(slot);
                          const booked = !loadingSlots && isSlotBooked(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => !disabled && handleChange("timeSlot", slot)}
                              disabled={disabled}
                              className={`px-3 py-3 rounded-xl border-2 text-sm font-bold transition-all text-center ${
                                disabled
                                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : data.timeSlot === slot
                                  ? "border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-100"
                                  : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                              }`}
                            >
                              <div>{slot}</div>
                              {booked && <div className="text-[10px] font-semibold mt-0.5 text-red-400">Unavailable</div>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-xl shadow-gray-100"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
