'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Check, Clock, MapPin, Phone, Mail, ChevronDown,
  Menu, X, Sparkles, Shield, Award, ArrowRight,
} from 'lucide-react';

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  features: string[];
}

const steps = [
  { step: '01', title: 'Book Online', desc: 'Choose your package and pick a date and time that suits you.' },
  { step: '02', title: 'We Come to You', desc: 'Our trained professional arrives at your home, office, or wherever you are.' },
  { step: '03', title: 'Relax & Wait', desc: 'Sit back while we work. No queues, no driving to a car wash bay.' },
  { step: '04', title: 'Drive Clean', desc: 'Your car is returned spotless. Pay securely through our platform.' },
];

const areas = [
  'Kuala Lumpur', 'Petaling Jaya', 'Shah Alam', 'Subang Jaya',
  'Klang', 'Puchong', 'Ampang', 'Cheras',
  'Damansara', 'Bangsar', 'Mont Kiara', 'Setapak',
];

const navLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Contact Us', href: '#contact-us' },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [popularName, setPopularName] = useState<string | null>(null);
  const [pkgLoading, setPkgLoading] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/public/services')
      .then((r) => r.json())
      .then(({ services, popularServiceName }: { services: ServicePackage[]; popularServiceName: string | null }) => {
        setPackages(services);
        setPopularName(popularServiceName);
      })
      .catch(() => {})
      .finally(() => setPkgLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ──────────────── NAVBAR ──────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="Das Auto Spa" width={34} height={34} className="rounded-lg" />
            <span className={`font-bold text-lg transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Das Auto Spa
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 ml-10">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/80 hover:text-white'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <Link
              href="/login"
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/15'
              }`}
            >
              Login
            </Link>
            <Link
              href="/register"
              className={`text-sm font-semibold px-5 py-2 rounded-lg transition-colors ${
                scrolled
                  ? 'bg-gray-900 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              }`}
            >
              Register
            </Link>
          </div>

          <button
            className="md:hidden ml-auto p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen
              ? <X className={`w-5 h-5 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
              : <Menu className={`w-5 h-5 ${scrolled ? 'text-gray-900' : 'text-white'}`} />
            }
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-1"
              >
                {label}
              </a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Link href="/login" className="flex-1 text-center py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
                Login
              </Link>
              <Link href="/register" className="flex-1 text-center py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800">
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ──────────────── HERO ──────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center bg-gradient-to-b from-gray-950 to-gray-900 overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center w-full">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-gray-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <Sparkles className="w-4 h-4" />
            Premium Door-to-Door Car Wash · Klang Valley
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Your Car Deserves
            <span className="block text-gray-400">The Best</span>
          </h1>

          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Das Auto Spa brings certified professionals straight to your doorstep.
            No queues. No hassle. Just a spotless, showroom-ready car.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-xl text-base"
            >
              Book Your Wash
            </Link>
            <a
              href="#services"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20 text-base"
            >
              View Packages
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-12">
            {[
              { value: '500+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '12+', label: 'Service Areas' },
              { value: '7 Days', label: 'A Week' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-gray-500 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#about"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors animate-bounce"
        >
          <ChevronDown className="w-6 h-6" />
        </a>
      </section>

      {/* ──────────────── ABOUT ──────────────── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <span className="text-gray-400 font-semibold text-sm uppercase tracking-widest">About Us</span>
              <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-6 leading-snug">
                We Bring the Car Wash<br />Straight to You
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-5">
                Das Auto Spa is a premium mobile car wash and detailing service based in Klang Valley, Malaysia. We believe your time is valuable — that's why our certified professionals come directly to you, fully equipped for a showroom-quality finish.
              </p>
              <p className="text-gray-400 leading-relaxed mb-10">
                Founded on a commitment to quality and convenience, we use only eco-friendly, biodegradable products that protect your car's paint and the environment. Every wash is backed by our 100% satisfaction guarantee.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, label: 'Fully Insured' },
                  { icon: Award, label: 'Certified Technicians' },
                  { icon: Sparkles, label: 'Eco-Friendly Products' },
                  { icon: Clock, label: '7 Days a Week' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { number: '500+', desc: 'Washes Completed' },
                { number: '4.9★', desc: 'Average Star Rating' },
                { number: '12+', desc: 'Service Areas' },
                { number: '100%', desc: 'Satisfaction Guarantee' },
              ].map((item) => (
                <div key={item.number} className="bg-gray-900 rounded-2xl p-4 md:p-8 text-center text-white">
                  <p className="text-4xl font-bold text-gray-100 mb-2">{item.number}</p>
                  <p className="text-gray-400 text-sm leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────── SERVICES / PRICING ──────────────── */}
      <section id="services" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-gray-400 font-semibold text-sm uppercase tracking-widest">Our Packages</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Choose the package that fits your car's needs. All prices include travel to your location — no hidden fees.
            </p>
          </div>

          {pkgLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className={`grid gap-6 ${
              packages.length <= 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' :
              packages.length === 3 ? 'sm:grid-cols-3' :
              'sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {packages.map((pkg) => {
                const isPopular = popularName !== null && pkg.name === popularName;
                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-white rounded-2xl border-2 p-7 flex flex-col shadow-sm hover:shadow-md transition-all ${
                      isPopular ? 'border-gray-900' : 'border-gray-100'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    <div className="mb-5">
                      <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                      <p className="text-gray-400 text-sm mt-1 min-h-[40px] leading-snug">{pkg.description}</p>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900">RM {pkg.price}</span>
                      <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {pkg.duration}
                      </div>
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-7">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-gray-700 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/register"
                      className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isPopular
                          ? 'bg-gray-900 text-white hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Book Now
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ──────────────── HOW IT WORKS ──────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-gray-400 font-semibold text-sm uppercase tracking-widest">How It Works</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Ready in 4 Simple Steps</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Getting a professional car wash has never been easier.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-px bg-gray-100" />
                )}
                <div className="relative z-10 w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 text-xl font-bold shadow-md">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── SERVICE AREAS ──────────────── */}
      <section id="areas" className="py-24 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-gray-400 font-semibold text-sm uppercase tracking-widest">Coverage</span>
            <h2 className="text-4xl font-bold mt-3 mb-4">We Serve Klang Valley</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Currently covering 12+ areas across Klang Valley, with more cities coming soon.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-12">
            {areas.map((area) => (
              <div
                key={area}
                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
              >
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-300">{area}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center max-w-xl mx-auto">
            <p className="text-gray-400 mb-1">Don't see your area?</p>
            <p className="text-gray-200 font-medium">
              Contact us — we'll notify you when we expand to your location.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────── CONTACT ──────────────── */}
      <section id="contact-us" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-gray-400 font-semibold text-sm uppercase tracking-widest">Get In Touch</span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">Contact Us</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Have a question or need a custom quote? We're here to help, 7 days a week.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
            {[
              { icon: Phone, label: 'Phone', value: '+60 19-325 3883', sub: 'Mon–Sun, 8AM – 8PM' },
              { icon: Mail, label: 'Email', value: 'support@dasautospa.com', sub: 'We reply within 24 hours' },
              { icon: MapPin, label: 'Coverage', value: 'Klang Valley, Malaysia', sub: 'Door-to-door service' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="text-center bg-gray-50 rounded-2xl p-5 md:p-8 border border-gray-100">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                <p className="font-bold text-gray-900 mb-1 text-sm">{value}</p>
                <p className="text-gray-400 text-xs">{sub}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all shadow-lg text-base"
            >
              Book Your Wash Today <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer className="bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-6 md:gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/logo.png" alt="Das Auto Spa" width={30} height={30} className="rounded-lg" />
                <span className="font-bold text-lg">Das Auto Spa</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-sm text-sm">
                Premium door-to-door car wash and detailing services across Klang Valley. Making luxury car care convenient, reliable, and affordable.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-5 text-gray-200">Quick Links</h4>
              <ul className="space-y-3">
                {navLinks.map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a>
                  </li>
                ))}
                <li>
                  <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-5 text-gray-200">Contact</h4>
              <ul className="space-y-3">
                {[
                  { icon: Phone, text: '+60 19-325 3883' },
                  { icon: Mail, text: 'support@dasautospa.com' },
                  { icon: Clock, text: 'Mon–Sun: 8AM – 8PM' },
                  { icon: MapPin, text: 'Klang Valley, Malaysia' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm text-gray-400">
                    <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Das Auto Spa. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
