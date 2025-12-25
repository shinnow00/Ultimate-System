"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();

            // 1. Sign up user
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (signUpError) {
                console.error("DEBUG: Registration error:", signUpError);
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                // 2. Profile creation is usually handled by a DB trigger, 
                // but let's ensure it exists or create it if needed.
                // Our current schema setup likely has a trigger, but 
                // we'll redirect and let the dashboard handle profile fetching.

                router.push("/");
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-discord-bg flex items-center justify-center p-4 content-center">
            {/* Register Card - Discord Style */}
            <div className="w-full max-w-md bg-discord-sidebar rounded-lg shadow-2xl p-8">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 p-2 shadow-lg">
                        <img src="/logo.svg" alt="Ultimate" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-discord-text">Create an account</h1>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleRegister} className="space-y-5">
                    {/* Email Field */}
                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple transition-all"
                            placeholder="Enter your email"
                        />
                    </div>

                    {/* Full Name Field */}
                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple transition-all"
                            placeholder="Enter your full name"
                        />
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-xs font-bold text-discord-text-muted uppercase tracking-wide mb-2">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 bg-discord-dark border-none rounded text-discord-text placeholder-discord-text-muted focus:outline-none focus:ring-2 focus:ring-discord-blurple transition-all"
                            placeholder="Create a password"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-discord-blurple hover:bg-discord-blurple/80 disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium text-white transition-colors"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" />
                                Joining...
                            </span>
                        ) : (
                            "Continue"
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <p className="text-sm text-discord-blurple mt-4">
                    <Link href="/login" className="hover:underline">
                        Already have an account?
                    </Link>
                </p>

                <p className="text-xs text-discord-text-muted mt-4">
                    By registering, you agree to Ultimate System&apos;s Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
