import { notFound, redirect } from "next/navigation";
import { StallDetail } from "@/components/stall-detail";
import { getViewer } from "@/lib/auth";
import { isDemo } from "@/lib/runtime";
import { DEMO_STALLS } from "@/lib/demo";
import { getStall } from "@/services/stalls";
export const metadata = { title: "Stall details" };
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    demo = isDemo(),
    viewer = await getViewer();
  if (!demo && !viewer) redirect("/login");
  const stall = demo ? DEMO_STALLS.find((s) => s.id === id) : await getStall(id, viewer);
  if (!stall) notFound();
  return <StallDetail stall={stall} viewer={viewer} demo={demo} />;
}
