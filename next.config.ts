import { existsSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

/**
 * Brand assets are detected at build time, so committing the files is all it
 * takes to activate them — no code change, no env var to remember. Checked
 * here (not at runtime) because serverless functions do not reliably see the
 * public directory on their filesystem.
 */
const brandAsset = (file: string) =>
  existsSync(path.join(process.cwd(), "public", "brand", file)) ? "1" : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BRAND_AGENT: brandAsset("agent.png"),
    NEXT_PUBLIC_BRAND_BANNER: brandAsset("banner.png"),
  },
};

export default nextConfig;
