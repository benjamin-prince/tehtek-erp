"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Product, ProductCreate, ProductStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function NewProductPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<ProductCreate>({
    sku: "",
    name: "",
    default_price: 0,
    default_tax_rate: 0,
    currency: "EUR",
    unit: "unit",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProductCreate>(
    key: K,
    value: ProductCreate[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) payload[k] = v;
    });

    try {
      const created = await api.post<Product>(
        "/inventory/products",
        payload,
        { token: accessToken! },
      );
      router.push(`/products/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || "Create failed");
      } else {
        setError("Network error");
      }
      setLoading(false);
    }
  }

  return (
    <div className="px-8 lg:px-12 py-10 max-w-4xl">
      <PageHeader
        eyebrow="06 — Products / new"
        title="New product."
        description="Add a product to the catalog. Stock will be tracked separately per location."
      />

      <form onSubmit={onSubmit} className="space-y-12">
        <Section num="A" title="Identification">
          <Field label="SKU" required>
            <input
              className="input-base font-mono"
              value={form.sku}
              onChange={(e) => update("sku", e.target.value)}
              required
              placeholder="WIDGET-001"
            />
          </Field>
          <Field label="Barcode (EAN/UPC)">
            <input
              className="input-base font-mono"
              value={form.barcode ?? ""}
              onChange={(e) => update("barcode", e.target.value)}
            />
          </Field>
          <Field label="Name" required colSpan={2}>
            <input
              className="input-base"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </Field>
          <Field label="Description" colSpan={2}>
            <textarea
              className="input-base resize-none"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <Field label="Category">
            <input
              className="input-base"
              value={form.category ?? ""}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Electronics, Clothing, etc."
            />
          </Field>
          <Field label="Brand">
            <input
              className="input-base"
              value={form.brand ?? ""}
              onChange={(e) => update("brand", e.target.value)}
            />
          </Field>
        </Section>

        <Section num="B" title="Pricing">
          <Field label="Default price" required>
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              value={form.default_price ?? 0}
              onChange={(e) =>
                update("default_price", parseFloat(e.target.value) || 0)
              }
              required
            />
          </Field>
          <Field label="Currency">
            <select
              className="input-base"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="XAF">XAF</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label="Default tax rate">
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.default_tax_rate ?? 0}
              onChange={(e) =>
                update("default_tax_rate", parseFloat(e.target.value) || 0)
              }
              placeholder="0.19 = 19%"
            />
          </Field>
          <Field label="Cost price">
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price ?? ""}
              onChange={(e) =>
                update(
                  "cost_price",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
        </Section>

        <Section num="C" title="Physical & stock">
          <Field label="Unit">
            <input
              className="input-base"
              value={form.unit ?? "unit"}
              onChange={(e) => update("unit", e.target.value)}
              placeholder="unit, kg, l, m"
            />
          </Field>
          <Field label="Low-stock threshold">
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              value={form.low_stock_threshold ?? ""}
              onChange={(e) =>
                update(
                  "low_stock_threshold",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              value={form.weight_kg ?? ""}
              onChange={(e) =>
                update(
                  "weight_kg",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
          <Field label="Volume (m³)">
            <input
              className="input-base"
              type="number"
              step="0.001"
              min="0"
              value={form.volume_m3 ?? ""}
              onChange={(e) =>
                update(
                  "volume_m3",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
          <Field label="Status">
            <select
              className="input-base"
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as ProductStatus)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </Field>
          <Field label="Image URL">
            <input
              className="input-base"
              type="url"
              value={form.image_url ?? ""}
              onChange={(e) => update("image_url", e.target.value)}
            />
          </Field>
        </Section>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Link href="/products" className="btn-ghost">
            ← Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-line">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent">
          {num}
        </span>
        <h2
          className="font-display text-xl font-medium"
          style={{ letterSpacing: "var(--tracking-tightest)" }}
        >
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  colSpan,
  children,
}: {
  label: string;
  required?: boolean;
  colSpan?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="label-base">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}