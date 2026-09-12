"use client";
import { useEffect, useState } from "react";

export function useClock(demo = false) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (demo) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [demo]);
  return demo ? new Date("2026-09-11T00:30:00+05:30") : now;
}
