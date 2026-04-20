"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Shipment } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  const { accessToken, user } = useAuth();

  const shipments = useQuery({
    queryKey: ["shipments", "recent"],
    queryFn: () =>
      api.get<Shipment[]>("/shipments?limit=8", { token: accessToken! }),
    enabled: !!accessToken,
  });

  const all = shipments.data ?? [];

  const counts = {
    total: all.length,
    active: all.filter((s) =>
      ["pending", "picked_up", "in_transit", "out_for_delivery"].includes(
        s.status,
      ),
    ).length,
    delivered: all.filter((s) => s.status === "delivered").length,
    issues: all.filter((s) =>
      ["failed_delivery", "returned", "at_customs"].includes(s.status),
    ).length,
  };

  return (
    <div className="px-8 lg:px-12 py-10 max-w-6xl">
      <PageHeader
        eyebrow={`Hello, ${user?.full_name.split(" ")[0] ?? ""}`}
        title="Today at a glance."
        description="A quick look at what's moving, what's stuck, and what's arrived."
        action={
          <Link href="/shipments/new" className="btn-primary">
            New shipment
          </Link>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line-strong border border-line-strong mb-12">
        <Stat label="Recent" value={counts.total} />
        <Stat label="Active" value={counts.active} accent />
        <Stat label="Delivered" value={counts.delivered} />
        <Stat
          label="Needs attention"
          value={counts.issues}
          warn={counts.issues > 0}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2
            className="font-display text-2xl font-medium"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            Recent shipments
          </h2>
          <Link
            href="/shipments"
            className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
          >
            View all →
          </Link>
        </div>

        {shipments.isLoading && (
          <div className="font-mono text-xs text-muted py-12 text-center">
            Loading…
          </div>
        )}

        {shipments.isError && (
          <div className="font-mono text-xs text-danger py-12 text-center">
            Could not load shipments. Check that the backend is running.
          </div>
        )}

        {shipments.data && shipments.data.length === 0 && (
          <div className="card p-12 text-center">
            <div
              className="font-display text-2xl text-ink mb-2"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              No shipments yet.
            </div>
            <p className="text-muted mb-6">
              Create your first shipment to see it here.
            </p>
            <Link href="/shipments/new" className="btn-primary">
              New shipment
            </Link>
          </div>
        )}

        {shipments.data && shipments.data.length > 0 && (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-strong">
                  <Th>Code</Th>
                  <Th>Status</Th>
                  <Th>Recipient</Th>
                  <Th>Destination</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {shipments.data.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-line last:border-b-0 hover:bg-paper/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/shipments/${s.id}`}
                        className="mono-code text-accent hover:underline underline-offset-4"
                      >
                        {s.tracking_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">{s.recipient_name}</td>
                    <td className="px-4 py-3 text-sm text-muted truncate max-w-[200px]">
                      {s.recipient_address.split(",").slice(-1)[0]?.trim()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-paper-elevated p-6">
      <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
        {label}
      </div>
      <div
        className="font-display text-5xl font-medium"
        style={{
          letterSpacing: "var(--tracking-tightest)",
          color: warn
            ? "var(--color-danger)"
            : accent
              ? "var(--color-accent)"
              : "var(--color-ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted font-normal">
      {children}
    </th>
  );
}