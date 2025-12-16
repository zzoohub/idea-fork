import type { Idea } from "@/types";

/**
 * Mock ideas data matching the HTML mockup exactly
 */
export const mockIdeas: Idea[] = [
  {
    id: "1",
    title: "AI-Powered Personal Stylist",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBHCMyKKOauM-nfOCXz8C_PB7gfIQfQQ6MqNydPrxlmiH0m_7adMRiHQg_IJJuklha6_zoGus7KW9KzgtqyzRdnBSjPkl8UZ_0n2lwbdFUFF-OcbeovwRGpAjHe_5vIIw_nDLCWhT5H6-qofl6-vlrOABL_vbt5GTAZc0senrGUe0z_ZxAO1yKJdbFTgP4V4p9z6PpRC6YlYUidLKTgXMNZQVt_yZFia9tOF600tUM2dQ1imyYw-lJxxhOqOvZgDUdcFIbKxuZK2wss",
    imageAlt: "AI-Powered Personal Stylist UI",
    categories: [
      { label: "AI", variant: "primary" },
      { label: "E-commerce", variant: "teal" },
    ],
    problem:
      "Users struggle to find clothes that match their style and body type.",
    solution:
      "An app that uses AI to analyze user photos and preferences to recommend outfits from online retailers.",
    targetUsers:
      "Fashion-conscious individuals aged 18-35 who shop online.",
    createdAt: "2024-01-15T10:00:00Z",
    popularity: 95,
  },
  {
    id: "2",
    title: "HealthPal Nutrition Planner",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD7dW-941O2WLo-vmRoYzPuhCOBxQeiK3bE3RCbFwl5KgmNmfZGaioRCjiEEiIhhvKZnz_sk2aeAXSEMLlJzwwuJ8omlE3X8RAbfmhH8BL3R8E7IXxJ9HVGdvPFDzLOxv2QNpSrYvHNMthacjhpI4CaWnt-KQ_6AAx1cdWAH4ibgIDfH1Zwt4c5Fyx6kWv8dC1mFPY2KtJg0-ss3gD9aXYmc27w_qr2fAoE1vvMIAEfVWumWvrm6SM15S_VTq0SLj_HlGtPDsCM0MOq",
    imageAlt: "HealthPal Nutrition Planner UI",
    categories: [
      { label: "HealthTech", variant: "primary" },
      { label: "Mobile App", variant: "orange" },
    ],
    problem:
      "Creating personalized and healthy meal plans is time-consuming and confusing.",
    solution:
      "A mobile app that generates weekly meal plans based on dietary goals, allergies, and food preferences.",
    targetUsers:
      "Individuals focused on fitness, weight loss, or managing dietary restrictions.",
    createdAt: "2024-01-14T09:00:00Z",
    popularity: 88,
  },
  {
    id: "3",
    title: "DevFlow Code Assistant",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4KGrG20vSRmHIMHFVDOpCwjMe6CzhvUOkWkhmxGoB8kNY-0iBRuiN1CEGBSjRqg1XKtE9DpF3z5CUqxS3dgFM7XdlkoZ698tWp_eZqxrlHbtFZCvCBifwKtkMd4aD67RFFUWF_0PG_3pBxmMCnyiwv61oqAwSjYbUgMwjzFHWtRNn4kL-l3zfBbKzQAutc1FrQ2YCUG9BjQfBb-15CL7EWvcT9xIwizu6uwjm7mW3JJp7fV5GGTmfG77vhqJCfbw3WhOg56hc_lxY",
    imageAlt: "DevFlow Code Assistant UI",
    categories: [
      { label: "Developer Tools", variant: "primary" },
      { label: "SaaS", variant: "indigo" },
    ],
    problem:
      "Developers spend too much time on boilerplate code and debugging common errors.",
    solution:
      "A smart IDE plugin that provides contextual code completions, refactoring suggestions, and automated bug detection.",
    targetUsers:
      "Software developers and engineering teams looking to boost productivity.",
    createdAt: "2024-01-13T08:00:00Z",
    popularity: 92,
  },
  {
    id: "4",
    title: "PocketFinance Tracker",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDh8l7C6vBtrSSRWA09CWYwJXFn-C3DPQF1ixHGCl5_Yk1-T08JntxntZMuKXaR-vM4ZLAb0793YOfrplq3VDoa6aS-ub-WEqZq1GBsBeldEWovbQuFPjKdDqkivnNemxWwlRZjXDUjXJzGTCD9Pds83OgLBKMNSVsow6Bq_r1TGOr-2TXg0k425tnFSksWzpu3p1ZybupqHTuqrS3ly0cpJAf_daeYqUo26bR2uMv_q35c4RjveOROawf71ut7BQemo32K_24R9gSW",
    imageAlt: "PocketFinance Tracker UI",
    categories: [
      { label: "FinTech", variant: "primary" },
      { label: "Mobile App", variant: "orange" },
    ],
    problem:
      "Young adults find personal finance and budgeting overwhelming and difficult to manage.",
    solution:
      "An intuitive app that gamifies saving, automates expense tracking, and offers simple investment advice.",
    targetUsers:
      "Millennials and Gen Z looking to improve their financial literacy and habits.",
    createdAt: "2024-01-12T07:00:00Z",
    popularity: 85,
  },
  {
    id: "5",
    title: "EcoRoute Delivery Optimizer",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBxcioLppUHOktql95DkumCRS24uh-5HMKZeNkhmGSK1-4RHfSUyryAgQ6B3ZT0POKDiuNSbr_4wNYvmyaOxUBi38s29ms8aEZzEusDkU3bCHwEhWeqdLNrldwyZ2HUjF-kL05jn4tSu4WOLUnOORlSLDyEA3wgNDOgl1PEku30QJQdZDqDFO1oYkuvSkQTlrA679ELN1vHdtTZMX0NTP4_-yMLNqsYofCpHY9iirfP8AL_ZvGym6iKVTjAKgGaXPjWPrKUasBTDDIZ",
    imageAlt: "EcoRoute Delivery Optimizer UI",
    categories: [
      { label: "Logistics", variant: "primary" },
      { label: "SaaS", variant: "indigo" },
    ],
    problem:
      "Delivery businesses face high fuel costs and carbon emissions due to inefficient routing.",
    solution:
      "AI-powered software that calculates the most fuel-efficient routes in real-time based on traffic and delivery schedules.",
    targetUsers:
      "Small to medium-sized logistics companies and e-commerce businesses with local delivery fleets.",
    createdAt: "2024-01-11T06:00:00Z",
    popularity: 78,
  },
  {
    id: "6",
    title: "LearnSphere VR Classroom",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDl8UGv7fWl4ryoRSPweN_Ad58OO3n2eVn4bURDm_8uP25-rZ5M4tt2pngxtA6rqIWtf0G-zalN6mimqpaYoLU3b2O9eEFPZtrcVa_w9ycmbDXALEJZFVja7onCbx9Zj7qT56OrOEAsG3tqrsXj5iGC0LEnKo5hQTSVR_Gh96x21ysG6HSS2Z4uy3puuR5wxAgLrsg23USWVdmnftSj5I2MFGLUMQzY8dF3gZAJ14naQKt_8g-7spfqcACPtKRBvJTYbgXULvm1BDgF",
    imageAlt: "LearnSphere VR Classroom UI",
    categories: [
      { label: "EdTech", variant: "primary" },
      { label: "VR", variant: "teal" },
    ],
    problem:
      "Online learning can be disengaging and lacks the immersive quality of in-person classes.",
    solution:
      "A virtual reality platform for interactive lessons, virtual field trips, and collaborative student projects.",
    targetUsers:
      "Educational institutions and corporate training programs seeking innovative teaching methods.",
    createdAt: "2024-01-10T05:00:00Z",
    popularity: 82,
  },
];
