import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
    return [
      { source: "/dashboard/admin", headers: noStore },
      { source: "/dashboard/admin/:path*", headers: noStore },
      { source: "/api/admin/:path*", headers: noStore },
    ];
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            port: "",
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
