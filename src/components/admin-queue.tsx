"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Check, Phone, Flag } from "lucide-react";
import { mutate, errorMessage } from "@/lib/client-api";
type Listing = {
  id: string;
  name: string;
  area: string;
  status: string;
  contactPhone: string;
  relationship: string;
  ownerId: string | null;
};
type Report = { id: string; stallId: string; name: string; note: string; createdAt: string };
export function AdminQueue({ listings, reports }: { listings: Listing[]; reports: Report[] }) {
  const [selected, setSelected] = useState<string | null>(null),
    [action, setAction] = useState<"claim" | "reject">("claim"),
    [email, setEmail] = useState(""),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function send(url: string, payload: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await mutate(url, payload);
      setMessage("The review action has been saved.");
      setSelected(null);
      setConfirmed(false);
      setEmail("");
      setReason("");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <ShieldCheck size={15} /> KEEP THE NIGHT CREW INFORMED
        </div>
        <h1>Admin review</h1>
        <p>Review new stalls, verify owners by phone, and investigate closure reports.</p>
      </div>
      {message && (
        <div role="status" className="notice success">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <section className="panel">
        <h2>Submissions & owner verification</h2>
        <p>
          Showing up to 100 newest actionable listings. Review both photos and details before
          approving.
        </p>
        {!listings.length && <p>No stalls waiting for review or an owner claim.</p>}
        {listings.map((stall) => (
          <div key={stall.id} className="panel">
            <div className="management-card" style={{ padding: 0, border: 0 }}>
              <div>
                <h3>{stall.name}</h3>
                <p>
                  {stall.area} · {stall.status}
                </p>
                <p>
                  <Phone size={12} /> <a href={`tel:${stall.contactPhone}`}>{stall.contactPhone}</a>{" "}
                  · Submitted as {stall.relationship === "mine" ? "own stall" : "another stall"}
                </p>
              </div>
              <div className="management-actions">
                <Link href={`/stalls/${stall.id}`} className="button secondary small">
                  Review details
                </Link>
                {stall.status === "pending" ? (
                  <>
                    <button
                      disabled={busy}
                      className="button primary small"
                      onClick={() => send(`/api/admin/stalls/${stall.id}`, { action: "approve" })}
                    >
                      <Check size={15} /> Approve
                    </button>
                    <button
                      disabled={busy}
                      className="button danger small"
                      onClick={() => {
                        setSelected(stall.id);
                        setAction("reject");
                      }}
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary small"
                    disabled={busy}
                    onClick={() => {
                      setSelected(stall.id);
                      setAction("claim");
                    }}
                  >
                    Assign owner
                  </button>
                )}
              </div>
            </div>
            {selected === stall.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(
                    `/api/admin/stalls/${stall.id}`,
                    action === "claim"
                      ? { action, email, callConfirmed: confirmed }
                      : { action, reason },
                  );
                }}
              >
                {action === "claim" ? (
                  <>
                    <label className="field">
                      Verified owner’s account email
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@example.com"
                      />
                      <small>The owner must already have a verified HungryOwl account.</small>
                    </label>
                    <label className="choice-card">
                      <input
                        required
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      I called the owner and verified their ownership and account email.
                    </label>
                  </>
                ) : (
                  <label className="field">
                    Reason for rejection
                    <textarea
                      required
                      minLength={5}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                )}
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                  <button disabled={busy} className="button primary small">
                    {busy ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>
          <Flag size={19} /> Closure reports
        </h2>
        <p>Reports need review; they do not automatically close a stall.</p>
        {!reports.length && <p>No unresolved reports.</p>}
        {reports.map((report) => (
          <div key={report.id} className="management-card">
            <div>
              <h3>
                <Link href={`/stalls/${report.stallId}`}>{report.name}</Link>
              </h3>
              <p>{report.note || "Reported closed; no additional note."}</p>
              <p>
                {new Date(report.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </div>
            <div className="management-actions">
              <button
                disabled={busy}
                className="button secondary small"
                onClick={() => send(`/api/admin/reports/${report.id}`, {})}
              >
                Dismiss report
              </button>
              <button
                disabled={busy}
                className="button danger small"
                onClick={() =>
                  send(`/api/admin/stalls/${report.stallId}`, { action: "close", hours: 12 })
                }
              >
                Close for 12 hours
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
