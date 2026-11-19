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
  return "/" + ["call-audio", ...parts].join("/") + "?v=20261119b";
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

export async function unlockAudio() {
  try {
    speakerElement();
    return true;
  } catch (err) {
    return false;
  }
}

let speaker = null;

function speakerElement() {
  if (typeof document === "undefined") return null;
  if (speaker && speaker.isConnected) return speaker;
  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = 1.0;
  audio.muted = false;
  audio.setAttribute("playsinline", "");
  audio.style.cssText = "position:fixed;bottom:0;left:0;width:8px;height:8px;opacity:0.02;pointer-events:none;";
  (document.body || document.documentElement).appendChild(audio);
  speaker = audio;
  return audio;
}

function stopSpeaker(audio) {
  audio.onended = null;
  audio.onerror = null;
  audio.onplaying = null;
  audio.oncanplay = null;
  audio.onloadedmetadata = null;
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch (err) {
    // بعض المتصفحات ترفض التصغير قبل تحميل الملف.
  }
}

function playUrl(url) {
  const audio = speakerElement();
  if (!audio) return Promise.resolve(false);
  stopSpeaker(audio);
  audio.volume = 1.0;
  audio.muted = false;
  return new Promise((resolve) => {
    let settled = false;
    let started = false;
    let timer = 0;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.oncanplay = null;
      audio.onloadedmetadata = null;
      resolve(Boolean(ok && started));
    };
    timer = setTimeout(() => finish(started), 15000);
    audio.onplaying = () => {
      started = true;
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 8;
      clearTimeout(timer);
      timer = setTimeout(() => finish(started), Math.ceil(duration * 1000) + 600);
    };
    let starting = false;
    const start = () => {
      if (starting || settled) return;
      starting = true;
      audio.volume = 1.0;
      audio.play().then(() => {
        started = true;
      }).catch(() => finish(false));
    };
    audio.oncanplay = () => start();
    audio.src = url;
    audio.load();
    if (audio.readyState >= 2) start();
  });
}

async function playClip(src) {
  return playUrl(src);
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

let returningPending = 0;
let returningBusy = false;

async function playReturningNow() {
  if (returningPending < 1 || returningBusy) return;
  returningBusy = true;
  try {
    const played = await playUrl(audioUrl("returning.mp3"));
    if (played) returningPending = Math.max(0, returningPending - 1);
  } catch (err) {
    console.warn("تعذر تشغيل صوت مريض مراجع:", err);
  } finally {
    returningBusy = false;
  }
}

export function armReturningPatientAudio() {
  speakerElement();
  playReturningNow();
}

export function nudgeReturningPatientSound() {
  playReturningNow();
}

export function playReturningPatientSound() {
  returningPending += 1;
  armReturningPatientAudio();
  return Promise.resolve(true);
}

let displayChain = Promise.resolve();

export function armDisplayAudio() {
  speakerElement();
}

async function playDisplayClip(src) {
  return playUrl(src);
}

async function playDisplayClips(urls) {
  armDisplayAudio();
  let heard = false;
  for (const src of urls) {
    const played = await playDisplayClip(src);
    if (!played && !heard) return false;
    heard = heard || played;
  }
  return heard;
}

export function playCallAnnouncement(ticketNumber, clinicName) {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!window.location.pathname.startsWith("/display")) return Promise.resolve(false);
  const urls = [audioUrl("open.mp3"), numberSoundUrl(ticketNumber), clinicSoundUrl(clinicName)].filter(Boolean);
  let resolveResult = () => {};
  const result = new Promise((resolve) => {
    resolveResult = resolve;
  });
  displayChain = displayChain
    .then(() => playDisplayClips(urls))
    .then((played) => resolveResult(played))
    .catch(() => resolveResult(false));
  return result;
}
