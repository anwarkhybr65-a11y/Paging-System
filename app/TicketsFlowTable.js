"use client";

import { clinicCaseStats, doctorNameOf, formatDateTime, TICKET_STATUS, ticketStatusLabel } from "@/lib/pb";
import { StatsPieChart } from "./StatsPieChart";

function statusClass(status) {
  if (status === TICKET_STATUS.calling) return "bg-sky-600 text-white";
  if (status === TICKET_STATUS.reserved) return "bg-amber-100 text-amber-900";
  if (status === TICKET_STATUS.completed) return "bg-warm/10 text-warm";
  return "bg-sky-100 text-sky-800";
}

export function TicketStats({ tickets, stats: statsOverride, title, showChart = false }) {
  const stats = statsOverride || clinicCaseStats(tickets);

  return (
    <div>
      {title ? <h3 className="mb-3 text-lg font-black text-ink">{title}</h3> : null}
      <div className={showChart ? "grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto]" : ""}>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
            <p className="text-sm text-warm">إجمالي الحالات</p>
            <p className="text-2xl font-black text-sky-800">{stats.total}</p>
          </article>
          <article className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
            <p className="text-sm text-warm">دخلوا العيادة</p>
            <p className="text-2xl font-black text-sky-800">{stats.entered}</p>
          </article>
          <article className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
            <p className="text-sm text-warm">لم يدخلوا العيادة</p>
            <p className="text-2xl font-black text-sky-800">{stats.notEntered}</p>
          </article>
        </div>
        {showChart ? <StatsPieChart stats={stats} size={168} /> : null}
      </div>
    </div>
  );
}

function groupTicketsByDoctor(tickets) {
  const groups = new Map();
  for (const ticket of tickets) {
    const key = String(ticket.doctor || "none");
    const name = doctorNameOf(ticket) || "بدون طبيب";
    if (!groups.has(key)) groups.set(key, { key, name, tickets: [] });
    groups.get(key).tickets.push(ticket);
  }
  return [...groups.values()]
    .sort((left, right) => left.name.localeCompare(right.name, "ar"))
    .map((group) => ({
      ...group,
      tickets: [...group.tickets].sort((left, right) => {
        const numberDiff = Number(left.ticket_number) - Number(right.ticket_number);
        if (numberDiff) return numberDiff;
        return new Date(left.created) - new Date(right.created);
      }),
    }));
}

export function TicketsFlowTable({
  tickets,
  statsTickets,
  clinics = [],
  notesEditable = false,
  savingNoteId = "",
  onSaveNote,
  onActivateReserved,
  onDeleteTicket,
  onReprintTicket,
  groupByDoctor = false,
  busy = false,
  showStats = true,
  statsTitle,
}) {
  const showActions = notesEditable || Boolean(onReprintTicket);
  const columnCount = 10 + (showActions ? 1 : 0);
  const groups = groupByDoctor ? groupTicketsByDoctor(tickets) : [{ name: "", tickets }];

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-sky-100">
        <table className="min-w-[1080px] w-full border-collapse text-right text-sm">
          <thead className="bg-sky-50 text-sky-900">
            <tr>
              <th className="px-3 py-3 font-bold">العيادة</th>
              <th className="px-3 py-3 font-bold">الطبيب</th>
              <th className="px-3 py-3 font-bold">الرقم</th>
              <th className="px-3 py-3 font-bold">الحالة</th>
              <th className="px-3 py-3 font-bold">المدخل</th>
              <th className="px-3 py-3 font-bold">وقت الإصدار</th>
              <th className="px-3 py-3 font-bold">النداء</th>
              <th className="px-3 py-3 font-bold">دخول العيادة</th>
              <th className="px-3 py-3 font-bold">خروج</th>
              <th className="px-3 py-3 font-bold">ملاحظات الطبيب</th>
              {showActions ? <th className="px-3 py-3 font-bold">إجراء</th> : null}
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-10 text-center text-warm">
                  لا توجد حالات في هذا اليوم
                </td>
              </tr>
            ) : (
              groups.flatMap((group) => [
                groupByDoctor ? (
                  <tr key={`doctor-${group.key}`} className="border-t border-sky-100 bg-sky-100">
                    <td colSpan={columnCount} className="px-3 py-2 text-base font-black text-sky-900">
                      {group.name}
                    </td>
                  </tr>
                ) : null,
                ...group.tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-sky-50 align-top">
                  <td className="px-3 py-3 font-semibold text-ink">
                    {ticket.expand?.clinic_id?.name || clinics.find((clinic) => clinic.id === ticket.clinic_id)?.name || "العيادة"}
                  </td>
                  <td className="px-3 py-3 text-warm">{doctorNameOf(ticket) || "—"}</td>
                  <td className="px-3 py-3 text-lg font-black text-sky-800">{ticket.ticket_number}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(ticket.status)}`}>
                      {ticketStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-sky-800">الاستقبال</td>
                  <td className="px-3 py-3 text-warm">{formatDateTime(ticket.created)}</td>
                  <td className="px-3 py-3 text-warm">{formatDateTime(ticket.called_at)}</td>
                  <td className="px-3 py-3 text-warm">{formatDateTime(ticket.entered_at)}</td>
                  <td className="px-3 py-3 text-warm">{formatDateTime(ticket.exited_at)}</td>
                  <td className="px-3 py-3">
                    {notesEditable ? (
                      <>
                        <textarea
                          defaultValue={ticket.notes || ""}
                          key={`${ticket.id}-${ticket.updated}`}
                          rows={2}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value !== (ticket.notes || "")) onSaveNote?.(ticket, value);
                          }}
                          className="w-48 resize-none rounded-xl border border-sky-100 bg-offwhite px-2 py-1.5 text-sm outline-none focus:border-sky-400"
                          placeholder="للطبيب فقط"
                        />
                        {savingNoteId === ticket.id ? <p className="mt-1 text-xs text-sky-700">جاري الحفظ...</p> : null}
                      </>
                    ) : (
                      <p className="max-w-48 text-warm">{ticket.notes || "—"}</p>
                    )}
                  </td>
                  {showActions ? (
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-2">
                        {onReprintTicket ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onReprintTicket(ticket)}
                            className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-bold text-sky-900 disabled:opacity-60"
                          >
                            إعادة طباعة
                          </button>
                        ) : null}
                        {ticket.status === TICKET_STATUS.reserved ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onActivateReserved?.(ticket)}
                            className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            تفعيل الرقم
                          </button>
                        ) : null}
                        {onDeleteTicket ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDeleteTicket(ticket)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-100 disabled:opacity-60"
                          >
                            حذف الرقم
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
                )),
              ])
            )}
          </tbody>
        </table>
      </div>

      {showStats ? (
        <div className="mt-4">
          <TicketStats tickets={statsTickets || tickets} title={statsTitle} />
        </div>
      ) : null}
    </div>
  );
}
