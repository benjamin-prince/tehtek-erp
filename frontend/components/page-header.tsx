export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-8 mb-10">
      <div>
        {eyebrow && (
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted mb-3">
            {eyebrow}
          </div>
        )}
        <h1
          className="font-display text-4xl lg:text-5xl font-medium leading-[1.05] text-ink"
          style={{ letterSpacing: "var(--tracking-tightest)" }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-muted mt-3 max-w-xl">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}