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
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const overlayTimer = useRef(null);
  const lastCallKey = useRef("");
  const lastAnnouncedId = useRef("");
  const primed = useRef(false);
  const clock = useClock();

  const current = callingTickets[0] || null;
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
    if (callKey && lastCallKey.current === callKey) return;
    if (callKey) lastCallKey.current = callKey;
    if (ticketId) lastAnnouncedId.current = ticketId;
    setIsNewCall(true);
    playCallAnnouncement(ticketNumber, clinicName);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setIsNewCall(false), 30000);
  }

  async function announceCall(record) {
    if (!record || record.status !== TICKET_STATUS.calling) return;
    const callKey = `${record.id}:${record.updated}`;
    if (lastCallKey.current === callKey) return;
    if (record.entered_at && record.id === lastAnnouncedId.current) {
      lastCallKey.current = callKey;
      return;
    }
    let clinicName = clinicNameOf(record) || "العيادة";
    try {
      const updatedTicket = await pb.collection("tickets").getOne(record.id, {
        expand: "clinic_id",
      });
      clinicName = clinicNameOf(updatedTicket) || clinicName;
      if (updatedTicket.entered_at && updatedTicket.id === lastAnnouncedId.current) {
        lastCallKey.current = `${updatedTicket.id}:${updatedTicket.updated}`;
        return;
      }
    } catch (err) {
      console.error("Error fetching expanded clinic info:", err);
    }
    startCallOverlay(record.ticket_number, clinicName, callKey, record.id);
  }

  useEffect(() => {
    const arm = () => {
      unlockAudio();
    };
    arm();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    window.addEventListener("touchstart", arm);
    const timer = setInterval(arm, 3000);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("touchstart", arm);
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
          if (top) {
            lastCallKey.current = `${top.id}:${top.updated}`;
            lastAnnouncedId.current = top.id;
          }
          return;
        }
        if (announce && top) await announceCall(top);
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

      unsub.tickets = await pb.collection("tickets").subscribe("*", async () => {
        await applyQueue(true);
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
    <main className="h-screen w-screen overflow-hidden bg-display font-sans text-white" dir="rtl">
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

            {current ? (
              <div className="mb-5 rounded-[28px] border border-sky-300/50 bg-display p-5 text-center">
                <p className="text-sm text-sky-200">الرقم الحالي</p>
                <p className="my-2 text-7xl font-black text-white">{current.ticket_number}</p>
                <p className="rounded-2xl bg-sky-700 px-3 py-2 text-lg font-bold">{clinicNameOf(current)}</p>
              </div>
            ) : (
              <p className="mb-5 rounded-2xl bg-sky-900/50 px-4 py-6 text-center text-sky-100">لا يوجد نداء حالياً</p>
            )}

            <h2 className="mb-3 text-lg font-bold text-sky-100">في الانتظار</h2>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {waitingTickets.length === 0 ? (
                <p className="rounded-2xl bg-sky-900/40 px-4 py-5 text-center text-sky-200">لا توجد أرقام منتظرة</p>
              ) : (
                waitingTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-2xl bg-sky-900/45 px-4 py-3"
                  >
                    <span className="text-3xl font-black text-white">{ticket.ticket_number}</span>
                    <span className="text-sm text-sky-100">
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

          {isNewCall && current ? (
            <section className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-display/92 p-6 text-center sm:p-10">
              <p className="text-3xl font-semibold text-sky-200 sm:text-4xl">نداء رقم جديد</p>
              <p className="call-pulse my-6 text-[clamp(7rem,22vw,16rem)] leading-none font-black tracking-wide text-white">
                {current.ticket_number}
              </p>
              <p className="rounded-3xl bg-sky-700 px-8 py-5 text-3xl font-bold sm:px-10 sm:text-5xl">
                الرجاء التوجه إلى {clinicNameOf(current)}
              </p>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
