"use client";

import { CalendarDays } from "lucide-react";
import { todayDateKey } from "@/lib/pb";

export function ArchiveToolbar({ date, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold text-warm">
        <span className="flex items-center gap-2">
          <CalendarDays size={16} />
          بحث في الأرشيف بالتاريخ
        </span>
        <input
          type="date"
          dir="ltr"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <button
        type="button"
        onClick={() => onChange(todayDateKey())}
        className="rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 transition hover:bg-sky-100"
      >
        اليوم
      </button>
      <button
        type="button"
        onClick={() => onChange("")}
        className="rounded-2xl bg-paper px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-sky-100 transition hover:bg-sky-50"
      >
        عرض الكل
      </button>
    </div>
  );
}
