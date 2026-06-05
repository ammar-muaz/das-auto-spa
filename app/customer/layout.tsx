import { Inter } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";
import ClientLayout from "./client-layout";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Das Auto Spa", template: "%s | Das Auto Spa" },
  description: "Door-to-Door Car Wash Booking System",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
