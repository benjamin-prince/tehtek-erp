"use client";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Role, User } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import clsx from "clsx";

const ROLES: { value: Role | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
  { value: "driver", label: "Driver" },
  { value: "traveler", label: "Traveler" },
  { value: "middleman", label: "Middleman" },
  { value: "customer", label: "Customer" },
];

export default function UsersPage() {
  const { accessToken, user: me } = useAuth();
  const qc = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const q = useQuery({
    queryKey: ["users", roleFilter, search, includeInactive],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (search) params.set("search", search);
      params.set("active_only", String(!includeInactive));
      params.set("limit", "100");
      return api.get<User[]>(`/users?${params.toString()}`, {
        token: accessToken!,
      });
    },
    enabled: !!accessToken,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<User> }) =>
      api.patch<User>(`/users/${id}`, patch, { token: accessToken! }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchDraft.trim());
  }

  async function changeRole(userId: string, role: Role) {
    updateUser.mutate({ id: userId, patch: { role } });
  }

  async function toggleActive(user: User) {
    updateUser.mutate({
      id: user.id,
      patch: { is_active: !user.is_active },
    });
  }

  return (
    <div className="px-8 lg:px-12 py-10 max-w-6xl">
      <PageHeader
        eyebrow="05 — Users"
        title="People."
        description="Manage accounts, change roles, block or unblock users."
        action={
          <Link href="/users/new" className="btn-primary">
            New user
          </Link>
        }
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
        <form onSubmit={onSearchSubmit} className="flex-1">
          <input
            type="search"
            placeholder="Search by name, email, or phone…"
            className="input-base"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </form>

        <label className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="accent-accent"
          />
          Show blocked
        </label>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleFilter(r.value)}
            className={clsx(
              "px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.15em] border transition-colors",
              roleFilter === r.value
                ? "bg-ink text-paper border-ink"
                : "border-line-strong text-muted hover:border-ink hover:text-ink",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {q.isLoading && (
        <div className="font-mono text-xs text-muted py-12 text-center">
          Loading…
        </div>
      )}

      {q.isError && (
        <div className="font-mono text-xs text-danger py-12 text-center">
          Could not load users.{" "}
          {q.error instanceof ApiError ? q.error.detail : null}
        </div>
      )}

      {q.data && q.data.length === 0 && (
        <div className="card p-12 text-center">
          <div
            className="font-display text-2xl text-ink mb-2"
            style={{ letterSpacing: "var(--tracking-tightest)" }}
          >
            No users match.
          </div>
          <p className="text-muted">Try clearing filters or search.</p>
        </div>
      )}

      {q.data && q.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <tr
                    key={u.id}
                    className={clsx(
                      "border-b border-line last:border-b-0 hover:bg-paper/60 transition-colors",
                      !u.is_active && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/users/${u.id}`}
                        className="text-ink hover:text-accent transition-colors"
                      >
                        {u.full_name}
                        {isMe && (
                          <span className="ml-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-accent">
                            you
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        className="font-mono text-[0.68rem] uppercase tracking-[0.15em] bg-transparent border border-line-strong px-2 py-1 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                        value={u.role}
                        disabled={isMe || updateUser.isPending}
                        onChange={(e) =>
                          changeRole(u.id, e.target.value as Role)
                        }
                        title={
                          isMe ? "You can't change your own role" : undefined
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                        <option value="driver">Driver</option>
                        <option value="traveler">Traveler</option>
                        <option value="middleman">Middleman</option>
                        <option value="customer">Customer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.is_active ? (
                        <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-success">
                          Active
                        </span>
                      ) : (
                        <span className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-danger">
                          Blocked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right pr-4">
                      <div className="inline-flex items-center gap-4">
                        <Link
                          href={`/users/${u.id}`}
                          className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-muted hover:text-ink transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={isMe || updateUser.isPending}
                          className={clsx(
                            "font-mono text-[0.68rem] uppercase tracking-[0.15em] transition-colors",
                            u.is_active
                              ? "text-muted hover:text-danger"
                              : "text-muted hover:text-success",
                            "disabled:opacity-40 disabled:cursor-not-allowed",
                          )}
                          title={
                            isMe ? "You can't block yourself" : undefined
                          }
                        >
                          {u.is_active ? "Block" : "Unblock"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {updateUser.isError && (
        <div className="mt-4 font-mono text-xs text-danger border-l-2 border-danger pl-3 py-1">
          {updateUser.error instanceof ApiError
            ? updateUser.error.detail || "Update failed"
            : "Network error"}
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={clsx(
        "text-left px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted font-normal",
        className,
      )}
    >
      {children}
    </th>
  );
}