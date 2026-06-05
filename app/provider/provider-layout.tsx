"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserHeader } from "@/components/user-header";
import { AppSidebar } from "@/components/app-sidebar";
import { UserProvider, useUser } from "@/hooks/user-provider";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { role, loading } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-mobile": "20rem" } as React.CSSProperties}>
      {role && <AppSidebar role={role} />}
      <SidebarInset>
        <UserHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function ProviderClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <LayoutContent>{children}</LayoutContent>
    </UserProvider>
  );
}
