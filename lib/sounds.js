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

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

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
let audioUnlocked = false;
let pendingPlay = null;

function getSharedAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

export async function unlockAudio() {
  const audio = getSharedAudio();
  if (!audio) return false;
  try {
    audio.muted = false;
    audio.volume = 1;
    audio.src = SILENT_WAV;
    await audio.play();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audioUnlocked = true;
    const queued = pendingPlay;
    pendingPlay = null;
    if (queued) queued();
    return true;
  } catch (err) {
    console.warn("تعذر تفعيل الصوت:", err);
    return false;
  }
}

function playClip(audio, src) {
  return new Promise((resolve) => {
    const finish = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };
    audio.onended = finish;
    audio.onerror = () => {
      console.warn("تعذر تشغيل الملف الصوتي:", src);
      finish();
    };
    audio.src = src;
    audio.play().catch((err) => {
      console.warn("تم منع تشغيل الصوت من المتصفح:", err);
      finish();
    });
  });
}

export async function playAudioSequence(urls) {
  const clips = urls.filter(Boolean);
  const run = async () => {
    const token = ++playToken;
    const audio = getSharedAudio();
    if (!audio) return;
    audio.pause();
    for (const src of clips) {
      if (token !== playToken) return;
      await playClip(audio, src);
    }
  };

  if (!audioUnlocked) {
    pendingPlay = run;
    return;
  }

  return run();
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
