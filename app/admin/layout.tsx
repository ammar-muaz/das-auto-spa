import { Poppins } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";
import ClientLayout from "./admin-layout";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
    title: {
        default: "Das Auto Spa",
        template: "%s | Das Auto Spa",
    },
    description: "Door-to-Door Car Wash Booking System",
};

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${poppins.className} antialiased`}>
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
