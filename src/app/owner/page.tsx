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
        message="Sign in to manage your stalls and follow your submissions."
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
        <p>Manage your own stalls and follow your submissions until an owner is assigned.</p>
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
                {stall.canManage ? "Your stall · You can edit" : "Your submission · View only"}
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
              {stall.canManage && (
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
            Add your own stall to manage it here. Stalls you submit for someone else appear here
            until an admin assigns their owner.
          </p>
          <Link href="/add" className="button primary">
            <Plus size={16} /> Add a stall
          </Link>
        </div>
      )}
    </>
  );
}
