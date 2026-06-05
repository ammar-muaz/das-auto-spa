import {
  LayoutDashboard,
  Car,
  History,
  Star,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  CalendarOff,
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
      title: "Main",
      items: [
        { title: "Dashboard", url: "/customer/dashboard", icon: LayoutDashboard },
        { title: "Book a Car Wash", url: "/customer/book", icon: Car },
        { title: "Booking History", url: "/customer/history", icon: History },
        { title: "My Reviews", url: "/customer/reviews", icon: Star },
      ],
    },
  ],

  admin: [
    {
      title: "Admin Panel",
      items: [
        { title: "Admin Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Manage Bookings", url: "/admin/bookings", icon: ClipboardList },
        { title: "Manage Users", url: "/admin/users", icon: Users },
        { title: "Reports & Analytics", url: "/admin/reports", icon: BarChart3 },
        { title: "Leave Management", url: "/admin/leave", icon: CalendarOff },
        { title: "Service Packages", url: "/admin/packages", icon: Package },
        { title: "Reviews", url: "/admin/reviews", icon: Star },
      ],
    },
  ],

  serviceProvider: [
    {
      title: "Work",
      items: [
        { title: "Dashboard", url: "/provider/dashboard", icon: LayoutDashboard },
        { title: "Job History", url: "/provider/jobs", icon: History },
        { title: "Reviews", url: "/provider/reviews", icon: Star },
        { title: "My Leave", url: "/provider/leave", icon: CalendarOff },
      ],
    },
  ],
};
