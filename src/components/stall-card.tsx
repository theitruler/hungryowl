import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Clock3, MapPin, BadgeCheck, Star } from "lucide-react";
import { DIET_LABELS, type Diet, type Stall } from "@/lib/config";
import { formatTime, formatDistance, isNew } from "@/lib/geo-time";
export function DietLabels({ diets }: { diets: Diet[] }) {
  return (
    <span className="diet-labels">
      {diets.map((diet) => (
        <span key={diet} className={`diet-label ${diet}`}>
          <span className="diet-symbol" aria-hidden="true">
            <i />
          </span>
          {DIET_LABELS[diet]}
        </span>
      ))}
    </span>
  );
}
export function StallCard({ stall, index = 0 }: { stall: Stall; index?: number }) {
  return (
    <Link href={`/stalls/${stall.id}`} className="stall-card">
      <div className={`card-photo crop-${index % 3}`}>
        <Image
          src={stall.photos[0]}
          alt={`${stall.name} food stall`}
          fill
          sizes="(max-width: 650px) 100vw, (max-width: 1100px) 45vw, 30vw"
        />
        <span className="open-badge">
          <span /> Open now
        </span>
        {isNew(stall.approvedAt) && <span className="new-badge">NEW</span>}
        <span className="card-distance">
          <MapPin size={13} /> {formatDistance(stall.distance || 0)} away
        </span>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <h3>{stall.name}</h3>
          <span className={`rating ${stall.rating === null ? "unrated" : ""}`}>
            <Star size={13} fill="currentColor" />
            {stall.rating?.toFixed(1) ?? "N/A"}
          </span>
        </div>
        <p className="card-area">{stall.area}</p>
        <DietLabels diets={stall.diets} />
        <div className="card-hours">
          <Clock3 size={15} />
          <span>
            {formatTime(stall.opensAt)} – {formatTime(stall.closesAt)}
          </span>
          <ArrowUpRight size={17} />
        </div>
        <div className={`verification ${stall.ownerId ? "verified" : ""}`}>
          {stall.ownerId ? (
            <>
              <BadgeCheck size={14} /> Owner verified
            </>
          ) : (
            <>
              <span className="unconfirmed-dot" /> Not confirmed by owner
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
