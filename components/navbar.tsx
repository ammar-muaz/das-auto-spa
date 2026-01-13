"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Menu,
    X,
    Phone,
    Sparkles,
    Sun,
    Moon,
    ChevronDown,
    MapPin,
    Clock,
} from "lucide-react";
import Link from "next/link";
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
    DrawerClose,
} from "@/components/ui/drawer";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Initialize theme
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navItems = [
        { label: "Home", href: "/" },
        { label: "Services", href: "#services" },
        { label: "Pricing", href: "#pricing" },
        { label: "Login", href: "/login" },
    ];

    const handleBookNow = () => {
        const bookingSection = document.getElementById("booking");
        if (bookingSection) {
            bookingSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <nav
            className={cn(
                "sticky top-0 z-50 w-full transition-all duration-500",
                isScrolled
                    ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b shadow-lg"
                    : "bg-transparent"
            )}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo - Enhanced */}
                    <Link
                        href="#home"
                        className="flex items-center gap-3 group"
                    >
                        <div className="relative">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <Sparkles className="h-6 w-6 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-linear-to-r from-amber-400 to-orange-500 shadow-md" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent tracking-tight">
                                Das Auto Spa
                            </span>
                            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>Door-to-Door Premium Service</span>
                            </div>
                        </div>
                    </Link>

                    {/* Desktop Navigation - Enhanced */}
                    <div className="hidden lg:flex items-center gap-10">
                        <div className="flex items-center gap-8">
                            {navItems.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className="relative text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors group"
                                >
                                    {item.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
                                </a>
                            ))}
                        </div>

                        {/* Right Section - Enhanced */}
                        <div className="flex items-center gap-6">
                            {/* Contact Info */}
                            <div className="hidden xl:flex items-center gap-4 px-4 py-2 rounded-full bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        (555) 123-WASH
                                    </span>
                                </div>
                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700" />
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="text-sm">8AM-8PM</span>
                                </div>
                            </div>

                            {/* Theme Toggle */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setTheme(
                                        theme === "dark" ? "light" : "dark"
                                    )
                                }
                                className="rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                {mounted &&
                                    (theme === "dark" ? (
                                        <Sun className="h-5 w-5 text-amber-400" />
                                    ) : (
                                        <Moon className="h-5 w-5 text-gray-600" />
                                    ))}
                                <span className="sr-only">Toggle theme</span>
                            </Button>

                            {/* CTA Button - Enhanced */}
                            <Button
                                className="relative bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden"
                                onClick={handleBookNow}
                                size="lg"
                            >
                                <span className="relative z-10 font-semibold">
                                    Book Now
                                </span>
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu - Enhanced */}
                    <div className="flex items-center gap-3 lg:hidden">
                        {/* Contact Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium">
                                (555) 123-WASH
                            </span>
                        </div>

                        {/* Theme Toggle for Mobile */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                setTheme(theme === "dark" ? "light" : "dark")
                            }
                            className="rounded-full border border-gray-200 dark:border-gray-700"
                        >
                            {mounted &&
                                (theme === "dark" ? (
                                    <Sun className="h-5 w-5" />
                                ) : (
                                    <Moon className="h-5 w-5" />
                                ))}
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        {/* Mobile Drawer */}
                        <Drawer
                            open={isMobileMenuOpen}
                            onOpenChange={setIsMobileMenuOpen}
                        >
                            <DrawerTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full border border-gray-200 dark:border-gray-700"
                                >
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent className="border-t-0 rounded-t-3xl">
                                <div className="flex flex-col h-[90vh] max-h-[600px] bg-linear-to-b from-background to-background/95">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 shadow-lg">
                                                <Sparkles className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xl font-bold">
                                                    Das Auto Spa
                                                </span>
                                                <div className="text-sm text-muted-foreground">
                                                    Premium Service
                                                </div>
                                            </div>
                                        </div>
                                        <DrawerClose asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-full border"
                                                onClick={() =>
                                                    setIsMobileMenuOpen(false)
                                                }
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </DrawerClose>
                                    </div>

                                    {/* Navigation Links */}
                                    <div className="flex-1 px-4 py-2 space-y-2">
                                        {navItems.map((item) => (
                                            <DrawerClose
                                                asChild
                                                key={item.label}
                                            >
                                                <a
                                                    href={item.href}
                                                    onClick={() =>
                                                        setIsMobileMenuOpen(
                                                            false
                                                        )
                                                    }
                                                    className="flex items-center rounded-xl px-4 py-4 text-base font-medium transition-all hover:bg-linear-to-r hover:from-primary/5 hover:to-primary/10 hover:border-l-4 hover:border-primary hover:pl-5 group"
                                                >
                                                    {item.label}
                                                    <ChevronDown className="ml-auto h-4 w-4 rotate-90 opacity-60 group-hover:opacity-100" />
                                                </a>
                                            </DrawerClose>
                                        ))}
                                    </div>

                                    {/* Bottom Section */}
                                    <div className="space-y-6 p-6 pt-4 border-t">
                                        {/* Contact Info */}
                                        <div className="rounded-2xl bg-linear-to-r from-primary/5 to-primary/10 p-5 border border-primary/10">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 shadow-md">
                                                    <Phone className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">
                                                        Ready to Serve You
                                                    </div>
                                                    <div className="text-lg font-bold text-primary mt-1">
                                                        (555) 123-WASH
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>
                                                            8AM-8PM, 7 days a
                                                            week
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA Button */}
                                        <DrawerClose asChild>
                                            <Button
                                                className="w-full bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg text-lg py-6 rounded-xl"
                                                size="lg"
                                                onClick={() => {
                                                    handleBookNow();
                                                    setIsMobileMenuOpen(false);
                                                }}
                                            >
                                                Book Appointment Now
                                            </Button>
                                        </DrawerClose>

                                        {/* Tagline */}
                                        <div className="text-center text-sm text-muted-foreground italic">
                                            "Where Every Car Gets the Royal
                                            Treatment"
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
