"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { homeForRole } from "@/lib/auth";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-sky-50 via-offwhite to-offwhite" dir="rtl">
      <p className="text-lg font-bold text-sky-800">جاري التحقق من الحساب...</p>
    </div>
  );
}

export function RequireRole({ allow, allowPublic = false, children }) {
  const { user, loading, ready } = useAuth();
  const router = useRouter();
  const allowed = allow.join(",");
  const waiting = !ready || loading;

  useEffect(() => {
    if (waiting) return;
    if (!user) {
      if (!allowPublic) router.replace("/");
      return;
    }
    if (!allow.includes(user.role)) {
      router.replace(homeForRole(user.role));
    }
  }, [user, waiting, allowed, allowPublic, router, allow]);

  if (allowPublic && !waiting && (!user || allow.includes(user.role))) {
    return children;
  }

  if (waiting || !user || !allow.includes(user.role)) {
    return <AuthLoading />;
  }

  return children;
}
