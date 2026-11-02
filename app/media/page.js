"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { displayImageUrl, ensurePocketBase, pb } from "@/lib/pb";
import { BrandMark } from "../BrandMark";
import { UserBar } from "../UserBar";

export default function MediaPage() {
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadImages() {
    try {
      await ensurePocketBase();
      const records = await pb.collection("display_images").getFullList({ sort: "-created" });
      setImages(records);
    } catch (err) {
      console.error(err);
      setMessage("تعذر جلب الصور");
    }
  }

  useEffect(() => {
    loadImages();
  }, []);

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : "");
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setMessage("اختر صورة أولاً");
      return;
    }

    try {
      setBusy(true);
      setMessage("");
      const data = new FormData();
      data.append("text", "-");
      data.append("file", file);
      await pb.collection("display_images").create(data);
      setFile(null);
      setPreview("");
      event.target.reset();
      await loadImages();
      setMessage("تم حفظ الصورة وستظهر على شاشة العرض");
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "تعذر رفع الصورة");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("هل تريد حذف هذه الصورة من شاشة العرض؟")) return;
    try {
      await pb.collection("display_images").delete(id);
      setImages((items) => items.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setMessage("تعذر حذف الصورة");
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite p-4 sm:p-6" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <div>
              <p className="text-sm font-semibold text-sky-700">شاشة العرض</p>
              <h1 className="text-3xl font-black text-ink">إدارة الصور التوعوية</h1>
            </div>
          </div>
          <UserBar />
        </div>

        <form onSubmit={handleUpload} className="mb-8 rounded-[32px] bg-paper p-6 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-ink">
            <ImagePlus size={22} />
            إضافة صورة جديدة
          </h2>
          <p className="mb-4 text-sm text-warm">
            الصورة تظهر على شاشة العرض. إذا لم يكن هناك رقم في الانتظار تغطي الشاشة كاملة، وإذا وُجد نداء تأخذ ثلثي الشاشة.
          </p>
          <label className="mb-4 block text-right font-semibold text-ink">
            ملف الصورة
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3"
            />
          </label>
          {preview ? (
            <img src={preview} alt="معاينة" className="mb-4 h-48 w-full rounded-2xl object-cover" />
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-sky-600 py-3 text-lg font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            حفظ الصورة على الشاشة
          </button>
          {message ? <p className="mt-3 text-center font-bold text-sky-800">{message}</p> : null}
        </form>

        <section className="rounded-[32px] bg-paper p-6 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100">
          <h2 className="mb-4 text-xl font-black text-ink">الصور الحالية ({images.length})</h2>
          {images.length === 0 ? (
            <p className="rounded-2xl bg-sky-50 px-4 py-10 text-center text-warm">لا توجد صور بعد</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-2xl bg-offwhite ring-1 ring-sky-100">
                  <img src={displayImageUrl(image)} alt="" className="h-40 w-full object-cover" />
                  <div className="flex justify-end p-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(image.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
