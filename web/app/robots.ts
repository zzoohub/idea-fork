import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mealio.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/bookmarks", "/tracking"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
