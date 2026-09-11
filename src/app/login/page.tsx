import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getViewer, googleConfigured } from "@/lib/auth";
import { authConfigured, isDemo } from "@/lib/runtime";
export const metadata = { title: "Sign in" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getViewer()) redirect("/");
  const params = await searchParams;
  return (
    <AuthForm
      googleEnabled={authConfigured() && googleConfigured()}
      demo={isDemo()}
      authError={params.error}
    />
  );
}
