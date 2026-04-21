"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Gender, IdDocumentType, Role, User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

interface FormState {
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  password: string;
  phone: string;
  phone_secondary: string;
  role: Role;
  date_of_birth: string;
  gender: Gender | "";
  nationality: string;
  id_document_type: IdDocumentType | "";
  id_document_number: string;
  id_document_expires_at: string;
  id_document_issuing_country: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  country: string;
  postal_code: string;
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
}

const initial: FormState = {
  first_name: "",
  last_name: "",
  middle_name: "",
  email: "",
  password: "",
  phone: "",
  phone_secondary: "",
  role: "customer",
  date_of_birth: "",
  gender: "",
  nationality: "",
  id_document_type: "",
  id_document_number: "",
  id_document_expires_at: "",
  id_document_issuing_country: "",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  country: "",
  postal_code: "",
  preferred_language: "en",
  preferred_currency: "EUR",
  timezone: "",
};

export default function NewUserPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Strip empty strings so backend gets proper nulls / omitted fields
    const payload: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) {
        payload[k] = v;
      }
    });

    try {
      const created = await api.post<User>("/users", payload, {
        token: accessToken!,
      });
      router.push(`/users/${created.id}`);
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
        eyebrow="05 — Users / new"
        title="New user."
        description="Create an internal or customer account. Everything except identity fields is optional."
      />

      <form onSubmit={onSubmit} className="space-y-12">
        <Section num="A" title="Identity">
          <Field label="First name" required>
            <input
              className="input-base"
              value={form.first_name}
              onChange={(e) => update("first_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Last name" required>
            <input
              className="input-base"
              value={form.last_name}
              onChange={(e) => update("last_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Middle name">
            <input
              className="input-base"
              value={form.middle_name}
              onChange={(e) => update("middle_name", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <input
              className="input-base"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select
              className="input-base"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value as Gender | "")}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="undisclosed">Undisclosed</option>
            </select>
          </Field>
          <Field label="Nationality (ISO 2-letter)">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.nationality}
              onChange={(e) =>
                update("nationality", e.target.value.toUpperCase())
              }
              placeholder="CM"
            />
          </Field>
        </Section>

        <Section num="B" title="Account">
          <Field label="Email" required colSpan={2}>
            <input
              className="input-base"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password" required>
            <input
              className="input-base"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Role" required>
            <select
              className="input-base"
              value={form.role}
              onChange={(e) => update("role", e.target.value as Role)}
            >
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="driver">Driver</option>
              <option value="traveler">Traveler</option>
              <option value="middleman">Middleman</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </Section>

        <Section num="C" title="Contact">
          <Field label="Phone">
            <input
              className="input-base"
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Phone (secondary)">
            <input
              className="input-base"
              type="tel"
              value={form.phone_secondary}
              onChange={(e) => update("phone_secondary", e.target.value)}
            />
          </Field>
        </Section>

        <Section num="D" title="Address">
          <Field label="Line 1" colSpan={2}>
            <input
              className="input-base"
              value={form.address_line1}
              onChange={(e) => update("address_line1", e.target.value)}
            />
          </Field>
          <Field label="Line 2" colSpan={2}>
            <input
              className="input-base"
              value={form.address_line2}
              onChange={(e) => update("address_line2", e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              className="input-base"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field label="Region / state">
            <input
              className="input-base"
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
            />
          </Field>
          <Field label="Country (ISO 2-letter)">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.country}
              onChange={(e) => update("country", e.target.value.toUpperCase())}
              placeholder="CM"
            />
          </Field>
          <Field label="Postal code">
            <input
              className="input-base"
              value={form.postal_code}
              onChange={(e) => update("postal_code", e.target.value)}
            />
          </Field>
        </Section>

        <Section num="E" title="Identification (optional)">
          <Field label="Document type">
            <select
              className="input-base"
              value={form.id_document_type}
              onChange={(e) =>
                update(
                  "id_document_type",
                  e.target.value as IdDocumentType | "",
                )
              }
            >
              <option value="">—</option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID</option>
              <option value="driver_license">Driver license</option>
              <option value="residence_permit">Residence permit</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Document number">
            <input
              className="input-base"
              value={form.id_document_number}
              onChange={(e) => update("id_document_number", e.target.value)}
            />
          </Field>
          <Field label="Expires on">
            <input
              className="input-base"
              type="date"
              value={form.id_document_expires_at}
              onChange={(e) =>
                update("id_document_expires_at", e.target.value)
              }
            />
          </Field>
          <Field label="Issuing country (ISO 2-letter)">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.id_document_issuing_country}
              onChange={(e) =>
                update(
                  "id_document_issuing_country",
                  e.target.value.toUpperCase(),
                )
              }
            />
          </Field>
        </Section>

        <Section num="F" title="Preferences">
          <Field label="Language">
            <select
              className="input-base"
              value={form.preferred_language}
              onChange={(e) => update("preferred_language", e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </Field>
          <Field label="Currency">
            <select
              className="input-base"
              value={form.preferred_currency}
              onChange={(e) => update("preferred_currency", e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="XAF">XAF</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label="Timezone (IANA)">
            <input
              className="input-base"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              placeholder="Africa/Douala"
            />
          </Field>
        </Section>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Link href="/users" className="btn-ghost">
            ← Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create user"}
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