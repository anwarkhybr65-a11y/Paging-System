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
  if (!audioContext || audioContext.state === "closed") audioContext = new Ctx();
  return audioContext;
}

export function releaseAudioContext() {
  const ctx = audioContext;
  audioContext = null;
  if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
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
    connectLoud(ctx, node);
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

let returningCtx = null;
let returningBuffer = null;
let returningLoading = null;
let returningPending = 0;

function returningContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!returningCtx || returningCtx.state === "closed") returningCtx = new Ctx();
  return returningCtx;
}

function warmReturningBuffer() {
  const ctx = returningContext();
  if (!ctx || returningBuffer || returningLoading) return returningLoading || Promise.resolve(returningBuffer);
  returningLoading = fetch(audioUrl("returning.mp3"))
    .then((response) => {
      if (!response.ok) throw new Error("returning-audio-missing");
      return response.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data.slice(0)))
    .then((buffer) => {
      returningBuffer = buffer;
      returningLoading = null;
      return buffer;
    })
    .catch((err) => {
      returningLoading = null;
      console.warn("تعذر تجهيز صوت مريض مراجع:", err);
      return null;
    });
  return returningLoading;
}

function connectLoud(ctx, source) {
  const pre = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const post = ctx.createGain();
  pre.gain.value = 4;
  comp.threshold.value = -10;
  comp.knee.value = 4;
  comp.ratio.value = 20;
  comp.attack.value = 0.001;
  comp.release.value = 0.05;
  post.gain.value = 1.8;
  source.connect(pre);
  pre.connect(comp);
  comp.connect(post);
  post.connect(ctx.destination);
}

function playReturningBuffer() {
  const ctx = returningContext();
  if (!ctx || ctx.state !== "running" || !returningBuffer) return false;
  const node = ctx.createBufferSource();
  node.buffer = returningBuffer;
  connectLoud(ctx, node);
  node.start();
  return true;
}

export function armReturningPatientAudio() {
  const ctx = returningContext();
  if (!ctx) return;
  const ready = ctx.state === "running" ? Promise.resolve() : ctx.resume().catch(() => {});
  Promise.all([ready, warmReturningBuffer()]).then(() => {
    nudgeReturningPatientSound();
  });
}

export function nudgeReturningPatientSound() {
  if (returningPending < 1) return;
  if (!playReturningBuffer()) return;
  returningPending -= 1;
  if (returningPending > 0) {
    const waitMs = Math.ceil((returningBuffer?.duration || 1.6) * 1000) + 150;
    window.setTimeout(nudgeReturningPatientSound, waitMs);
  }
}

export function playReturningPatientSound() {
  returningPending += 1;
  armReturningPatientAudio();
  return Promise.resolve(true);
}

let displayCtx = null;
let displayCache = new Map();
let displayChain = Promise.resolve();

function displayContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!displayCtx || displayCtx.state === "closed") displayCtx = new Ctx();
  return displayCtx;
}

export function armDisplayAudio() {
  const ctx = displayContext();
  if (!ctx) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
}

function loadDisplayBuffer(src) {
  if (displayCache.has(src)) return Promise.resolve(displayCache.get(src));
  const ctx = displayContext();
  if (!ctx) return Promise.resolve(null);
  return fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`audio-http-${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data.slice(0)))
    .then((buffer) => {
      displayCache.set(src, buffer);
      return buffer;
    })
    .catch(() => null);
}

function playDisplayBuffer(buffer) {
  const ctx = displayContext();
  if (!ctx || ctx.state !== "running" || !buffer) return Promise.resolve(false);
  return new Promise((resolve) => {
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    connectLoud(ctx, node);
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true), Math.ceil((buffer.duration || 1) * 1000) + 250);
    node.onended = () => {
      clearTimeout(timer);
      finish(true);
    };
    try {
      node.start();
    } catch (err) {
      clearTimeout(timer);
      finish(false);
    }
  });
}

function playHtmlNow(src) {
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = 1;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 12000);
    audio.onended = () => {
      clearTimeout(timer);
      finish(true);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      finish(false);
    };
    audio.play().catch(() => {
      clearTimeout(timer);
      finish(false);
    });
  });
}

async function playDisplayClip(src) {
  const ctx = displayContext();
  if (ctx && ctx.state !== "running") {
    try {
      await Promise.race([ctx.resume(), wait(700)]);
    } catch (err) {
      // The browser is still holding the sound until the screen is tapped.
    }
  }
  if (ctx && ctx.state === "running") {
    const buffer = await loadDisplayBuffer(src);
    if (buffer && (await playDisplayBuffer(buffer))) return true;
  }
  return playHtmlNow(src);
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
