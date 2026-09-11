"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Brand } from "./brand";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/client-api";

export function AuthForm({
  googleEnabled,
  demo,
  authError,
}: {
  googleEnabled: boolean;
  demo: boolean;
  authError?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    authError ? "Google sign-in could not be completed. Please try again." : "",
  );
  async function google() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
      });
      if (result.error) throw new Error("Google sign-in could not be started. Please try again.");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-art">
        <Image
          src="/images/night-food.webp"
          fill
          priority
          sizes="50vw"
          alt="Dosa and chai at a warmly lit night food counter"
        />
        <Brand />
        <div className="auth-art-copy">
          <div className="eyebrow">YOUR CITY, AFTER HOURS</div>
          <h2>
            Good nights start
            <br />
            with <em>great bites.</em>
          </h2>
          <p>
            Your companion for midnight cravings, spontaneous rides, and the little stalls worth
            stopping for.
          </p>
        </div>
      </section>
      <div className="auth-main">
        <Brand />
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Back to exploring
        </Link>
        <h1>Hello, night owl.</h1>
        <p>Sign in with your Google account and find your next midnight favourite.</p>
        {(demo || !googleEnabled) && (
          <div className="notice" role="status">
            {demo
              ? "Sign-in is disabled in this sample preview."
              : "Sign-in is temporarily unavailable. Please try again later."}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <button
          className="button secondary full"
          onClick={google}
          disabled={!googleEnabled || demo || busy}
          aria-busy={busy}
        >
          <span className="google-icon" aria-hidden="true">
            G
          </span>
          {busy ? "Connecting to Google…" : "Continue with Google"}
        </button>
        <p className="legal-copy">
          New here? Your account is created when you first continue with Google.
        </p>
        <div className="legal-copy">
          <Link href="/privacy">How we use your account and location information</Link>
        </div>
      </div>
    </div>
  );
}
