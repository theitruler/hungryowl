"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Compass,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Search,
  AlertCircle,
} from "lucide-react";
import { DEFAULT_RADIUS_KM, type Coordinates, type Diet, type Stall, type Viewer } from "@/lib/config";
import { useClock } from "@/hooks/use-clock";
import { DEMO_LOCATION, DEMO_STALLS } from "@/lib/demo";
import { distanceKm } from "@/lib/geo-time";
import { StallCard } from "./stall-card";
import { useLocation } from "@/hooks/use-location";
import { useRadiusPreference } from "@/hooks/use-radius-preference";
import { useExploreTools } from "@/hooks/use-explore-tools";
type Result = { stalls: Stall[]; hasMore: boolean };
export function Explore({ demo, viewer }: { demo: boolean; viewer: Viewer | null }) {
  const location = useLocation();
  const storedRadius = useRadiusPreference();
  const radius = viewer ? storedRadius : DEFAULT_RADIUS_KM;
  const now = useClock(demo);
  const [diet, setDiet] = useState<Diet | "all">("all"),
    [search, setSearch] = useState("");
  const [result, setResult] = useState<Result>({ stalls: [], hasMore: false }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [sort, setSort] = useState("distance");
  useExploreTools(
    useCallback((input) => {
      setSearch(input.query);
      setDiet(input.diet);
      setSort(input.sort);
    }, []),
  );
  const [query, setQuery] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    async (coords: Coordinates, page = 0) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;
      setBusy(true);
      setError("");
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          radius: String(radius),
          offset: String(page),
          q: query,
          diet,
          sort,
        });
        const response = await fetch(`/api/stalls?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "We couldn’t load nearby stalls.");
        setResult((previous) => ({
          ...body,
          stalls: page ? [...previous.stalls, ...body.stalls] : body.stalls,
        }));
        setOffset(page);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Please try again.");
      } finally {
        if (activeRequest.current === controller) setBusy(false);
      }
    },
    [radius, query, diet, sort],
  );
  useEffect(() => {
    if (demo || !viewer || !location.coordinates) return;
    // Synchronize server results with an externally supplied GPS fix.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(location.coordinates);
    const timer = setInterval(() => void load(location.coordinates!), 60000);
    return () => {
      clearInterval(timer);
      activeRequest.current?.abort();
    };
  }, [demo, viewer, location.coordinates, load]);
  const source = demo
    ? DEMO_STALLS.map((s) => ({ ...s, distance: distanceKm(DEMO_LOCATION, s) })).filter(
        (s) => s.distance <= radius,
      )
    : result.stalls;
  const stalls = source
    .filter(
      (s) =>
        (diet === "all" || s.diets.includes(diet)) &&
        `${s.name} ${s.area} ${s.menu.map((m) => m.name).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "rating"
        ? (b.rating ?? -1) - (a.rating ?? -1)
        : (a.distance ?? 0) - (b.distance ?? 0),
    );
  const permitted = demo || !!location.coordinates;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <Moon size={15} /> THE NIGHT IS STILL YOUNG
          </div>
          <h1>
            Hey {viewer?.name.split(" ")[0] || "night owl"}
            <span className="accent">,</span>
            <br className="mobile-break" /> what’s the craving?
          </h1>
          <p>Find a warm bite around the corner. Even after midnight.</p>
        </div>
        <button
          className="location-chip"
          onClick={demo ? undefined : location.request}
          disabled={demo || location.loading}
        >
          <MapPin size={18} />
          <span>
            <small>{demo ? "PREVIEW LOCATION" : "YOUR LOCATION"}</small>
            <strong>{demo ? "Koramangala, Bangalore" : location.label}</strong>
          </span>
          {!demo && <LocateFixed size={15} />}
        </button>
      </div>
      <section className="night-hero" aria-label="Late-night food in Bangalore">
        <Image
          src="/images/night-food.webp"
          alt="Golden dosa and chai at a warmly lit food stall at night"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 80vw"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> THE CITY SLEEPS. YOUR CRAVINGS DON’T.
          </span>
          <h2>
            Your next stop?
            <br />
            <span>Something delicious.</span>
          </h2>
          <p>Little stalls. Big flavours. Open late.</p>
          <a href="#nearby" className="button primary">
            Find your midnight bite <ArrowRight size={17} />
          </a>
        </div>
        <span className="hero-stamp">
          <Moon size={17} /> 11:00 PM — 6:00 AM
        </span>
      </section>
      <section id="nearby" className="nearby-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FOLLOW YOUR APPETITE</div>
            <h2>
              Stalls nearby <span className="count-pill">{permitted ? stalls.length : "—"}</span>
            </h2>
            <p>
              {permitted
                ? `Late-night spots within ${radius} km${demo ? " · Sample listings" : " · Hours checked every minute"}`
                : "Your next food stop starts with your location."}
            </p>
          </div>
          {viewer ? <Link href="/settings" className="button secondary small">
            <SlidersHorizontal size={16} />
            <span>Within {radius} km</span>
          </Link> : <button type="button" className="button secondary small" disabled title="Sign in to change distance"><SlidersHorizontal size={16} /><span>Within {radius} km · Sign in to change</span></button>}
        </div>
        <div className="filter-bar">
          <div className="diet-filters" role="group" aria-label="Food preference">
            {(
              [
                { id: "all", label: "All bites" },
                { id: "veg", label: "Veg", symbol: "◉" },
                { id: "non-veg", label: "Non-veg", symbol: "◉" },
                { id: "egg", label: "Egg", symbol: "◉" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setDiet(item.id)}
                className={`filter ${diet === item.id ? "selected" : ""}`}
                aria-pressed={diet === item.id}
              >
                {"symbol" in item && <span className={`food-dot ${item.id}`}>{item.symbol}</span>}
                {item.label}
              </button>
            ))}
          </div>
          <div className="search-sort">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search stalls or food"
                placeholder="Find a stall or a bite"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sort-field">
              <span>Sort:</span>
              <select
                aria-label="Sort stalls"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="distance">Nearest first</option>
                <option value="rating">Top rated</option>
              </select>
            </label>
          </div>
        </div>
        {!demo && !viewer ? (
          <div className="empty-state">
            <Compass size={36} />
            <h3>Your midnight food trail starts here</h3>
            <p>Sign in to discover stalls and their opening times near your current location.</p>
            <Link href="/login" className="button primary">
              Sign in to explore <ArrowRight size={16} />
            </Link>
          </div>
        ) : !permitted ? (
          <div className="empty-state">
            <LocateFixed size={36} />
            <h3>{location.error || "Let’s find what’s cooking nearby"}</h3>
            <p>
              {location.error
                ? "Allow location in your browser settings, then try again. Your location is needed to show nearby stalls."
                : "HungryOwl uses your current location to find nearby stalls and calculate distances."}
            </p>
            <button
              className="button primary"
              disabled={location.loading}
              onClick={location.request}
            >
              {location.loading ? "Finding your location…" : "Allow location access"}
            </button>
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">
            <AlertCircle size={32} />
            <h3>{error}</h3>
            <button
              className="button secondary"
              onClick={() => location.coordinates && load(location.coordinates)}
            >
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        ) : busy && !stalls.length ? (
          <div className="card-grid" aria-label="Loading stalls" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div className="skeleton-card" key={i} />
            ))}
          </div>
        ) : stalls.length ? (
          <>
            <div className="card-grid">
              {stalls.map((s, i) => (
                <StallCard key={s.id} stall={s} index={i} now={now} />
              ))}
            </div>
            {result.hasMore && !demo && (
              <button
                disabled={busy}
                className="button secondary load-more"
                onClick={() => location.coordinates && load(location.coordinates, offset + 24)}
              >
                {busy ? "Loading…" : "Show more stalls"}
              </button>
            )}
          </>
        ) : (
          <div className="empty-state">
            <Moon size={36} />
            <h3>No nearby stalls found</h3>
            <p>
              Try a wider distance in settings or clear your filters. Approved stalls appear here with their opening times.
            </p>
            <Link href={viewer ? "/settings" : "/login"} className="button secondary">
              Adjust nearby distance
            </Link>
          </div>
        )}
      </section>
      <div className="community-strip">
        <div className="community-icon">
          <Compass size={27} />
        </div>
        <div>
          <h3>Know a late-night hidden gem?</h3>
          <p>Put your favourite little stall on the map for the next night owl.</p>
        </div>
        <Link href="/add" className="text-link">
          Add a stall <ArrowRight size={17} />
        </Link>
      </div>
    </>
  );
}
