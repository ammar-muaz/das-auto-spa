"use client";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { getPageTitle } from "@/hooks/get-page-title";
import { ModeToggle } from "./mode-toggle";

export function UserHeader() {
    const pathname = usePathname();
    const pageTitle = getPageTitle(pathname);

    return (
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur sticky top-0 z-50 px-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 data-[state=open]:bg-accent transition-all duration-200 hover:scale-105" />

                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-sm font-semibold text-foreground">
                                {pageTitle}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex items-center gap-3">
                <ModeToggle />
            </div>
        </header>
    );
}
