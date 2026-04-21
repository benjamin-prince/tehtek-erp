"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { OrderDetail, OrderStatus } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { OrderStatusBadge } from "@/components/order-status-badge";
import {
  formatDate,
  formatMoney,
  orderStatusLabel,
} from "@/lib/format";

const STATUS_FLOW: OrderStatus[] = [
  "draft",
  "confirmed",
  "paid",
  "preparing",
  "ready_to_ship",
  "shipped",
  "delivered",
];
const END_STATUSES: OrderStatus[] = ["cancelled", "refunded"];

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["order", params.id],
    queryFn: () =>
      api.get<OrderDetail>(`/orders/${params.id}`, { token: accessToken! }),
    enabled: !!accessToken && !!params.id,
  });

  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (patch: Partial<OrderDetail>) =>
      api.patch<OrderDetail>(`/orders/${params.id}`, patch, {
        token: accessToken!,
      }),
    onSuccess: () => {
      setUpdateError(null);
      setNewStatus("");
      qc.invalidateQueries({ queryKey: ["order", params.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => {
      setUpdateError(
        err instanceof ApiError
          ? err.detail || "Update failed"
          : "Network error",
      );
    },
  });

  if (q.isLoading) {
    return (
      <div className="px-12 py-10 font-mono text-xs text-muted">Loading…</div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="px-12 py-10">
        <div className="font-mono text-xs text-danger mb-4">
          Could not load order.
        </div>
        <Link href="/orders" className="btn-ghost">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const o = q.data;

  return (
    <div className="px-8 lg:px-12 py-10 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/orders"
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
        >
          ← All orders
        </Link>
      </div>

      <PageHeader
        eyebrow={o.order_number}
        title={o.customer_name}
        action={<OrderStatusBadge status={o.status} size="md" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {/* Customer */}
          <section className="card p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
                  Customer
                </div>
                <div
                  className="font-display text-xl mb-1"
                  style={{ letterSpacing: "var(--tracking-tightest)" }}
                >
                  {o.customer_name}
                </div>
                {o.customer_email && (
                  <div className="text-sm text-muted">{o.customer_email}</div>
                )}
                {o.customer_phone && (
                  <div className="text-sm text-muted">{o.customer_phone}</div>
                )}
              </div>

              <div className="md:border-l md:border-line md:pl-8 space-y-4">
                {o.billing_address && (
                  <div>
                    <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mb-1">
                      Billing
                    </div>
                    <div className="text-sm">{o.billing_address}</div>
                  </div>
                )}
                {o.shipping_address && (
                  <div>
                    <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mb-1">
                      Shipping
                    </div>
                    <div className="text-sm">{o.shipping_address}</div>
                  </div>
                )}
              </div>
            </div>

            {o.notes && (
              <>
                <div className="rule my-6" />
                <div>
                  <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-2">
                    Notes
                  </div>
                  <p className="text-sm italic text-muted">{o.notes}</p>
                </div>
              </>
            )}
          </section>

          {/* Line items */}
          <section>
            <h2
              className="font-display text-2xl font-medium mb-6"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Line items
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-strong">
                    <Th>Item</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Unit price</Th>
                    <Th className="text-right">Discount</Th>
                    <Th className="text-right">Tax</Th>
                    <Th className="text-right">Line total</Th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-b border-line last:border-b-0 align-top"
                    >
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-ink">{it.name}</div>
                        {it.description && (
                          <div className="text-xs text-muted mt-0.5">
                            {it.description}
                          </div>
                        )}
                        {it.sku && (
                          <div className="font-mono text-[0.65rem] text-muted mt-1">
                            SKU · {it.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">
                        {it.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">
                        {formatMoney(it.unit_price, o.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-muted">
                        {it.discount > 0
                          ? `− ${formatMoney(it.discount, o.currency)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-muted">
                        {it.tax_rate > 0 ? `${(it.tax_rate * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm">
                        {formatMoney(it.line_total, o.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section className="card p-8 bg-paper">
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-4">
              Summary
            </div>
            <dl className="space-y-2 text-sm max-w-sm ml-auto">
              <Row label="Subtotal" value={formatMoney(o.subtotal, o.currency)} />
              {o.discount_total > 0 && (
                <Row
                  label="Discount"
                  value={`− ${formatMoney(o.discount_total, o.currency)}`}
                />
              )}
              {o.tax_total > 0 && (
                <Row label="Tax" value={formatMoney(o.tax_total, o.currency)} />
              )}
              {o.shipping_total > 0 && (
                <Row
                  label="Shipping"
                  value={formatMoney(o.shipping_total, o.currency)}
                />
              )}
              <div className="rule my-3" />
              <Row
                label="Grand total"
                value={formatMoney(o.grand_total, o.currency)}
                big
              />
            </dl>
          </section>
        </div>

        {/* Sidebar: status change + metadata */}
        <aside className="space-y-6">
          <div className="card p-6 sticky top-6">
            <h3
              className="font-display text-xl font-medium mb-1"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Update status
            </h3>
            <p className="text-xs text-muted mb-6">
              Change the order&apos;s state in the pipeline.
            </p>

            <div className="space-y-4">
              <div>
                <label className="label-base">New status</label>
                <select
                  className="input-base"
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as OrderStatus | "")
                  }
                >
                  <option value="">—</option>
                  {[...STATUS_FLOW, ...END_STATUSES]
                    .filter((s) => s !== o.status)
                    .map((s) => (
                      <option key={s} value={s}>
                        {orderStatusLabel[s]}
                      </option>
                    ))}
                </select>
              </div>

              {updateError && (
                <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
                  {updateError}
                </div>
              )}

              <button
                onClick={() =>
                  newStatus && update.mutate({ status: newStatus })
                }
                disabled={!newStatus || update.isPending}
                className="btn-primary w-full"
              >
                {update.isPending ? "Updating…" : "Apply"}
              </button>
            </div>

            <div className="rule my-6" />

            <div className="space-y-3 text-sm">
              <Meta label="Created" value={formatDate(o.created_at)} />
              {o.confirmed_at && (
                <Meta label="Confirmed" value={formatDate(o.confirmed_at)} />
              )}
              {o.paid_at && (
                <Meta label="Paid" value={formatDate(o.paid_at)} />
              )}
              <Meta label="Currency" value={o.currency} />
            </div>
          </div>
        </aside>
      </div>
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
      className={`text-left px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted font-normal ${className}`}
    >
      {children}
    </th>
  );
}

function Row({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <dt
        className={
          big
            ? "font-display text-base text-ink"
            : "font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted"
        }
      >
        {label}
      </dt>
      <dd
        className={
          big
            ? "font-display text-2xl text-ink"
            : "font-mono text-sm text-ink"
        }
        style={big ? { letterSpacing: "var(--tracking-tightest)" } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mb-0.5">
        {label}
      </div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}