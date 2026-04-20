"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { TokenPair } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.post<TokenPair>(
        "/auth/login",
        { email, password },
        { auth: false },
      );
      setSession({
        access: tokens.access_token,
        refresh: tokens.refresh_token,
        user: tokens.user,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || "Login failed");
      } else {
        setError("Network error — is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
        Sign in
      </div>
      <h2
        className="font-display text-4xl font-medium mb-10"
        style={{ letterSpacing: "var(--tracking-tightest)" }}
      >
        Welcome back.
      </h2>

      <form onSubmit={onSubmit} className="space-y-7">
        <div>
          <label htmlFor="email" className="label-base">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-base">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/register"
            className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
          >
            Create account →
          </Link>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}