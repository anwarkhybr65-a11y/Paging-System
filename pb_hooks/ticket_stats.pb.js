/// <reference path="../pb_data/types.d.ts" />

function isReserved(record) {
  return record.getString("status") === "reserved";
}

function statsOf(records) {
  let total = 0;
  let entered = 0;
  for (let i = 0; i < records.length; i++) {
    if (isReserved(records[i])) continue;
    total += 1;
    if (records[i].get("entered_at")) entered += 1;
  }
  return { total, entered, notEntered: total - entered };
}

function ticketYearMonth(record) {
  let date = new Date();
  try {
    const created = record.getDateTime("created");
    date = new Date(created.string());
  } catch (err) {
    try {
      date = new Date(String(record.get("created") || ""));
    } catch (inner) {}
  }
  if (Number.isNaN(date.getTime())) date = new Date();
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function findReport(app, type, year, month) {
  try {
    return app.findFirstRecordByFilter(
      "stat_reports",
      `period_type = "${type}" && year = ${year} && month = ${month}`,
    );
  } catch (err) {
    return null;
  }
}

function doctorRows(app, tickets) {
  const doctors = app.findAllRecords("doctors");
  const clinics = app.findAllRecords("clinics");
  const clinicName = {};
  for (let i = 0; i < clinics.length; i++) {
    clinicName[clinics[i].id] = clinics[i].getString("name");
  }

  const rows = [];
  for (let i = 0; i < doctors.length; i++) {
    const doctor = doctors[i];
    const related = tickets.filter((ticket) => ticket.get("doctor") === doctor.id);
    const stats = statsOf(related);
    rows.push({
      id: doctor.id,
      name: doctor.getString("name"),
      clinic: clinicName[doctor.get("clinic")] || "",
      total: stats.total,
      entered: stats.entered,
      notEntered: stats.notEntered,
    });
  }

  const unnamed = statsOf(tickets.filter((ticket) => !ticket.get("doctor")));
  if (unnamed.total > 0) {
    rows.push({ id: "", name: "بدون طبيب", clinic: "", total: unnamed.total, entered: unnamed.entered, notEntered: unnamed.notEntered });
  }
  return rows;
}

function ticketsInMonth(all, year, month) {
  return all.filter((ticket) => {
    const stamp = ticketYearMonth(ticket);
    return stamp.year === year && stamp.month === month;
  });
}

function ticketsInYear(all, year) {
  return all.filter((ticket) => ticketYearMonth(ticket).year === year);
}

function upsert(app, type, year, month, live) {
  if (!live || live.total <= 0) return;
  let record = findReport(app, type, year, month);
  if (record && live.total < Number(record.get("total") || 0)) return;

  const collection = app.findCollectionByNameOrId("stat_reports");
  if (!record) {
    record = new Record(collection);
    record.set("period_type", type);
    record.set("year", year);
    record.set("month", month);
  }
  record.set("total", live.total);
  record.set("entered", live.entered);
  record.set("not_entered", live.notEntered);
  record.set("doctors", live.doctors || []);
  record.set("months", live.months || []);
  record.set("captured_at", new Date().toISOString());
  app.save(record);
}

function saveTicketPeriod(app, ticket) {
  const stamp = ticketYearMonth(ticket);
  const all = app.findAllRecords("tickets");
  const monthTickets = ticketsInMonth(all, stamp.year, stamp.month);
  const yearTickets = ticketsInYear(all, stamp.year);
  const monthStats = statsOf(monthTickets);
  const yearStats = statsOf(yearTickets);
  const months = [];
  for (let month = 1; month <= 12; month++) {
    const row = statsOf(ticketsInMonth(all, stamp.year, month));
    months.push({ month, total: row.total, entered: row.entered, notEntered: row.notEntered });
  }

  upsert(app, "month", stamp.year, stamp.month, {
    ...monthStats,
    doctors: doctorRows(app, monthTickets),
    months: [],
  });
  upsert(app, "year", stamp.year, 0, {
    ...yearStats,
    doctors: doctorRows(app, yearTickets),
    months,
  });
}

onRecordAfterCreateSuccess((e) => {
  try {
    saveTicketPeriod(e.app, e.record);
  } catch (err) {
    console.log("stat snapshot create failed", err);
  }
}, "tickets");

onRecordAfterUpdateSuccess((e) => {
  try {
    saveTicketPeriod(e.app, e.record);
  } catch (err) {
    console.log("stat snapshot update failed", err);
  }
}, "tickets");
