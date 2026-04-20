"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { CarrierType, Shipment, ShipmentCreate } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default function NewShipmentPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<ShipmentCreate>({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_address: "",
    currency: "EUR",
    piece_count: 1,
  });
  const [carrierType, setCarrierType] = useState<CarrierType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ShipmentCreate>(
    key: K,
    value: ShipmentCreate[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: ShipmentCreate = {
        ...form,
        ...(carrierType ? { carrier_type: carrierType as CarrierType } : {}),
      };
      const created = await api.post<Shipment>("/shipments", payload, {
        token: accessToken!,
      });
      router.push(`/shipments/${created.id}`);
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
        eyebrow="01 — Shipments / new"
        title="New shipment."
        description="Record sender, recipient, and package details. A tracking code will be generated automatically."
      />

      <form onSubmit={onSubmit} className="space-y-12">
        <Section num="A" title="Sender">
          <Field label="Name" required>
            <input
              className="input-base"
              value={form.sender_name}
              onChange={(e) => update("sender_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Phone" required>
            <input
              className="input-base"
              type="tel"
              value={form.sender_phone}
              onChange={(e) => update("sender_phone", e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="input-base"
              type="email"
              value={form.sender_email ?? ""}
              onChange={(e) => update("sender_email", e.target.value)}
            />
          </Field>
          <Field label="Address" required colSpan={2}>
            <input
              className="input-base"
              value={form.sender_address}
              onChange={(e) => update("sender_address", e.target.value)}
              required
              placeholder="Street, city, country"
            />
          </Field>
        </Section>

        <Section num="B" title="Recipient">
          <Field label="Name" required>
            <input
              className="input-base"
              value={form.recipient_name}
              onChange={(e) => update("recipient_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Phone" required>
            <input
              className="input-base"
              type="tel"
              value={form.recipient_phone}
              onChange={(e) => update("recipient_phone", e.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="input-base"
              type="email"
              value={form.recipient_email ?? ""}
              onChange={(e) => update("recipient_email", e.target.value)}
            />
          </Field>
          <Field label="Address" required colSpan={2}>
            <input
              className="input-base"
              value={form.recipient_address}
              onChange={(e) => update("recipient_address", e.target.value)}
              required
              placeholder="Street, city, country"
            />
          </Field>
        </Section>

        <Section num="C" title="Package">
          <Field label="Description" colSpan={2}>
            <input
              className="input-base"
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What's inside?"
            />
          </Field>
          <Field label="Weight (kg)">
            <input
              className="input-base"
              type="number"
              step="0.01"
              value={form.weight_kg ?? ""}
              onChange={(e) =>
                update(
                  "weight_kg",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
          <Field label="Pieces">
            <input
              className="input-base"
              type="number"
              min={1}
              value={form.piece_count ?? 1}
              onChange={(e) => update("piece_count", parseInt(e.target.value))}
            />
          </Field>
          <Field label="Declared value">
            <input
              className="input-base"
              type="number"
              step="0.01"
              value={form.declared_value ?? ""}
              onChange={(e) =>
                update(
                  "declared_value",
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
            />
          </Field>
          <Field label="Currency">
            <select
              className="input-base"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option>EUR</option>
              <option>USD</option>
              <option>XAF</option>
              <option>GBP</option>
            </select>
          </Field>
        </Section>

        <Section num="D" title="Carrier (optional)">
          <Field label="Carrier type" colSpan={2}>
            <select
              className="input-base"
              value={carrierType}
              onChange={(e) => setCarrierType(e.target.value as CarrierType | "")}
            >
              <option value="">— Not assigned yet —</option>
              <option value="driver">Driver (internal)</option>
              <option value="traveler">Traveler (plane)</option>
              <option value="middleman">Middleman</option>
              <option value="external">External courier</option>
            </select>
          </Field>
          {carrierType === "traveler" && (
            <>
              <Field label="Flight number">
                <input
                  className="input-base"
                  value={form.flight_number ?? ""}
                  onChange={(e) => update("flight_number", e.target.value)}
                  placeholder="AF1234"
                />
              </Field>
              <Field label="Flight date">
                <input
                  className="input-base"
                  type="datetime-local"
                  value={form.flight_date ?? ""}
                  onChange={(e) => update("flight_date", e.target.value)}
                />
              </Field>
            </>
          )}
        </Section>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Link href="/shipments" className="btn-ghost">
            ← Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create shipment"}
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