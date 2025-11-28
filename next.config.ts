import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - turbopack is not yet in the types
    turbopack: {
      root: path.resolve(process.cwd()),
    },
  },
};

export default nextConfig;
