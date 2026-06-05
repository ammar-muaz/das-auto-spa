"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/language-context";
import { FontSizeProvider } from "@/lib/font-size-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <FontSizeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </FontSizeProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
