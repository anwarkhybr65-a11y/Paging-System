'use client';
import { useState, useEffect, useRef } from 'react';
import { Building2, DoorOpen, LogOut, Megaphone, RefreshCcw, Users } from 'lucide-react';
import {
  callingFilter,
  ensurePocketBase,
  filterTicketsByDate,
  formatDateTime,
  localDateKey,
  nowIso,
  pb,
  ticketsOnLocalDate,
  todayDateKey,
  TICKET_STATUS,
  waitingFilter,
} from '@/lib/pb';
import { playReturningPatientSound, unlockAudio } from '@/lib/sounds';
import { TicketsFlowTable } from '../TicketsFlowTable';
import { ArchiveToolbar, useWorkDay } from '../ArchiveToolbar';
import { BrandMark } from '../BrandMark';
import { UserBar } from '../UserBar';
import { useAuth } from '../AuthProvider';
import { ROLES } from '@/lib/auth';

export default function DoctorPage() {
  const { user } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [selectedWaitingId, setSelectedWaitingId] = useState('');
  const [clinicTickets, setClinicTickets] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [archiveDate, setArchiveDate] = useWorkDay();
  const knownWaitingIds = useRef(null);
  const assignedClinic = user?.clinic || '';
  const clinicLocked = user?.role === ROLES.doctor && Boolean(assignedClinic);

  useEffect(() => {
    async function fetchClinics() {
      try {
        await ensurePocketBase();
        const records = await pb.collection('clinics').getFullList();
        if (clinicLocked) {
          const assigned = records.filter((clinic) => clinic.id === assignedClinic);
          setClinics(assigned.length ? assigned : records);
          setSelectedClinic(assignedClinic);
          return;
        }
        setClinics(records);
        if (records.length > 0) {
          setSelectedClinic(records[0].id);
        }
      } catch (err) {
        console.error('Error fetching clinics:', err);
        setError('تعذر جلب العيادات');
      }
    }
    fetchClinics();
  }, [assignedClinic, clinicLocked]);

  useEffect(() => {
    knownWaitingIds.current = null;
  }, [selectedClinic]);

  useEffect(() => {
    if (!selectedClinic) return;
    let cancelled = false;
    let unsubTickets = null;

    function isWaitingStatus(status) {
      return String(status || "").trim() === "waiting";
    }

    function maybePlayReturning(ticket) {
      if (!ticket || ticket.clinic_id !== selectedClinic) return;
      if (!isWaitingStatus(ticket.status)) return;
      if (localDateKey(ticket.created) !== todayDateKey()) return;
      const known = knownWaitingIds.current;
      if (!known) return;
      if (known.has(ticket.id)) return;
      known.add(ticket.id);
      playReturningPatientSound();
    }

    async function refreshQueue() {
      try {
        await ensurePocketBase();
        const waiting = await pb.collection('tickets').getFullList({
          filter: waitingFilter(selectedClinic),
          sort: 'created',
        });
        const calling = await pb.collection('tickets').getList(1, 1, {
          filter: callingFilter(selectedClinic),
          sort: '-updated',
        });
        const clinicRows = await pb.collection('tickets').getFullList({
          filter: `clinic_id = "${selectedClinic}"`,
          sort: '-created',
          expand: 'clinic_id,doctor',
        });
        if (cancelled) return;

        const waitingToday = ticketsOnLocalDate(waiting);
        const callingToday = ticketsOnLocalDate(calling.items);
        const previousIds = knownWaitingIds.current;
        const nextIds = new Set(waitingToday.map((ticket) => ticket.id));
        if (!previousIds) {
          knownWaitingIds.current = nextIds;
        } else {
          waitingToday.forEach((ticket) => {
            if (!previousIds.has(ticket.id)) maybePlayReturning(ticket);
          });
          knownWaitingIds.current = nextIds;
        }

        setWaitingTickets(waitingToday);
        setSelectedWaitingId((current) =>
          waitingToday.some((ticket) => ticket.id === current) ? current : waitingToday[0]?.id || '',
        );
        setCurrentTicket(callingToday[0] || null);
        setClinicTickets(clinicRows);
        setError('');
      } catch (err) {
        console.error('Error fetching waiting tickets:', err);
        if (!cancelled) setError('تعذر جلب قائمة الانتظار');
      }
    }

    async function connectQueue() {
      await ensurePocketBase();
      if (cancelled) return;
      await refreshQueue();
      if (cancelled) return;
      unsubTickets = await pb.collection('tickets').subscribe('*', async (event) => {
        maybePlayReturning(event?.record);
        await refreshQueue();
      });
    }

    connectQueue();
    const timer = setInterval(refreshQueue, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (typeof unsubTickets === 'function') unsubTickets();
      else pb.collection('tickets').unsubscribe('*');
    };
  }, [selectedClinic]);

  const clinicName = clinics.find((clinic) => clinic.id === selectedClinic)?.name || 'العيادة';

  const handleCallTicket = async (ticketId) => {
    if (!selectedClinic || busy) return;

    try {
      setBusy(true);
      await ensurePocketBase();
      const waitingTicketsPage = await pb.collection('tickets').getFullList({
        filter: waitingFilter(selectedClinic),
        sort: 'created',
      });
      const todayWaiting = ticketsOnLocalDate(waitingTicketsPage);

      if (todayWaiting.length === 0) {
        alert('لا توجد تذاكر في قائمة الانتظار لهذه العيادة');
        return;
      }

      const nextTicket = ticketId
        ? todayWaiting.find((ticket) => ticket.id === ticketId)
        : todayWaiting[0];

      if (!nextTicket) {
        alert('هذا الرقم لم يعد في قائمة الانتظار');
        return;
      }

      const currentCalling = await pb.collection('tickets').getFullList({
        filter: callingFilter(selectedClinic),
      });
      await Promise.all(
        currentCalling.map((ticket) =>
          pb.collection('tickets').update(ticket.id, {
            status: TICKET_STATUS.completed,
            exited_at: ticket.exited_at || nowIso(),
          }),
        ),
      );

      const updated = await pb.collection('tickets').update(nextTicket.id, {
        status: TICKET_STATUS.calling,
        called_at: nextTicket.called_at || nowIso(),
      });

      setCurrentTicket(updated);
      setWaitingTickets((tickets) => tickets.filter((ticket) => ticket.id !== nextTicket.id));
      setError('');

    } catch (err) {
      console.error('Error calling patient:', err);
      alert('حدث خطأ أثناء نداء المريض');
    } finally {
      setBusy(false);
    }
  };

  const selectedWaiting = waitingTickets.find((ticket) => ticket.id === selectedWaitingId) || waitingTickets[0];
  const calledTickets = clinicTickets
    .filter(
      (ticket) =>
        ticket.called_at &&
        localDateKey(ticket.created) === todayDateKey() &&
        ticket.status !== TICKET_STATUS.waiting &&
        ticket.status !== TICKET_STATUS.reserved,
    )
    .sort((left, right) => new Date(right.called_at) - new Date(left.called_at));

  const handleEnterClinic = async () => {
    if (!currentTicket?.id || busy) {
      alert('لا يوجد مريض حالي لتسجيل دخوله');
      return;
    }
    if (currentTicket.entered_at) {
      alert('تم تسجيل دخول هذا المريض مسبقاً');
      return;
    }

    try {
      setBusy(true);
      const updated = await pb.collection('tickets').update(currentTicket.id, {
        entered_at: nowIso(),
      });
      setCurrentTicket(updated);
      setError('');
    } catch (err) {
      console.error('Error recording clinic entry:', err);
      alert('حدث خطأ أثناء تسجيل دخول المريض');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentTicket?.id || busy) {
      alert('لا يوجد مريض حالي لإخراجه');
      return;
    }

    try {
      setBusy(true);
      await pb.collection('tickets').update(currentTicket.id, {
        status: TICKET_STATUS.completed,
        exited_at: currentTicket.exited_at || nowIso(),
      });
      setCurrentTicket(null);
      setError('');
    } catch (err) {
      console.error('Error checking out patient:', err);
      alert('حدث خطأ أثناء إخراج المريض');
    } finally {
      setBusy(false);
    }
  };

  const handleRecall = async (ticket) => {
    const target = ticket?.id ? ticket : currentTicket;
    if (!target?.id || busy) {
      alert('لا يوجد رقم لإعادة ندائه');
      return;
    }

    const previousStatus = target.status;
    const keepAsCurrent = !previousStatus || previousStatus === TICKET_STATUS.calling;

    try {
      setBusy(true);
      await ensurePocketBase();
      const recalled = await pb.collection('tickets').update(target.id, {
        status: TICKET_STATUS.calling,
        called_at: nowIso(),
      });
      if (keepAsCurrent) {
        setCurrentTicket(recalled);
      } else {
        window.setTimeout(() => {
          pb.collection('tickets').update(target.id, {
            status: previousStatus,
          }).catch((err) => {
            console.error('Error restoring recalled ticket:', err);
          });
        }, 1200);
      }
      setError('');
    } catch (err) {
      console.error('Error recalling patient:', err);
      alert('حدث خطأ أثناء إعادة المناداة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-offwhite to-offwhite px-4 py-8" dir="rtl" onPointerDown={unlockAudio}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="w-full rounded-[32px] bg-paper p-6 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <BrandMark size="sm" />
            <div className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Megaphone size={24} strokeWidth={1.8} />
            </div>
            <h1 className="text-2xl font-black leading-snug text-ink sm:text-3xl">لوحة تحكم الطبيب - إدارة النداء</h1>
          </div>
          <UserBar />
        </div>

        <div className="mb-6 text-right">
          <label className="mb-2 flex items-center gap-2 font-semibold text-warm">
            <Building2 size={18} />
            اختر العيادة الخاصة بك:
          </label>
          <select
            className="w-full rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3.5 outline-none transition focus:border-sky-400 focus:bg-paper focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-80"
            value={selectedClinic}
            disabled={clinicLocked}
            onChange={(e) => {
              unlockAudio();
              setSelectedClinic(e.target.value);
            }}
          >
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]">
          <aside className="flex flex-col gap-3">
            <div className="rounded-2xl bg-sky-700 px-4 py-4 text-center text-white shadow-[0_10px_24px_rgba(42,101,130,0.22)]">
              <p className="mb-1 text-xs text-sky-100">المريض الحالي في العيادة</p>
              <p className="text-4xl font-black tracking-wide">{currentTicket?.ticket_number || 'لا يوجد'}</p>
              {currentTicket?.notes ? (
                <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-right text-xs leading-5 text-sky-50">
                  ملاحظة الاستقبال: {currentTicket.notes}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-warm">
                <Users size={16} />
                المنتظرون بالخارج
              </span>
              <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-paper px-2 py-0.5 text-lg font-black text-sky-700 ring-1 ring-sky-100">
                {waitingTickets.length}
              </span>
            </div>

            {error ? <p className="font-bold text-red-700">{error}</p> : null}

            <div className="grid gap-2">
              <button
                onClick={() => handleCallTicket(selectedWaiting?.id)}
                disabled={busy || !selectedWaiting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(52,126,160,0.22)] transition hover:bg-sky-700 disabled:opacity-60"
              >
                <Megaphone size={16} />
                {selectedWaiting ? `نداء الرقم ${selectedWaiting.ticket_number}` : 'نداء المريض التالي'}
              </button>
              <button
                onClick={() => handleRecall(currentTicket)}
                disabled={busy || !currentTicket}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-100 px-3 py-2.5 text-sm font-black text-sky-900 transition hover:bg-sky-200 disabled:opacity-60"
              >
                <RefreshCcw size={16} />
                إعادة المناداة
              </button>
              <button
                onClick={handleEnterClinic}
                disabled={busy || !currentTicket || Boolean(currentTicket?.entered_at)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-2.5 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60"
              >
                <DoorOpen size={16} />
                دخول العيادة
              </button>
              <button
                onClick={handleCheckout}
                disabled={busy || !currentTicket}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-sm font-black text-white transition hover:bg-black disabled:opacity-60"
              >
                <LogOut size={16} />
                خروج المريض
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-[28px] border border-sky-100 bg-offwhite p-5 text-right">
              <p className="mb-1 font-semibold text-sky-800">حالات الانتظار</p>
              <p className="mb-3 text-sm text-warm">اختر الرقم من القائمة ثم اضغط نداء، أو نادِ رقماً مباشرة.</p>
              {waitingTickets.length === 0 ? (
                <p className="text-sm text-warm">لا توجد تذاكر منتظرة لهذه العيادة</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {waitingTickets.map((ticket, index) => {
                    const selected = ticket.id === (selectedWaiting?.id || '');
                    return (
                      <li
                        key={ticket.id}
                        className={`rounded-2xl px-4 py-3.5 ring-1 transition ${
                          selected ? 'bg-sky-100 ring-sky-300' : 'bg-paper ring-sky-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedWaitingId(ticket.id)}
                            disabled={busy}
                            className="min-w-0 flex-1 text-right disabled:opacity-60"
                          >
                            <span className="text-xl font-black text-sky-800">{ticket.ticket_number}</span>
                            <span className="mr-2 rounded-full bg-sky-50 px-3 py-1 text-sm text-warm">الدور {index + 1}</span>
                            {selected ? (
                              <span className="mr-2 rounded-full bg-sky-600 px-3 py-1 text-sm font-bold text-white">محدد</span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCallTicket(ticket.id)}
                            disabled={busy}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                          >
                            <Megaphone size={16} />
                            نداء
                          </button>
                        </div>
                        {ticket.notes ? (
                          <p className="mt-2 text-sm leading-6 text-warm">ملاحظة الاستقبال: {ticket.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-[28px] border border-sky-100 bg-offwhite p-5 text-right">
              <p className="mb-1 font-semibold text-sky-800">أرقام تمت مناداتها</p>
              <p className="mb-3 text-sm text-warm">يمكن إعادة نداء أي رقم حتى بعد الانتقال إلى رقم آخر.</p>
              {calledTickets.length === 0 ? (
                <p className="text-sm text-warm">لا توجد أرقام تمت مناداتها اليوم</p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {calledTickets.map((ticket) => (
                    <li key={ticket.id} className="rounded-2xl bg-paper px-4 py-3.5 ring-1 ring-sky-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xl font-black text-sky-800">{ticket.ticket_number}</span>
                          <span className="mr-2 text-sm text-warm">{formatDateTime(ticket.called_at)}</span>
                          {ticket.id === currentTicket?.id ? (
                            <span className="mr-2 rounded-full bg-sky-600 px-3 py-1 text-sm font-bold text-white">الحالي</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRecall(ticket)}
                          disabled={busy}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-2 text-sm font-black text-sky-900 transition hover:bg-sky-200 disabled:opacity-60"
                        >
                          <RefreshCcw size={16} />
                          إعادة النداء
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[32px] bg-paper p-5 shadow-[0_18px_50px_rgba(36,63,79,0.08)] ring-1 ring-sky-100 sm:p-6">
        <h2 className="mb-4 text-xl font-black text-ink">جدول دخول وخروج المرضى</h2>
        <ArchiveToolbar date={archiveDate} onChange={setArchiveDate} />
        <TicketsFlowTable tickets={filterTicketsByDate(clinicTickets, archiveDate || todayDateKey())} clinics={clinics} />
      </section>
      </div>
    </div>
  );
}