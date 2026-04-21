import type { OrderStatus } from "@/lib/types";
import { orderStatusLabel, orderStatusTone } from "@/lib/format";

export function OrderStatusBadge({
  status,
  size = "sm",
}: {
  status: OrderStatus;
  size?: "sm" | "md";
}) {
  const tone = orderStatusTone(status);
  const textSize = size === "md" ? "text-xs" : "text-[0.68rem]";
  const padding = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} ${textSize} font-mono uppercase tracking-[0.1em] border`}
      style={{
        color: tone.fg,
        backgroundColor: tone.bg,
        borderColor: tone.fg,
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ backgroundColor: tone.dot }}
      />
      {orderStatusLabel[status]}
    </span>
  );
}