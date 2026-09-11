import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HungryOwl",
    short_name: "HungryOwl",
    description: "Bangalore’s late-night food companion",
    start_url: "/",
    display: "standalone",
    background_color: "#111310",
    theme_color: "#111310",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
