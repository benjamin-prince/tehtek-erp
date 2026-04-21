"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Product, ProductStatus } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney } from "@/lib/format";
import clsx from "clsx";

const STATUS_FILTERS: { value: ProductStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
];

export default function ProductsPage() {
  const { accessToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">(
    "active",
  );
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const q = useQuery({
    queryKey: ["products", statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");
      return api.get<Product[]>(`/inventory/products?${params.toString()}`, {
        token: accessToken!,
      });
    },
    enabled: !!accessToken,
  });

  return (
    <div className="px-8 lg:px-12 py-10 max-w-6xl">
      <PageHeader
        eyebrow="06 — Inventory"
        title="Products."
        description="Catalog of items you buy, sell, or ship. Stock levels are tracked per location."
        action={
          <Link href="/products/new" className="btn-primary">
            New product
          </Link>
        }
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchDraft.trim());
          }}
          className="flex-1"
        >
          <input
            type="search"
            placeholder="Search by name, SKU, or barcode…"
            className="input-base"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </form>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={clsx(
              "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.15em] border transition-colors",
              statusFilter === f.value
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
          Could not load products.{" "}
          {q.error instanceof ApiError ? q.error.detail : null}
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="card p-12 text-center">
          <div
            className="font-display text-2xl text-ink mb-2"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            No products match.
          </div>
          <p className="text-muted mb-6">
            Add your first product to start tracking stock.
          </p>
          <Link href="/products/new" className="btn-primary">
            New product
          </Link>
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong">
                <Th>SKU</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
                <Th>Added</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-line last:border-b-0 hover:bg-paper/60 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/products/${p.id}`}
                      className="mono-code text-accent hover:underline underline-offset-4"
                    >
                      {p.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-sm">{p.name}</td>
                  <td className="px-4 py-3.5 text-sm text-muted">
                    {p.category || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm">
                    {formatMoney(p.default_price, p.currency)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted">
                    {formatDate(p.created_at)}
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

function StatusPill({ status }: { status: ProductStatus }) {
  const tone =
    status === "active"
      ? { fg: "var(--color-success)", bg: "var(--tone-success-bg)" }
      : status === "discontinued"
        ? { fg: "var(--color-danger)", bg: "var(--tone-danger-bg)" }
        : { fg: "var(--color-muted)", bg: "var(--tone-neutral-bg)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[0.68rem] font-mono uppercase tracking-[0.1em] border"
      style={{
        color: tone.fg,
        backgroundColor: tone.bg,
        borderColor: tone.fg,
      }}
    >
      {status}
    </span>
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