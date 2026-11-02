import PocketBase from "pocketbase";

export const PB_URLS = [
  process.env.NEXT_PUBLIC_POCKETBASE_URL,
  "http://127.0.0.1:8091",
  "https://paging-system-pb.fly.dev",
].filter((url, index, list) => url && list.indexOf(url) === index);

export const PB_URL = PB_URLS[0] || "http://127.0.0.1:8091";

export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export async function connectPocketBase() {
  for (const url of PB_URLS) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        pb.baseUrl = url;
        return url;
      }
    } catch (err) {
      // try the next server
    }
  }
  return pb.baseUrl;
}

export const TICKET_STATUS = {
  waiting: "waiting ",
  calling: "calling",
  completed: "completed",
  reserved: "reserved",
};

export function waitingFilter(clinicId) {
  return `clinic_id = "${clinicId}" && status = "${TICKET_STATUS.waiting}"`;
}

export function callingFilter(clinicId) {
  return `clinic_id = "${clinicId}" && status = "${TICKET_STATUS.calling}"`;
}

export const TICKET_MAX = 100;

export function nextTicketValue(currentNumber) {
  const current = Number(currentNumber) || 0;
  if (current < 1 || current >= TICKET_MAX) return 1;
  return current + 1;
}

export function ticketsOnLocalDate(tickets, dateKey) {
  const key = dateKey || todayDateKey();
  return (tickets || []).filter((ticket) => localDateKey(ticket.created) === key);
}

export function pickNextDailyNumber(tickets) {
  const todayTickets = ticketsOnLocalDate(tickets);
  const usedNumbers = new Set(
    todayTickets
      .filter((ticket) => isOccupiedStatus(ticket.status))
      .map((ticket) => Number(ticket.ticket_number))
      .filter(Number.isFinite),
  );
  const lastToday = todayTickets.reduce((max, ticket) => {
    const value = Number(ticket.ticket_number) || 0;
    return value > max ? value : max;
  }, 0);

  let ticketValue = nextTicketValue(lastToday);
  let attempts = 0;
  while (usedNumbers.has(ticketValue) && attempts < TICKET_MAX) {
    ticketValue = nextTicketValue(ticketValue);
    attempts += 1;
  }

  return attempts >= TICKET_MAX ? null : ticketValue;
}

export function clinicNameOf(ticket) {
  return ticket?.expand?.clinic_id?.name || "العيادة";
}

export function doctorNameOf(record) {
  return record?.expand?.doctor?.name || record?.name || "";
}

export function displayImageUrl(record) {
  const fileName = record?.file || record?.image;
  if (!record || !fileName) return "";
  return pb.files.getURL(record, fileName);
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "numeric",
  });
}

export function ticketStatusLabel(status) {
  if (status === TICKET_STATUS.waiting) return "انتظار";
  if (status === TICKET_STATUS.calling) return "في العيادة";
  if (status === TICKET_STATUS.completed) return "خرج";
  if (status === TICKET_STATUS.reserved) return "محجوز";
  return status || "—";
}

export function isOccupiedStatus(status) {
  return (
    status === TICKET_STATUS.waiting ||
    status === TICKET_STATUS.calling ||
    status === TICKET_STATUS.reserved
  );
}

export function clinicCaseStats(tickets) {
  const cases = (tickets || []).filter((ticket) => ticket.status !== TICKET_STATUS.reserved);
  const entered = cases.filter((ticket) => Boolean(ticket.entered_at));
  return {
    total: cases.length,
    entered: entered.length,
    notEntered: cases.length - entered.length,
  };
}

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function localDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateKey() {
  return localDateKey(new Date());
}

export function filterTicketsByDate(tickets, dateKey) {
  if (!dateKey) return tickets || [];
  return (tickets || []).filter((ticket) => localDateKey(ticket.created) === dateKey);
}

export function filterTicketsByPeriod(tickets, { mode, year, month }) {
  return (tickets || []).filter((ticket) => {
    const date = new Date(ticket.created);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return false;
    if (mode === "month") return date.getMonth() + 1 === month;
    return true;
  });
}

export function ticketDoctorId(ticket) {
  return ticket?.doctor || ticket?.expand?.doctor?.id || "";
}
