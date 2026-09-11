import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>This spot isn’t on our map.</h1>
      <p>The listing may be unavailable or you may not have access to it.</p>
      <Link className="button primary" href="/">
        Back to exploring
      </Link>
    </div>
  );
}
