"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, BarChart3, Building2, KeyRound, LayoutDashboard, Stethoscope } from "lucide-react";
import { BrandMark } from "../BrandMark";
import { HomeStations } from "../HomeStations";
import { UserBar } from "../UserBar";

const adminTools = [
  {
    href: "/admin/clinics",
    title: "العيادات",
    description: "إضافة عيادة أو قسم جديد ليظهر في كل الشاشات.",
    action: "إضافة عيادة",
    icon: Building2,
  },
  {
    href: "/admin/users",
    title: "المستخدمون",
    description: "تغيير اسم المستخدم وكلمة المرور لأي حساب.",
    action: "إدارة الحسابات",
    icon: KeyRound,
  },
  {
    href: "/admin/doctors",
    title: "الأطباء",
    description: "تغيير اسم الطبيب عند تبديل طبيب العيادة مستقبلاً.",
    action: "تعديل الأسماء",
    icon: Stethoscope,
  },
  {
    href: "/admin/archive",
    title: "الأرشيف",
    description: "نفس جدول دخول وخروج المرضى في الاستقبال، مع البحث بالتاريخ.",
    action: "فتح الأرشيف",
    icon: Archive,
  },
  {
    href: "/admin/stats",
    title: "الإحصائيات",
    description: "إحصائيات شهرية وسنوية للمجمع ولكل طبيب، مع البحث والطباعة.",
    action: "عرض الإحصائيات",
    icon: BarChart3,
  },
];

function AdminTools() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="mt-10 grid gap-5 md:grid-cols-3">
      {adminTools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-[28px] bg-paper p-6 shadow-[0_16px_40px_rgba(36,63,79,0.06)] ring-1 ring-sky-100 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(36,63,79,0.12)]"
          >
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              {ready ? <Icon size={24} strokeWidth={1.8} /> : <span className="h-6 w-6" />}
            </div>
            <div className="mb-3 text-lg font-black text-ink">{tool.title}</div>
            <p className="min-h-16 text-base leading-7 text-warm">{tool.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700">
              {tool.action}
              <span className="transition group-hover:-translate-x-1">←</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
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
            <LayoutDashboard size={24} strokeWidth={1.8} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-ink sm:text-5xl">لوحة الإدارة</h1>
        </div>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-warm">
          تحكم كامل بجميع الشاشات: الاستقبال، الطبيب، شاشة العرض، وإدارة الصور.
        </p>
        <AdminTools />
        <HomeStations />
      </div>
    </main>
  );
}
