"use client";

import { useEffect, useState } from "react";
import { Archive } from "lucide-react";
import { ensurePocketBase, filterTicketsByDate, pb } from "@/lib/pb";
import { ArchiveToolbar, useWorkDay } from "../../ArchiveToolbar";
import { TicketStats, TicketsFlowTable } from "../../TicketsFlowTable";
import { BrandMark } from "../../BrandMark";
import { UserBar } from "../../UserBar";

export default function AdminArchivePage() {
  const [clinics, setClinics] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [archiveDate, setArchiveDate] = useWorkDay();

  useEffect(() => {
    async function loadClinics() {
      try {
        await ensurePocketBase();
        setClinics(await pb.collection("clinics").getFullList());
      } catch (err) {
        console.error(err);
      }
    }
    loadClinics();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      try {
        await ensurePocketBase();
        const records = await pb.collection("tickets").getFullList({
          sort: "-created",
          expand: "clinic_id,doctor",
        });
        if (!cancelled) setTickets(records);
      } catch (err) {
        console.error(err);
      }
    }

    loadTickets();
    const timer = setInterval(loadTickets, 4000);
    const subscription = pb.collection("tickets").subscribe("*", loadTickets);

    return () => {
      cancelled = true;
      clearInterval(timer);
      Promise.resolve(subscription)
        .then((unsub) => {
          if (typeof unsub === "function") unsub();
          else pb.collection("tickets").unsubscribe("*");
        })
        .catch(() => {});
    };
  }, []);

  const archivedTickets = filterTicketsByDate(tickets, archiveDate);

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Archive size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">أرشيف دخول وخروج المرضى</h1>
              <p className="mt-1 text-sm text-warm">نفس جدول الاستقبال، مع البحث عن الحالات حسب تاريخ الإصدار.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          <ArchiveToolbar date={archiveDate} onChange={setArchiveDate} showAll />
          <TicketsFlowTable tickets={archivedTickets} clinics={clinics} showStats={false} />
        </section>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          <h2 className="mb-5 text-xl font-black text-ink">إجماليات دخول وخروج المرضى</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <TicketStats tickets={archivedTickets} title="كل العيادات" />
            <div className="grid gap-4 sm:grid-cols-2">
              {clinics.map((clinic) => (
                <TicketStats
                  key={clinic.id}
                  tickets={archivedTickets.filter((ticket) => ticket.clinic_id === clinic.id)}
                  title={clinic.name}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
