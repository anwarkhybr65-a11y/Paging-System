import {
  ARABIC_MONTHS,
  clinicCaseStats,
  filterTicketsByPeriod,
  nowIso,
  pb,
  ticketDoctorId,
} from "./pb";

export const STAT_COLLECTION = "stat_reports";

export function emptyStats() {
  return { total: 0, entered: 0, notEntered: 0 };
}

export function buildDoctorRows(tickets, doctors) {
  const rows = (doctors || []).map((doctor) => {
    const stats = clinicCaseStats(tickets.filter((ticket) => ticketDoctorId(ticket) === doctor.id));
    return {
      id: doctor.id,
      name: doctor.name,
      clinic: doctor.expand?.clinic?.name || "",
      ...stats,
    };
  });
  const unnamed = clinicCaseStats(tickets.filter((ticket) => !ticketDoctorId(ticket)));
  if (unnamed.total > 0) {
    rows.push({ id: "", name: "بدون طبيب", clinic: "", ...unnamed });
  }
  return rows;
}

export function buildLiveReport(tickets, doctors, period) {
  const periodTickets = filterTicketsByPeriod(tickets, period);
  const stats = clinicCaseStats(periodTickets);
  const report = {
    period_type: period.mode,
    year: period.year,
    month: period.mode === "month" ? period.month : 0,
    total: stats.total,
    entered: stats.entered,
    not_entered: stats.notEntered,
    doctors: buildDoctorRows(periodTickets, doctors),
    months: [],
    captured_at: nowIso(),
  };

  if (period.mode === "year") {
    report.months = ARABIC_MONTHS.map((_, index) => {
      const monthStats = clinicCaseStats(
        filterTicketsByPeriod(tickets, { mode: "month", year: period.year, month: index + 1 }),
      );
      return { month: index + 1, ...monthStats };
    });
  }

  return report;
}

export function reportToStats(report) {
  if (!report) return emptyStats();
  return {
    total: Number(report.total) || 0,
    entered: Number(report.entered) || 0,
    notEntered: Number(report.not_entered) || 0,
  };
}

export function shouldReplaceSaved(live, saved) {
  if (!live || live.total <= 0) return false;
  if (!saved) return true;
  return live.total >= (Number(saved.total) || 0);
}

export function chooseReport(live, saved) {
  if (shouldReplaceSaved(live, saved)) return { report: live, source: "live" };
  if (saved && (Number(saved.total) || 0) > 0) return { report: saved, source: "saved" };
  return { report: live || saved, source: live?.total ? "live" : "empty" };
}

export function monthStatsFromReport(yearReport, month) {
  const row = (yearReport?.months || []).find((item) => Number(item.month) === month);
  if (row) {
    return { total: row.total || 0, entered: row.entered || 0, notEntered: row.notEntered || 0 };
  }
  return emptyStats();
}

export async function listStatReports() {
  try {
    return await pb.collection(STAT_COLLECTION).getFullList({ sort: "-year,-month" });
  } catch (err) {
    console.error("Error loading saved stats:", err);
    return [];
  }
}

export function findSavedReport(reports, period) {
  const month = period.mode === "month" ? period.month : 0;
  return reports.find(
    (item) => item.period_type === period.mode && Number(item.year) === Number(period.year) && Number(item.month) === Number(month),
  );
}

export async function persistReport(live, saved) {
  if (!shouldReplaceSaved(live, saved)) return saved || null;
  const payload = {
    period_type: live.period_type,
    year: live.year,
    month: live.month,
    total: live.total,
    entered: live.entered,
    not_entered: live.not_entered,
    doctors: live.doctors || [],
    months: live.months || [],
    captured_at: nowIso(),
  };

  try {
    if (saved?.id) {
      return await pb.collection(STAT_COLLECTION).update(saved.id, payload);
    }
    return await pb.collection(STAT_COLLECTION).create(payload);
  } catch (err) {
    console.error("Error saving stats snapshot:", err);
    return saved || null;
  }
}

export async function persistVisibleStats(tickets, doctors, reports) {
  const years = new Set([new Date().getFullYear()]);
  tickets.forEach((ticket) => {
    const date = new Date(ticket.created);
    if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
  });
  reports.forEach((report) => {
    if (report.year) years.add(Number(report.year));
  });

  const saved = [...reports];
  for (const year of years) {
    const yearPeriod = { mode: "year", year };
    const yearLive = buildLiveReport(tickets, doctors, yearPeriod);
    const yearSaved = findSavedReport(saved, yearPeriod);
    const yearStored = await persistReport(yearLive, yearSaved);
    if (yearStored) {
      const index = saved.findIndex((item) => item.id === yearStored.id);
      if (index >= 0) saved[index] = yearStored;
      else saved.push(yearStored);
    }

    for (let month = 1; month <= 12; month += 1) {
      const monthPeriod = { mode: "month", year, month };
      const monthLive = buildLiveReport(tickets, doctors, monthPeriod);
      const monthSaved = findSavedReport(saved, monthPeriod);
      const monthStored = await persistReport(monthLive, monthSaved);
      if (monthStored) {
        const index = saved.findIndex((item) => item.id === monthStored.id);
        if (index >= 0) saved[index] = monthStored;
        else saved.push(monthStored);
      }
    }
  }
  return saved;
}
