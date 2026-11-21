'use client';
import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarClock, Printer, SkipForward, Stethoscope, Ticket } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { UserBar } from '../UserBar';
import {
  doctorNameOf,
  ensurePocketBase,
  filterTicketsByDate,
  todayDateKey,
  ticketsOnLocalDate,
  pb,
  isOccupiedStatus,
  pickNextDailyNumber,
  ticketStatusLabel,
  TICKET_MAX,
  TICKET_STATUS,
} from '@/lib/pb';
import { PrintTicket, ticketPrintCss } from './PrintTicket';
import { TicketStats, TicketsFlowTable } from '../TicketsFlowTable';
import { ArchiveToolbar, useWorkDay } from '../ArchiveToolbar';

function pocketbaseErrorMessage(err) {
  const fields = err?.data?.data || err?.response?.data || {};
  const details = Object.entries(fields)
    .map(([field, info]) => `${field}: ${info?.message || info}`)
    .join(' | ');
  return details || err?.message || 'فشل حفظ التذكرة';
}

export default function ReceptionPage() {
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [lastTicket, setLastTicket] = useState(null);
  const [clinicName, setClinicName] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [shouldPrint, setShouldPrint] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState('');
  const [archiveDate, setArchiveDate] = useWorkDay();
  const [chosenNumber, setChosenNumber] = useState('');
  const [printRequest, setPrintRequest] = useState(null);
  const suggestedNumber = useRef("");
  const numberScope = useRef("");

  useEffect(() => {
    async function fetchClinics() {
      try {
        await ensurePocketBase();
        const records = await pb.collection('clinics').getFullList();
        setClinics(records);
        if (records.length > 0) {
          setSelectedClinic(records[0].id);
          setClinicName(records[0].name);
        }
      } catch (err) {
        console.error('Error fetching clinics:', err);
      }
    }
    fetchClinics();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      try {
        await ensurePocketBase();
        const records = await pb.collection('tickets').getFullList({
          sort: '-created',
          expand: 'clinic_id,doctor',
        });
        if (!cancelled) setTickets(records);
      } catch (err) {
        console.error('Error fetching tickets:', err);
      }
    }

    loadTickets();
    const timer = setInterval(loadTickets, 4000);
    const subscription = pb.collection('tickets').subscribe('*', loadTickets);

    return () => {
      cancelled = true;
      clearInterval(timer);
      Promise.resolve(subscription).then((unsub) => {
        if (typeof unsub === 'function') unsub();
        else pb.collection('tickets').unsubscribe('*');
      }).catch(() => {});
    };
  }, []);

  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    setSelectedClinic(clinicId);
    const found = clinics.find(c => c.id === clinicId);
    if (found) setClinicName(found.name);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDoctors() {
      try {
        await ensurePocketBase();
        const records = await pb.collection('doctors').getFullList({
          sort: 'name',
          expand: 'clinic',
        });
        if (!cancelled) setDoctors(records);
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    }

    loadDoctors();
    const subscription = pb.collection('doctors').subscribe('*', loadDoctors);

    return () => {
      cancelled = true;
      Promise.resolve(subscription).then((unsub) => {
        if (typeof unsub === 'function') unsub();
        else pb.collection('doctors').unsubscribe('*');
      }).catch(() => {});
    };
  }, []);

  const clinicDoctors = doctors.filter((doctor) => {
    const clinicId = doctor.clinic || doctor.expand?.clinic?.id;
    return clinicId === selectedClinic && doctor.is_active !== false;
  });
  const selectedDoctorRecord = clinicDoctors.find((doctor) => doctor.id === selectedDoctor)
    || doctors.find((doctor) => doctor.id === selectedDoctor);
  const printedDoctorName = selectedDoctorRecord?.name || doctorNameOf(lastTicket);

  useEffect(() => {
    setSelectedDoctor((current) => {
      const list = doctors.filter((doctor) => {
        const clinicId = doctor.clinic || doctor.expand?.clinic?.id;
        return clinicId === selectedClinic && doctor.is_active !== false;
      });
      if (list.some((doctor) => doctor.id === current)) return current;
      return list[0]?.id || '';
    });
  }, [selectedClinic, doctors]);

  const archivedTickets = filterTicketsByDate(tickets, archiveDate || todayDateKey());
  const clinicTickets = archivedTickets.filter((ticket) => ticket.clinic_id === selectedClinic);
  const liveTickets = ticketsOnLocalDate(tickets);
  function doctorIdOf(ticket) {
    if (!ticket?.doctor) return ticket?.expand?.doctor?.id || "";
    if (typeof ticket.doctor === "string") return ticket.doctor;
    return ticket.doctor.id || ticket.expand?.doctor?.id || "";
  }

  function ticketsForDoctor(records, doctorId = selectedDoctor) {
    const target = String(doctorId || "");
    return (records || []).filter((ticket) => doctorIdOf(ticket) === target);
  }

  const nextNumber = selectedDoctor
    ? pickNextDailyNumber(ticketsForDoctor(tickets))
    : null;

  useEffect(() => {
    const scope = `${selectedClinic}|${selectedDoctor}`;
    const suggested = nextNumber ? String(nextNumber) : "";
    const scopeChanged = numberScope.current !== scope;
    const followingSuggestion = chosenNumber === "" || chosenNumber === suggestedNumber.current;
    if (!scopeChanged && !followingSuggestion) return;
    numberScope.current = scope;
    suggestedNumber.current = suggested;
    setChosenNumber(suggested);
  }, [selectedClinic, selectedDoctor, nextNumber, chosenNumber]);

  function printWhenReady() {
    const startedAt = Date.now();
    const attempt = () => {
      const ticket = document.getElementById("print-ticket");
      if (!ticket) {
        if (Date.now() - startedAt < 1500) window.setTimeout(attempt, 50);
        return;
      }
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;left:0;top:0;width:80mm;height:140mm;border:0;z-index:-1;pointer-events:none;";
      document.body.appendChild(frame);
      const doc = frame.contentDocument;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>تذكرة</title><style>${ticketPrintCss}</style></head><body>${ticket.outerHTML}</body></html>`);
      doc.close();
      let started = false;
      const go = () => {
        if (started) return;
        started = true;
        frame.contentWindow.focus();
        frame.contentWindow.print();
        window.setTimeout(() => frame.remove(), 1000);
      };
      const image = doc.querySelector(".ticket-logo");
      if (!image || (image.complete && image.naturalWidth > 0)) {
        go();
        return;
      }
      image.addEventListener("load", go, { once: true });
      image.addEventListener("error", go, { once: true });
      window.setTimeout(go, 1500);
    };
    window.setTimeout(attempt, 50);
  }

  useEffect(() => {
    if (!printRequest?.key) return;
    printWhenReady();
  }, [printRequest]);

  function queuePrint(ticket, overrides = {}) {
    if (!ticket) return;
    setPrintRequest({
      key: `${ticket.id || "ticket"}-${Date.now()}`,
      ticketNumber: ticket.ticket_number,
      clinicName:
        overrides.clinicName ||
        ticket.expand?.clinic_id?.name ||
        clinics.find((clinic) => clinic.id === ticket.clinic_id)?.name ||
        clinicName ||
        "",
      doctorName: overrides.doctorName || doctorNameOf(ticket) || "",
      issuedAt: ticket.created,
    });
  }

  function takenToday(records) {
    return new Set(
      ticketsOnLocalDate(records)
        .filter((ticket) => isOccupiedStatus(ticket.status))
        .map((ticket) => Number(ticket.ticket_number))
        .filter(Number.isFinite),
    );
  }

  function chosenTicketValue(records) {
    const raw = String(chosenNumber).trim();
    if (!raw) return { value: pickNextDailyNumber(records) };
    const typed = Number(raw);
    if (!Number.isInteger(typed) || typed < 1 || typed > TICKET_MAX) {
      return { error: `اختر رقماً من 1 إلى ${TICKET_MAX}` };
    }
    if (takenToday(records).has(typed)) {
      return { error: `الرقم ${typed} مستخدم اليوم لهذا الطبيب` };
    }
    return { value: typed };
  }

  async function createTicketRecord(status, ticketValue) {
    const data = {
      ticket_number: String(ticketValue),
      clinic_id: String(selectedClinic).trim(),
      status,
      notes: notes.trim(),
      ...(selectedDoctor ? { doctor: selectedDoctor } : {}),
    };

    const newTicket = await pb.collection('tickets').create(data);
    await pb.collection('clinics').update(selectedClinic, {
      current_number: ticketValue,
    });
    setClinics((items) =>
      items.map((item) =>
        item.id === selectedClinic ? { ...item, current_number: ticketValue } : item,
      ),
    );
    setLastTicket(newTicket);
    setNotes('');
    return newTicket;
  }

  const handleIssueTicket = async () => {
    if (!selectedClinic) {
      alert('الرجاء اختيار العيادة أولاً');
      return;
    }
    if (clinicDoctors.length > 0 && !selectedDoctor) {
      alert('الرجاء اختيار الطبيب أولاً');
      return;
    }

    try {
      setBusy(true);
      const clinicTicketsToday = ticketsForDoctor(await pb.collection('tickets').getFullList({
        filter: `doctor = "${selectedDoctor}"`,
        sort: '-created',
      }));
      const picked = chosenTicketValue(clinicTicketsToday);
      if (picked.error) {
        alert(picked.error);
        return;
      }
      const ticketValue = picked.value;

      if (!ticketValue) {
        alert(`اكتملت أرقام الانتظار من 1 إلى ${TICKET_MAX} لهذا الطبيب اليوم`);
        return;
      }

      const newTicket = await createTicketRecord(TICKET_STATUS.waiting, ticketValue);
      const upcoming = pickNextDailyNumber([...clinicTicketsToday, newTicket]);
      const upcomingText = upcoming ? String(upcoming) : '';
      suggestedNumber.current = upcomingText;
      setChosenNumber(upcomingText);

      if (shouldPrint) {
        queuePrint(newTicket, { clinicName, doctorName: printedDoctorName });
      } else {
        setLastTicket(newTicket);
      }
    } catch (err) {
      console.error('Detailed Error creating ticket:', err?.data || err);
      alert(`خطأ: ${pocketbaseErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSkipNumber = async () => {
    if (!selectedClinic) {
      alert('الرجاء اختيار العيادة أولاً');
      return;
    }
    if (clinicDoctors.length > 0 && !selectedDoctor) {
      alert('الرجاء اختيار الطبيب أولاً');
      return;
    }

    try {
      setBusy(true);
      const clinicTicketsToday = ticketsForDoctor(await pb.collection('tickets').getFullList({
        filter: `doctor = "${selectedDoctor}"`,
        sort: '-created',
      }));
      const ticketValue = pickNextDailyNumber(clinicTicketsToday);

      if (!ticketValue) {
        alert(`اكتملت أرقام الانتظار من 1 إلى ${TICKET_MAX} لهذا الطبيب اليوم`);
        return;
      }

      await createTicketRecord(TICKET_STATUS.reserved, ticketValue);
    } catch (err) {
      console.error('Error reserving ticket:', err?.data || err);
      alert(`خطأ: ${pocketbaseErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTicket = async (ticket) => {
    const doctorLabel = doctorNameOf(ticket) || printedDoctorName || "";
    const confirmed = window.confirm(`حذف الرقم ${ticket.ticket_number}${doctorLabel ? ` (${doctorLabel})` : ""}؟`);
    if (!confirmed) return;
    try {
      setBusy(true);
      await ensurePocketBase();
      await pb.collection('tickets').delete(ticket.id);
      const remaining = tickets.filter((item) => item.id !== ticket.id);
      setTickets(remaining);
      if (lastTicket?.id === ticket.id) setLastTicket(null);
      const sameDoctor = String(ticket.doctor || "") === String(selectedDoctor || "");
      const sameClinic = String(ticket.clinic_id || "") === String(selectedClinic || "");
      if (sameDoctor && sameClinic) {
        const value = pickNextDailyNumber(
          ticketsForDoctor(remaining),
        );
        const text = value ? String(value) : "";
        suggestedNumber.current = text;
        setChosenNumber(text);
      }
    } catch (err) {
      console.error('Error deleting ticket:', err?.data || err);
      alert(`تعذر حذف الرقم: ${pocketbaseErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleActivateReserved = async (ticket) => {
    try {
      setBusy(true);
      const ticketClinicName =
        ticket.expand?.clinic_id?.name ||
        clinics.find((clinic) => clinic.id === ticket.clinic_id)?.name ||
        clinicName;
      setSelectedClinic(ticket.clinic_id);
      setClinicName(ticketClinicName);
      if (ticket.doctor) setSelectedDoctor(ticket.doctor);
      const updated = await pb.collection('tickets').update(ticket.id, {
        status: TICKET_STATUS.waiting,
        notes: ticket.notes || '',
      });
      setLastTicket(updated);
      if (shouldPrint) {
        queuePrint(ticket, { clinicName: ticketClinicName, doctorName: doctorNameOf(ticket) || printedDoctorName });
      }
    } catch (err) {
      console.error('Error activating reserved ticket:', err?.data || err);
      alert(`خطأ: ${pocketbaseErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  function handleReprint(ticket) {
    queuePrint(ticket);
  }

  const handleSaveNote = async (ticket, value) => {
    try {
      setSavingNoteId(ticket.id);
      await pb.collection('tickets').update(ticket.id, { notes: value });
      setTickets((items) =>
        items.map((item) => (item.id === ticket.id ? { ...item, notes: value } : item)),
      );
    } catch (err) {
      console.error('Error saving note:', err);
      alert('تعذر حفظ الملاحظة');
    } finally {
      setSavingNoteId('');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-5 py-5 xl:px-8 print:min-h-0 print:bg-white print:p-0" dir="rtl">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Ticket size={24} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-snug text-ink sm:text-3xl">نظام إصدار التذاكر - الاستقبال</h1>
              <p className="mt-1 text-sm text-warm">إصدار الأرقام، حجز مكان لمراجع مسبق، ومتابعة حالات العيادات.</p>
            </div>
          </div>
          <UserBar />
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-[32px] bg-paper p-6 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-8">
            <div className="mb-6 text-right">
              <label className="mb-2 flex items-center gap-2 font-semibold text-warm">
                <Building2 size={18} />
                اختر العيادة / القسم:
              </label>
              <select
                className="w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
                value={selectedClinic}
                onChange={handleClinicChange}
              >
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 text-right">
              <label className="mb-2 flex items-center gap-2 font-semibold text-warm">
                <Stethoscope size={18} />
                اختر الطبيب:
              </label>
              <select
                className="w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
              >
                {clinicDoctors.length === 0 ? (
                  <option value="">لا يوجد أطباء لهذه العيادة</option>
                ) : (
                  clinicDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mb-6 rounded-[24px] bg-sky-700 p-5 text-center text-white">
              <label htmlFor="ticket-number" className="text-sky-100">اختر رقم التذكرة</label>
              <input
                id="ticket-number"
                type="number"
                min={1}
                max={TICKET_MAX}
                inputMode="numeric"
                value={chosenNumber}
                onChange={(e) => setChosenNumber(e.target.value)}
                className="mt-1 w-full bg-transparent text-center text-6xl font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <p className="mt-2 text-sm text-sky-100">الرقم التالي لهذا الطبيب: {nextNumber || '—'}</p>
            </div>

            <label className="mb-4 block text-right">
              <span className="mb-2 flex items-center gap-2 font-semibold text-warm">
                <Stethoscope size={18} />
                ملاحظات للطبيب فقط
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="لا تظهر هذه الملاحظة على بطاقة المراجع"
                className="w-full resize-none rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-sky-50 p-2">
              <button
                type="button"
                onClick={() => setShouldPrint(true)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  shouldPrint ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-800'
                }`}
              >
                <Printer size={16} />
                طباعة التذكرة
              </button>
              <button
                type="button"
                onClick={() => setShouldPrint(false)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  !shouldPrint ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-800'
                }`}
              >
                <Stethoscope size={16} />
                للطبيب فقط
              </button>
            </div>

            <button
              onClick={handleIssueTicket}
              disabled={busy}
              className="mb-3 flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-sky-600 py-4 px-6 text-lg font-black text-white shadow-[0_10px_24px_rgba(52,126,160,0.28)] transition hover:bg-sky-700 disabled:opacity-60"
            >
              <Printer size={22} />
              {shouldPrint ? 'طباعة تذكرة جديدة 🎫' : 'إرسال رقم للطبيب'}
            </button>

            <button
              onClick={handleSkipNumber}
              disabled={busy}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-sky-100 py-3.5 px-6 text-base font-black text-sky-900 transition hover:bg-sky-200 disabled:opacity-60"
            >
              <SkipForward size={20} />
              تخطي الرقم وحجز مكان
            </button>

            {lastTicket && (
              <div className="mt-6 rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-4 text-center text-sky-900">
                <p className="mb-3 flex items-center justify-center gap-2 font-medium">
                  <Ticket size={18} />
                  آخر تذكرة تم إصدارها:
                </p>
                <PrintTicket
                  preview
                  ticketNumber={lastTicket.ticket_number}
                  clinicName={clinicName}
                  doctorName={printedDoctorName}
                  issuedAt={lastTicket.created}
                />
                <p className="mt-3 text-sm text-warm">{ticketStatusLabel(lastTicket.status)}</p>
              </div>
            )}
          </section>

          <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock size={20} className="text-sky-700" />
              <h2 className="text-xl font-black text-ink">متابعة العيادات والحالات</h2>
            </div>

            <ArchiveToolbar date={archiveDate} onChange={setArchiveDate} />

            <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clinics.map((clinic) => {
                const rows = liveTickets.filter((ticket) => ticket.clinic_id === clinic.id);
                const current = rows.find((ticket) => ticket.status === TICKET_STATUS.calling);
                const waitingCount = rows.filter((ticket) => ticket.status === TICKET_STATUS.waiting).length;
                return (
                  <article key={clinic.id} className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                    <p className="font-bold text-ink">{clinic.name}</p>
                    <p className="mt-1 text-sm text-warm">
                      الرقم عندها: <span className="font-black text-sky-800">{current?.ticket_number || 'لا يوجد'}</span>
                    </p>
                    <p className="text-sm text-warm">
                      أرقام الانتظار: <span className="font-black text-sky-800">{waitingCount}</span>
                    </p>
                  </article>
                );
              })}
            </div>

            <TicketsFlowTable
              tickets={archivedTickets}
              clinics={clinics}
              notesEditable
              savingNoteId={savingNoteId}
              onSaveNote={handleSaveNote}
              onActivateReserved={handleActivateReserved}
              onDeleteTicket={handleDeleteTicket}
              onReprintTicket={handleReprint}
              groupByDoctor
              busy={busy}
              showStats={false}
            />
          </section>
        </div>

        <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
          <h2 className="mb-5 text-xl font-black text-ink">إجماليات دخول وخروج المرضى</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <TicketStats tickets={clinicTickets} title={clinicName ? `عيادة: ${clinicName}` : "العيادة المحددة"} />
            <TicketStats tickets={archivedTickets} title="كل العيادات" />
          </div>
        </section>
      </div>

      {printRequest ? (
        <div className="ticket-print-host">
          <PrintTicket
            ticketNumber={printRequest.ticketNumber}
            clinicName={printRequest.clinicName}
            doctorName={printRequest.doctorName}
            issuedAt={printRequest.issuedAt}
          />
        </div>
      ) : null}
    </div>
  );
}
