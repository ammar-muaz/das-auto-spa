"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { HeaderBell } from "@/components/header-bell";

export function UserHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const isSettings = pathname?.includes("/settings");
    const isHelp = pathname?.includes("/help");

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 md:px-8">
            <SidebarTrigger className="-ml-1" />
            {(isSettings || isHelp) && (
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors ml-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            )}
            <div className="ml-auto">
                <HeaderBell />
            </div>
        </header>
    );
}
