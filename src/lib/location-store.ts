import type { Coordinates } from "./config";
import { resolveLocationName } from "./location-name";

type LocationState = {
  coordinates: (Coordinates & { accuracy: number; capturedAt: number }) | null;
  loading: boolean;
  error: string;
  name: string | null;
  nameLoading: boolean;
};
const initial: LocationState = {
  coordinates: null,
  loading: false,
  error: "",
  name: null,
  nameLoading: false,
};

export function createLocationStore() {
  let state = initial;
  let generation = 0;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<LocationState>) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  };
  const request = () => {
    if (state.loading) return;
    const current = ++generation;
    update({ ...initial, loading: true });
    if (!navigator.geolocation) {
      update({ loading: false, error: "Location is not supported by this browser." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current !== generation) return;
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: position.timestamp,
        };
        update({ coordinates, loading: false, nameLoading: true });
        void resolveLocationName(coordinates).then(
          (name) => {
            if (current === generation) update({ name, nameLoading: false });
          },
          () => {
            if (current === generation) update({ nameLoading: false });
          },
        );
      },
      (failure) => {
        if (current !== generation) return;
        update({
          loading: false,
          error:
            failure.code === 1
              ? "Location access not permitted"
              : failure.code === 2
                ? "Your location is unavailable"
                : "Finding your location took too long",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    request,
    ensureLocation: () => {
      if (!state.coordinates && !state.error) request();
    },
    reset: () => {
      ++generation;
      update(initial);
    },
  };
}

export function locationLabel(state: LocationState): string {
  if (state.loading) return "Finding your location…";
  if (state.error) return state.error;
  if (state.nameLoading) return "Finding your area…";
  return state.name || (state.coordinates ? "Current location" : "Enable location");
}
