"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoCarousel({ photos, name }: { photos: string[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  function goTo(index: number) {
    const element = track.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  }
  return (
    <section className="photo-carousel" aria-label={`${name} photos`} aria-roledescription="carousel">
      <div
        ref={track}
        className="carousel-track"
        tabIndex={0}
        aria-label="Stall photos. Swipe or use arrow keys to change photos."
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.clientWidth) setActive(Math.round(element.scrollLeft / element.clientWidth));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            goTo(Math.max(0, Math.min(photos.length - 1, active + (event.key === "ArrowRight" ? 1 : -1))));
          }
        }}
      >
        {photos.map((photo, index) => (
          <div className="carousel-photo" key={`${photo}-${index}`} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${photos.length}`}>
            <Image src={photo} alt={`${name}, photo ${index + 1}`} fill sizes="(max-width: 760px) 100vw, 80vw" priority={index === 0} unoptimized={photo.startsWith("/api/")} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="carousel-controls">
          <button type="button" className="icon-button" disabled={active === 0} onClick={() => goTo(active - 1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
          <div className="carousel-dots">
            {photos.map((_, index) => <button type="button" key={index} className={active === index ? "active" : ""} aria-label={`Show photo ${index + 1}`} aria-current={active === index ? "true" : undefined} onClick={() => goTo(index)}><span /></button>)}
          </div>
          <span aria-live="polite">Photo {active + 1} of {photos.length}</span>
          <button type="button" className="icon-button" disabled={active === photos.length - 1} onClick={() => goTo(active + 1)} aria-label="Next photo"><ChevronRight size={20} /></button>
        </div>
      )}
    </section>
  );
}
