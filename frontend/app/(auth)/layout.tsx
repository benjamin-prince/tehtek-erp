import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header className="px-8 py-6">
        <Logo />
      </header>

      <div className="flex-1 grid lg:grid-cols-2 gap-12 px-8 pb-16 items-center max-w-7xl w-full mx-auto">
        <div className="hidden lg:block">
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-6">
            № 001 &nbsp;&middot;&nbsp; Operations terminal
          </div>
          <h1
            className="font-display text-6xl xl:text-7xl font-medium leading-[0.95] text-ink mb-8"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            Every package.
            <br />
            <span className="text-accent italic">Every leg.</span>
            <br />
            One manifest.
          </h1>
          <p className="text-lg text-muted max-w-md leading-relaxed">
            Ground, air, hand-carried — track shipments across warehouses,
            airports, and every pair of hands in between.
          </p>

          <div className="mt-12 flex items-center gap-4 font-mono text-xs text-muted">
            <span>shipments</span>
            <span className="text-line-strong">·</span>
            <span>stores</span>
            <span className="text-line-strong">·</span>
            <span>orders</span>
            <span className="text-line-strong">·</span>
            <span>documents</span>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">{children}</div>
      </div>

      <footer className="px-8 py-6 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted">
        v0.1 &nbsp;&middot;&nbsp; manifest erp
      </footer>
    </main>
  );
}