"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth, useLogout } from "./AuthProvider";
import { ROLE_LABELS, ROLES } from "@/lib/auth";

export function UserBar() {
  const { user } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 print:hidden">
      {user.role === ROLES.admin && pathname !== "/admin" ? (
        <Link
          href="/admin"
          className="rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-100"
        >
          لوحة الإدارة
        </Link>
      ) : null}
      <span className="rounded-full bg-paper px-4 py-2 text-sm font-bold text-ink shadow-sm ring-1 ring-sky-100">
        {user.name || user.username} · {ROLE_LABELS[user.role] || user.role}
      </span>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:bg-black"
      >
        <LogOut size={16} />
        خروج
      </button>
    </div>
  );
}
