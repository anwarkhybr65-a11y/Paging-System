"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Printer, Search } from "lucide-react";
import { ARABIC_MONTHS, ensurePocketBase, formatDateTime, pb } from "@/lib/pb";
import {
  buildLiveReport,
  chooseReport,
  emptyStats,
  findSavedReport,
  listStatReports,
  persistVisibleStats,
  reportToStats,
} from "@/lib/statReports";
import { TicketStats } from "../../TicketsFlowTable";
import { StatsPieChart } from "../../StatsPieChart";
import { UserBar } from "../../UserBar";

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

export default function AdminStatsPage() {
  const [tickets, setTickets] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [reports, setReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("month");
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(currentMonth());
  const [applied, setApplied] = useState({ mode: "month", year: currentYear(), month: currentMonth() });

  useEffect(() => {
    async function load() {
      try {
        await ensurePocketBase();
        const [ticketRows, doctorRows, reportRows] = await Promise.all([
          pb.collection("tickets").getFullList({ sort: "-created", expand: "clinic_id,doctor" }),
          pb.collection("doctors").getFullList({ sort: "name", expand: "clinic" }),
          listStatReports(),
        ]);
        setTickets(ticketRows);
        setDoctors(doctorRows);
        setSaving(true);
        const stored = await persistVisibleStats(ticketRows, doctorRows, reportRows);
        setReports(stored);
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    }
    load();
  }, []);

  const years = useMemo(() => {
    const values = new Set([currentYear()]);
    tickets.forEach((ticket) => {
      const date = new Date(ticket.created);
      if (!Number.isNaN(date.getTime())) values.add(date.getFullYear());
    });
    reports.forEach((report) => {
      if (report.year) values.add(Number(report.year));
    });
    return [...values].sort((a, b) => b - a);
  }, [tickets, reports]);

  const liveReport = buildLiveReport(tickets, doctors, applied);
  const savedReport = findSavedReport(reports, applied);
  const chosen = chooseReport(liveReport, savedReport);
  const report = chosen.report || liveReport;
  const periodStats = reportToStats(report);
  const doctorRows = Array.isArray(report?.doctors) ? report.doctors : [];

  const yearLive = buildLiveReport(tickets, doctors, { mode: "year", year: applied.year });
  const yearSaved = findSavedReport(reports, { mode: "year", year: applied.year });
  const yearChosen = chooseReport(yearLive, yearSaved);
  const yearReport = yearChosen.report || yearLive;
  const yearStats = reportToStats(yearReport);
  const yearMonths = ARABIC_MONTHS.map((label, index) => {
    const monthLive = buildLiveReport(tickets, doctors, { mode: "month", year: applied.year, month: index + 1 });
    const monthSaved = findSavedReport(reports, { mode: "month", year: applied.year, month: index + 1 });
    const monthChosen = chooseReport(monthLive, monthSaved);
    const fromYear = (yearReport?.months || []).find((item) => Number(item.month) === index + 1);
    const stats = reportToStats(monthChosen.report) || emptyStats();
    if (stats.total === 0 && fromYear) {
      return {
        label,
        stats: {
          total: fromYear.total || 0,
          entered: fromYear.entered || 0,
          notEntered: fromYear.notEntered || 0,
        },
      };
    }
    return { label, stats };
  });

  const periodLabel =
    applied.mode === "month"
      ? `${ARABIC_MONTHS[applied.month - 1]} ${applied.year}`
      : `سنة ${applied.year}`;
  const capturedAt = report?.captured_at || report?.updated || savedReport?.captured_at;
  const fromArchive = chosen.source === "saved";

  function handleSearch(event) {
    event.preventDefault();
    setApplied({ mode, year: Number(year), month: Number(month) });
  }

  function handlePrint() {
    document.documentElement.classList.add("report-print");
    const cleanup = () => {
      document.documentElement.classList.remove("report-print");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex items-start justify-between gap-3 print:hidden">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <BarChart3 size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ink sm:text-3xl">الإحصائيات</h1>
              <p className="mt-1 text-sm text-warm">إجماليات المجمع من جدول الاستقبال، وإحصائيات كل طبيب من إجماليات عيادته. تُحفظ شهرياً وسنوياً في قاعدة البيانات مع الرسوم.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-wrap items-end gap-3 rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 print:hidden"
        >
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sky-50 p-1">
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "month" ? "bg-sky-600 text-white" : "text-sky-800"}`}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setMode("year")}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === "year" ? "bg-sky-600 text-white" : "text-sky-800"}`}
            >
              سنوي
            </button>
          </div>

          {mode === "month" ? (
            <label className="text-sm font-semibold text-warm">
              الشهر
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="mt-1 block rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 outline-none focus:border-sky-400"
              >
                {ARABIC_MONTHS.map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-sm font-semibold text-warm">
            السنة
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="mt-1 block rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 outline-none focus:border-sky-400"
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 font-bold text-white hover:bg-sky-700"
          >
            <Search size={16} />
            بحث
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 font-bold text-white hover:bg-black"
          >
            <Printer size={16} />
            طباعة الإحصائيات
          </button>
        </form>

        <div id="print-report" className="flex flex-col gap-6">
          <header className="hidden print:block text-center">
            <p className="text-sm font-semibold">مجمع انوار خيبر الطبي العام</p>
            <h1 className="text-2xl font-black">تقرير الإحصائيات</h1>
            <p className="mt-1 font-bold text-sky-800">{periodLabel}</p>
          </header>

          <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-100">
            {saving
              ? "جاري حفظ الإحصائيات في قاعدة البيانات..."
              : fromArchive
                ? `عرض نسخة محفوظة في قاعدة البيانات${capturedAt ? ` — آخر حفظ: ${formatDateTime(capturedAt)}` : ""}`
                : `محفوظة في قاعدة البيانات${capturedAt ? ` — آخر حفظ: ${formatDateTime(capturedAt)}` : ""}`}
          </p>

          <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
            <h2 className="mb-2 text-xl font-black text-ink">1. إحصائيات المجمع</h2>
            <p className="mb-5 text-sm text-warm">من إجماليات جدول الاستقبال لكل العيادات خلال {periodLabel}، مع الرسم الدائري المحفوظ مع التقرير.</p>
            <TicketStats stats={periodStats} title="كل العيادات" showChart />
          </section>

          <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
            <h2 className="mb-4 text-xl font-black text-ink">رسوم الأشهر والسنة</h2>
            <p className="mb-5 text-sm text-warm">دائرة مقسمة لكل شهر من سنة {applied.year}، ودائرة للإجمالي السنوي. تُحفظ مع الإحصائيات في قاعدة البيانات.</p>
            <div className="mb-6 rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
              <StatsPieChart stats={yearStats} size={200} title={`سنة ${applied.year}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {yearMonths.map((item) => (
                <article key={item.label} className="rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <StatsPieChart stats={item.stats} size={148} title={item.label} />
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
            <h2 className="mb-2 text-xl font-black text-ink">2. إحصائيات الطبيب</h2>
            <p className="mb-5 text-sm text-warm">من إجماليات جدول كل طبيب خلال {periodLabel}، مع الرسم الدائري لكل طبيب.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {doctorRows.map((doctor) => (
                <TicketStats
                  key={doctor.id || doctor.name}
                  stats={{
                    total: doctor.total || 0,
                    entered: doctor.entered || 0,
                    notEntered: doctor.notEntered || 0,
                  }}
                  title={`${doctor.name}${doctor.clinic ? ` - ${doctor.clinic}` : ""}`}
                  showChart
                />
              ))}
            </div>
            {doctorRows.length === 0 ? <p className="text-warm">لا توجد إحصائيات أطباء لهذه الفترة</p> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
