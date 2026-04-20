"use client";

import { useAuth } from "@/lib/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const { accessToken, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [accessToken, hydrated, router]);

  return (
    <main className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Loading manifest…
      </div>
    </main>
  );
}