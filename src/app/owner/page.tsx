import Link from "next/link";
import { Store, Plus, ArrowRight } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { isDemo } from "@/lib/runtime";
import { myStalls } from "@/services/stalls";
import { AccessGate } from "@/components/access-gate";
export const metadata = { title: "My stalls" };
export default async function OwnerPage() {
  const viewer = await getViewer(),
    demo = isDemo();
  if (!viewer && !demo)
    return (
      <AccessGate
        title="Your little corner of HungryOwl"
        message="Sign in to manage your verified stalls and follow your submissions."
      />
    );
  const list = viewer ? await myStalls(viewer) : [];
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <Store size={15} /> BEHIND THE COUNTER
        </div>
        <h1>My stalls & submissions</h1>
        <p>Follow your submissions and keep your verified stalls up to date.</p>
      </div>
      {demo && (
        <div className="notice">
          The owner workspace requires a verified account. This preview contains no personal
          submissions.
        </div>
      )}
      {list.length ? (
        list.map((stall) => (
          <div key={stall.id} className="management-card">
            <div>
              <h3>{stall.name}</h3>
              <p>
                {stall.area} ·{" "}
                {stall.ownerId === viewer?.id ? "Your verified stall" : "Your submission"}
              </p>
              {stall.rejectionReason && (
                <p className="notice error">Review note: {stall.rejectionReason}</p>
              )}
            </div>
            <div className="management-actions">
              <span className="status-tag">{stall.status}</span>
              <Link className="button secondary small" href={`/stalls/${stall.id}`}>
                View
              </Link>
              {stall.ownerId === viewer?.id && (
                <Link className="button primary small" href={`/owner/${stall.id}`}>
                  Manage <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <Store size={36} />
          <h2>Your food story starts here.</h2>
          <p>
            Add a stall to see its review status here. After our admin calls and verifies the owner,
            that owner can manage the listing directly.
          </p>
          <Link href="/add" className="button primary">
            <Plus size={16} /> Add a stall
          </Link>
        </div>
      )}
    </>
  );
}
