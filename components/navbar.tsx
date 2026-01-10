'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Phone, Sparkles, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Initialize theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '#home' },
    { label: 'Services', href: '#services' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Login', href: '/login' },
    { label: 'Contact', href: '#contact' },
  ];

  const handleBookNow = () => {
    // Smooth scroll to booking section
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      isScrolled 
        ? 'bg-background/95 backdrop-blur-md border-b shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="#home" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">Das Auto Spa</span>
              <div className="hidden sm:block text-xs text-muted-foreground">Premium Door-to-Door</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Theme Toggle and Contact */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full"
              >
                {mounted && (
                  theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              
              <div className="hidden lg:flex items-center gap-2 text-sm border-r pr-4">
                <Phone className="h-4 w-4" />
                <span>(555) 123-WASH</span>
              </div>
              
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={handleBookNow}
              >
                Book Now
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {mounted && (
                theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Drawer for Mobile Navigation */}
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-lg font-bold">Das Auto Spa</span>
                        <div className="text-xs text-muted-foreground">Premium Car Care</div>
                      </div>
                    </div>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="icon">
                        <X className="h-5 w-5" />
                      </Button>
                    </DrawerClose>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 space-y-4">
                    {navItems.map((item) => (
                      <DrawerClose asChild key={item.label}>
                        <a
                          href={item.href}
                          className="flex items-center rounded-lg px-4 py-3 text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {item.label}
                        </a>
                      </DrawerClose>
                    ))}
                  </div>

                  {/* Contact Info and CTA */}
                  <div className="space-y-6 pt-6 border-t">
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                        <Phone className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">Call Us</div>
                        <div className="text-sm text-muted-foreground">(555) 123-WASH</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <DrawerClose asChild>
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90"
                          size="lg"
                          onClick={handleBookNow}
                        >
                          Book Appointment
                        </Button>
                      </DrawerClose>
                      
                      <div className="text-center text-sm text-muted-foreground">
                        Mon-Sun: 8AM-8PM
                      </div>
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </nav>
  );
}