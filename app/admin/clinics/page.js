"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { pb } from "@/lib/pb";
import { UserBar } from "../../UserBar";

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClinics() {
    try {
      const records = await pb.collection("clinics").getFullList({ sort: "name" });
      setClinics(records);
    } catch (err) {
      console.error(err);
      setMessage("تعذر جلب العيادات");
    }
  }

  useEffect(() => {
    loadClinics();
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    const clinicName = name.trim();
    if (!clinicName) {
      setMessage("أدخل اسم العيادة");
      return;
    }
    if (clinics.some((clinic) => clinic.name === clinicName)) {
      setMessage("هذه العيادة موجودة مسبقاً");
      return;
    }

    try {
      setBusy(true);
      setMessage("");
      await pb.collection("clinics").create({
        name: clinicName,
      });
      setName("");
      await loadClinics();
      setMessage(`تمت إضافة العيادة: ${clinicName}`);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "تعذر إضافة العيادة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Building2 size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">إضافة عيادة</h1>
              <p className="mt-1 text-sm text-warm">أضف عيادة أو قسماً جديداً ليظهر في الاستقبال ولوحة الطبيب وشاشة العرض.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <form
          onSubmit={handleAdd}
          className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6"
        >
          <label className="text-sm font-semibold text-warm">
            اسم العيادة الجديدة
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثال: عيادة الجلدية"
              className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? "جاري الإضافة..." : "إضافة العيادة"}
          </button>
          {message ? <p className="mt-4 font-bold text-sky-800">{message}</p> : null}
        </form>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          <h2 className="mb-4 text-xl font-black text-ink">العيادات الحالية</h2>
          <ul className="space-y-2">
            {clinics.map((clinic) => (
              <li key={clinic.id} className="rounded-2xl bg-sky-50 px-4 py-3 font-bold text-ink ring-1 ring-sky-100">
                {clinic.name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
