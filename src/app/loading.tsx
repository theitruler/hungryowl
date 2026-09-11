export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading HungryOwl">
      <div className="skeleton-card" style={{ height: 90, marginBottom: 25 }} />
      <div className="skeleton-card" style={{ height: 280 }} />
    </div>
  );
}
