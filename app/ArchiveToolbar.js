"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { todayDateKey } from "@/lib/pb";

export function useWorkDay() {
  const [date, setDate] = useState(todayDateKey);
  const liveDay = useRef(todayDateKey());

  useEffect(() => {
    const timer = setInterval(() => {
      const today = todayDateKey();
      setDate((current) => (current === liveDay.current ? today : current));
      liveDay.current = today;
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return [date, setDate];
}

export function ArchiveToolbar({ date, onChange, showAll = false }) {
  const today = todayDateKey();
  const viewingAll = showAll && !date;
  const viewingToday = !viewingAll && (!date || date === today);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold text-warm">
        <span className="flex items-center gap-2">
          <CalendarDays size={16} />
          {viewingAll ? "كل الأيام" : viewingToday ? "جدول اليوم" : "بحث في الأرشيف بالتاريخ"}
        </span>
        <input
          type="date"
          dir="ltr"
          value={date || (showAll ? "" : today)}
          onChange={(event) => onChange(event.target.value || (showAll ? "" : today))}
          className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <button
        type="button"
        onClick={() => onChange(today)}
        className="rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 transition hover:bg-sky-100"
      >
        اليوم
      </button>
      {showAll ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-2xl bg-paper px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-sky-100 transition hover:bg-sky-50"
        >
          عرض الكل
        </button>
      ) : null}
      {!viewingToday && !viewingAll ? (
        <p className="w-full text-sm font-bold text-sky-800">أرشيف يوم {date}</p>
      ) : null}
    </div>
  );
}
