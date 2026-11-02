"use client";

import { useCallback, useEffect, useState } from "react";

const empty = {
  waiting: [],
  current: null,
  served: [],
  lastNumber: 0,
  callVersion: 0,
};

export function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function useQueue(interval = 1200) {
  const [state, setState] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/queue", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الدور");
      setState(data);
      setError("");
    } catch (err) {
      setError(err.message || "تعذر الاتصال بالنظام");
    }
  }, []);

  const act = useCallback(async (action, extra = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      setState(data);
      return data;
    } catch (err) {
      setError(err.message || "تعذر تنفيذ العملية");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [refresh, interval]);

  return { state, error, busy, refresh, act, setError };
}
