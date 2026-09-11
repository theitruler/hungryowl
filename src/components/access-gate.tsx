import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";
export function AccessGate({
  title = "Sign in to continue",
  message = "Use your account to add stalls, share ratings, and help fellow night owls.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="empty-state">
      <LogIn size={32} />
      <h2>{title}</h2>
      <p>{message}</p>
      <Link href="/login" className="button primary">
        Sign in <ArrowRight size={16} />
      </Link>
    </div>
  );
}
