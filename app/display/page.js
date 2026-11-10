"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { clinicNameOf, displayImageUrl, ensurePocketBase, pb, ticketsOnLocalDate, TICKET_STATUS } from "@/lib/pb";
import { playCallAnnouncement, unlockAudio } from "@/lib/sounds";
import { BrandMark } from "../BrandMark";

function useClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function DisplayPage() {
  const [callingTickets, setCallingTickets] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [isNewCall, setIsNewCall] = useState(false);
  const [overlayCall, setOverlayCall] = useState(null);
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const overlayTimer = useRef(null);
  const overlayToken = useRef(0);
  const callQueue = useRef(Promise.resolve());
  const announcedKeys = useRef(new Set());
  const unheardCall = useRef(null);
  const lastCallKey = useRef("");
  const lastAnnouncedId = useRef("");
  const announcedCalledAt = useRef(new Map());
  const latestUpdate = useRef("");
  const primed = useRef(false);

  function noteUpdate(updated) {
    if (!updated) return;
    if (!latestUpdate.current || new Date(updated).getTime() > new Date(latestUpdate.current).getTime()) {
      latestUpdate.current = updated;
    }
  }
  const clock = useClock();

  const showQueue = callingTickets.length > 0 || waitingTickets.length > 0;
  const currentImage = images[currentImageIndex] || null;
  const imageSrc = currentImage ? displayImageUrl(currentImage) : "";

  async function loadImages() {
    try {
      await ensurePocketBase();
      const records = await pb.collection("display_images").getFullList({ sort: "-created" });
      setImages(records);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error("Error fetching display images:", err);
    }
  }

  async function fetchQueue() {
    await ensurePocketBase();
    const [calling, waiting] = await Promise.all([
      pb.collection("tickets").getFullList({
        filter: `status = "${TICKET_STATUS.calling}"`,
        sort: "-updated",
        expand: "clinic_id",
      }),
      pb.collection("tickets").getFullList({
        filter: `status = "${TICKET_STATUS.waiting}"`,
        sort: "created",
        expand: "clinic_id",
      }),
    ]);
    return {
      calling: ticketsOnLocalDate(calling),
      waiting: ticketsOnLocalDate(waiting),
    };
  }

  function startCallOverlay(ticketNumber, clinicName, callKey, ticketId) {
    if (callKey && announcedKeys.current.has(callKey)) return;
    if (callKey) {
      announcedKeys.current.add(callKey);
      lastCallKey.current = callKey;
    }
    if (ticketId) lastAnnouncedId.current = ticketId;

    const token = ++overlayToken.current;
    setOverlayCall({ ticketNumber, clinicName });
    setIsNewCall(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
      if (overlayToken.current !== token) return;
      setIsNewCall(false);
      setOverlayCall(null);
    }, 30000);

    const announcement = { ticketNumber, clinicName, callKey };
    callQueue.current = callQueue.current
      .then(async () => {
        const played = Boolean(await playCallAnnouncement(ticketNumber, clinicName));
        if (played) {
          if (unheardCall.current?.callKey === callKey) unheardCall.current = null;
          return;
        }
        unheardCall.current = announcement;
      })
      .catch((err) => {
        unheardCall.current = announcement;
        console.error("Error playing call announcement:", err);
      });
  }

  function isEntryUpdate(record, calledAt) {
    const previousCalledAt = announcedCalledAt.current.get(record.id) || "";
    return Boolean(record.entered_at) && record.id === lastAnnouncedId.current && previousCalledAt === (calledAt || "");
  }

  async function announceCall(record) {
    if (!record || record.status !== TICKET_STATUS.calling) return;
    noteUpdate(record.updated);
    const callKey = `${record.id}:${record.called_at || record.updated}`;
    if (announcedKeys.current.has(callKey) || lastCallKey.current === callKey) return;
    if (isEntryUpdate(record, record.called_at)) {
      announcedKeys.current.add(callKey);
      lastCallKey.current = callKey;
      return;
    }
    let clinicName = clinicNameOf(record) || "العيادة";
    let calledAt = record.called_at || "";
    if (!record.expand?.clinic_id) {
      try {
        const updatedTicket = await Promise.race([
          pb.collection("tickets").getOne(record.id, { expand: "clinic_id" }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("clinic-timeout")), 1500)),
        ]);
        clinicName = clinicNameOf(updatedTicket) || clinicName;
        calledAt = updatedTicket.called_at || calledAt;
        if (isEntryUpdate(updatedTicket, calledAt)) {
          announcedKeys.current.add(callKey);
          lastCallKey.current = callKey;
          return;
        }
      } catch (err) {
        console.error("Error fetching expanded clinic info:", err);
      }
    }
    announcedCalledAt.current.set(record.id, calledAt);
    startCallOverlay(record.ticket_number, clinicName, callKey, record.id);
  }

  useEffect(() => {
    const arm = async () => {
      await unlockAudio();
    };
    const replay = async () => {
      await unlockAudio();
      const pending = unheardCall.current;
      if (!pending) return;
      unheardCall.current = null;
      const played = Boolean(await playCallAnnouncement(pending.ticketNumber, pending.clinicName));
      if (!played) unheardCall.current = pending;
    };
    arm();
    window.addEventListener("pointerdown", replay);
    window.addEventListener("keydown", replay);
    window.addEventListener("touchstart", replay);
    const timer = setInterval(arm, 3000);
    return () => {
      window.removeEventListener("pointerdown", replay);
      window.removeEventListener("keydown", replay);
      window.removeEventListener("touchstart", replay);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsub = { tickets: null, images: null };

    async function applyQueue(announce) {
      try {
        const { calling, waiting } = await fetchQueue();
        if (cancelled) return;
        setCallingTickets(calling);
        setWaitingTickets(waiting);
        const top = calling[0];
        if (!primed.current) {
          primed.current = true;
          calling.forEach((ticket) => {
            const callKey = `${ticket.id}:${ticket.called_at || ticket.updated}`;
            announcedKeys.current.add(callKey);
            announcedCalledAt.current.set(ticket.id, ticket.called_at || "");
            noteUpdate(ticket.updated);
          });
          if (top) {
            lastCallKey.current = `${top.id}:${top.called_at || top.updated}`;
            lastAnnouncedId.current = top.id;
          }
          return;
        }
        if (announce) {
          const pending = [...calling].sort(
            (left, right) => new Date(left.called_at || left.updated) - new Date(right.called_at || right.updated),
          );
          for (const ticket of pending) {
            const callKey = `${ticket.id}:${ticket.called_at || ticket.updated}`;
            if (!announcedKeys.current.has(callKey)) await announceCall(ticket);
          }
        }
      } catch (err) {
        console.error("Error fetching display tickets:", err);
      }
    }

    async function connectDisplay() {
      await ensurePocketBase();
      if (cancelled) return;
      await loadImages();
      await applyQueue(false);
      if (cancelled) return;

      unsub.tickets = await pb.collection("tickets").subscribe("*", async (event) => {
        const record = event?.record;
        if (record?.status === TICKET_STATUS.calling) await announceCall(record);
        await applyQueue(false);
      });
      unsub.images = await pb.collection("display_images").subscribe("*", () => {
        loadImages();
      });
    }

    connectDisplay();
    const poll = setInterval(() => applyQueue(true), 2500);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      if (typeof unsub.tickets === "function") unsub.tickets();
      else pb.collection("tickets").unsubscribe("*");
      if (typeof unsub.images === "function") unsub.images();
      else pb.collection("display_images").unsubscribe("*");
    };
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [images]);

  return (
    <main className="display-screen h-screen w-screen overflow-hidden bg-display font-sans text-white" dir="rtl">
      <div className="flex h-full w-full flex-row">
        {showQueue ? (
          <aside className="flex h-full w-[34%] shrink-0 flex-col border-sky-900/60 bg-[#143140] p-5 lg:border-l">
            <header className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandMark size="sm" />
                <h1 className="text-xl font-black">قائمة النداء</h1>
              </div>
              <p className="inline-flex items-center gap-2 rounded-full bg-sky-900/50 px-3 py-1.5 text-sky-200">
                <Clock3 size={16} />
                {clock
                  ? clock.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </p>
            </header>

            <h2 className="mb-3 text-lg font-bold text-sky-100">يتم نداؤهم</h2>
            <div className="no-scrollbar mb-4 max-h-[46%] overflow-y-auto">
              {callingTickets.length === 0 ? (
                <p className="rounded-2xl bg-sky-900/50 px-4 py-5 text-center text-sky-100">لا يوجد نداء حالياً</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {callingTickets.map((ticket) => (
                    <article
                      key={ticket.id}
                      className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-sky-300/50 bg-display px-2 text-center"
                    >
                      <span className="text-4xl font-black leading-none text-white">{ticket.ticket_number}</span>
                      <span className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-sky-100">
                        {clinicNameOf(ticket)}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <h2 className="mb-3 text-lg font-bold text-sky-100">في الانتظار</h2>
            <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
              {waitingTickets.length === 0 ? (
                <p className="rounded-2xl bg-sky-900/40 px-4 py-5 text-center text-sky-200">لا توجد أرقام منتظرة</p>
              ) : (
                waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-sky-900/45 px-4 py-3"
                  >
                    <span className="text-4xl font-black leading-none text-white">{ticket.ticket_number}</span>
                    <span className="max-w-[58%] text-start text-base font-bold leading-6 text-sky-50">
                      {clinicNameOf(ticket)} · الدور {index + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        ) : null}

        <section className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-black">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-contain object-center" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-display via-sky-900 to-[#0b1c24] p-10 text-center">
              <p className="text-4xl font-black">مجمع انوار خيبر الطبي العام</p>
              <p className="mt-4 max-w-2xl text-xl text-sky-100">
                أضف صوراً توعوية من صفحة إدارة الصور حتى تظهر هنا على الشاشة.
              </p>
            </div>
          )}

          {isNewCall && overlayCall ? (
            <section className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-display/92 p-6 text-center sm:p-10">
              <p className="text-3xl font-semibold text-sky-200 sm:text-4xl">نداء رقم جديد</p>
              <p className="call-pulse my-6 text-[clamp(7rem,22vw,16rem)] leading-none font-black tracking-wide text-white">
                {overlayCall.ticketNumber}
              </p>
              <p className="rounded-3xl bg-sky-700 px-8 py-5 text-3xl font-bold sm:px-10 sm:text-5xl">
                الرجاء التوجه إلى {overlayCall.clinicName}
              </p>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
