import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { getStall } from "@/services/stalls";
import { StallForm } from "@/components/stall-form";
export const metadata = { title: "Manage stall" };
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const stall = await getStall((await params).id, viewer);
  if (!stall?.canManage) notFound();
  return <StallForm stall={stall} demo={false} backHref={viewer.role === "admin" ? "/admin" : "/owner"} />;
}
