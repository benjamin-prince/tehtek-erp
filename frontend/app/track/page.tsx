"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function TrackLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/track/${encodeURIComponent(clean)}`);
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header className="px-8 py-6 border-b border-line">
        <Logo />
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-xl w-full">
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-4">
            Public tracking
          </div>
          <h1
            className="font-display text-5xl lg:text-6xl font-medium leading-[1] mb-4"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            Where&apos;s my <span className="text-accent italic">package</span>?
          </h1>
          <p className="text-muted mb-10">
            Enter the tracking code from your confirmation email or SMS.
          </p>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="label-base">Tracking code</label>
              <input
                className="input-base font-mono text-lg"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SH-XXXXXX"
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Track shipment
            </button>
          </form>

          <div className="mt-16 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted">
            <Link href="/login" className="hover:text-ink transition-colors">
              Staff sign in →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}