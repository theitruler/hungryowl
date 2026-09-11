import { Settings } from "@/components/settings";
import { getViewer } from "@/lib/auth";
import { isDemo } from "@/lib/runtime";
export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  return <Settings viewer={await getViewer()} demo={isDemo()} />;
}
