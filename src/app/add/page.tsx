import { StallForm } from "@/components/stall-form";
import { AccessGate } from "@/components/access-gate";
import { getViewer } from "@/lib/auth";
import { isDemo } from "@/lib/runtime";
export const metadata = { title: "Add a stall" };
export default async function AddPage() {
  const viewer = await getViewer(),
    demo = isDemo();
  if (!viewer && !demo) return <AccessGate title="Share your midnight find" />;
  return <StallForm demo={demo} />;
}
