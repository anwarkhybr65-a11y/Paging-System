"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { clinicNameOf, displayImageUrl, ensurePocketBase, pb, TICKET_STATUS } from "@/lib/pb";
import { playCallAnnouncement, unlockAudio } from "@/lib/sounds";

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
  const clock = useClock();

  const current = callingTickets[0] || null;
  const hasQueue = callingTickets.length > 0 || waitingTickets.length > 0;
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

  async function loadQueue() {
    try {
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
      setCallingTickets(calling);
      setWaitingTickets(waiting);
    } catch (err) {
      console.error("Error fetching display tickets:", err);
    }
  }

  function startCallOverlay(ticketNumber, clinicName) {
    setIsNewCall(true);
    playCallAnnouncement(ticketNumber, clinicName);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => setIsNewCall(false), 30000);
  }

  useEffect(() => {
    loadImages();
    loadQueue();

    const ticketsSub = pb.collection("tickets").subscribe("*", async (event) => {
      await loadQueue();
      if (event.action === "update" && event.record.status === TICKET_STATUS.calling) {
        let clinicName = "العيادة";
        try {
          const updatedTicket = await pb.collection("tickets").getOne(event.record.id, {
            expand: "clinic_id",
          });
          clinicName = clinicNameOf(updatedTicket);
        } catch (err) {
          console.error("Error fetching expanded clinic info:", err);
        }
        startCallOverlay(event.record.ticket_number, clinicName);
      }
    });

    const imagesSub = pb.collection("display_images").subscribe("*", () => {
      loadImages();
    });

    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      Promise.resolve(ticketsSub).then((unsub) => (typeof unsub === "function" ? unsub() : pb.collection("tickets").unsubscribe("*"))).catch(() => {});
      Promise.resolve(imagesSub).then((unsub) => (typeof unsub === "function" ? unsub() : pb.collection("display_images").unsubscribe("*"))).catch(() => {});
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
    <main
      className="relative min-h-screen overflow-hidden bg-display font-sans text-white"
      dir="rtl"
      onPointerDown={unlockAudio}
    >
      {isNewCall && current ? (
        <section className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-display p-6 text-center sm:p-10">
          <p className="text-3xl font-semibold text-sky-200 sm:text-4xl">نداء رقم جديد</p>
          <p className="call-pulse my-6 text-[clamp(7rem,28vw,16rem)] leading-none font-black tracking-wide text-white">
            {current.ticket_number}
          </p>
          <p className="rounded-3xl bg-sky-700 px-8 py-5 text-3xl font-bold sm:px-10 sm:text-5xl">
            الرجاء التوجه إلى {clinicNameOf(current)}
          </p>
        </section>
      ) : null}

      <div className={`flex min-h-screen ${hasQueue && !isNewCall ? "flex-col lg:flex-row" : "flex-col"}`}>
        {hasQueue && !isNewCall ? (
          <aside className="flex min-h-[40vh] w-full flex-col border-sky-900/60 bg-[#143140] p-5 lg:min-h-screen lg:w-1/3 lg:border-l">
            <header className="mb-5 flex items-center justify-between gap-3">
              <h1 className="text-xl font-black">قائمة النداء</h1>
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

        <section className={`relative min-h-screen overflow-hidden bg-black ${hasQueue && !isNewCall ? "w-full lg:w-2/3" : "w-full"}`}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-display via-sky-900 to-[#0b1c24] p-10 text-center">
              <p className="text-4xl font-black">مستوصف العناية الطبية</p>
              <p className="mt-4 max-w-2xl text-xl text-sky-100">
                أضف صوراً توعوية من صفحة إدارة الصور حتى تظهر هنا على الشاشة.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
