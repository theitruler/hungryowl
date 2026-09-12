import type { Viewer } from "./config";

type Ownership = {
  ownerId: string | null;
  submittedBy: string;
  relationship: "mine" | "other";
};

export function isStallOwner(stall: Ownership, viewer: Viewer | null) {
  return !!viewer && (
    stall.ownerId === viewer.id ||
    (!stall.ownerId && stall.relationship === "mine" && stall.submittedBy === viewer.id)
  );
}

export function canManageStall(stall: Ownership, viewer: Viewer | null) {
  return viewer?.role === "admin" || isStallOwner(stall, viewer);
}
