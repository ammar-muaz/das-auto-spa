export const services = [
  {
    id: "basic",
    name: "Basic Wash",
    description: "Quick and efficient exterior cleaning",
    duration: "30 minutes",
    price: 20,
    features: ["Exterior hand wash", "Wheel cleaning", "Tire shine", "Quick dry"],
  },
  {
    id: "premium",
    name: "Premium Wash",
    description: "Complete interior and exterior cleaning",
    duration: "60 minutes",
    price: 45,
    features: ["Everything in Basic", "Interior vacuum", "Dashboard cleaning", "Window cleaning", "Air freshener"],
  },
  {
    id: "interior",
    name: "Interior Cleaning",
    description: "Deep interior cleaning and sanitization",
    duration: "45 minutes",
    price: 35,
    features: ["Deep vacuum", "Seat shampooing", "Dashboard & console polish", "Door panels", "Odor elimination"],
  },
  {
    id: "full",
    name: "Full Package",
    description: "Complete detailing service for your car",
    duration: "90 minutes",
    price: 80,
    features: ["Everything in Premium", "Wax & polish", "Engine bay cleaning", "Leather conditioning", "Undercarriage wash"],
  },
];

export const carTypes = ["Sedan", "SUV", "MPV", "Hatchback", "Pickup Truck", "Coupe"];

export const timeSlots = [
  "08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
];

export const KVALLEY_AREAS = [
  {
    zone: "Zone A",
    distanceRange: "0-10 km",
    fee: 5,
    areas: ["Cheras", "Bandar Tun Razak", "Ampang"],
  },
  {
    zone: "Zone B",
    distanceRange: "10-20 km",
    fee: 10,
    areas: ["Kajang", "Balakong", "Seri Kembangan", "KL City Centre (KLCC, Bukit Bintang)", "Setapak"],
  },
  {
    zone: "Zone C",
    distanceRange: "20-30 km",
    fee: 15,
    areas: ["Petaling Jaya", "Puchong", "Subang Jaya", "Damansara", "Batu Caves", "Gombak", "Putrajaya", "Wangsa Maju", "Kepong"],
  },
  {
    zone: "Zone D",
    distanceRange: "> 30 km",
    fee: 20,
    areas: ["Bandar Baru Bangi", "Shah Alam", "Klang", "Cyberjaya", "Kota Damansara", "Semenyih", "Selayang", "Dengkil"],
  },
];

export const KVALLEY_AREA_OPTIONS = KVALLEY_AREAS.flatMap((zone) =>
  zone.areas.map((area) => ({
    name: area,
    fee: zone.fee,
    zone: zone.zone,
  }))
);

export const getTravelFee = (areaName: string) => {
  const match = KVALLEY_AREA_OPTIONS.find((area) => area.name === areaName);
  return match ? match.fee : 0;
};
