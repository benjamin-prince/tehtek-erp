"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { OrderDetail, OrderItemCreate, User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";

interface LineDraft extends OrderItemCreate {
  _key: string;
}

let keyCounter = 0;
const nextKey = () => `line-${++keyCounter}`;

function emptyLine(): LineDraft {
  return {
    _key: nextKey(),
    sku: "",
    name: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    discount: 0,
    tax_rate: 0,
  };
}

/** One-line address composed from a user's address parts. */
function formatUserAddress(
  u: Pick<
    User,
    | "address_line1"
    | "address_line2"
    | "city"
    | "region"
    | "country"
    | "postal_code"
  >,
): string {
  const parts = [
    u.address_line1,
    u.address_line2,
    u.postal_code && u.city ? `${u.postal_code} ${u.city}` : u.city,
    u.region,
    u.country,
  ];
  return parts.filter((p) => p && String(p).trim()).join(", ");
}

export default function NewOrderPage() {
  const router = useRouter();
  const { accessToken, user } = useAuth();

  // Role gate — customer vs staff (anyone else)
  const isCustomer = user?.role === "customer";

  // Customer section state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  // Staff-only: optionally link the order to a registered customer user
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [currency, setCurrency] = useState("EUR");
  const [shippingTotal, setShippingTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill for customer — runs once when `user` is loaded
  useEffect(() => {
    if (!user) return;
    if (isCustomer) {
      setCustomerName(user.full_name);
      setCustomerPhone(user.phone ?? "");
      setCustomerEmail(user.email);
      const addr = formatUserAddress(user);
      if (addr) setBillingAddress(addr);
      setCurrency(user.preferred_currency || "EUR");
    }
  }, [user, isCustomer]);

  // Debounced customer search (staff only)
  useEffect(() => {
    if (isCustomer || !accessToken) return;
    if (!searchOpen) return;
    const q = customerSearch.trim();

    const handle = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("role", "customer");
        params.set("active_only", "true");
        params.set("limit", "10");
        if (q) params.set("search", q);
        const users = await api.get<User[]>(`/users?${params.toString()}`, {
          token: accessToken,
        });
        setCustomerSearchResults(users);
      } catch {
        setCustomerSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [customerSearch, searchOpen, accessToken, isCustomer]);

  // When staff picks a registered customer, prefill like the customer flow
  // — but fields stay editable (staff might be writing a slightly different address).
  function selectCustomer(u: User) {
    setCustomerUserId(u.id);
    setCustomerName(u.full_name);
    setCustomerPhone(u.phone ?? "");
    setCustomerEmail(u.email);
    const addr = formatUserAddress(u);
    if (addr && !billingAddress) setBillingAddress(addr);
    if (u.preferred_currency) setCurrency(u.preferred_currency);
    setSearchOpen(false);
    setCustomerSearch("");
  }

  function clearCustomerLink() {
    setCustomerUserId(null);
  }

  // ────── totals ──────
  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (s, l) => s + (l.quantity || 0) * (l.unit_price || 0),
      0,
    );
    const discount = lines.reduce((s, l) => s + (l.discount || 0), 0);
    const tax = lines.reduce((s, l) => {
      const gross = Math.max(
        0,
        (l.quantity || 0) * (l.unit_price || 0) - (l.discount || 0),
      );
      return s + gross * (l.tax_rate || 0);
    }, 0);
    const grand = subtotal - discount + tax + (shippingTotal || 0);
    return { subtotal, discount, tax, shipping: shippingTotal, grand };
  }, [lines, shippingTotal]);

  // ────── line item helpers ──────
  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, emptyLine()]);
  }
  function removeLine(key: string) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l._key !== key) : ls));
  }

  // ────── submit ──────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("You must be logged in");
      return;
    }

    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }

    if (lines.length === 0 || lines.every((l) => !l.name.trim())) {
      setError("At least one line item is required");
      return;
    }

    setLoading(true);

    const items: OrderItemCreate[] = lines
      .filter((l) => l.name.trim())
      .map((l) => ({
        sku: l.sku?.trim() || undefined,
        name: l.name.trim(),
        description: l.description?.trim() || undefined,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount: l.discount || 0,
        tax_rate: l.tax_rate || 0,
      }));

    // Decide whether to send customer_user_id:
    //  - Customer placing their own order → always their own id
    //  - Staff → only if they've explicitly linked to a registered customer
    const linkedUserId = isCustomer ? user.id : customerUserId || undefined;

    const payload = {
      customer_user_id: linkedUserId,
      customer_name: isCustomer ? user.full_name : customerName.trim(),
      customer_phone: customerPhone || undefined,
      customer_email: customerEmail || undefined,
      billing_address: billingAddress || undefined,
      shipping_address: shippingAddress || undefined,
      currency,
      notes: notes || undefined,
      shipping_total: shippingTotal,
      items,
    };

    try {
      const created = await api.post<OrderDetail>("/orders", payload, {
        token: accessToken!,
      });
      router.push(`/orders/${created.id}`);
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
    <div className="px-8 lg:px-12 py-10 max-w-5xl">
      <PageHeader
        eyebrow="02 — Orders / new"
        title="New order."
        description={
          isCustomer
            ? "Your contact info is prefilled. Add items and check out."
            : "Search for an existing customer or enter details manually."
        }
      />

      <form onSubmit={onSubmit} className="space-y-12">
        <Section num="A" title="Customer">
          {/* Staff-only customer picker */}
          {!isCustomer && (
            <div className="md:col-span-2 relative">
              <label className="label-base">
                Link to existing customer (optional)
              </label>
              {customerUserId ? (
                <div className="flex items-center justify-between gap-3 px-3 py-2 border border-accent bg-accent/5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-ink">{customerName}</span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent">
                      linked
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomerLink}
                    className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted hover:text-danger transition-colors"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="input-base"
                    placeholder="Search by name, email, or phone…"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                  />
                  {searchOpen &&
                    (customerSearch || customerSearchResults.length > 0) && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-paper-elevated border border-line-strong max-h-64 overflow-y-auto">
                        {searchLoading && (
                          <div className="px-3 py-2 font-mono text-xs text-muted">
                            Searching…
                          </div>
                        )}
                        {!searchLoading &&
                          customerSearchResults.length === 0 && (
                            <div className="px-3 py-2 font-mono text-xs text-muted">
                              No customers match. Fill fields manually below.
                            </div>
                          )}
                        {!searchLoading &&
                          customerSearchResults.map((u) => (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => selectCustomer(u)}
                              className="w-full text-left px-3 py-2 hover:bg-line/60 transition-colors border-b border-line last:border-b-0"
                            >
                              <div className="text-sm text-ink">
                                {u.full_name}
                              </div>
                              <div className="font-mono text-[0.65rem] text-muted mt-0.5">
                                {u.email}
                                {u.phone ? ` · ${u.phone}` : ""}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className={
                      searchOpen
                        ? "mt-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted hover:text-ink transition-colors"
                        : "hidden"
                    }
                  >
                    Close search
                  </button>
                </>
              )}
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mt-2">
                Linking attaches the order to that customer&apos;s account
              </p>
            </div>
          )}

          <Field
            label="Name"
            required
            locked={isCustomer}
            colSpan={2}
          >
            <input
              className={
                isCustomer
                  ? "input-base bg-line/30 cursor-not-allowed"
                  : "input-base"
              }
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              readOnly={isCustomer}
              disabled={isCustomer}
              required
            />
            {isCustomer && (
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted mt-2">
                Fixed to your account &middot; edit your profile to change
              </p>
            )}
          </Field>

          <Field label="Phone">
            <input
              className="input-base"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className="input-base"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </Field>

          <Field label="Billing address" colSpan={2}>
            <input
              className="input-base"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Street, city, country"
            />
          </Field>
          <Field label="Shipping address" colSpan={2}>
            <div className="flex gap-3 items-end">
              <input
                className="input-base flex-1"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Leave blank to use billing address"
              />
              {billingAddress && shippingAddress !== billingAddress && (
                <button
                  type="button"
                  onClick={() => setShippingAddress(billingAddress)}
                  className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-accent hover:text-ink transition-colors pb-2 shrink-0"
                >
                  Same as billing
                </button>
              )}
            </div>
          </Field>
        </Section>

        {/* ─── Line items ─── */}
        <section>
          <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-line">
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent">
              B
            </span>
            <h2
              className="font-display text-xl font-medium"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Line items
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="ml-auto font-mono text-[0.68rem] uppercase tracking-[0.2em] text-accent hover:text-ink transition-colors"
            >
              + Add line
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div
                key={line._key}
                className="card p-5 grid grid-cols-12 gap-3 items-start"
              >
                <div className="col-span-12 sm:col-span-5">
                  <label className="label-base">Item #{idx + 1} name *</label>
                  <input
                    className="input-base"
                    value={line.name}
                    onChange={(e) =>
                      updateLine(line._key, { name: e.target.value })
                    }
                    required
                    placeholder="Product or service"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="label-base">SKU</label>
                  <input
                    className="input-base font-mono text-sm"
                    value={line.sku ?? ""}
                    onChange={(e) =>
                      updateLine(line._key, { sku: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="label-base">Qty</label>
                  <input
                    className="input-base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line._key, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-end items-end">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line._key)}
                      className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted hover:text-danger transition-colors pb-2"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="col-span-12 sm:col-span-5">
                  <label className="label-base">Description</label>
                  <input
                    className="input-base"
                    value={line.description ?? ""}
                    onChange={(e) =>
                      updateLine(line._key, { description: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-4 sm:col-span-3">
                  <label className="label-base">Unit price</label>
                  <input
                    className="input-base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateLine(line._key, {
                        unit_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label-base">Discount</label>
                  <input
                    className="input-base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.discount ?? 0}
                    onChange={(e) =>
                      updateLine(line._key, {
                        discount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="label-base">Tax %</label>
                  <input
                    className="input-base"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={line.tax_rate ?? 0}
                    onChange={(e) =>
                      updateLine(line._key, {
                        tax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.19 = 19%"
                  />
                </div>

                <div className="col-span-12 flex justify-end pt-2 border-t border-line">
                  <div className="text-right">
                    <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted">
                      Line total
                    </div>
                    <div className="font-mono text-sm text-ink mt-1">
                      {formatMoney(
                        Math.max(
                          0,
                          line.quantity * line.unit_price -
                            (line.discount || 0),
                        ) *
                          (1 + (line.tax_rate || 0)),
                        currency,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <Section num="C" title="Pricing">
          <Field label="Currency">
            <select
              className="input-base"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="XAF">XAF</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label="Shipping total">
            <input
              className="input-base"
              type="number"
              step="0.01"
              min="0"
              value={shippingTotal}
              onChange={(e) =>
                setShippingTotal(parseFloat(e.target.value) || 0)
              }
            />
          </Field>
          <Field label="Notes" colSpan={2}>
            <textarea
              className="input-base resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </Section>

        <div className="card p-6 bg-paper">
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-4">
            Summary
          </div>
          <dl className="space-y-2 text-sm">
            <Row
              label="Subtotal"
              value={formatMoney(totals.subtotal, currency)}
            />
            {totals.discount > 0 && (
              <Row
                label="Discount"
                value={`− ${formatMoney(totals.discount, currency)}`}
              />
            )}
            {totals.tax > 0 && (
              <Row label="Tax" value={formatMoney(totals.tax, currency)} />
            )}
            {totals.shipping > 0 && (
              <Row
                label="Shipping"
                value={formatMoney(totals.shipping, currency)}
              />
            )}
            <div className="rule my-3" />
            <Row
              label="Grand total"
              value={formatMoney(totals.grand, currency)}
              big
            />
          </dl>
        </div>

        {error && (
          <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Link href="/orders" className="btn-ghost">
            ← Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create order"}
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
  locked,
  colSpan,
  children,
}: {
  label: string;
  required?: boolean;
  locked?: boolean;
  colSpan?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <label className="label-base flex items-center gap-2">
        <span>{label}</span>
        {required && <span className="text-accent">*</span>}
        {locked && (
          <span className="font-mono text-[0.55rem] tracking-[0.1em] text-muted normal-case">
            locked
          </span>
        )}
      </label>
      {children}
    </div>
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