"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { Logo } from "./logo";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Overview", num: "00" },
  { href: "/shipments", label: "Shipments", num: "01" },
  { href: "/orders", label: "Orders", num: "02" },
  { href: "/locations", label: "Locations", num: "03", disabled: true },
  { href: "/documents", label: "Documents", num: "04", disabled: true },
  { href: "/users", label: "Users", num: "05" },
  { href: "/products", label: "Products", num: "06" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clear } = useAuth();

  function onLogout() {
    clear();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-line-strong bg-paper-elevated min-h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-line">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-6">
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted px-3 mb-3">
          Modules
        </div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                {item.disabled ? (
                  <span
                    className="flex items-center gap-3 px-3 py-2 text-sm text-muted/50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <span className="font-mono text-[0.6rem] tracking-widest">
                      {item.num}
                    </span>
                    <span>{item.label}</span>
                    <span className="ml-auto font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted/60">
                      soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink/80 hover:bg-line/60 hover:text-ink",
                    )}
                  >
                    <span className="font-mono text-[0.6rem] tracking-widest opacity-70">
                      {item.num}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-line">
        {user && (
          <div className="mb-3">
            <div className="text-sm text-ink truncate">{user.full_name}</div>
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted mt-0.5">
              {user.role}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-muted hover:text-danger transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}