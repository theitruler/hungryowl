"use client";
import { useSyncExternalStore } from "react";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM } from "@/lib/config";
const KEY = "hungryowl-radius",
  EVENT = "hungryowl:radius-changed";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
function snapshot() {
  try {
    const value = Number(localStorage.getItem(KEY));
    return value >= 1 && value <= MAX_RADIUS_KM ? value : DEFAULT_RADIUS_KM;
  } catch {
    return DEFAULT_RADIUS_KM;
  }
}
export function useRadiusPreference() {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_RADIUS_KM);
}
export function saveRadiusPreference(value: number) {
  localStorage.setItem(KEY, String(value));
  window.dispatchEvent(new Event(EVENT));
}
