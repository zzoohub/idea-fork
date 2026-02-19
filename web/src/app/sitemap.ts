import type { MetadataRoute } from "next";
import { mockBriefDetails, mockNeedDetails } from "@/lib/mock-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mealio.app";

  const briefUrls = mockBriefDetails.map((brief) => ({
    url: `${baseUrl}/briefs/${brief.id}`,
    lastModified: new Date(brief.cycleDate),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const needUrls = mockNeedDetails.map((need) => ({
    url: `${baseUrl}/needs/${need.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/briefs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...briefUrls,
    ...needUrls,
  ];
}
