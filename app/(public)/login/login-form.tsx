"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";
import supabase from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            setError(error?.message || "Invalid email or password");
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (profile?.role === "admin") router.push("/admin/dashboard");
        else if (profile?.role === "serviceProvider")
            router.push("/provider/dashboard");
        else router.push("/customer/dashboard");
    };

    return (
        <form
            className={cn("flex flex-col gap-6", className)}
            {...props}
            onSubmit={handleLogin}
        >
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">
                        Login to your account
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Enter your email below to login
                    </p>
                </div>

                <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                        id="password"
                        type="password"
                        placeholder="******"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </Field>

                {error && (
                    <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <Field>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Login"}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    );
}
