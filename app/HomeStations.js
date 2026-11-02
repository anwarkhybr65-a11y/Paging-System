"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Images, MonitorPlay, Stethoscope, Ticket } from "lucide-react";

const stations = [
  {
    href: "/reception",
    title: "الاستقبال",
    description: "إصدار أرقام التذاكر وطباعتها للمرضى عند الوصول.",
    action: "فتح شاشة الاستقبال",
    icon: Ticket,
  },
  {
    href: "/doctor",
    title: "لوحة الطبيب",
    description: "نداء الرقم التالي، إعادة النداء، وإنهاء المعاينة الحالية.",
    action: "فتح لوحة التحكم",
    icon: Stethoscope,
  },
  {
    href: "/display",
    title: "شاشة العرض",
    description: "عرض الرقم الحالي بحجم كبير مناسب للشاشات المعلقة.",
    action: "فتح شاشة الانتظار",
    icon: MonitorPlay,
  },
  {
    href: "/media",
    title: "صور العرض",
    description: "أضف أو احذف الصور التوعوية التي تظهر على الشاشة المعلقة.",
    action: "إدارة الصور",
    icon: Images,
  },
];

export function HomeStations() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {stations.map((station) => {
        const Icon = station.icon;
        return (
          <Link
            key={station.href}
            href={station.href}
            className="group rounded-[28px] bg-paper p-6 shadow-[0_16px_40px_rgba(36,63,79,0.06)] ring-1 ring-sky-100 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(36,63,79,0.12)]"
          >
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              {ready ? <Icon size={24} strokeWidth={1.8} /> : <span className="h-6 w-6" />}
            </div>
            <div className="mb-3 text-lg font-black text-ink">{station.title}</div>
            <p className="min-h-20 text-base leading-7 text-warm">{station.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700">
              {station.action}
              <span className="transition group-hover:-translate-x-1">←</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
