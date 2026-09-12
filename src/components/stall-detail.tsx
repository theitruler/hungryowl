"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Star,
  BadgeCheck,
  Flag,
  ExternalLink,
  Pencil,
} from "lucide-react";
import type { StallDetails, Viewer } from "@/lib/config";
import { formatTime, isOpen, openingLabel } from "@/lib/geo-time";
import { useClock } from "@/hooks/use-clock";
import { PhotoCarousel } from "./photo-carousel";
import { DietLabels } from "./stall-card";
import { mutate, errorMessage } from "@/lib/client-api";
export function StallDetail({
  stall,
  viewer,
  demo,
}: {
  stall: StallDetails;
  viewer: Viewer | null;
  demo: boolean;
}) {
  const [stars, setStars] = useState(0),
    [reporting, setReporting] = useState(false),
    [note, setNote] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const now = useClock(demo);
  const router = useRouter(),
    open = isOpen(stall, now);
  const admin = viewer?.role === "admin";
  const canManage = !!viewer && (stall.canManage || viewer.id === stall.ownerId || admin);
  const workspace = admin || canManage || !!stall.submission;
  const visitor = !workspace && stall.status === "approved";
  const backHref = admin ? "/admin" : workspace ? "/owner" : "/";
  async function act(type: "rating" | "report") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await mutate(`/api/stalls/${stall.id}/${type}`, type === "rating" ? { stars } : { note });
      setMessage(
        type === "rating"
          ? "Your rating has been saved. Thanks for sharing!"
          : "Your report has been sent to the admin team for review.",
      );
      if (type === "report") setReporting(false);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={backHref} className="back-link">
        <ArrowLeft size={16} /> {admin ? "Back to admin review" : workspace ? "Back to my stalls & submissions" : "Back to nearby stalls"}
      </Link>
      <PhotoCarousel photos={stall.photos} name={stall.name} />
      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            {stall.status !== "approved"
              ? `${stall.status.toUpperCase()} SUBMISSION`
              : open
                ? "OPEN NOW · YOUR NEXT FOOD STOP"
                : openingLabel(stall, now)}
          </div>
          <h1>{stall.name}</h1>
          <p>
            <MapPin size={14} /> {stall.area}
          </p>
          <DietLabels diets={stall.diets} />
          <div className={`verification ${stall.ownerId ? "verified" : ""}`}>
            {stall.ownerId ? (
              <>
                <BadgeCheck size={15} /> Owner verified
              </>
            ) : (
              "Not confirmed by owner · Hours are community submitted"
            )}
          </div>
        </div>
        {canManage && (
          <Link className="button secondary" href={`/owner/${stall.id}`}>
            <Pencil size={15} /> {admin ? "Edit stall" : "Manage my stall"}
          </Link>
        )}
      </div>
      <div className="detail-layout">
        <div>
          {workspace && (
            <section className="panel">
              <h2>{admin ? "Submission details" : canManage ? "Manage your stall" : "Your submission"}</h2>
              <p>{admin ? "Review the details and both photos provided with this stall." : canManage ? "You can update the menu, photos, opening hours, and temporary closures." : "You submitted someone else’s stall. You can follow its review status here; editing is reserved for the owner and admin team."}</p>
              {canManage && <Link className="button primary" href={`/owner/${stall.id}`}><Pencil size={16} /> Edit menu, timings & stall details</Link>}
              <dl className="submission-details">
                <div><dt>Review status</dt><dd>{stall.status}</dd></div>
                {stall.submission && <>
                  <div><dt>Submitted as</dt><dd>{stall.submission.relationship === "mine" ? "My stall" : "Someone else’s stall"}</dd></div>
                  <div><dt>Owner’s contact number</dt><dd><a href={`tel:${stall.submission.contactPhone}`}>{stall.submission.contactPhone}</a></dd></div>
                </>}
                <div><dt>Submitted on</dt><dd>{new Date(stall.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
              </dl>
              {stall.submission?.rejectionReason && <p className="notice error">Review note: {stall.submission.rejectionReason}</p>}
            </section>
          )}
          <section className="panel">
            <h2>A little about this spot</h2>
            <p style={{ marginTop: 15, marginBottom: 0 }}>
              {stall.description || (workspace ? "No description provided." : "A community-discovered late-night food stall in Bangalore.")}
            </p>
          </section>
          <section className="panel">
            <h2>On the menu</h2>
            <p>Prices in Indian rupees. Availability can change through the night.</p>
            {stall.menu.length ? (
              stall.menu.map((item, index) => (
                <div className="menu-item" key={index}>
                  <div>
                    {item.name}
                    <DietLabels diets={[item.diet]} />
                  </div>
                  <strong>
                    {item.price === null
                      ? "Ask at stall"
                      : `₹${item.price.toLocaleString("en-IN")}`}
                  </strong>
                </div>
              ))
            ) : (
              <div className="notice">
                The menu hasn’t been added yet. Check with the stall when you visit.
              </div>
            )}
          </section>
          {visitor && <section className="panel">
            <h2>How was your bite?</h2>
            <p>One rating per person. You can update yours any time.</p>
            <div className="stars" role="group" aria-label="Your star rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className={value <= stars ? "chosen" : ""}
                  onClick={() => setStars(value)}
                  aria-label={`Rate ${value} ${value === 1 ? "star" : "stars"}`}
                  aria-pressed={stars === value}
                >
                  <Star size={29} fill={value <= stars ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            {demo ? (
              <p>Ratings are disabled for sample listings.</p>
            ) : !viewer ? (
              <Link href="/login" className="text-link">
                Sign in to rate this stall
              </Link>
            ) : viewer.id === stall.ownerId ? (
              <p>You can’t rate your own stall.</p>
            ) : (
              <button
                disabled={!stars || busy}
                onClick={() => act("rating")}
                className="button primary"
              >
                Save rating
              </button>
            )}
          </section>}
        </div>
        <aside>
          <section className="panel">
            <h2>{workspace ? "Opening hours & location" : "Plan your stop"}</h2>
            <p className="opening-time">{openingLabel(stall, now)}</p>
            <div className="detail-stat">
              <Clock3 size={20} />
              <div>
                <strong>
                  {formatTime(stall.opensAt)} – {formatTime(stall.closesAt)}
                </strong>
                <small>
                  Daily · Bangalore time
                  {stall.opensAt > stall.closesAt ? " · Closes next morning" : ""}
                </small>
                {stall.closedUntil && new Date(stall.closedUntil) > now && (
                  <small>
                    Temporarily closed until{" "}
                    {new Date(stall.closedUntil).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </small>
                )}
              </div>
            </div>
            {visitor && <div className="detail-stat">
              <Star size={20} />
              <div>
                <strong>
                  {stall.rating === null
                    ? "N/A · No ratings yet"
                    : `${stall.rating.toFixed(1)} out of 5`}
                </strong>
                <small>
                  {stall.ratingCount
                    ? `${stall.ratingCount} community ratings`
                    : "Be the first to share a rating"}
                </small>
              </div>
            </div>}
            <div className="detail-stat">
              <MapPin size={20} />
              <div>
                {stall.area}
                <small>
                  {stall.latitude.toFixed(5)}, {stall.longitude.toFixed(5)}
                </small>
              </div>
            </div>
            {visitor && !demo && (
              <a
                className="button primary full"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${stall.latitude},${stall.longitude}`}
              >
                <ExternalLink size={16} /> Get directions
              </a>
            )}
            {visitor && !stall.ownerId && (
              <div className="notice">
                These opening hours haven’t been confirmed by the owner. A stall may close earlier
                than listed.
              </div>
            )}
          </section>
          {visitor && <section className="panel">
            <h3>Found the shutters down?</h3>
            <p style={{ margin: "12px 0 18px" }}>
              Let us know so we can check it for the next night owl.
            </p>
            {demo ? (
              <p>Reports are disabled for sample listings.</p>
            ) : !viewer ? (
              <Link className="text-link" href="/login">
                Sign in to report
              </Link>
            ) : reporting ? (
              <form
                className="report-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act("report");
                }}
              >
                <label className="field">
                  A note for the team (optional)
                  <textarea
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you notice?"
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  Send closure report
                </button>
                <button type="button" className="text-link" onClick={() => setReporting(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button className="button secondary" onClick={() => setReporting(true)}>
                <Flag size={16} /> Report closed stall
              </button>
            )}
          </section>}
        </aside>
      </div>
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
