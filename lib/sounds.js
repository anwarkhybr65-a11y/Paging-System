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
    if (ctx && ctx.state === "suspended") await withTimeout(ctx.resume(), 800);
    const audio = new Audio(SILENT_WAV);
    audio.muted = true;
    await withTimeout(audio.play(), 800);
    audio.pause();
    return true;
  } catch (err) {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    wait(ms).then(() => {
      throw new Error("audio-timeout");
    }),
  ]);
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
    let started = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      resolve(Boolean(ok && started));
    };
    const timer = setTimeout(() => finish(started), 15000);
    audio.onplaying = () => {
      started = true;
    };
    audio.onended = () => finish(true);
    audio.onerror = () => {
      console.warn("تعذر تشغيل الملف الصوتي:", src);
      finish(false);
    };
    audio.src = src;
    const attempt = (n) => {
      audio.play().then(() => {
        started = true;
      }).catch((err) => {
        console.warn("تم منع تشغيل الصوت من المتصفح:", err);
        if (n < 8 && !settled) wait(400).then(() => attempt(n + 1));
        else finish(false);
      });
    };
    attempt(0);
  });
}

async function playWebClip(src) {
  const ctx = getContext();
  if (!ctx) throw new Error("no-audio-context");
  if (ctx.state === "suspended") await withTimeout(ctx.resume(), 800);
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

async function playClip(src) {
  try {
    await playWebClip(src);
    return true;
  } catch (err) {
    return playHtmlClip(src);
  }
}

export async function playAudioSequence(urls) {
  const clips = urls.filter(Boolean);
  if (!clips.length) return false;
  await unlockAudio();
  let started = false;
  for (const src of clips) {
    const played = await playClip(src);
    if (!played && !started) return false;
    started = started || played;
  }
  return started;
}

let returningAudio = null;
let returningPending = 0;
let returningBusy = false;
let returningToken = 0;

function returningElement() {
  if (typeof window === "undefined") return null;
  if (!returningAudio) {
    returningAudio = new Audio(audioUrl("returning.mp3"));
    returningAudio.preload = "auto";
    returningAudio.playsInline = true;
    returningAudio.volume = 1;
    returningAudio.onended = () => {
      completeReturning(returningAudio.dataset.token);
    };
  }
  return returningAudio;
}

function completeReturning(token) {
  if (String(token) !== String(returningToken)) return;
  returningToken += 1;
  returningBusy = false;
  nudgeReturningPatientSound();
}

export function nudgeReturningPatientSound() {
  const audio = returningElement();
  if (!audio || returningBusy || returningPending < 1) return;
  returningBusy = true;
  returningPending -= 1;
  const token = ++returningToken;
  audio.dataset.token = String(token);
  try {
    audio.currentTime = 0;
  } catch (err) {
    // The file may still be loading; playback can start from the beginning anyway.
  }
  audio.play().then(() => {
    const duration = Number(audio.duration);
    const waitMs = Number.isFinite(duration) && duration > 0 ? Math.ceil(duration * 1000) + 600 : 8000;
    window.setTimeout(() => completeReturning(token), waitMs);
  }).catch(() => {
    if (returningToken === token) {
      returningBusy = false;
      returningPending += 1;
    }
  });
}

export function playReturningPatientSound() {
  returningPending += 1;
  nudgeReturningPatientSound();
  return Promise.resolve(true);
}

export function playCallAnnouncement(ticketNumber, clinicName) {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!window.location.pathname.startsWith("/display")) return Promise.resolve(false);
  return playAudioSequence([
    audioUrl("open.mp3"),
    numberSoundUrl(ticketNumber),
    clinicSoundUrl(clinicName),
  ]);
}
