import type { Idea } from "@/types";

/**
 * Mock ideas data with new taxonomy fields (function, industry, target_user)
 */
export const mockIdeas: Idea[] = [
  {
    id: "1",
    title: "AI-Powered Personal Stylist",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBHCMyKKOauM-nfOCXz8C_PB7gfIQfQQ6MqNydPrxlmiH0m_7adMRiHQg_IJJuklha6_zoGus7KW9KzgtqyzRdnBSjPkl8UZ_0n2lwbdFUFF-OcbeovwRGpAjHe_5vIIw_nDLCWhT5H6-qofl6-vlrOABL_vbt5GTAZc0senrGUe0z_ZxAO1yKJdbFTgP4V4p9z6PpRC6YlYUidLKTgXMNZQVt_yZFia9tOF600tUM2dQ1imyYw-lJxxhOqOvZgDUdcFIbKxuZK2wss",
    image_alt: "AI-Powered Personal Stylist UI",
    function_slug: "create",
    industry_slug: "retail",
    target_user_slug: "consumers",
    problem:
      "Users struggle to find clothes that match their style and body type.",
    solution:
      "An app that uses AI to analyze user photos and preferences to recommend outfits from online retailers.",
    target_users: "Fashion-conscious individuals aged 18-35 who shop online.",
    created_at: "2024-01-15T10:00:00Z",
    popularity: 95,
  },
  {
    id: "2",
    title: "HealthPal Nutrition Planner",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD7dW-941O2WLo-vmRoYzPuhCOBxQeiK3bE3RCbFwl5KgmNmfZGaioRCjiEEiIhhvKZnz_sk2aeAXSEMLlJzwwuJ8omlE3X8RAbfmhH8BL3R8E7IXxJ9HVGdvPFDzLOxv2QNpSrYvHNMthacjhpI4CaWnt-KQ_6AAx1cdWAH4ibgIDfH1Zwt4c5Fyx6kWv8dC1mFPY2KtJg0-ss3gD9aXYmc27w_qr2fAoE1vvMIAEfVWumWvrm6SM15S_VTq0SLj_HlGtPDsCM0MOq",
    image_alt: "HealthPal Nutrition Planner UI",
    function_slug: "manage",
    industry_slug: "healthcare",
    target_user_slug: "consumers",
    problem:
      "Creating personalized and healthy meal plans is time-consuming and confusing.",
    solution:
      "A mobile app that generates weekly meal plans based on dietary goals, allergies, and food preferences.",
    target_users:
      "Individuals focused on fitness, weight loss, or managing dietary restrictions.",
    created_at: "2024-01-14T09:00:00Z",
    popularity: 88,
  },
  {
    id: "3",
    title: "DevFlow Code Assistant",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4KGrG20vSRmHIMHFVDOpCwjMe6CzhvUOkWkhmxGoB8kNY-0iBRuiN1CEGBSjRqg1XKtE9DpF3z5CUqxS3dgFM7XdlkoZ698tWp_eZqxrlHbtFZCvCBifwKtkMd4aD67RFFUWF_0PG_3pBxmMCnyiwv61oqAwSjYbUgMwjzFHWtRNn4kL-l3zfBbKzQAutc1FrQ2YCUG9BjQfBb-15CL7EWvcT9xIwizu6uwjm7mW3JJp7fV5GGTmfG77vhqJCfbw3WhOg56hc_lxY",
    image_alt: "DevFlow Code Assistant UI",
    function_slug: "create",
    industry_slug: "technology",
    target_user_slug: "developers",
    problem:
      "Developers spend too much time on boilerplate code and debugging common errors.",
    solution:
      "A smart IDE plugin that provides contextual code completions, refactoring suggestions, and automated bug detection.",
    target_users:
      "Software developers and engineering teams looking to boost productivity.",
    created_at: "2024-01-13T08:00:00Z",
    popularity: 92,
  },
  {
    id: "4",
    title: "PocketFinance Tracker",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDh8l7C6vBtrSSRWA09CWYwJXFn-C3DPQF1ixHGCl5_Yk1-T08JntxntZMuKXaR-vM4ZLAb0793YOfrplq3VDoa6aS-ub-WEqZq1GBsBeldEWovbQuFPjKdDqkivnNemxWwlRZjXDUjXJzGTCD9Pds83OgLBKMNSVsow6Bq_r1TGOr-2TXg0k425tnFSksWzpu3p1ZybupqHTuqrS3ly0cpJAf_daeYqUo26bR2uMv_q35c4RjveOROawf71ut7BQemo32K_24R9gSW",
    image_alt: "PocketFinance Tracker UI",
    function_slug: "analyze",
    industry_slug: "finance",
    target_user_slug: "consumers",
    problem:
      "Young adults find personal finance and budgeting overwhelming and difficult to manage.",
    solution:
      "An intuitive app that gamifies saving, automates expense tracking, and offers simple investment advice.",
    target_users:
      "Millennials and Gen Z looking to improve their financial literacy and habits.",
    created_at: "2024-01-12T07:00:00Z",
    popularity: 85,
  },
  {
    id: "5",
    title: "LearnSphere VR Classroom",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDl8UGv7fWl4ryoRSPweN_Ad58OO3n2eVn4bURDm_8uP25-rZ5M4tt2pngxtA6rqIWtf0G-zalN6mimqpaYoLU3b2O9eEFPZtrcVa_w9ycmbDXALEJZFVja7onCbx9Zj7qT56OrOEAsG3tqrsXj5iGC0LEnKo5hQTSVR_Gh96x21ysG6HSS2Z4uy3puuR5wxAgLrsg23USWVdmnftSj5I2MFGLUMQzY8dF3gZAJ14naQKt_8g-7spfqcACPtKRBvJTYbgXULvm1BDgF",
    image_alt: "LearnSphere VR Classroom UI",
    function_slug: "learn",
    industry_slug: "education",
    target_user_slug: "students",
    problem:
      "Online learning can be disengaging and lacks the immersive quality of in-person classes.",
    solution:
      "A virtual reality platform for interactive lessons, virtual field trips, and collaborative student projects.",
    target_users:
      "Educational institutions and corporate training programs seeking innovative teaching methods.",
    created_at: "2024-01-10T05:00:00Z",
    popularity: 82,
  },
];
