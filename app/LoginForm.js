"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { homeForRole } from "@/lib/auth";

export function LoginForm() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace(homeForRole(user.role));
    }
  }, [user, loading, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    try {
      setBusy(true);
      setError("");
      const record = await login(username, password);
      router.replace(homeForRole(record.role));
    } catch (err) {
      console.error(err);
      const status = Number(err?.status || err?.statusCode || err?.response?.status || 0);
      const message = String(err?.message || err?.data?.message || "");
      if (status === 400 || /invalid|failed to authenticate/i.test(message)) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      } else if (!status || /fetch|network|failed to fetch|econnrefused/i.test(message)) {
        setError("تعذر الاتصال بالخادم. تأكد أن PocketBase يعمل.");
      } else {
        setError("تعذر تسجيل الدخول. حاول مرة أخرى.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-sky-50 via-offwhite to-offwhite" dir="rtl">
        <p className="text-lg font-bold text-sky-800">جاري التوجيه...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <p className="mb-3 text-sm font-semibold tracking-wide text-sky-700">مجمع انوار خيبر الطبي العام</p>
        <h1 className="text-4xl font-black tracking-tight text-ink">تسجيل الدخول</h1>
        <p className="mt-3 text-base leading-7 text-warm">
          أدخل حسابك ليتم توجيهك تلقائياً إلى الشاشة الخاصة بدورك.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-[32px] bg-paper p-6 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-8"
        >
          <label className="mb-2 flex items-center gap-2 font-semibold text-warm">
            <UserRound size={18} />
            اسم المستخدم
          </label>
          <input
            className="mb-5 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            dir="ltr"
            required
          />

          <label className="mb-2 flex items-center gap-2 font-semibold text-warm">
            <LockKeyhole size={18} />
            كلمة المرور
          </label>
          <input
            type="password"
            className="mb-6 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            dir="ltr"
            required
          />

          {error ? <p className="mb-4 font-bold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-sky-600 py-4 text-xl font-black text-white shadow-[0_10px_24px_rgba(52,126,160,0.28)] transition hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </main>
  );
}
