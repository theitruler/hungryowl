import { Explore } from "@/components/explore";
import { isDemo } from "@/lib/runtime";
import { getViewer } from "@/lib/auth";
export default async function Home() {
  return <Explore demo={isDemo()} viewer={await getViewer()} />;
}
