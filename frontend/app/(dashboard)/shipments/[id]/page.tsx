"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type {
  ShipmentDetail,
  ShipmentStatus,
  TrackingEvent,
} from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, statusLabel, statusTone } from "@/lib/format";

const STATUS_OPTIONS: ShipmentStatus[] = [
  "pending",
  "picked_up",
  "at_origin_hub",
  "in_transit",
  "at_customs",
  "at_destination_hub",
  "out_for_delivery",
  "delivered",
  "failed_delivery",
  "returned",
];

export default function ShipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["shipment", params.id],
    queryFn: () =>
      api.get<ShipmentDetail>(`/shipments/${params.id}`, {
        token: accessToken!,
      }),
    enabled: !!accessToken && !!params.id,
  });

  const [newStatus, setNewStatus] = useState<ShipmentStatus>("in_transit");
  const [note, setNote] = useState("");
  const [locationName, setLocationName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addEvent = useMutation({
    mutationFn: () =>
      api.post<TrackingEvent>(
        `/shipments/${params.id}/events`,
        {
          status: newStatus,
          note: note || undefined,
          location_name: locationName || undefined,
        },
        { token: accessToken! },
      ),
    onSuccess: () => {
      setNote("");
      setLocationName("");
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["shipment", params.id] });
      qc.invalidateQueries({ queryKey: ["shipments"] });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError ? err.detail || "Failed" : "Network error",
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
          Could not load shipment.
        </div>
        <Link href="/shipments" className="btn-ghost">
          ← Back to shipments
        </Link>
      </div>
    );
  }

  const s = q.data;
  const trackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/track/${s.tracking_code}`;

  return (
    <div className="px-8 lg:px-12 py-10 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/shipments"
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
        >
          ← All shipments
        </Link>
      </div>

      <PageHeader
        eyebrow={s.tracking_code}
        title={`${s.sender_name} → ${s.recipient_name}`}
        action={<StatusBadge status={s.status} size="md" />}
      />

      <section className="card p-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
              From
            </div>
            <div
              className="font-display text-xl mb-1"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              {s.sender_name}
            </div>
            <div className="text-sm text-muted">{s.sender_phone}</div>
            <div className="text-sm text-muted mt-2">{s.sender_address}</div>
          </div>

          <div className="md:border-l md:border-line md:pl-8">
            <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
              To
            </div>
            <div
              className="font-display text-xl mb-1"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              {s.recipient_name}
            </div>
            <div className="text-sm text-muted">{s.recipient_phone}</div>
            <div className="text-sm text-muted mt-2">{s.recipient_address}</div>
          </div>
        </div>

        <div className="rule my-8" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <Meta label="Weight" value={s.weight_kg ? `${s.weight_kg} kg` : "—"} />
          <Meta label="Pieces" value={s.piece_count.toString()} />
          <Meta
            label="Declared"
            value={
              s.declared_value != null
                ? `${s.declared_value} ${s.currency}`
                : "—"
            }
          />
          <Meta label="Created" value={formatDate(s.created_at)} />
          {s.carrier_type && <Meta label="Carrier" value={s.carrier_type} />}
          {s.flight_number && <Meta label="Flight" value={s.flight_number} />}
          {s.delivered_at && (
            <Meta label="Delivered" value={formatDate(s.delivered_at)} />
          )}
        </div>

        {s.description && (
          <>
            <div className="rule my-8" />
            <div>
              <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-2">
                Description
              </div>
              <p className="text-sm">{s.description}</p>
            </div>
          </>
        )}

        <div className="rule my-8" />

        <div>
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-2">
            Public tracking link
          </div>
          <a
            href={trackUrl}
            target="_blank"
            rel="noreferrer"
            className="mono-code text-accent hover:underline underline-offset-4 break-all"
          >
            {trackUrl}
          </a>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2
            className="font-display text-2xl font-medium mb-6"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            Journey
          </h2>
          <ol className="space-y-6">
            {s.events.map((e, i) => (
              <EventRow key={e.id} event={e} isLast={i === s.events.length - 1} />
            ))}
          </ol>
        </section>

        <aside>
          <div className="card p-6 sticky top-6">
            <h3
              className="font-display text-xl font-medium mb-1"
              style={{ letterSpacing: "var(--tracking-tightest)" }}
            >
              Update status
            </h3>
            <p className="text-xs text-muted mb-6">
              Adds an entry to the journey timeline.
            </p>

            <div className="space-y-5">
              <div>
                <label className="label-base">New status</label>
                <select
                  className="input-base"
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as ShipmentStatus)
                  }
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {statusLabel[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-base">Location</label>
                <input
                  className="input-base"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. CDG airport"
                />
              </div>

              <div>
                <label className="label-base">Note</label>
                <input
                  className="input-base"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {formError && (
                <div className="font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
                  {formError}
                </div>
              )}

              <button
                onClick={() => addEvent.mutate()}
                disabled={addEvent.isPending}
                className="btn-primary w-full"
              >
                {addEvent.isPending ? "Adding…" : "Add event"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
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

function EventRow({
  event,
  isLast,
}: {
  event: TrackingEvent;
  isLast: boolean;
}) {
  const tone = statusTone(event.status);
  return (
    <li className="relative pl-8">
      {!isLast && (
        <span
          className="absolute left-[5px] top-6 bottom-[-24px] w-px bg-line-strong"
          aria-hidden
        />
      )}
      <span
        className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 bg-paper"
        style={{ borderColor: tone.fg }}
      />
      <div className="flex items-baseline justify-between gap-4">
        <div className="font-display text-lg text-ink">
          {statusLabel[event.status]}
        </div>
        <div className="font-mono text-xs text-muted shrink-0">
          {formatDate(event.timestamp)}
        </div>
      </div>
      {(event.location_name || event.note) && (
        <div className="mt-1 text-sm text-muted space-y-0.5">
          {event.location_name && <div>{event.location_name}</div>}
          {event.note && <div className="italic">{event.note}</div>}
        </div>
      )}
    </li>
  );
}