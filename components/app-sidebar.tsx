"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronsUpDown, User, Shield, LogOut, Car } from "lucide-react";
import { sidebarMenus } from "@/lib/sidebar-menu";
import supabase from "@/lib/supabase";

type Role = "customer" | "admin" | "serviceProvider";

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
    const { isMobile } = useSidebar();

    const menuGroups = sidebarMenus[role] ?? [];

    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const isMenuActive = (url: string) =>
        pathname === url || pathname.startsWith(url + "/");

    /* ================= LOAD USER ================= */
    useEffect(() => {
        const loadUser = async () => {
            const { data: authData } = await supabase.auth.getUser();

            if (!authData.user) {
                router.push("/login");
                return;
            }

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("full_name, email, role")
                .eq("id", authData.user.id)
                .single();

            if (error || !profile) {
                console.error("Failed to load profile", error);
                return;
            }

            const initials = profile.full_name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p: string) => p[0].toUpperCase())
                .join("");

            setUserData({
                name: profile.full_name,
                email: profile.email,
                role: profile.role,
                initials,
            });

            setIsLoaded(true);
        };

        loadUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <Sidebar {...props}>
            {/* ===== HEADER ===== */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
                                <Car className="size-4" />
                            </div>
                            <span className="font-semibold">Das Auto Spa</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* ===== CONTENT ===== */}
            <SidebarContent>
                {menuGroups.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="text-xs uppercase text-muted-foreground">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isMenuActive(
                                                    item.url
                                                )}
                                                tooltip={item.title}
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
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* ===== FOOTER ===== */}
            <SidebarFooter>
                {!isLoaded || !userData ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback>
                                        {userData.initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <div className="font-medium truncate">
                                        {userData.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {userData.role}
                                    </div>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            side={isMobile ? "bottom" : "right"}
                            align="end"
                        >
                            <DropdownMenuLabel>
                                {userData.email}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    onClick={() => router.push("/profile")}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>

                                <DropdownMenuItem>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Security
                                </DropdownMenuItem>
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-600"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
