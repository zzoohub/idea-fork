import type { NextConfig } from "next";

// Security headers applied to every response.
// These are defence-in-depth controls that remain relevant even while the
// app uses mock data; they must be in place before real auth / payments land.
const securityHeaders = [
  // Prevent the browser from MIME-sniffing responses away from the declared
  // Content-Type, which can turn benign downloads into executable scripts.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Deny framing of any Mealio page to block clickjacking.
  { key: "X-Frame-Options", value: "DENY" },

  // Restrict the Referer header to the origin only when navigating to
  // external sites, preventing source URLs from leaking sensitive path info.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Limit browser features to what the UI actually needs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
