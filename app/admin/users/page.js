"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { ensurePocketBase, pb } from "@/lib/pb";
import { ROLE_LABELS, STAFF_COLLECTION } from "@/lib/auth";
import { UserBar } from "../../UserBar";
import { useAuth } from "../../AuthProvider";

function errorMessage(err) {
  const fields = err?.data?.data || {};
  if (fields.username) return "اسم المستخدم مستخدم مسبقاً أو غير صالح";
  if (fields.password) return "كلمة المرور يجب ألا تقل عن 4 خانات";
  return err?.message || "تعذر حفظ بيانات المستخدم";
}

function keepAuthRecord(updated) {
  const current = pb.authStore.record || {};
  return {
    ...current,
    ...updated,
    role: updated?.role || current.role,
    name: updated?.name || current.name,
    clinic: updated?.clinic ?? current.clinic,
  };
}

export default function AdminUsersPage() {
  const { user: currentUser, ready } = useAuth();
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      await ensurePocketBase();
      const records = await pb.collection(STAFF_COLLECTION).getFullList({
        sort: "role,name",
        expand: "clinic",
      });
      setUsers(records);
      setDrafts(
        Object.fromEntries(
          records.map((record) => [
            record.id,
            { username: record.username || "", password: "" },
          ]),
        ),
      );
    } catch (err) {
      console.error(err);
      setMessage("تعذر جلب المستخدمين. تأكد أن حساب الإدارة يملك صلاحية إدارة الحسابات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    loadUsers();
  }, [ready]);

  function updateDraft(id, field, value) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function handleSave(record) {
    const draft = drafts[record.id] || {};
    const username = String(draft.username || "").trim();
    const password = String(draft.password || "");

    if (username.length < 3) {
      setMessage("اسم المستخدم يجب ألا يقل عن 3 خانات");
      return;
    }
    if (password && password.length < 4) {
      setMessage("كلمة المرور يجب ألا تقل عن 4 خانات");
      return;
    }

    try {
      setSavingId(record.id);
      setMessage("");
      await ensurePocketBase();
      const payload = { username };
      if (password) {
        payload.password = password;
        payload.passwordConfirm = password;
      }
      const updated = await pb.collection(STAFF_COLLECTION).update(record.id, payload);
      if (currentUser?.id === record.id) {
        if (password) {
          const auth = await pb.collection(STAFF_COLLECTION).authWithPassword(username, password);
          pb.authStore.save(auth.token, keepAuthRecord(auth.record));
        } else if (pb.authStore.token) {
          pb.authStore.save(pb.authStore.token, keepAuthRecord(updated));
        }
      }
      await loadUsers();
      setMessage(
        password
          ? `تم تحديث اسم المستخدم وكلمة المرور لـ ${record.name || username}`
          : `تم تحديث اسم المستخدم لـ ${record.name || username}`,
      );
    } catch (err) {
      console.error(err);
      setMessage(errorMessage(err));
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <KeyRound size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">حسابات المستخدمين</h1>
              <p className="mt-1 text-sm text-warm">غيّر اسم المستخدم أو كلمة المرور لأي حساب. اترك كلمة المرور فارغة إذا كنت تريد تغيير الاسم فقط.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          {message ? <p className="mb-4 font-bold text-sky-800">{message}</p> : null}
          {loading ? <p className="font-bold text-warm">جاري تحميل المستخدمين...</p> : null}
          {!loading && users.length === 0 ? (
            <p className="font-bold text-warm">لا يوجد مستخدمون للعرض حالياً.</p>
          ) : null}
          <div className="space-y-4">
            {users.map((record) => {
              const draft = drafts[record.id] || { username: "", password: "" };
              return (
                <div key={record.id} className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <p className="mb-3 font-black text-ink">
                    {record.name || record.username}
                    <span className="mr-2 text-sm font-semibold text-warm">
                      · {ROLE_LABELS[record.role] || record.role}
                      {record.expand?.clinic?.name ? ` · ${record.expand.clinic.name}` : ""}
                    </span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <label className="text-sm font-semibold text-warm">
                      اسم المستخدم
                      <input
                        value={draft.username}
                        onChange={(event) => updateDraft(record.id, "username", event.target.value)}
                        dir="ltr"
                        className="mt-1 w-full rounded-2xl border border-sky-100 bg-paper px-4 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <label className="text-sm font-semibold text-warm">
                      كلمة المرور الجديدة
                      <input
                        type="text"
                        value={draft.password}
                        onChange={(event) => updateDraft(record.id, "password", event.target.value)}
                        placeholder="بدون تغيير"
                        dir="ltr"
                        className="mt-1 w-full rounded-2xl border border-sky-100 bg-paper px-4 py-2.5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={savingId === record.id}
                      onClick={() => handleSave(record)}
                      className="rounded-2xl bg-sky-600 px-5 py-2.5 font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                      {savingId === record.id ? "جاري الحفظ..." : "حفظ"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
