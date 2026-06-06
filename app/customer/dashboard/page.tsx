"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, Sparkles, ShieldCheck, Star, Clock, Mail, Phone, MapPin, Calendar, CheckCircle, Settings as SettingsIcon } from "lucide-react";
import supabase from "@/lib/supabase";
import { useUser } from "@/hooks/user-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  "Basic Wash": Car,
  "Premium Wash": Sparkles,
  "Interior Cleaning": ShieldCheck,
  "Full Package": Star,
};
const ICON_CYCLE: React.ElementType[] = [Car, Sparkles, ShieldCheck, Star, Clock];

const FALLBACK_SERVICES = [
  { id: "basic", name: "Basic Wash", description: "Exterior hand wash and dry", duration: "30 mins", price: 20 },
  { id: "premium", name: "Premium Wash", description: "Exterior + interior cleaning", duration: "60 mins", price: 45 },
  { id: "interior", name: "Interior Cleaning", description: "Deep interior cleaning and vacuum", duration: "45 mins", price: 35 },
  { id: "full", name: "Full Package", description: "Complete detailing service", duration: "90 mins", price: 80 },
];

export default function CustomerDashboardPage() {
  const { fullName } = useUser();
  const [services, setServices] = useState(
    FALLBACK_SERVICES.map((s, i) => ({ ...s, icon: SERVICE_ICON_MAP[s.name] ?? ICON_CYCLE[i % ICON_CYCLE.length] }))
  );

  useEffect(() => {
    supabase
      .from("services")
      .select("id, name, description, duration, price")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setServices(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map((row: any, i: number) => ({
              id: row.id,
              name: row.name,
              description: row.description,
              duration: row.duration,
              price: Number(row.price),
              icon: SERVICE_ICON_MAP[row.name] ?? ICON_CYCLE[i % ICON_CYCLE.length],
            }))
          );
        }
      });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* HERO BANNER */}
          <section className="rounded-3xl bg-gray-900 text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-2">Customer Portal</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome back, {fullName || "Guest"}!</h1>
              <p className="text-gray-400 max-w-md leading-relaxed">
                Premium door-to-door car wash and detailing — we come to you, wherever you are, whenever you need us.
              </p>
            </div>
            <Link href="/customer/book" className="shrink-0 bg-white text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors self-start md:self-center">
              Book a Wash
            </Link>
          </section>

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {[
              { val: "30 min", label: "Quickest Service", icon: Clock },
              { val: "4", label: "Premium Packages", icon: Sparkles },
              { val: "5.0 ⭐", label: "Average Rating", icon: CheckCircle },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-xs flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                  <s.icon className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900">{s.val}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AVAILABLE SERVICES */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Our Services</h2>
              <Link href="/customer/book" className="text-sm font-semibold text-gray-700 hover:text-gray-900 underline underline-offset-4">Book Now →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <Link key={service.id} href="/customer/book">
                    <Card className="bg-gradient-to-t from-primary/5 to-card shadow-xs hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group h-full">
                      <CardHeader>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white mb-3 group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-base font-bold">{service.name}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">{service.description}</CardDescription>
                      </CardHeader>
                      <CardFooter className="flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /><span>{service.duration}</span>
                        </div>
                        <span className="text-lg font-black text-gray-900">RM{service.price}</span>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5">How It Works</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: "01", title: "Choose a Service", desc: "Pick the package that best suits your car's needs and budget.", icon: Sparkles },
                { step: "02", title: "Pick a Date & Time", desc: "Schedule at your convenience — same-day slots available.", icon: Calendar },
                { step: "03", title: "We Come to You", desc: "Our certified team arrives at your location fully equipped.", icon: MapPin },
                { step: "04", title: "Enjoy the Result", desc: "Sit back and relax while we deliver a spotless finish.", icon: Car },
              ].map((s, i) => (
                <div key={i} className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-xs overflow-hidden">
                  <span className="absolute top-4 right-4 text-4xl font-black text-gray-100 select-none">{s.step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white mb-4">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* WHY CHOOSE US */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Why Choose Das Auto Spa</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: SettingsIcon, title: "Advanced Equipment", desc: "State-of-the-art mobile washing systems with water recycling technology for an eco-friendly clean." },
                { icon: ShieldCheck, title: "Insured & Certified", desc: "Fully insured professionals with extensive training and certification for your complete peace of mind." },
                { icon: Clock, title: "Flexible Scheduling", desc: "Book same-day or schedule in advance — we work around your schedule, 7 days a week." },
              ].map((item, i) => (
                <Card key={i} className="bg-gradient-to-t from-primary/5 to-card shadow-xs min-h-[200px]">
                  <CardHeader className="h-full flex flex-col justify-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white mb-3">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base font-bold">{item.title}</CardTitle>
                    <CardDescription className="leading-relaxed text-xs">{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA BANNER */}
          <section className="bg-gray-900 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Ready for a Spotless Ride?</h2>
              <p className="text-gray-400">Book your wash in under 2 minutes. We&apos;ll handle the rest.</p>
            </div>
            <Link href="/customer/book" className="shrink-0 bg-white text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors">Book Now</Link>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-gray-100 pt-12 pb-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 border-b border-gray-900/50 pb-12 mb-6">
          <div>
            <div className="flex items-center gap-2 text-white mb-4">
              <Sparkles className="w-6 h-6 text-gray-300" />
              <span className="text-xl font-bold">Das Auto Spa</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-200">Premium door-to-door car wash and detailing services. Making luxury convenient for every car owner.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-300" /> support@dasautospa.com</li>
              <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-300" /> 011-222 3333</li>
              <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-300" /> Mon–Sun: 8AM–8PM</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Service Areas</h4>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
              <p className="leading-relaxed text-gray-200">Currently serving the Klang Valley. Expanding soon!</p>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-300/70">&copy; 2026 Das Auto Spa. All rights reserved.</div>
      </footer>
    </div>
  );
}
