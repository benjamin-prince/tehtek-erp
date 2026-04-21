import type { OrderStatus, ShipmentStatus } from "./types";

export const statusLabel: Record<ShipmentStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  picked_up: "Picked up",
  at_origin_hub: "At origin hub",
  in_transit: "In transit",
  at_customs: "At customs",
  at_destination_hub: "At destination hub",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  failed_delivery: "Failed delivery",
  returned: "Returned",
  cancelled: "Cancelled",
};

export function statusTone(status: ShipmentStatus): {
  fg: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case "delivered":
      return {
        fg: "var(--color-success)",
        bg: "var(--tone-success-bg)",
        dot: "var(--color-success)",
      };
    case "failed_delivery":
    case "returned":
    case "cancelled":
      return {
        fg: "var(--color-danger)",
        bg: "var(--tone-danger-bg)",
        dot: "var(--color-danger)",
      };
    case "at_customs":
      return {
        fg: "var(--color-warning)",
        bg: "var(--tone-warning-bg)",
        dot: "var(--color-warning)",
      };
    case "in_transit":
    case "out_for_delivery":
    case "picked_up":
    case "at_origin_hub":
    case "at_destination_hub":
      return {
        fg: "var(--color-accent)",
        bg: "var(--tone-accent-bg)",
        dot: "var(--color-accent)",
      };
    default:
      return {
        fg: "var(--color-muted)",
        bg: "var(--tone-neutral-bg)",
        dot: "var(--color-muted)",
      };
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Append these to lib/format.ts

export const orderStatusLabel: Record<OrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  paid: "Paid",
  preparing: "Preparing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusTone(status: OrderStatus): {
  fg: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case "delivered":
    case "paid":
      return {
        fg: "var(--color-success)",
        bg: "var(--tone-success-bg)",
        dot: "var(--color-success)",
      };
    case "cancelled":
    case "refunded":
      return {
        fg: "var(--color-danger)",
        bg: "var(--tone-danger-bg)",
        dot: "var(--color-danger)",
      };
    case "confirmed":
    case "preparing":
    case "ready_to_ship":
    case "shipped":
      return {
        fg: "var(--color-accent)",
        bg: "var(--tone-accent-bg)",
        dot: "var(--color-accent)",
      };
    default: // draft
      return {
        fg: "var(--color-muted)",
        bg: "var(--tone-neutral-bg)",
        dot: "var(--color-muted)",
      };
  }
}

export function formatMoney(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}