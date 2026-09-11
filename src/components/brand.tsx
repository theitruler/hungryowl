import Image from "next/image";
import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="HungryOwl home">
      <Image
        className="brand-logo"
        src="/images/hungryowl-logo.png"
        width={1254}
        height={1254}
        sizes="(max-width: 760px) 92px, 168px"
        alt=""
      />
    </Link>
  );
}
