"use client";
import { useEffect, useState } from "react";

export function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function calc() {
      const ms = Date.now() - new Date(createdAt).getTime();
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${m}:${String(s).padStart(2, "0")}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  return elapsed;
}

export function useIsUrgent(createdAt: string, thresholdMinutes = 10) {
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    const check = () => {
      const ms = Date.now() - new Date(createdAt).getTime();
      setUrgent(ms > thresholdMinutes * 60000);
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [createdAt, thresholdMinutes]);
  return urgent;
}
