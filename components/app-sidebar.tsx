"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreVertical, LogOut, Settings, HelpCircle } from "lucide-react";
import { sidebarMenus } from "@/lib/sidebar-menu";
import supabase from "@/lib/supabase";

type Role = "customer" | "admin" | "serviceProvider";

const ROLE_SUBTITLE: Record<Role, string> = {
  customer: "Customer Portal",
  admin: "Admin Portal",
  serviceProvider: "Provider Portal",
};

interface UserData {
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export function AppSidebar({
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuGroups = sidebarMenus[role] ?? [];
  const allItems = menuGroups.flatMap((g) => g.items);

  const [userData, setUserData] = useState<UserData | null>(null);

  const isMenuActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  useEffect(() => {
    const loadUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", authData.user.id)
        .single();

      if (!profile) return;

      const cleanName = profile.full_name.replace(/\s*\(.*?\)/g, "").trim();
      const initials = cleanName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0]?.toUpperCase())
        .join("") || "U";

      setUserData({ name: profile.full_name, email: profile.email, role: profile.role, initials });
    };
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      {/* HEADER */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none select-none">
              <img src="/logo.png" alt="Das Auto Spa" className="h-8 w-8 object-contain rounded-lg shrink-0" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Das Auto Spa</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_SUBTITLE[role]}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        <SidebarMenu className="gap-1 px-2">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isMenuActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={active ? "bg-gray-900 text-white hover:bg-gray-800 hover:text-white" : ""}
                >
                  <Link href={item.url}>
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Avatar className="h-8 w-8 rounded-full shrink-0">
                <AvatarFallback className="rounded-full bg-gray-900 text-white text-xs font-bold">
                  {userData?.initials ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{userData?.name ?? ""}</span>
                <span className="truncate text-xs text-muted-foreground">{userData?.email ?? ""}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-gray-100 shrink-0 outline-none group-data-[collapsible=icon]:hidden">
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-lg" side="top" align="end" sideOffset={4}>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Avatar className="h-8 w-8 rounded-full shrink-0">
                      <AvatarFallback className="rounded-full bg-gray-900 text-white text-xs font-bold">
                        {userData?.initials ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userData?.name ?? ""}</span>
                      <span className="truncate text-xs text-muted-foreground">{userData?.email ?? ""}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/help")}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Get Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
