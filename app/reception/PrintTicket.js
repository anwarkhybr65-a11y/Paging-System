function formatTicketTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function PrintTicket({
  ticketNumber,
  clinicName,
  doctorName,
  issuedAt,
  preview = false,
}) {
  return (
    <div
      id={preview ? undefined : "print-ticket"}
      dir="rtl"
      className={preview ? "ticket-sheet ticket-preview" : "ticket-sheet"}
    >
      <header className="ticket-head">
        <p className="ticket-mark">✚</p>
        <h2>مجمع انوار خيبر الطبي العام</h2>
        <p className="ticket-en">Anwar Khaibar General Medical Complex</p>
      </header>

      <div className="ticket-number-box">
        <p className="ticket-number-label">رقم التذكرة</p>
        <p className="ticket-number">{ticketNumber}</p>
      </div>

      <dl className="ticket-meta">
        <div>
          <dt>Clinic</dt>
          <dd>{clinicName || "—"}</dd>
        </div>
        <div>
          <dt>Dr.</dt>
          <dd>{doctorName || "—"}</dd>
        </div>
        <div>
          <dt>الخدمة</dt>
          <dd>كشف و مراجعة</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatTicketTime(issuedAt)}</dd>
        </div>
      </dl>

      <p className="ticket-foot">يرجى الانتظار لحين نداء رقمك</p>
    </div>
  );
}
