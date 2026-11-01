import type { NextConfig } from "next";

function supabaseImageHost() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!raw) {
    return null;
  }

  try {
    const hostname = new URL(raw).hostname;
    return hostname.endsWith(".supabase.co") ? hostname : null;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHost();

const nextConfig: NextConfig = {
  images: supabaseHost
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
