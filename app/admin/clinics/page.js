"use client";

import { useEffect, useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import { ensurePocketBase, pb } from "@/lib/pb";
import { STAFF_COLLECTION } from "@/lib/auth";
import { BrandMark } from "../../BrandMark";
import { UserBar } from "../../UserBar";
import { useAuth } from "../../AuthProvider";

function accountError(err) {
  const fields = err?.data?.data || err?.response?.data || {};
  if (fields.username) return "اسم المستخدم مستخدم مسبقاً أو غير صالح. استخدم حروفاً إنجليزية وأرقاماً.";
  if (fields.password) return "كلمة المرور يجب ألا تقل عن 4 خانات";
  if (err?.status === 403 || err?.status === 404) return "الخادم رفض إنشاء الحساب. حدّث صلاحيات المستخدمين ثم أعد المحاولة.";
  return err?.message || "تعذر إنشاء المستخدم";
}

function validateAccount(doctorName, username, password) {
  if (!doctorName.trim()) return "أدخل اسم الطبيب";
  if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) return "اسم المستخدم 3 خانات على الأقل، حروف إنجليزية أو أرقام أو _ فقط";
  if (password.length < 4) return "كلمة المرور يجب ألا تقل عن 4 خانات";
  return "";
}

export default function AdminClinicsPage() {
  const { ready } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountClinicId, setAccountClinicId] = useState("");
  const [extraDoctor, setExtraDoctor] = useState("");
  const [extraUsername, setExtraUsername] = useState("");
  const [extraPassword, setExtraPassword] = useState("");
  const [clinicNames, setClinicNames] = useState({});
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadClinics() {
    try {
      await ensurePocketBase();
      const [records, accounts] = await Promise.all([
        pb.collection("clinics").getFullList({ sort: "name" }),
        pb.collection(STAFF_COLLECTION).getFullList({ sort: "name" }),
      ]);
      setClinics(records);
      setClinicNames(Object.fromEntries(records.map((clinic) => [clinic.id, clinic.name || ""])));
      setStaff(accounts);
    } catch (err) {
      console.error(err);
      setMessage("تعذر جلب العيادات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    loadClinics();
  }, [ready]);

  async function handleAdd(event) {
    event.preventDefault();
    const clinicName = name.trim();
    const accountProblem = validateAccount(doctorName, username.trim(), password);
    if (!clinicName) {
      setMessage("أدخل اسم العيادة");
      return;
    }
    if (accountProblem) {
      setMessage(accountProblem);
      return;
    }
    if (clinics.some((clinic) => clinic.name === clinicName)) {
      setMessage("هذه العيادة موجودة مسبقاً");
      return;
    }

    try {
      setBusy(true);
      setMessage("");
      await ensurePocketBase();
      let clinicCreated = false;
      try {
        const clinic = await pb.collection("clinics").create({
          name: clinicName,
          current_number: 0,
        });
        clinicCreated = true;
        await createClinicUser(clinic.id, doctorName.trim(), username.trim(), password);
      } catch (err) {
        err.clinicCreated = clinicCreated;
        throw err;
      }
      setName("");
      setDoctorName("");
      setUsername("");
      setPassword("");
      await loadClinics();
      setMessage(`تمت إضافة العيادة وحساب الدخول: ${clinicName}`);
    } catch (err) {
      console.error(err);
      setMessage(err?.clinicCreated ? `أُضيفت العيادة، لكن تعذر إنشاء الحساب: ${accountError(err)}` : accountError(err));
      await loadClinics();
    } finally {
      setBusy(false);
    }
  }

  async function createClinicUser(clinicId, nextDoctorName, nextUsername, nextPassword) {
    const doctor = await pb.collection("doctors").create({
      name: nextDoctorName,
      clinic: clinicId,
      is_active: true,
    });
    try {
      await pb.collection(STAFF_COLLECTION).create({
        username: nextUsername,
        password: nextPassword,
        passwordConfirm: nextPassword,
        name: nextDoctorName,
        role: "doctor",
        clinic: clinicId,
        verified: true,
      });
    } catch (err) {
      await pb.collection("doctors").delete(doctor.id).catch(() => {});
      throw err;
    }
  }

  async function handleAddUser(event) {
    event.preventDefault();
    const problem = validateAccount(extraDoctor, extraUsername.trim(), extraPassword);
    if (!accountClinicId) {
      setMessage("اختر العيادة");
      return;
    }
    if (problem) {
      setMessage(problem);
      return;
    }
    try {
      setBusy(true);
      setMessage("");
      await ensurePocketBase();
      await createClinicUser(accountClinicId, extraDoctor.trim(), extraUsername.trim(), extraPassword);
      setAccountClinicId("");
      setExtraDoctor("");
      setExtraUsername("");
      setExtraPassword("");
      await loadClinics();
      setMessage("تم إنشاء حساب الدخول للعيادة");
    } catch (err) {
      console.error(err);
      setMessage(accountError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(clinic) {
    const nextName = (clinicNames[clinic.id] || "").trim();
    if (!nextName) {
      setMessage("أدخل اسم العيادة");
      return;
    }
    if (clinics.some((item) => item.id !== clinic.id && item.name === nextName)) {
      setMessage("هذه العيادة موجودة مسبقاً");
      return;
    }
    if (nextName === (clinic.name || "")) return;

    try {
      setSavingId(clinic.id);
      setMessage("");
      await ensurePocketBase();
      await pb.collection("clinics").update(clinic.id, { name: nextName });
      await loadClinics();
      setMessage(`تم تعديل اسم العيادة إلى ${nextName}`);
    } catch (err) {
      console.error(err);
      setMessage("تعذر حفظ اسم العيادة");
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(clinic) {
    if (!clinic?.id || deletingId || busy) return;
    const clinicName = clinic.name || "هذه العيادة";
    if (!window.confirm(`هل تريد حذف العيادة «${clinicName}»؟ ستختفي من الاستقبال ولوحة الطبيب وشاشة العرض.`)) {
      return;
    }

    try {
      setDeletingId(clinic.id);
      setMessage("");
      await ensurePocketBase();
      const [relatedDoctors, relatedStaff] = await Promise.all([
        pb.collection("doctors").getFullList({ filter: `clinic = "${clinic.id}"` }),
        pb.collection(STAFF_COLLECTION).getFullList({ filter: `clinic = "${clinic.id}"` }),
      ]);
      await Promise.all(relatedDoctors.map((doctor) => pb.collection("doctors").delete(doctor.id)));
      await Promise.all(
        relatedStaff.map((account) => pb.collection(STAFF_COLLECTION).delete(account.id).catch(() => {})),
      );
      await pb.collection("clinics").delete(clinic.id);
      setClinics((items) => items.filter((item) => item.id !== clinic.id));
      setMessage(`تم حذف العيادة: ${clinicName}`);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "تعذر حذف العيادة");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Building2 size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">إدارة العيادات</h1>
              <p className="mt-1 text-sm text-warm">أضف عيادة مع حساب دخول، أو عدّل اسم عيادة موجودة، أو أنشئ مستخدماً لها.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <form
          onSubmit={handleAdd}
          className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-warm">
              اسم العيادة الجديدة
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثال: عيادة الجلدية"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm font-semibold text-warm">
              اسم الطبيب
              <input
                value={doctorName}
                onChange={(event) => setDoctorName(event.target.value)}
                placeholder="مثال: د.ليلى"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm font-semibold text-warm">
              اسم المستخدم
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="layla"
                dir="ltr"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm font-semibold text-warm">
              كلمة المرور
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {busy ? "جاري الإضافة..." : "إضافة العيادة والمستخدم"}
          </button>
          {message ? <p className="mt-4 font-bold text-sky-800">{message}</p> : null}
        </form>

        <form
          onSubmit={handleAddUser}
          className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6"
        >
          <h2 className="mb-4 text-xl font-black text-ink">مستخدم لعيادة موجودة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-warm">
              العيادة
              <select
                value={accountClinicId}
                onChange={(event) => setAccountClinicId(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              >
                <option value="">اختر العيادة</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-warm">
              اسم الطبيب
              <input
                value={extraDoctor}
                onChange={(event) => setExtraDoctor(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm font-semibold text-warm">
              اسم المستخدم
              <input
                value={extraUsername}
                onChange={(event) => setExtraUsername(event.target.value)}
                dir="ltr"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="text-sm font-semibold text-warm">
              كلمة المرور
              <input
                value={extraPassword}
                onChange={(event) => setExtraPassword(event.target.value)}
                dir="ltr"
                className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-2xl bg-sky-700 px-5 py-3 font-bold text-white transition hover:bg-sky-800 disabled:opacity-60"
          >
            {busy ? "جاري الإنشاء..." : "إنشاء المستخدم"}
          </button>
        </form>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          <h2 className="mb-4 text-xl font-black text-ink">العيادات الحالية</h2>
          {loading ? <p className="font-bold text-warm">جاري تحميل العيادات...</p> : null}
          {!loading && clinics.length === 0 ? (
            <p className="font-bold text-warm">لا توجد عيادات حالياً. أضف عيادة من النموذج أعلاه.</p>
          ) : null}
          <ul className="space-y-2">
            {clinics.map((clinic) => (
              <li
                key={clinic.id}
                className="flex flex-col gap-3 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100 sm:flex-row sm:items-end"
              >
                <label className="min-w-0 flex-1 text-sm font-semibold text-warm">
                  اسم العيادة
                  <input
                    value={clinicNames[clinic.id] || ""}
                    onChange={(event) => setClinicNames((current) => ({ ...current, [clinic.id]: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-paper px-4 py-2.5 font-bold text-ink outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <span className="pb-2.5 text-sm font-semibold text-warm">
                  {staff.some((account) => account.role === "doctor" && account.clinic === clinic.id)
                    ? "لها مستخدم"
                    : "بدون مستخدم"}
                </span>
                <button
                  type="button"
                  disabled={savingId === clinic.id || Boolean(deletingId) || busy}
                  onClick={() => handleRename(clinic)}
                  className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {savingId === clinic.id ? "جاري الحفظ..." : "حفظ الاسم"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId) || busy || Boolean(savingId)}
                  onClick={() => handleDelete(clinic)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  {deletingId === clinic.id ? "جاري الحذف..." : "حذف"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
