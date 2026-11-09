"use client";

import { MonitorPlay } from "lucide-react";
import { BrandMark } from "../BrandMark";
import { HomeStations } from "../HomeStations";
import { UserBar } from "../UserBar";

export default function ScreensPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size="md" />
            <p className="text-sm font-semibold tracking-wide text-sky-700">مجمع انوار خيبر الطبي العام</p>
          </div>
          <UserBar />
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <MonitorPlay size={24} strokeWidth={1.8} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl">لوحة الشاشات</h1>
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-warm">
          هذا الحساب مخصص لشاشة العرض وإدارة الصور التوعوية فقط.
        </p>
        <HomeStations only={["/display", "/media"]} />
      </div>
    </main>
  );
}
