"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, statusLabel } from "@/lib/format";
import clsx from "clsx";

const FILTERS: { value: ShipmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
];

export default function ShipmentsPage() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<ShipmentStatus | "all">("all");

  const q = useQuery({
    queryKey: ["shipments", filter],
    queryFn: () => {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      return api.get<Shipment[]>(`/shipments${qs}`, { token: accessToken! });
    },
    enabled: !!accessToken,
  });

  return (
    <div className="px-8 lg:px-12 py-10 max-w-6xl">
      <PageHeader
        eyebrow="01 — Shipments"
        title="Shipments."
        description="Every package in the system. Filter by status, open one to see its full journey."
        action={
          <Link href="/shipments/new" className="btn-primary">
            New shipment
          </Link>
        }
      />

      <div className="flex gap-2 flex-wrap mb-8">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.15em] border transition-colors",
              filter === f.value
                ? "bg-ink text-paper border-ink"
                : "border-line-strong text-muted hover:border-ink hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading && (
        <div className="font-mono text-xs text-muted py-12 text-center">
          Loading…
        </div>
      )}

      {q.isError && (
        <div className="font-mono text-xs text-danger py-12 text-center">
          Could not load shipments.
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="card p-12 text-center">
          <div
            className="font-display text-2xl text-ink mb-2"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            No shipments
            {filter !== "all" ? ` with status "${statusLabel[filter]}"` : ""}.
          </div>
          <p className="text-muted mb-6">
            {filter === "all"
              ? "Create your first shipment to get started."
              : "Try another filter or create a new shipment."}
          </p>
          <Link href="/shipments/new" className="btn-primary">
            New shipment
          </Link>
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong">
                <Th>Code</Th>
                <Th>Status</Th>
                <Th>Sender</Th>
                <Th>Recipient</Th>
                <Th>Weight</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line last:border-b-0 hover:bg-paper/60 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/shipments/${s.id}`}
                      className="mono-code text-accent hover:underline underline-offset-4"
                    >
                      {s.tracking_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm">{s.sender_name}</td>
                  <td className="px-4 py-3.5 text-sm">{s.recipient_name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted">
                    {s.weight_kg ? `${s.weight_kg} kg` : "—"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted">
                    {formatDate(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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