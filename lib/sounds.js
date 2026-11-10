import { TICKET_MAX } from "./pb";

const CLINIC_SOUND_FILES = [
  { keys: ["أسنان 1", "اسنان 1", "عيادة الاسنان رقم 1"], file: "dental-1.mp3" },
  { keys: ["أسنان 2", "اسنان 2", "عيادة الاسنان رقم 2"], file: "dental-2.mp3" },
  { keys: ["أسنان 3", "اسنان 3", "عيادة الاسنان رقم 3"], file: "dental-3.mp3" },
  { keys: ["أسنان 4", "اسنان 4", "عيادة الاسنان رقم 4"], file: "dental-4.mp3" },
  { keys: ["باطنة", "باطنه", "عيادة الباطنة"], file: "internal.mp3" },
  { keys: ["نساء", "ولاده", "ولادة", "عيادة النساء والولاده"], file: "obgyn.mp3" },
  { keys: ["مختبر", "تحاليل", "مختبر التحاليل"], file: "lab.mp3" },
];

function normalizeName(value) {
  return String(value || "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s*و\s*/g, "و")
    .replace(/\s+/g, " ")
    .trim();
}

function audioUrl(...parts) {
  return "/" + ["call-audio", ...parts].join("/");
}

export function numberSoundUrl(ticketNumber) {
  const value = Number(ticketNumber);
  if (!Number.isFinite(value) || value < 1 || value > TICKET_MAX) return "";
  return audioUrl("numbers", `${value}.mp3`);
}

export function clinicSoundUrl(clinicName) {
  const normalized = normalizeName(clinicName);
  const match = CLINIC_SOUND_FILES.find((item) =>
    item.keys.some((key) => {
      const fileName = normalizeName(key);
      return normalized === fileName || normalized.includes(fileName) || fileName.includes(normalized);
    }),
  );
  if (!match) return "";
  return audioUrl("clinics", match.file);
}

let currentAudio = null;
let audioContext = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

export async function unlockAudio() {
  try {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") await ctx.resume();
    const audio = new Audio(SILENT_WAV);
    audio.muted = true;
    await audio.play();
    audio.pause();
    return true;
  } catch (err) {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playHtmlClip(src) {
  return new Promise((resolve) => {
    const audio = new Audio();
    currentAudio = audio;
    audio.preload = "auto";
    audio.playsInline = true;
    audio.muted = false;
    audio.volume = 1;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };
    const timer = setTimeout(finish, 15000);
    audio.onended = finish;
    audio.onerror = () => {
      console.warn("تعذر تشغيل الملف الصوتي:", src);
      finish();
    };
    audio.src = src;
    const attempt = (n) => {
      audio.play().catch((err) => {
        console.warn("تم منع تشغيل الصوت من المتصفح:", err);
        if (n < 8 && !settled) wait(400).then(() => attempt(n + 1));
        else finish();
      });
    };
    attempt(0);
  });
}

async function playWebClip(src) {
  const ctx = getContext();
  if (!ctx) throw new Error("no-audio-context");
  if (ctx.state === "suspended") await ctx.resume();
  if (ctx.state !== "running") throw new Error("audio-context-suspended");
  const response = await fetch(src);
  if (!response.ok) throw new Error(`audio-http-${response.status}`);
  const data = await response.arrayBuffer();
  const buffer = await ctx.decodeAudioData(data.slice(0));
  await new Promise((resolve) => {
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    const timer = setTimeout(resolve, Math.ceil((buffer.duration || 8) * 1000) + 400);
    node.onended = () => {
      clearTimeout(timer);
      resolve();
    };
    node.start();
  });
}

export async function playAudioSequence(urls) {
  const clips = urls.filter(Boolean);
  await unlockAudio();
  for (const src of clips) {
    try {
      await playWebClip(src);
    } catch (err) {
      await playHtmlClip(src);
    }
  }
}

export function playReturningPatientSound() {
  return playAudioSequence([audioUrl("returning.mp3")]);
}

export function playCallAnnouncement(ticketNumber, clinicName) {
  return playAudioSequence([
    audioUrl("open.mp3"),
    numberSoundUrl(ticketNumber),
    clinicSoundUrl(clinicName),
  ]);
}
