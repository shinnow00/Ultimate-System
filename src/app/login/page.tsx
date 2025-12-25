"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("DEBUG: Login error:", error);
                setError(error.message);
                setLoading(false);
                return;
            }

            // Redirect to dashboard on success
            router.push("/");
            router.refresh();
        } catch {
            setError("An unexpected error occurred");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-discord-bg flex items-center justify-center p-4">
            {/* Login Card - Discord Style */}
            <div className="w-full max-w-md bg-discord-sidebar rounded-lg shadow-2xl p-8">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 p-2 shadow-lg">
                        <img src="/logo.svg" alt="Ultimate" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-discord-text">Ultimate System</h1>
                    <p className="text-discord-text-muted mt-1">Ready for the ultimate workflow?</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
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
                            placeholder="Enter your password"
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
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Logging in...
                            </span>
                        ) : (
                            "Log In"
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <p className="text-sm text-discord-text-muted mt-4">
                    Need an account?{" "}
                    <Link href="/register" className="text-discord-blurple hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div >
    );
}
