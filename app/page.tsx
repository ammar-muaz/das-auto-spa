'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Shield, Sparkles, Star, Bubbles, GlassWater, Wind, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const services = [
  {
    id: 'basic',
    name: 'Basic Wash',
    description: 'Exterior wash, tire cleaning, and window cleaning',
    price: 30,
    duration: '30 min',
    features: ['Exterior Wash', 'Tire Cleaning', 'Window Cleaning']
  },
  {
    id: 'premium',
    name: 'Premium Wash',
    description: 'Basic wash + interior vacuuming and dashboard cleaning',
    price: 40,
    duration: '60 min',
    features: ['Exterior Wash', 'Interior Vacuuming', 'Dashboard Cleaning', 'Tire Dressing']
  },
  {
    id: 'deluxe',
    name: 'Deluxe Spa',
    description: 'Premium wash + waxing, leather conditioning, and air freshener',
    price: 80,
    duration: '90 min',
    features: ['Premium Wash', 'Wax Application', 'Leather Conditioning', 'Engine Bay Cleaning', 'Air freshener']
  },
  {
    id: 'ultimate',
    name: 'Ultimate Detailing',
    description: 'Complete interior and exterior detailing with ceramic coating',
    price: 140,
    duration: '3 hours',
    features: ['Full Interior Detail', 'Clay Bar Treatment', 'Ceramic Coating', 'Paint Correction', 'Engine Detail']
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Door-to-Door Service</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Das Auto Spa
              <span className="block text-3xl md:text-4xl font-normal mt-2">
                Luxury Car Wash, Delivered to Your Doorstep
              </span>
            </h1>
            
            <p className="text-xl mb-10 text-primary-foreground/90 max-w-2xl mx-auto">
              Experience the ultimate in convenience and quality. Our professional team brings the car spa to you.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>100% Satisfaction</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>On-Time Service</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                <span>Eco-Friendly Products</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Available Services Section */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Available Services</h2>
            <p className="text-muted-foreground">Choose from our premium car wash packages</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col border-0 shadow-xl transition-all hover:shadow-2xl">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[40px]">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-3 mb-6 flex-1">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <Clock className="w-4 h-4" />
                      {service.duration}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      RM {service.price}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-b from-background to-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Das Auto Spa Difference</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;re not just a car wash - we&apos;re a complete mobile automotive care experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Bubbles className="w-8 h-8" />,
                title: 'Advanced Equipment',
                description: 'State-of-the-art mobile washing systems with water recycling technology'
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Insured & Certified',
                description: 'Fully insured professionals with extensive training and certification'
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: 'Flexible Scheduling',
                description: 'Book same-day or schedule in advance - we work around your schedule'
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Das Auto Spa</h3>
              <p className="text-secondary-foreground/80">
                Premium door-to-door car wash and detailing services. Making luxury convenient.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-secondary-foreground/80">
                <li><a href="#" className="hover:text-secondary-foreground">Services</a></li>
                <li><a href="#" className="hover:text-secondary-foreground">Pricing</a></li>
                <li><a href="#" className="hover:text-secondary-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-secondary-foreground">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-secondary-foreground/80">
                <li>support@dasautospa.com</li>
                <li>(555) 123-WASH</li>
                <li>Mon-Sun: 8AM-8PM</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Service Areas</h4>
              <p className="text-secondary-foreground/80">
                Currently serving metropolitan areas within Klang Valley. Expanding soon!
              </p>
            </div>
          </div>
          
          <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center text-secondary-foreground/80">
            <p>&copy; {new Date().getFullYear()} Das Auto Spa. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}