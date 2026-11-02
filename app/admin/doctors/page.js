"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { ensurePocketBase, pb } from "@/lib/pb";
import { STAFF_COLLECTION } from "@/lib/auth";
import { BrandMark } from "../../BrandMark";
import { UserBar } from "../../UserBar";
import { useAuth } from "../../AuthProvider";

export default function AdminDoctorsPage() {
  const { ready } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [names, setNames] = useState({});
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDoctors() {
    try {
      await ensurePocketBase();
      const records = await pb.collection("doctors").getFullList({
        sort: "name",
        expand: "clinic",
      });
      setDoctors(records);
      setNames(Object.fromEntries(records.map((doctor) => [doctor.id, doctor.name || ""])));
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("تعذر جلب قائمة الأطباء");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    loadDoctors();
  }, [ready]);

  async function handleSave(doctor) {
    const name = (names[doctor.id] || "").trim();
    if (!name) {
      setMessage("اسم الطبيب مطلوب");
      return;
    }

    try {
      setSavingId(doctor.id);
      setMessage("");
      await ensurePocketBase();
      await pb.collection("doctors").update(doctor.id, { name });
      const clinicId = doctor.clinic || doctor.expand?.clinic?.id;
      if (clinicId) {
        try {
          const staff = await pb.collection(STAFF_COLLECTION).getFullList({
            filter: `clinic = "${clinicId}" && role = "doctor"`,
          });
          await Promise.all(staff.map((record) => pb.collection(STAFF_COLLECTION).update(record.id, { name })));
        } catch (staffErr) {
          console.error(staffErr);
        }
      }
      await loadDoctors();
      setMessage(`تم تحديث اسم الطبيب إلى ${name}`);
    } catch (err) {
      console.error(err);
      setMessage("تعذر حفظ اسم الطبيب");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Stethoscope size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">تعديل أسماء الأطباء</h1>
              <p className="mt-1 text-sm text-warm">عند تغيير طبيب العيادة حدّث الاسم هنا ليظهر في الاستقبال والتذاكر والإحصائيات.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          {message ? <p className="mb-4 font-bold text-sky-800">{message}</p> : null}
          {loading ? <p className="font-bold text-warm">جاري تحميل الأطباء...</p> : null}
          {!loading && doctors.length === 0 ? (
            <p className="font-bold text-warm">لا يوجد أطباء بعد. أضف العيادات أولاً ثم حدّث الصفحة.</p>
          ) : null}
          <div className="space-y-4">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="grid gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                <label className="text-sm font-semibold text-warm">
                  اسم الطبيب
                  <input
                    value={names[doctor.id] || ""}
                    onChange={(event) => setNames((current) => ({ ...current, [doctor.id]: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-paper px-4 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <p className="text-sm font-semibold text-warm">
                  العيادة
                  <span className="mt-1 block rounded-2xl bg-paper px-4 py-2.5 font-bold text-ink ring-1 ring-sky-100">
                    {doctor.expand?.clinic?.name || "—"}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={savingId === doctor.id}
                  onClick={() => handleSave(doctor)}
                  className="rounded-2xl bg-sky-600 px-5 py-2.5 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {savingId === doctor.id ? "جاري الحفظ..." : "حفظ الاسم"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
