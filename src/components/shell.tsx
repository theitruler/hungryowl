"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useLocation } from "@/hooks/use-location";
import { usePathname } from "next/navigation";
import {
  Compass,
  Plus,
  Settings2,
  Store,
  ShieldCheck,
  Moon,
  ArrowUpRight,
  LogIn,
} from "lucide-react";
import { Brand } from "./brand";
import type { Viewer } from "@/lib/config";
export function Shell({
  children,
  viewer,
  demo,
}: {
  children: React.ReactNode;
  viewer: Viewer | null;
  demo: boolean;
}) {
  const pathname = usePathname();
  const location = useLocation();
  const { ensureLocation, reset } = location;
  const viewerId = viewer?.id;
  useEffect(() => {
    if (demo) return;
    if (viewerId) ensureLocation();
    else reset();
  }, [demo, viewerId, ensureLocation, reset]);
  const placeLabel = demo ? "Sample location" : location.label;
  if (["/login", "/reset-password"].includes(pathname)) return <>{children}</>;
  const links = [
    { href: "/", label: "Explore nearby", icon: Compass },
    { href: "/add", label: "Add a stall", icon: Plus },
    { href: "/owner", label: "My stalls", icon: Store },
    { href: "/settings", label: "Settings", icon: Settings2 },
    ...(viewer?.role === "admin"
      ? [{ href: "/admin", label: "Admin review", icon: ShieldCheck }]
      : []),
  ];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">YOUR NIGHT, SORTED</div>
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={`nav-link ${pathname === href ? "active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {pathname === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="night-note">
            <Moon size={23} />
            <strong>
              Good food.
              <br />
              Late hours.
            </strong>
            <p>For the city that’s still awake.</p>
            <span>11 PM — 6 AM</span>
          </div>
          <Link className="profile" href={viewer ? "/settings" : "/login"}>
            <span className="avatar">
              {viewer ? viewer.name.slice(0, 1).toUpperCase() : <LogIn size={18} />}
            </span>
            <span>
              <strong>{viewer?.name || "Hello, night owl"}</strong>
              <small>{viewer ? "Your account" : "Sign in to HungryOwl"}</small>
            </span>
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span className="mobile-brand">
            <Brand />
          </span>
          <button
            className="city-label"
            onClick={location.request}
            disabled={demo || location.loading}
            title={placeLabel}
            aria-label={placeLabel + ". Refresh current location"}
          >
            <span className="live-dot" />{" "}
            <span className="place-name" aria-live="polite">
              {placeLabel}
            </span>
            <span className="muted">/</span> <span className="after-hours">AFTER HOURS</span>
          </button>
          <div className="header-right">
            <span className="night-pill">
              <Moon size={14} /> Made for your midnight appetite
            </span>
            <Link href="/add" className="button small secondary">
              <Plus size={16} /> Add a stall
            </Link>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            Sample preview · Illustrative stalls, distances and ratings at 12:30 am.{" "}
            <Link href="/login">Sign-in setup</Link>
          </div>
        )}
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} HungryOwl</span>
          <span>A little hungry. A little adventurous.</span>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
