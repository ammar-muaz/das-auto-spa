"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserHeader } from "@/components/user-header";
import { AppSidebar } from "@/components/app-sidebar";
import { UserProvider, useUser } from "@/hooks/user-provider";

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { role, loading } = useUser();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Loading...
            </div>
        );
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "16rem",
                    "--sidebar-width-mobile": "20rem",
                } as React.CSSProperties
            }
        >
            {role && <AppSidebar role={role} />}

            <SidebarInset>
                <UserHeader />
                <main className="flex-1 overflow-auto bg-linear-to-b from-background to-muted/20">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <UserProvider>
                <LayoutContent>{children}</LayoutContent>
            </UserProvider>
        </ThemeProvider>
    );
}
