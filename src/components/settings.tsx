"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, LogOut, ShieldCheck, LocateFixed, Check, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, type Viewer } from "@/lib/config";
import { useRadiusPreference, saveRadiusPreference } from "@/hooks/use-radius-preference";
import { authClient } from "@/lib/auth-client";
import { useLocation } from "@/hooks/use-location";
export function Settings({ viewer, demo }: { viewer: Viewer | null; demo: boolean }) {
  const storedRadius = useRadiusPreference(),
    router = useRouter();
  const [draft, setRadius] = useState<number | null>(null),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const radius = viewer ? draft ?? storedRadius : DEFAULT_RADIUS_KM;
  const location = useLocation();
  function save() {
    if (!viewer) return;
    try {
      saveRadiusPreference(radius);
      setSaved(true);
      setError("");
    } catch {
      setError("Your browser couldn’t save this preference. Allow site storage and try again.");
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Couldn’t sign out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <div className="narrow-page">
      <div className="page-heading">
        <div className="eyebrow">
          <SlidersHorizontal size={15} /> MAKE IT YOURS
        </div>
        <h1>Your night, your radius.</h1>
        <p>Keep your next bite close, or make a little adventure out of it.</p>
      </div>
      <section className="panel">
        <h2>Nearby distance</h2>
        <p>Choose how far you want to ride for food. Saved on this device.</p>
        <div className="distance-number">
          {radius} <span>kilometres</span>
        </div>
        <label htmlFor="radius" className="muted" style={{ fontSize: 12 }}>
          Search radius
        </label>
        <input
          id="radius"
          className="field-range"
          type="range"
          disabled={!viewer}
          min={1}
          max={MAX_RADIUS_KM}
          value={radius}
          onChange={(e) => {
            if (!viewer) return;
            setRadius(Number(e.target.value));
            setSaved(false);
          }}
        />
        <div className="range-labels">
          <span>1 km · Around the corner</span>
          <span>30 km · Worth the ride</span>
        </div>
        <div className="form-actions" style={{ marginTop: 25 }}>
          <button className="button primary" onClick={save} disabled={!viewer}>
            {saved ? (
              <>
                <Check size={17} /> Preference saved
              </>
            ) : (
              "Save preference"
            )}
          </button>
        </div>
        {!viewer && <p><Link href="/login" className="text-link">Sign in to change your nearby distance</Link></p>}
        {saved && (
          <p role="status" style={{ marginTop: 15 }}>
            Your nearby list will use {radius} km.{" "}
            <Link href="/" className="text-link">
              Back to exploring
            </Link>
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Location & privacy</h2>
        <div className="setting-row">
          <div>
            <h3>Current location only</h3>
            <p>
              Your precise browsing location is used to calculate distances. We don’t save your
              travel history.
            </p>
          </div>
          <MapPin size={25} />
        </div>
        <div className="setting-row">
          <div>
            <h3>Browser permissions</h3>
            <p>
              {location.error ||
                (location.coordinates
                  ? "Location access is working."
                  : "Manage location access in your browser’s site settings.")}
            </p>
          </div>
          <button
            className="button secondary small"
            disabled={location.loading}
            onClick={location.request}
          >
            <LocateFixed size={15} />
            {location.loading ? "Checking…" : "Check access"}
          </button>
        </div>
        <Link href="/privacy" className="text-link">
          Read the privacy notice
        </Link>
      </section>
      <section className="panel">
        <h2>Your account</h2>
        {viewer ? (
          <>
            <div className="setting-row">
              <div>
                <h3>{viewer.name}</h3>
                <p>{viewer.email}</p>
              </div>
              <ShieldCheck size={22} />
            </div>
            {viewer.role === "admin" && (
              <Link href="/admin" className="button secondary">
                Open admin review
              </Link>
            )}
            <button
              className="button secondary"
              style={{ marginTop: 18 }}
              disabled={busy}
              onClick={signOut}
            >
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <>
            <p>
              {demo
                ? "You’re exploring a sample preview."
                : "Sign in to discover nearby stalls and contribute."}
            </p>
            <Link href="/login" className="button secondary">
              Go to sign in
            </Link>
          </>
        )}
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
