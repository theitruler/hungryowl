import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocationStore, locationLabel } from "../src/lib/location-store";
import { parseLocationName } from "../src/lib/location-name";

afterEach(() => vi.unstubAllGlobals());

function gps() {
  let success: PositionCallback = () => {};
  let failure: PositionErrorCallback = () => {};
  const getCurrentPosition = vi.fn((yes: PositionCallback, no: PositionErrorCallback) => {
    success = yes;
    failure = no;
  });
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  return {
    getCurrentPosition,
    success: () =>
      success({
        coords: {
          latitude: 13.08,
          longitude: 80.27,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      }),
    fail: () =>
      failure({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }),
  };
}

describe("location naming and shared GPS state", () => {
  it("uses provider names for any city and handles missing or invalid fields", () => {
    expect(parseLocationName({ locality: "Mylapore", city: "Chennai" })).toBe("Mylapore, Chennai");
    expect(parseLocationName({ locality: "Chennai", city: "Chennai" })).toBe("Chennai");
    expect(parseLocationName({ city: "", principalSubdivision: "Tamil Nadu" })).toBe("Tamil Nadu");
    expect(parseLocationName({ city: 123 })).toBeNull();
    expect(parseLocationName({})).toBeNull();
  });
  it("shares one GPS request and resolves the name without blocking coordinates", async () => {
    const device = gps();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ locality: "Mylapore", city: "Chennai" }));
    vi.stubGlobal("fetch", fetchMock);
    const store = createLocationStore();
    store.ensureLocation();
    store.ensureLocation();
    expect(device.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(locationLabel(store.getSnapshot())).toBe("Finding your location…");
    device.success();
    expect(store.getSnapshot().coordinates?.latitude).toBe(13.08);
    await vi.waitFor(() => expect(locationLabel(store.getSnapshot())).toBe("Mylapore, Chennai"));
    expect(fetchMock.mock.calls[0][0]).toContain("latitude=13.08&longitude=80.27");
    store.ensureLocation();
    expect(device.getCurrentPosition).toHaveBeenCalledTimes(1);
    store.request();
    expect(device.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(device.getCurrentPosition.mock.calls[0]).toHaveLength(3);
  });
  it("denied permission never calls the geocoder and clears a previous fix", async () => {
    const device = gps();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ city: "Chennai" }));
    vi.stubGlobal("fetch", fetchMock);
    const store = createLocationStore();
    store.request();
    device.success();
    await vi.waitFor(() => expect(store.getSnapshot().name).toBe("Chennai"));
    fetchMock.mockClear();
    store.request();
    device.fail();
    expect(locationLabel(store.getSnapshot())).toBe("Location access not permitted");
    expect(store.getSnapshot().coordinates).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps GPS usable when reverse geocoding fails", async () => {
    const device = gps();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const store = createLocationStore();
    store.request();
    device.success();
    await vi.waitFor(() => expect(store.getSnapshot().nameLoading).toBe(false));
    expect(locationLabel(store.getSnapshot())).toBe("Current location");
    expect(store.getSnapshot().coordinates).not.toBeNull();
  });
  it("ignores an old lookup after permission is denied or state is reset", async () => {
    const device = gps();
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const store = createLocationStore();
    store.request();
    device.success();
    store.request();
    device.fail();
    resolve(Response.json({ city: "Stale city" }));
    await new Promise((done) => setTimeout(done, 0));
    expect(locationLabel(store.getSnapshot())).toBe("Location access not permitted");
    store.reset();
    expect(locationLabel(store.getSnapshot())).toBe("Enable location");
  });
});
