"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#111310",
          color: "#f1f1e9",
          fontFamily: "Arial, sans-serif",
          padding: 40,
        }}
      >
        <h1>HungryOwl is taking a quick breather.</h1>
        <p>We couldn’t load your account right now. Please try again shortly.</p>
        <button onClick={reset} style={{ padding: "12px 20px", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
