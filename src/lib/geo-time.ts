import { TIME_ZONE, NEW_STALL_DAYS, type Coordinates } from "./config";
export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function timeMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function localMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return (
    Number(parts.find((p) => p.type === "hour")!.value) * 60 +
    Number(parts.find((p) => p.type === "minute")!.value)
  );
}
export function isOpen(
  stall: { opensAt: string; closesAt: string; closedUntil: string | null },
  now = new Date(),
) {
  if (stall.closedUntil && new Date(stall.closedUntil) > now) return false;
  const open = timeMinutes(stall.opensAt),
    close = timeMinutes(stall.closesAt),
    minute = localMinutes(now);
  return open === close
    ? true
    : open < close
      ? minute >= open && minute < close
      : minute >= open || minute < close;
}
export function servesLateNight(open: string, close: string) {
  const a = timeMinutes(open),
    b = timeMinutes(close);
  return a === b || a > b || a < 360 || b > 1380;
}
export function nextOpening(stall: { opensAt: string; closesAt: string; closedUntil: string | null }, now = new Date()) {
  if (isOpen(stall, now)) return null;
  const availableAt = stall.closedUntil && new Date(stall.closedUntil) > now
    ? new Date(stall.closedUntil) : now;
  if (isOpen({ ...stall, closedUntil: null }, availableAt)) return availableAt;
  const minutesUntilOpen = (timeMinutes(stall.opensAt) - localMinutes(availableAt) + 1440) % 1440;
  return new Date(Math.floor(availableAt.getTime() / 60000) * 60000 + minutesUntilOpen * 60000);
}

export function openingLabel(stall: { opensAt: string; closesAt: string; closedUntil: string | null }, now = new Date()) {
  const next = nextOpening(stall, now);
  if (!next) return "Open now";
  const minutes = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remaining = minutes % 60;
  const duration = [days && `${days}d`, hours && `${hours}h`, remaining && `${remaining}m`].filter(Boolean).join(" ");
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(next);
  return `Opens in ${duration} · ${time}`;
}
export function inBangalore({ latitude, longitude }: Coordinates) {
  return latitude >= 12.7 && latitude <= 13.3 && longitude >= 77.3 && longitude <= 77.9;
}
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "pm" : "am"}`;
}
export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
export function isNew(approvedAt: string | null, now = new Date()) {
  return !!approvedAt && now.getTime() - new Date(approvedAt).getTime() < NEW_STALL_DAYS * 86400000;
}
