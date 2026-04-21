"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Order, OrderStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { formatDate, formatMoney, orderStatusLabel } from "@/lib/format";
import clsx from "clsx";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "paid", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const q = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      return api.get<Order[]>(`/orders${qs}`, { token: accessToken! });
    },
    enabled: !!accessToken,
  });

  return (
    <div className="px-8 lg:px-12 py-10 max-w-6xl">
      <PageHeader
        eyebrow="02 — Orders"
        title="Orders."
        description="Customer orders with line items and pricing. Orders feed into documents and shipments."
        action={
          <Link href="/orders/new" className="btn-primary">
            New order
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
          Could not load orders.{" "}
          {q.error instanceof ApiError ? q.error.detail : null}
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="card p-12 text-center">
          <div
            className="font-display text-2xl text-ink mb-2"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            No orders{filter !== "all" ? ` with status "${orderStatusLabel[filter]}"` : ""}.
          </div>
          <p className="text-muted mb-6">
            {filter === "all"
              ? "Create your first order to get started."
              : "Try another filter or create a new order."}
          </p>
          <Link href="/orders/new" className="btn-primary">
            New order
          </Link>
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong">
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-line last:border-b-0 hover:bg-paper/60 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/orders/${o.id}`}
                      className="mono-code text-accent hover:underline underline-offset-4"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-sm">{o.customer_name}</td>
                  <td className="px-4 py-3.5">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm">
                    {formatMoney(o.grand_total, o.currency)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted">
                    {formatDate(o.created_at)}
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

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={clsx(
        "text-left px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted font-normal",
        className,
      )}
    >
      {children}
    </th>
  );
}