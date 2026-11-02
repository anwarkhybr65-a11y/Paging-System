import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "queue.json");

function emptyState() {
  return {
    waiting: [],
    current: null,
    served: [],
    lastNumber: 0,
    callVersion: 0,
  };
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(emptyState(), null, 2), "utf8");
  }
}

export function loadQueue() {
  ensureStore();
  try {
    return { ...emptyState(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return emptyState();
  }
}

function saveQueue(state) {
  ensureStore();
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function normalizeNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!/^\d{1,6}$/.test(raw)) return "";
  return raw.padStart(Math.max(3, raw.length), "0");
}

function existsInQueue(state, number) {
  if (state.current?.number === number) return true;
  return state.waiting.some((ticket) => ticket.number === number);
}

export function getQueue() {
  return loadQueue();
}

export function issueTicket(manualNumber) {
  const state = loadQueue();
  let number = normalizeNumber(manualNumber);

  if (number) {
    if (existsInQueue(state, number)) {
      throw new Error("هذا الرقم موجود بالفعل في قائمة الانتظار");
    }
    const numeric = Number(number);
    if (numeric > state.lastNumber) state.lastNumber = numeric;
  } else {
    state.lastNumber += 1;
    number = String(state.lastNumber).padStart(3, "0");
  }

  state.waiting.push({
    number,
    createdAt: Date.now(),
  });

  return { ...saveQueue(state), issued: number };
}

export function callNext() {
  const state = loadQueue();
  if (state.current) {
    state.served.unshift({
      ...state.current,
      finishedAt: Date.now(),
    });
  }

  const next = state.waiting.shift();
  if (!next) {
    state.current = null;
    return saveQueue(state);
  }

  state.current = {
    ...next,
    calledAt: Date.now(),
    status: "calling",
  };
  state.callVersion += 1;
  state.served = state.served.slice(0, 40);
  return saveQueue(state);
}

export function recallCurrent() {
  const state = loadQueue();
  if (!state.current) throw new Error("لا يوجد رقم حالي لإعادة ندائه");
  state.current = {
    ...state.current,
    calledAt: Date.now(),
    status: "calling",
  };
  state.callVersion += 1;
  return saveQueue(state);
}

export function finishCurrent() {
  const state = loadQueue();
  if (!state.current) throw new Error("لا يوجد رقم حالي لإنهائه");
  state.served.unshift({
    ...state.current,
    finishedAt: Date.now(),
  });
  state.served = state.served.slice(0, 40);
  state.current = null;
  return saveQueue(state);
}

export function resetQueue() {
  return saveQueue(emptyState());
}
