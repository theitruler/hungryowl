"use client";
import { useSyncExternalStore } from "react";
import { createLocationStore, locationLabel } from "@/lib/location-store";

// Shared in memory across navigation; GPS is never saved in local storage.
const store = createLocationStore();
export function useLocation() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return {
    ...state,
    label: locationLabel(state),
    request: store.request,
    ensureLocation: store.ensureLocation,
    reset: store.reset,
  };
}
