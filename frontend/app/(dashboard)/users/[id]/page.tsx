"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Gender, IdDocumentType, Role, User } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";

type EditableUser = Partial<{
  first_name: string;
  last_name: string;
  middle_name: string;
  phone: string;
  phone_secondary: string;
  role: Role;
  date_of_birth: string;
  gender: Gender;
  nationality: string;
  id_document_type: IdDocumentType;
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
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_verified: boolean;
}>;

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user: me } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["user", params.id],
    queryFn: () =>
      api.get<User>(`/users/${params.id}`, { token: accessToken! }),
    enabled: !!accessToken && !!params.id,
  });

  const [form, setForm] = useState<EditableUser>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed form once user loads
  useEffect(() => {
    if (!q.data) return;
    const u = q.data;
    setForm({
      first_name: u.first_name,
      last_name: u.last_name,
      middle_name: u.middle_name ?? "",
      phone: u.phone ?? "",
      phone_secondary: u.phone_secondary ?? "",
      role: u.role,
      date_of_birth: u.date_of_birth ?? "",
      gender: u.gender ?? undefined,
      nationality: u.nationality ?? "",
      id_document_type: u.id_document_type ?? undefined,
      id_document_number: u.id_document_number ?? "",
      id_document_expires_at: u.id_document_expires_at ?? "",
      id_document_issuing_country: u.id_document_issuing_country ?? "",
      address_line1: u.address_line1 ?? "",
      address_line2: u.address_line2 ?? "",
      city: u.city ?? "",
      region: u.region ?? "",
      country: u.country ?? "",
      postal_code: u.postal_code ?? "",
      preferred_language: u.preferred_language,
      preferred_currency: u.preferred_currency,
      timezone: u.timezone ?? "",
      is_active: u.is_active,
      email_verified: u.email_verified,
      phone_verified: u.phone_verified,
      kyc_verified: u.kyc_verified,
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: (patch: EditableUser) =>
      api.patch<User>(`/users/${params.id}`, patch, { token: accessToken! }),
    onSuccess: () => {
      setSaveError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["user", params.id] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      setSaveError(
        err instanceof ApiError ? err.detail || "Save failed" : "Network error",
      );
    },
  });

  function update<K extends keyof EditableUser>(key: K, value: EditableUser[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSave() {
    // Build a patch that only sends non-empty strings (let nulls stand for unset)
    const patch: EditableUser = {};
    for (const [k, v] of Object.entries(form) as [keyof EditableUser, unknown][]) {
      if (v === "" || v === undefined) continue;
      // @ts-expect-error — dynamic assignment
      patch[k] = v;
    }
    save.mutate(patch);
  }

  if (q.isLoading) {
    return (
      <div className="px-12 py-10 font-mono text-xs text-muted">Loading…</div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="px-12 py-10">
        <div className="font-mono text-xs text-danger mb-4">
          Could not load user.
        </div>
        <Link href="/users" className="btn-ghost">
          ← Back to users
        </Link>
      </div>
    );
  }

  const u = q.data;
  const isMe = u.id === me?.id;

  return (
    <div className="px-8 lg:px-12 py-10 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/users"
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
        >
          ← All users
        </Link>
      </div>

      <PageHeader
        eyebrow={`User · ${u.role}${isMe ? " · you" : ""}`}
        title={u.full_name}
        description={u.email}
        action={
          <button
            onClick={() =>
              save.mutate({ is_active: !u.is_active })
            }
            disabled={isMe || save.isPending}
            className={
              u.is_active ? "btn-outline" : "btn-primary"
            }
            title={isMe ? "You can't block yourself" : undefined}
          >
            {save.isPending
              ? "Saving…"
              : u.is_active
                ? "Block account"
                : "Unblock account"}
          </button>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-12"
      >
        <Section num="A" title="Identity">
          <Field label="First name" required>
            <input
              className="input-base"
              value={form.first_name ?? ""}
              onChange={(e) => update("first_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Last name" required>
            <input
              className="input-base"
              value={form.last_name ?? ""}
              onChange={(e) => update("last_name", e.target.value)}
              required
            />
          </Field>
          <Field label="Middle name">
            <input
              className="input-base"
              value={form.middle_name ?? ""}
              onChange={(e) => update("middle_name", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <input
              className="input-base"
              type="date"
              value={form.date_of_birth ?? ""}
              onChange={(e) => update("date_of_birth", e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select
              className="input-base"
              value={form.gender ?? ""}
              onChange={(e) =>
                update("gender", (e.target.value || undefined) as Gender)
              }
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="undisclosed">Undisclosed</option>
            </select>
          </Field>
          <Field label="Nationality">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.nationality ?? ""}
              onChange={(e) =>
                update("nationality", e.target.value.toUpperCase())
              }
            />
          </Field>
        </Section>

        <Section num="B" title="Role & verification">
          <Field label="Role" required>
            <select
              className="input-base"
              value={form.role ?? "customer"}
              onChange={(e) => update("role", e.target.value as Role)}
              disabled={isMe}
            >
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="driver">Driver</option>
              <option value="traveler">Traveler</option>
              <option value="middleman">Middleman</option>
              <option value="admin">Admin</option>
            </select>
            {isMe && (
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mt-2">
                You can&apos;t change your own role
              </p>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Toggle
              label="Email verified"
              checked={form.email_verified ?? false}
              onChange={(v) => update("email_verified", v)}
            />
            <Toggle
              label="Phone verified"
              checked={form.phone_verified ?? false}
              onChange={(v) => update("phone_verified", v)}
            />
            <Toggle
              label="KYC verified"
              checked={form.kyc_verified ?? false}
              onChange={(v) => update("kyc_verified", v)}
            />
            <Toggle
              label="Active"
              checked={form.is_active ?? true}
              onChange={(v) => update("is_active", v)}
              disabled={isMe}
            />
          </div>
        </Section>

        <Section num="C" title="Contact">
          <Field label="Phone">
            <input
              className="input-base"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Phone (secondary)">
            <input
              className="input-base"
              type="tel"
              value={form.phone_secondary ?? ""}
              onChange={(e) => update("phone_secondary", e.target.value)}
            />
          </Field>
        </Section>

        <Section num="D" title="Address">
          <Field label="Line 1" colSpan={2}>
            <input
              className="input-base"
              value={form.address_line1 ?? ""}
              onChange={(e) => update("address_line1", e.target.value)}
            />
          </Field>
          <Field label="Line 2" colSpan={2}>
            <input
              className="input-base"
              value={form.address_line2 ?? ""}
              onChange={(e) => update("address_line2", e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              className="input-base"
              value={form.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field label="Region / state">
            <input
              className="input-base"
              value={form.region ?? ""}
              onChange={(e) => update("region", e.target.value)}
            />
          </Field>
          <Field label="Country">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.country ?? ""}
              onChange={(e) => update("country", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Postal code">
            <input
              className="input-base"
              value={form.postal_code ?? ""}
              onChange={(e) => update("postal_code", e.target.value)}
            />
          </Field>
        </Section>

        <Section num="E" title="Identification">
          <Field label="Document type">
            <select
              className="input-base"
              value={form.id_document_type ?? ""}
              onChange={(e) =>
                update(
                  "id_document_type",
                  (e.target.value || undefined) as IdDocumentType,
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
              value={form.id_document_number ?? ""}
              onChange={(e) => update("id_document_number", e.target.value)}
            />
          </Field>
          <Field label="Expires on">
            <input
              className="input-base"
              type="date"
              value={form.id_document_expires_at ?? ""}
              onChange={(e) =>
                update("id_document_expires_at", e.target.value)
              }
            />
          </Field>
          <Field label="Issuing country">
            <input
              className="input-base uppercase"
              maxLength={2}
              value={form.id_document_issuing_country ?? ""}
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
              value={form.preferred_language ?? "en"}
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
              value={form.preferred_currency ?? "EUR"}
              onChange={(e) => update("preferred_currency", e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="XAF">XAF</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label="Timezone">
            <input
              className="input-base"
              value={form.timezone ?? ""}
              onChange={(e) => update("timezone", e.target.value)}
              placeholder="Africa/Douala"
            />
          </Field>
        </Section>

        <Section num="G" title="Audit">
          <Meta label="Joined" value={formatDate(u.created_at)} />
          <Meta
            label="Last login"
            value={u.last_login_at ? formatDate(u.last_login_at) : "Never"}
          />
        </Section>

        {saveError && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {saveError}
          </div>
        )}

        {saved && (
          <div className="font-mono text-xs text-success border-l-2 border-success pl-3 py-1">
            Saved.
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <button
            type="button"
            onClick={() => router.push("/users")}
            className="btn-ghost"
          >
            ← Back
          </button>
          <button type="submit" disabled={save.isPending} className="btn-primary">
            {save.isPending ? "Saving…" : "Save changes"}
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

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent disabled:opacity-40"
      />
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted">
        {label}
      </span>
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mb-1">
        {label}
      </div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}