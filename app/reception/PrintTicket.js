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

export const ticketPrintCss = `
  @page { size: 72mm 130mm; margin: 2mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 68mm; background: #fff; color: #000; }
  body { font-family: "Cairo", Tahoma, sans-serif; }
  .ticket-sheet { width: 68mm; margin: 0; padding: 0; text-align: center; }
  .ticket-logo { display: block; width: 34mm; height: auto; margin: 0 auto 1mm; }
  .ticket-head h2 { margin: 0; font-size: 15px; font-weight: 900; line-height: 1.35; }
  .ticket-en { margin: 0.5mm 0 0; font-size: 10px; }
  .ticket-number-box { margin: 2mm 0; padding: 1.5mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
  .ticket-number-label { margin: 0; font-size: 13px; font-weight: 700; }
  .ticket-number { margin: 0; font-size: 40px; font-weight: 900; line-height: 1.1; }
  .ticket-row { margin: 0; padding: 1.2mm 0; border-bottom: 1px dotted #666; text-align: center; }
  .ticket-row span { display: block; font-size: 12px; font-weight: 700; }
  .ticket-row strong { display: block; margin-top: 0.4mm; font-size: 15px; font-weight: 900; line-height: 1.35; overflow-wrap: anywhere; }
  .ticket-foot { margin: 2mm 0 0; font-size: 13px; font-weight: 800; }
`;

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
        <img src="/brand/ax-logo-print.png" alt="شعار المجمع" className="ticket-logo" />
        <h2>مجمع انوار خيبر الطبي العام</h2>
        <p className="ticket-en">Anwar Khaibar General Medical Complex</p>
      </header>

      <div className="ticket-number-box">
        <p className="ticket-number-label">رقم التذكرة</p>
        <p className="ticket-number">{ticketNumber}</p>
      </div>

      <div className="ticket-row">
        <span>العيادة</span>
        <strong>{clinicName || "—"}</strong>
      </div>
      <div className="ticket-row">
        <span>الطبيب</span>
        <strong>{doctorName || "—"}</strong>
      </div>
      <div className="ticket-row">
        <span>الخدمة</span>
        <strong>كشف و مراجعة</strong>
      </div>
      <div className="ticket-row">
        <span>الوقت</span>
        <strong>{formatTicketTime(issuedAt)}</strong>
      </div>

      <p className="ticket-foot">يرجى الانتظار لحين نداء رقمك</p>
    </div>
  );
}
