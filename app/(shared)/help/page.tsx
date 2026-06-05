"use client";

import { Car, CreditCard, Calendar, XCircle, Clock, Star, CalendarOff, ClipboardList, CheckCircle, Bell, Users } from "lucide-react";
import { useUser } from "@/hooks/user-provider";

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  steps: string[];
}

const customerSections: HelpSection[] = [
  {
    icon: <Car className="w-5 h-5 text-blue-500" />,
    title: "How to Book a Car Wash",
    steps: [
      "From your dashboard, click Book a Car Wash.",
      "Enter your car details (make, model, colour, plate number) and upload a photo.",
      "Select the service package that suits you.",
      "Choose your preferred date and time slot, then enter your location.",
      "Review your booking summary and confirm.",
      "Complete payment to finalise your booking.",
    ],
  },
  {
    icon: <CreditCard className="w-5 h-5 text-green-500" />,
    title: "How to Pay",
    steps: [
      "Payment is made at the end of the booking flow on the Payment page.",
      "Once paid, your booking status changes to Confirmed.",
      "You will receive a notification confirming your payment.",
    ],
  },
  {
    icon: <Calendar className="w-5 h-5 text-purple-500" />,
    title: "How to Reschedule a Booking",
    steps: [
      "Go to Booking History from the sidebar.",
      "Find the booking you want to reschedule (only Pending, Confirmed, or Assigned bookings can be rescheduled).",
      "Click the Reschedule button and pick a new date and time slot.",
      "Confirm the change — the new schedule is saved immediately.",
    ],
  },
  {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    title: "How to Cancel a Booking",
    steps: [
      "Go to Booking History from the sidebar.",
      "Find the booking you want to cancel.",
      "Click the Cancel button and confirm in the popup.",
      "If the booking was paid, the admin will process a refund.",
    ],
  },
  {
    icon: <Star className="w-5 h-5 text-amber-500" />,
    title: "How to Leave a Review",
    steps: [
      "Once a booking is marked Completed, a Rate this wash button appears in Booking History.",
      "Click it, choose a star rating (1–5), and optionally add a comment.",
      "Submit your review — you can view it anytime under My Reviews.",
    ],
  },
  {
    icon: <Bell className="w-5 h-5 text-indigo-500" />,
    title: "Notifications",
    steps: [
      "The bell icon in the top-right corner shows your unread notifications.",
      "You'll be notified when your booking is confirmed, assigned, updated, or completed.",
      "Click any notification to mark it as read.",
    ],
  },
];

const providerSections: HelpSection[] = [
  {
    icon: <ClipboardList className="w-5 h-5 text-blue-500" />,
    title: "Viewing Your Jobs",
    steps: [
      "The Job Dashboard shows all bookings assigned to you.",
      "The Today tab shows only today's jobs sorted by time slot.",
      "The All Jobs tab shows every assigned booking across all dates.",
      "Click View on any booking to see full details.",
    ],
  },
  {
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    title: "Updating Job Status",
    steps: [
      "Open a booking from the Job Dashboard.",
      "Use the status buttons to update: En Route → In Progress → Completion Pending.",
      "Upload a proof-of-completion photo when the job is done.",
      "The admin will mark the booking as Completed after reviewing.",
    ],
  },
  {
    icon: <CalendarOff className="w-5 h-5 text-amber-500" />,
    title: "How to Request Leave",
    steps: [
      "Go to My Leave from the sidebar.",
      "Click Request Leave and fill in the date, leave type, and any notes.",
      "Submit the request — the admin will be notified.",
      "Once approved, you will receive a notification and the leave appears as Approved.",
      "On your leave date, you will not be assigned to new bookings.",
    ],
  },
  {
    icon: <Clock className="w-5 h-5 text-purple-500" />,
    title: "Job History",
    steps: [
      "Go to Job History from the sidebar to see all your completed and cancelled jobs.",
      "Use the date filter at the top-right to find jobs on a specific date.",
      "Customer ratings (stars) are shown next to completed jobs when available.",
    ],
  },
  {
    icon: <Star className="w-5 h-5 text-amber-500" />,
    title: "My Reviews",
    steps: [
      "Go to My Reviews from the sidebar to see all ratings left by customers.",
      "Each review shows the booking details, star rating, and customer comment.",
    ],
  },
];

const adminSections: HelpSection[] = [
  {
    icon: <ClipboardList className="w-5 h-5 text-blue-500" />,
    title: "Managing Bookings",
    steps: [
      "Go to Manage Bookings from the sidebar.",
      "The Today tab shows all bookings for today — assign a service provider to unassigned ones.",
      "The All Bookings tab lets you search, filter by status, date, or provider.",
      "Click on a provider name in the assignment panel to assign or unassign them.",
    ],
  },
  {
    icon: <CalendarOff className="w-5 h-5 text-amber-500" />,
    title: "Approving Leave Requests",
    steps: [
      "Go to Leave Management from the sidebar.",
      "The Pending tab shows all new leave requests awaiting your review.",
      "Click Approve to approve a request — the provider is notified and their leave date is blocked.",
      "Click Reject to decline with an optional note explaining the reason.",
    ],
  },
  {
    icon: <Users className="w-5 h-5 text-green-500" />,
    title: "Managing Users",
    steps: [
      "Go to Manage Users from the sidebar.",
      "You can view all customers and service providers.",
      "Use the search and role filters to find specific users.",
    ],
  },
  {
    icon: <Star className="w-5 h-5 text-amber-500" />,
    title: "Reviews",
    steps: [
      "Go to Reviews from the sidebar to see all customer reviews.",
      "You can reply to reviews — your reply is visible to the customer in their Booking History.",
    ],
  },
  {
    icon: <CreditCard className="w-5 h-5 text-purple-500" />,
    title: "Handling Refunds",
    steps: [
      "When a paid booking is cancelled, the payment status changes to Refund Required.",
      "Go to Manage Bookings, find the booking, and mark the payment as Refunded after processing.",
    ],
  },
];

export default function HelpPage() {
  const { role } = useUser();

  const sections =
    role === "customer" ? customerSections :
    role === "serviceProvider" ? providerSections :
    adminSections;

  const roleLabel =
    role === "customer" ? "Customer" :
    role === "serviceProvider" ? "Service Provider" :
    "Admin";

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Help & Guide</h1>
        <p className="text-gray-500 mt-1">{roleLabel} guide — everything you need to know</p>
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                {section.icon}
              </div>
              <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
            </div>
            <ol className="space-y-2">
              {section.steps.map((step, j) => (
                <li key={j} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {j + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
