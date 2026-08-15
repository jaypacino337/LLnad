import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solanda — claim your plot of the web",
    short_name: "Solanda",
    description:
      "A 64 by 64 grid of web. Claim a plot, name it, point it at your work, and take your place on the map.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e0d",
    theme_color: "#d9a441",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
