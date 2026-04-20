import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={`inline-flex items-baseline gap-2 ${className}`}
    >
      <span
        className="font-display text-2xl font-medium text-ink"
        style={{ letterSpacing: "var(--tracking-tightest)" }}
      >
        Manifest
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted pb-1">
        / ERP
      </span>
    </Link>
  );
}