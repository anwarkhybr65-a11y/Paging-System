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
let sharedAudio = null;

function getSharedAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    sharedAudio.playsInline = true;
  }
  return sharedAudio;
}

export function bindCallSpeaker(element) {
  if (!element) return;
  element.preload = "auto";
  element.playsInline = true;
  sharedAudio = element;
}

export function unlockAudio() {
  const audio = getSharedAudio();
  if (!audio) return Promise.resolve(false);
  const resume = audio.play();
  if (resume && typeof resume.then === "function") {
    return resume.then(() => true).catch(() => false);
  }
  return Promise.resolve(true);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playClip(audio, src) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      audio.oncanplaythrough = null;
      resolve();
    };

    audio.pause();
    audio.onended = finish;
    audio.onerror = () => {
      console.warn("تعذر تشغيل الملف الصوتي:", src);
      finish();
    };

    const tryPlay = (attempt) => {
      const playing = audio.play();
      if (!playing || typeof playing.catch !== "function") return;
      playing.catch((err) => {
        console.warn("تم منع تشغيل الصوت من المتصفح:", err);
        if (attempt < 6 && !settled) {
          wait(350).then(() => tryPlay(attempt + 1));
          return;
        }
        finish();
      });
    };

    audio.src = src;
    audio.load();
    if (audio.readyState >= 3) {
      tryPlay(0);
      return;
    }
    audio.oncanplaythrough = () => {
      audio.oncanplaythrough = null;
      tryPlay(0);
    };
  });
}

export async function playAudioSequence(urls) {
  const clips = urls.filter(Boolean);
  const token = ++playToken;
  const audio = getSharedAudio();
  if (!audio || clips.length === 0) return;
  audio.pause();
  for (const src of clips) {
    if (token !== playToken) return;
    await playClip(audio, src);
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
