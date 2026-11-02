import { TICKET_MAX } from "./pb";

const CLINIC_SOUND_FILES = [
  "عيادة الاسنان رقم 1",
  "عيادة الاسنان رقم 2",
  "عيادة الاسنان رقم 3",
  "عيادة الاسنان رقم 4",
  "عيادة الباطنة",
  "عيادة النساء والولاده",
  "مختبر التحاليل",
];

function normalizeName(value) {
  return String(value || "")
    .replace(/ة/g, "ه")
    .replace(/\s*و\s*/g, "و")
    .replace(/\s+/g, " ")
    .trim();
}

function soundUrl(...parts) {
  return "/" + parts.map((part) => encodeURIComponent(part)).join("/");
}

export function numberSoundUrl(ticketNumber) {
  const value = Number(ticketNumber);
  if (!Number.isFinite(value) || value < 1 || value > TICKET_MAX) return "";
  return soundUrl("sounds", "ارقام البطاقات", `${value}.mp3`);
}

export function clinicSoundUrl(clinicName) {
  const normalized = normalizeName(clinicName);
  const match = CLINIC_SOUND_FILES.find((file) => {
    const fileName = normalizeName(file);
    return fileName === normalized || fileName.includes(normalized) || normalized.includes(fileName);
  });
  if (!match) return "";
  return soundUrl("sounds", "العيادات", `${match}.mp3`);
}

let playToken = 0;
let currentAudio = null;

export function unlockAudio() {
  const audio = new Audio();
  audio.muted = true;
  audio.play().catch(() => {});
}

export async function playAudioSequence(urls) {
  const token = ++playToken;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  for (const src of urls.filter(Boolean)) {
    if (token !== playToken) return;
    await new Promise((resolve) => {
      const audio = new Audio(src);
      currentAudio = audio;
      audio.onended = resolve;
      audio.onerror = () => {
        console.warn("تعذر تشغيل الملف الصوتي:", src);
        resolve();
      };
      audio.play().catch((err) => {
        console.warn("تم منع تشغيل الصوت من المتصفح:", err);
        resolve();
      });
    });
  }
}

export function playReturningPatientSound() {
  return playAudioSequence([soundUrl("sounds", "مريض مراجع.mp3")]);
}

export function playCallAnnouncement(ticketNumber, clinicName) {
  return playAudioSequence([
    soundUrl("sounds", "تنبيه افتتاحيه.mp3"),
    numberSoundUrl(ticketNumber),
    clinicSoundUrl(clinicName),
  ]);
}
