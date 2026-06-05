"use client";

import supabase from "@/lib/supabase";
import { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile, Role, ProfileRow } from "@/lib/types";
import { mapProfile } from "@/lib/types";

interface UserContextType {
  userId: string | null;
  email: string | null;
  role: Role | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (!error && data) {
      setProfile(mapProfile(data as ProfileRow));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      } else {
        loadUser();
      }
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  return (
    <UserContext.Provider
      value={{
        userId: profile?.id ?? null,
        email: profile?.email ?? null,
        role: profile?.role ?? null,
        fullName: profile?.fullName ?? null,
        phone: profile?.phone ?? null,
        address: profile?.address ?? null,
        loading,
        refreshProfile: loadUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
}
