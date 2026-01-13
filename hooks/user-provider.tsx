"use client";

import supabase from "@/lib/supabase";
import { createContext, useContext, useEffect, useState } from "react";

type Role = "customer" | "admin" | "serviceProvider";

interface UserContextType {
    userId: string | null;
    email: string | null;
    role: Role | null;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const { data: authData } = await supabase.auth.getUser();

            if (!authData.user) {
                setLoading(false);
                return;
            }

            setUserId(authData.user.id);
            setEmail(authData.user.email ?? null);

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", authData.user.id)
                .single();

            console.log(profile);
            if (!error && profile?.role) {
                setRole(profile.role as Role);
            }

            setLoading(false);
        };

        loadUser();

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!session?.user) {
                    setUserId(null);
                    setEmail(null);
                    setRole(null);
                    setLoading(false);
                } else {
                    loadUser();
                }
            }
        );

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    return (
        <UserContext.Provider
            value={{
                userId,
                email,
                role,
                loading,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used inside UserProvider");
    }
    return context;
}
