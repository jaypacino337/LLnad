import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone: a self-contained server with only the node_modules
  // it actually uses, which is what the Docker image ships.
  output: "standalone",

  // The register is written from route handlers, so responses must never be
  // served from a shared cache with a stale claim count.
  poweredByHeader: false,
};

export default nextConfig;
