"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { TokenPair } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.post<TokenPair>(
        "/auth/register",
        { full_name: fullName, email, phone: phone || undefined, password },
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
        setError(err.detail || "Registration failed");
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
        New account
      </div>
      <h2
        className="font-display text-4xl font-medium mb-3"
        style={{ letterSpacing: "var(--tracking-tightest)" }}
      >
        Get started.
      </h2>
      <p className="text-sm text-muted mb-10">
        Customer accounts are free. Internal roles are created by an admin.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="label-base">
            Full name
          </label>
          <input
            id="fullName"
            required
            className="input-base"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

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
          />
        </div>

        <div>
          <label htmlFor="phone" className="label-base">
            Phone (optional)
          </label>
          <input
            id="phone"
            type="tel"
            className="input-base"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            minLength={8}
            autoComplete="new-password"
            className="input-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/login"
            className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
          >
            ← Sign in instead
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}