import {
    LayoutDashboard,
    CarFront,
    CalendarClock,
    Sparkles,
    History,
    CreditCard,
    MapPin,
    Settings,
    LifeBuoy,
    Package,
    Users,
    ShieldCheck,
    ClipboardList,
} from "lucide-react";

export type SidebarMenuGroup = {
    title: string;
    items: {
        title: string;
        url: string;
        icon: any;
    }[];
};

export const sidebarMenus: Record<string, SidebarMenuGroup[]> = {
    customer: [
        {
            title: "My Garage",
            items: [
                {
                    title: "Dashboard",
                    url: "/customer/dashboard",
                    icon: LayoutDashboard,
                },
                {
                    title: "My Vehicles",
                    url: "/customer/vehicles",
                    icon: CarFront,
                },
            ],
        },
        {
            title: "Services & Booking",
            items: [
                {
                    title: "Book a Wash",
                    url: "/customer/book",
                    icon: Sparkles,
                },
                {
                    title: "Appointments",
                    url: "/customer/appointments",
                    icon: CalendarClock,
                },
                {
                    title: "Service Menu",
                    url: "/customer/services",
                    icon: Package,
                },
                {
                    title: "Locations",
                    url: "/customer/locations",
                    icon: MapPin,
                },
            ],
        },
        {
            title: "Membership & History",
            items: [
                {
                    title: "Service History",
                    url: "/customer/history",
                    icon: History,
                },

                {
                    title: "Invoices",
                    url: "/customer/invoices",
                    icon: CreditCard,
                },
            ],
        },
        {
            title: "Support",
            items: [
                {
                    title: "Help Center",
                    url: "/customer/support",
                    icon: LifeBuoy,
                },
                {
                    title: "Settings",
                    url: "/customer/settings",
                    icon: Settings,
                },
            ],
        },
    ],

    admin: [
        {
            title: "Admin Panel",
            items: [
                {
                    title: "Dashboard",
                    url: "/admin/dashboard",
                    icon: LayoutDashboard,
                },
                {
                    title: "Users",
                    url: "/admin/users",
                    icon: Users,
                },
                {
                    title: "Services",
                    url: "/admin/services",
                    icon: Package,
                },
            ],
        },
        {
            title: "System",
            items: [
                {
                    title: "Settings",
                    url: "/admin/settings",
                    icon: Settings,
                },
                {
                    title: "Security",
                    url: "/admin/security",
                    icon: ShieldCheck,
                },
            ],
        },
    ],

    serviceProvider: [
        {
            title: "Work",
            items: [
                {
                    title: "Dashboard",
                    url: "/provider/dashboard",
                    icon: LayoutDashboard,
                },
                {
                    title: "Jobs",
                    url: "/provider/jobs",
                    icon: ClipboardList,
                },
                {
                    title: "Locations",
                    url: "/provider/locations",
                    icon: MapPin,
                },
            ],
        },
        {
            title: "Support",
            items: [
                {
                    title: "Help Center",
                    url: "/provider/support",
                    icon: LifeBuoy,
                },
            ],
        },
    ],
};
