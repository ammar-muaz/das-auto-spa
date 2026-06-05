import { Inter } from "next/font/google";
import "../globals.css";
import type { Metadata } from "next";
import ProviderClientLayout from "./provider-layout";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Das Auto Spa", template: "%s | Das Auto Spa" },
  description: "Door-to-Door Car Wash Booking System",
};

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ProviderClientLayout>{children}</ProviderClientLayout>
        </Providers>
      </body>
    </html>
  );
}
