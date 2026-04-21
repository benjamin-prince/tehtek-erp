"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type {
  Product,
  StockByProduct,
  StockMovement,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney } from "@/lib/format";
import clsx from "clsx";

type Action = "receive" | "issue" | "adjust" | null;

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const productQ = useQuery({
    queryKey: ["product", params.id],
    queryFn: () =>
      api.get<Product>(`/inventory/products/${params.id}`, {
        token: accessToken!,
      }),
    enabled: !!accessToken && !!params.id,
  });

  const stockQ = useQuery({
    queryKey: ["product-stock", params.id],
    queryFn: () =>
      api.get<StockByProduct>(`/inventory/products/${params.id}/stock`, {
        token: accessToken!,
      }),
    enabled: !!accessToken && !!params.id,
  });

  const movementsQ = useQuery({
    queryKey: ["product-movements", params.id],
    queryFn: () =>
      api.get<StockMovement[]>(
        `/inventory/movements?product_id=${params.id}&limit=50`,
        { token: accessToken! },
      ),
    enabled: !!accessToken && !!params.id,
  });

  const locationsQ = useQuery({
    queryKey: ["locations"],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; code: string }>>(
        "/locations?limit=500",
        { token: accessToken! },
      ),
    enabled: !!accessToken,
  });

  const [action, setAction] = useState<Action>(null);
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!locationId) throw new ApiError(400, "Validation", "Pick a location");
      const qty = parseFloat(quantity);
      if (!Number.isFinite(qty) || qty === 0) {
        throw new ApiError(400, "Validation", "Quantity must be non-zero");
      }
      if (action === "adjust") {
        return api.post(
          "/inventory/movements/adjust",
          {
            product_id: params.id,
            location_id: locationId,
            signed_quantity: qty,
            reference: reference || undefined,
            note: note || undefined,
          },
          { token: accessToken! },
        );
      }
      return api.post(
        `/inventory/movements/${action}`,
        {
          product_id: params.id,
          location_id: locationId,
          quantity: Math.abs(qty),
          reference: reference || undefined,
          note: note || undefined,
        },
        { token: accessToken! },
      );
    },
    onSuccess: () => {
      setFormError(null);
      setAction(null);
      setQuantity("");
      setReference("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["product-stock", params.id] });
      qc.invalidateQueries({ queryKey: ["product-movements", params.id] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError ? err.detail || "Failed" : "Network error",
      );
    },
  });

  if (productQ.isLoading)
    return (
      <div className="px-12 py-10 font-mono text-xs text-muted">Loading…</div>
    );
  if (productQ.isError || !productQ.data)
    return (
      <div className="px-12 py-10">
        <div className="font-mono text-xs text-danger mb-4">
          Could not load product.
        </div>
        <Link href="/products" className="btn-ghost">
          ← Back
        </Link>
      </div>
    );

  const p = productQ.data;
  const total = stockQ.data?.total_quantity ?? 0;
  const lowStock =
    p.low_stock_threshold != null && total < p.low_stock_threshold;

  const locationName = (id: string) =>
    locationsQ.data?.find((l) => l.id === id)?.name ?? id;

  return (
    <div className="px-8 lg:px-12 py-10 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/products"
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
        >
          ← All products
        </Link>
      </div>

      <PageHeader
        eyebrow={p.sku}
        title={p.name}
        description={p.description ?? undefined}
        action={
          <div className="text-right">
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-1">
              On hand
            </div>
            <div
              className="font-display text-5xl font-medium"
              style={{
                letterSpacing: "var(--tracking-tightest)",
                color: lowStock ? "var(--color-danger)" : "var(--color-ink)",
              }}
            >
              {total}
              <span className="text-lg text-muted ml-2">{p.unit}</span>
            </div>
            {lowStock && (
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-danger mt-1">
                Below threshold ({p.low_stock_threshold})
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          {/* Stock by location */}
          <section>
            <h2
              className="font-display text-2xl font-medium mb-6"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Stock by location
            </h2>
            {stockQ.data && stockQ.data.levels.length === 0 && (
              <div className="card p-8 text-center text-muted">
                No stock recorded yet. Use the actions panel to receive stock.
              </div>
            )}
            {stockQ.data && stockQ.data.levels.length > 0 && (
              <div className="card">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line-strong">
                      <Th>Location</Th>
                      <Th className="text-right">Quantity</Th>
                      <Th>Updated</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockQ.data.levels.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-line last:border-b-0"
                      >
                        <td className="px-4 py-3.5 text-sm">
                          {locationName(l.location_id)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-sm">
                          {l.quantity} {p.unit}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted">
                          {formatDate(l.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Movements timeline */}
          <section>
            <h2
              className="font-display text-2xl font-medium mb-6"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Recent movements
            </h2>
            {movementsQ.data && movementsQ.data.length === 0 && (
              <div className="card p-8 text-center text-muted">
                No movements yet.
              </div>
            )}
            {movementsQ.data && movementsQ.data.length > 0 && (
              <ol className="space-y-4">
                {movementsQ.data.map((m) => (
                  <MovementRow
                    key={m.id}
                    movement={m}
                    unit={p.unit}
                    locationName={locationName(m.location_id)}
                  />
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Sidebar — action panel + metadata */}
        <aside className="space-y-6">
          <div className="card p-6 sticky top-6">
            <h3
              className="font-display text-xl font-medium mb-4"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Stock action
            </h3>

            <div className="flex gap-2 flex-wrap mb-4">
              <ActionButton label="Receive" val="receive" current={action} onClick={setAction} />
              <ActionButton label="Issue" val="issue" current={action} onClick={setAction} />
              <ActionButton label="Adjust" val="adjust" current={action} onClick={setAction} />
            </div>

            {action && (
              <div className="space-y-4">
                <div>
                  <label className="label-base">Location</label>
                  <select
                    className="input-base"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <option value="">—</option>
                    {locationsQ.data?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-base">
                    {action === "adjust" ? "Signed quantity" : "Quantity"}
                  </label>
                  <input
                    className="input-base"
                    type="number"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={action === "adjust" ? "e.g. -2 or 5" : "0"}
                  />
                  {action === "adjust" && (
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mt-1">
                      Use a negative number to decrease stock
                    </p>
                  )}
                </div>

                <div>
                  <label className="label-base">Reference</label>
                  <input
                    className="input-base"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="PO, invoice, etc."
                  />
                </div>

                <div>
                  <label className="label-base">Note</label>
                  <input
                    className="input-base"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {formError && (
                  <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
                    {formError}
                  </div>
                )}

                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="btn-primary w-full"
                >
                  {mutation.isPending ? "Recording…" : "Record movement"}
                </button>
              </div>
            )}

            <div className="rule my-6" />

            <div className="space-y-3 text-sm">
              <Meta label="Default price" value={formatMoney(p.default_price, p.currency)} />
              {p.cost_price != null && (
                <Meta
                  label="Cost price"
                  value={formatMoney(p.cost_price, p.currency)}
                />
              )}
              {p.default_tax_rate > 0 && (
                <Meta
                  label="Default tax"
                  value={`${(p.default_tax_rate * 100).toFixed(1)}%`}
                />
              )}
              <Meta label="Unit" value={p.unit} />
              {p.weight_kg != null && (
                <Meta label="Weight" value={`${p.weight_kg} kg`} />
              )}
              {p.brand && <Meta label="Brand" value={p.brand} />}
              {p.barcode && <Meta label="Barcode" value={p.barcode} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  val,
  current,
  onClick,
}: {
  label: string;
  val: Exclude<Action, null>;
  current: Action;
  onClick: (v: Action) => void;
}) {
  const active = current === val;
  return (
    <button
      type="button"
      onClick={() => onClick(active ? null : val)}
      className={clsx(
        "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.15em] border transition-colors",
        active
          ? "bg-ink text-paper border-ink"
          : "border-line-strong text-muted hover:border-ink hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function MovementRow({
  movement: m,
  unit,
  locationName,
}: {
  movement: StockMovement;
  unit: string;
  locationName: string;
}) {
  const pos = m.signed_quantity > 0;
  const typeLabel = {
    receive: "Received",
    issue: "Issued",
    transfer_in: "Transferred in",
    transfer_out: "Transferred out",
    adjust: "Adjusted",
  }[m.type];

  return (
    <li className="card p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="font-mono text-[0.68rem] uppercase tracking-[0.15em]"
            style={{
              color: pos ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {typeLabel}
          </span>
          <span
            className="font-mono text-lg"
            style={{
              color: pos ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {pos ? "+" : ""}
            {m.signed_quantity} {unit}
          </span>
          <span className="font-mono text-xs text-muted">at {locationName}</span>
        </div>
        {(m.reference || m.note) && (
          <div className="text-xs text-muted mt-1 space-y-0.5">
            {m.reference && (
              <div>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em]">
                  Ref
                </span>{" "}
                {m.reference}
              </div>
            )}
            {m.note && <div className="italic">{m.note}</div>}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
          Balance
        </div>
        <div className="font-mono text-sm text-ink">
          {m.balance_after} {unit}
        </div>
        <div className="font-mono text-[0.65rem] text-muted mt-1">
          {formatDate(m.timestamp)}
        </div>
      </div>
    </li>
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