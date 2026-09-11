import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { adminQueue } from "@/services/stalls";
import { AdminQueue } from "@/components/admin-queue";
export const metadata = { title: "Admin review" };
export default async function AdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "admin") notFound();
  return <AdminQueue {...await adminQueue()} />;
}
