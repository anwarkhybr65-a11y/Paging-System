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

export function releaseAudioContext() {
  const ctx = audioContext;
  audioContext = null;
  if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
}

export async function unlockAudio() {
  try {
    speakerElement();
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

let speaker = null;
const loudCache = new Map();

function speakerElement() {
  if (typeof document === "undefined") return null;
  if (speaker && speaker.isConnected) return speaker;
  const audio = document.createElement("audio");
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = 1;
  audio.muted = false;
  audio.setAttribute("playsinline", "");
  audio.style.cssText = "position:fixed;bottom:0;left:0;width:8px;height:8px;opacity:0.02;pointer-events:none;";
  (document.body || document.documentElement).appendChild(audio);
  speaker = audio;
  return audio;
}

function audioBufferToWav(buffer) {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const drive = 2.6;
  const channelData = [];
  for (let channel = 0; channel < channels; channel += 1) channelData.push(buffer.getChannelData(channel));
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, Math.tanh(channelData[channel][frame] * drive)));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}

function loudUrl(src) {
  if (loudCache.has(src)) return loudCache.get(src);
  const pending = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error("audio-missing");
      return response.arrayBuffer();
    })
    .then((data) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(data.slice(0)))
    .then((buffer) => URL.createObjectURL(audioBufferToWav(buffer)))
    .catch(() => src);
  loudCache.set(src, pending);
  return pending;
}

function playUrl(url) {
  const audio = speakerElement();
  if (!audio) return Promise.resolve(false);
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
      audio.play().then(() => {
        started = true;
      }).catch(() => finish(false));
    };
    audio.oncanplay = () => start();
    audio.volume = 1;
    audio.muted = false;
    audio.src = url;
    audio.load();
    if (audio.readyState >= 2) start();
  });
}

async function playWebClip(src) {
  const url = await loudUrl(src);
  const played = await playUrl(url);
  if (!played) throw new Error("speaker-blocked");
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

let returningPending = 0;
let returningBusy = false;

async function playReturningNow() {
  if (returningPending < 1 || returningBusy) return;
  returningBusy = true;
  try {
    const url = await loudUrl(audioUrl("returning.mp3"));
    const played = await playUrl(url);
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
  const url = await loudUrl(src);
  return playUrl(url);
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
