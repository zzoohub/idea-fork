import type {
  FeedPost,
  Brief,
  BriefDetail,
  Product,
  ProductDetail,
} from "@/shared/types";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

export const mockFeedPosts: FeedPost[] = [
  {
    id: "fp-1",
    platform: "reddit",
    platformSubSource: "r/SaaS",
    title: "Why is every invoicing tool so bloated and expensive for freelancers?",
    excerpt:
      "I just want to send an invoice and get paid. Why do I need to pay $30/mo for features I'll never use? Every tool assumes I'm running a 50-person company.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/SaaS/example1",
    upvotes: 142,
    comments: 47,
    createdAt: hoursAgo(2),
    relatedBriefId: "brief-1",
  },
  {
    id: "fp-2",
    platform: "playstore",
    platformSubSource: "Google Play",
    title: "Can't export my data. Stuck in this app with no way out.",
    excerpt:
      "Been using this for 6 months and now I want to switch. There's no export option at all. My data is trapped. This should be illegal.",
    tag: "need",
    sourceUrl: "https://play.google.com/store/apps/example2",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 38,
    createdAt: hoursAgo(5),
    relatedBriefId: "brief-2",
  },
  {
    id: "fp-3",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "The onboarding flow took me 20 minutes just to see the product",
    excerpt:
      "I signed up excited to try this, but the onboarding had 8 steps, asked for my company size, industry, and made me watch a video. I just wanted to see the dashboard.",
    tag: "complaint",
    sourceUrl: "https://producthunt.com/posts/example3",
    upvotes: 23,
    comments: 12,
    createdAt: hoursAgo(8),
  },
  {
    id: "fp-4",
    platform: "reddit",
    platformSubSource: "r/freelance",
    title: "I just want to send an invoice without learning accounting",
    excerpt:
      "Every invoicing app I try wants me to set up chart of accounts, tax categories, and payment terms. I'm a freelance designer. I send 3 invoices a month.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/freelance/example4",
    upvotes: 89,
    comments: 31,
    createdAt: hoursAgo(12),
    relatedBriefId: "brief-1",
  },
  {
    id: "fp-5",
    platform: "appstore",
    platformSubSource: "App Store",
    title: "Terrible app. Can't even set recurring invoices.",
    excerpt:
      "3 stars because recurring billing is missing. I have retainer clients and have to manually create the same invoice every month. Basic feature that's missing.",
    tag: "complaint",
    sourceUrl: "https://apps.apple.com/app/example5",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 15,
    createdAt: daysAgo(1),
    relatedBriefId: "brief-1",
  },
  {
    id: "fp-6",
    platform: "reddit",
    platformSubSource: "r/Entrepreneur",
    title: "Switched from FreshBooks because the pricing tripled",
    excerpt:
      "Was paying $15/mo, now they want $45 for the same features. Looking for alternatives that won't pull a bait-and-switch on pricing after I'm locked in.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/Entrepreneur/example6",
    upvotes: 67,
    comments: 28,
    createdAt: daysAgo(1),
    relatedBriefId: "brief-1",
  },
  {
    id: "fp-7",
    platform: "reddit",
    platformSubSource: "r/webdev",
    title: "Why can't I deploy a simple static site without a PhD in DevOps?",
    excerpt:
      "I have an HTML file, some CSS, and a bit of JS. Why do I need Docker, Kubernetes, and a CI/CD pipeline? The deployment story for simple sites is broken.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/webdev/example7",
    upvotes: 234,
    comments: 89,
    createdAt: hoursAgo(3),
    relatedBriefId: "brief-3",
  },
  {
    id: "fp-8",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "Need a simple way to collect customer feedback without a huge tool",
    excerpt:
      "Tried Canny, UserVoice, and Productboard. All overkill for a 2-person startup. I just want a simple widget where users can submit ideas and vote.",
    tag: "need",
    sourceUrl: "https://producthunt.com/posts/example8",
    upvotes: 45,
    comments: 18,
    createdAt: hoursAgo(6),
    relatedBriefId: "brief-4",
  },
  {
    id: "fp-9",
    platform: "playstore",
    platformSubSource: "Google Play",
    title: "Please add dark mode. My eyes hurt using this at night.",
    excerpt:
      "I use this app before bed to plan meals for the week. The bright white screen is painful. Every other app has dark mode now. This is a basic feature.",
    tag: "feature-request",
    sourceUrl: "https://play.google.com/store/apps/example9",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 52,
    createdAt: hoursAgo(10),
  },
  {
    id: "fp-10",
    platform: "reddit",
    platformSubSource: "r/smallbusiness",
    title: "CRM tools are designed for enterprise sales teams, not small businesses",
    excerpt:
      "I don't have a 'pipeline' or 'deal stages'. I have 30 regular customers I want to keep track of. Every CRM wants me to pretend I'm running Salesforce.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/smallbusiness/example10",
    upvotes: 178,
    comments: 56,
    createdAt: hoursAgo(4),
    relatedBriefId: "brief-5",
  },
  {
    id: "fp-11",
    platform: "reddit",
    platformSubSource: "r/SaaS",
    title: "Auth is the worst part of building any new project",
    excerpt:
      "I've spent more time implementing auth flows than building actual features. OAuth, JWT, session management, password reset — it's the same boring problem every time.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/SaaS/example11",
    upvotes: 312,
    comments: 124,
    createdAt: hoursAgo(1),
  },
  {
    id: "fp-12",
    platform: "appstore",
    platformSubSource: "App Store",
    title: "Syncing between devices is completely broken",
    excerpt:
      "I add items on my phone and they don't show up on iPad for hours. Sometimes they never sync. What's the point of a cloud app that doesn't sync?",
    tag: "complaint",
    sourceUrl: "https://apps.apple.com/app/example12",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 29,
    createdAt: daysAgo(2),
    relatedBriefId: "brief-6",
  },
  {
    id: "fp-13",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "Would love a lightweight project management tool for solo founders",
    excerpt:
      "Notion is too flexible (analysis paralysis), Linear is too team-focused, Trello feels outdated. Something between a todo list and full PM tool for solopreneurs.",
    tag: "need",
    sourceUrl: "https://producthunt.com/posts/example13",
    upvotes: 67,
    comments: 34,
    createdAt: hoursAgo(14),
  },
  {
    id: "fp-14",
    platform: "reddit",
    platformSubSource: "r/startups",
    title: "Landing page builders are either too simple or too complex",
    excerpt:
      "Carrd can't handle anything beyond a single page. Webflow requires a design degree. Where's the middle ground for a developer who wants to ship fast?",
    tag: "need",
    sourceUrl: "https://reddit.com/r/startups/example14",
    upvotes: 156,
    comments: 72,
    createdAt: hoursAgo(7),
  },
  {
    id: "fp-15",
    platform: "playstore",
    platformSubSource: "Google Play",
    title: "App crashes every time I try to upload a photo",
    excerpt:
      "Updated to the latest version and now photo uploads crash the app. Tried reinstalling. Same issue. Can't use the core feature of the app.",
    tag: "complaint",
    sourceUrl: "https://play.google.com/store/apps/example15",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 44,
    createdAt: daysAgo(1),
  },
  {
    id: "fp-16",
    platform: "reddit",
    platformSubSource: "r/nocode",
    title: "No-code tools break the moment you need anything custom",
    excerpt:
      "Built my whole app in Bubble, then hit a wall when I needed a custom integration. Now I have to rebuild everything. The 'code escape hatch' is a myth.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/nocode/example16",
    upvotes: 201,
    comments: 67,
    createdAt: hoursAgo(9),
  },
  {
    id: "fp-17",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "Feature request: Allow scheduling posts across time zones",
    excerpt:
      "My audience is split across US and EU. I want to schedule the same post at 9am local time for both regions without creating duplicate entries.",
    tag: "feature-request",
    sourceUrl: "https://producthunt.com/posts/example17",
    upvotes: 34,
    comments: 8,
    createdAt: hoursAgo(11),
  },
  {
    id: "fp-18",
    platform: "reddit",
    platformSubSource: "r/analytics",
    title: "Google Analytics 4 is a nightmare compared to Universal Analytics",
    excerpt:
      "Who designed this UI? I can't find basic pageview data without creating a custom report. The migration was forced and the product got worse.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/analytics/example18",
    upvotes: 445,
    comments: 187,
    createdAt: hoursAgo(5),
    relatedBriefId: "brief-7",
  },
  {
    id: "fp-19",
    platform: "appstore",
    platformSubSource: "App Store",
    title: "Please add Apple Watch support for quick capture",
    excerpt:
      "I get ideas throughout the day and want to quickly dictate them to my watch. Having to pull out my phone breaks the flow. All the competitor apps have this.",
    tag: "feature-request",
    sourceUrl: "https://apps.apple.com/app/example19",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 67,
    createdAt: daysAgo(3),
  },
  {
    id: "fp-20",
    platform: "reddit",
    platformSubSource: "r/SaaS",
    title: "Why do all pricing pages hide the actual price?",
    excerpt:
      "Contact sales, book a demo, get a quote. I just want to know if your product costs $10 or $10,000. Hiding pricing is a red flag.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/SaaS/example20",
    upvotes: 567,
    comments: 234,
    createdAt: hoursAgo(3),
  },
  {
    id: "fp-21",
    platform: "playstore",
    platformSubSource: "Google Play",
    title: "Notifications are completely unreliable",
    excerpt:
      "I miss important reminders because notifications just don't show up. I've checked all the battery optimization settings. The app just doesn't send them reliably.",
    tag: "complaint",
    sourceUrl: "https://play.google.com/store/apps/example21",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 33,
    createdAt: hoursAgo(16),
  },
  {
    id: "fp-22",
    platform: "reddit",
    platformSubSource: "r/webdev",
    title: "Need a dead simple email sending service for transactional emails",
    excerpt:
      "SendGrid's UI is a labyrinth. AWS SES requires a PhD. I want to send a welcome email and a password reset. That's it. Why is this so hard?",
    tag: "need",
    sourceUrl: "https://reddit.com/r/webdev/example22",
    upvotes: 198,
    comments: 76,
    createdAt: hoursAgo(6),
  },
  {
    id: "fp-23",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "Love the concept but the mobile experience is terrible",
    excerpt:
      "Desktop app is great, but the mobile version is just a shrunken desktop layout. Buttons are tiny, text is hard to read. Need a proper mobile redesign.",
    tag: "complaint",
    sourceUrl: "https://producthunt.com/posts/example23",
    upvotes: 19,
    comments: 7,
    createdAt: daysAgo(2),
  },
  {
    id: "fp-24",
    platform: "reddit",
    platformSubSource: "r/Entrepreneur",
    title: "All the simple habit trackers got acquired and ruined",
    excerpt:
      "Streaks got complicated, Habitica became a game, and every new one wants a subscription. I just want to check off 5 daily habits. That's literally it.",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/Entrepreneur/example24",
    upvotes: 123,
    comments: 45,
    createdAt: hoursAgo(13),
  },
  {
    id: "fp-25",
    platform: "appstore",
    platformSubSource: "App Store",
    title: "Backup feature doesn't actually restore properly",
    excerpt:
      "Created a backup, reset my phone, tried to restore. Half my data was missing. The backup feature is either broken or doesn't back up everything it claims to.",
    tag: "complaint",
    sourceUrl: "https://apps.apple.com/app/example25",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 21,
    createdAt: daysAgo(4),
  },
  {
    id: "fp-26",
    platform: "reddit",
    platformSubSource: "r/SaaS",
    title: "Looking for a simple way to accept payments without Stripe complexity",
    excerpt:
      "Stripe is powerful but overkill for selling a single digital product. I just want a buy button and a Stripe-like experience without the dashboard complexity.",
    tag: "need",
    sourceUrl: "https://reddit.com/r/SaaS/example26",
    upvotes: 89,
    comments: 41,
    createdAt: hoursAgo(15),
  },
  {
    id: "fp-27",
    platform: "producthunt",
    platformSubSource: "Product Hunt",
    title: "AI features feel bolted on. Not actually useful.",
    excerpt:
      "Every app is adding 'AI' features that nobody asked for. The AI suggestions are generic and unhelpful. Focus on making the core product work better.",
    tag: "complaint",
    sourceUrl: "https://producthunt.com/posts/example27",
    upvotes: 78,
    comments: 42,
    createdAt: hoursAgo(4),
  },
  {
    id: "fp-28",
    platform: "playstore",
    platformSubSource: "Google Play",
    title: "Offline mode doesn't actually work offline",
    excerpt:
      "The app claims offline support but shows a loading spinner when I'm without internet. Downloaded content for my flight and couldn't access any of it.",
    tag: "complaint",
    sourceUrl: "https://play.google.com/store/apps/example28",
    upvotes: 0,
    comments: 0,
    helpfulVotes: 57,
    createdAt: hoursAgo(18),
  },
  {
    id: "fp-29",
    platform: "reddit",
    platformSubSource: "r/startups",
    title: "Customer support tools are insanely expensive for early-stage startups",
    excerpt:
      "Intercom wants $300/mo, Zendesk $150/mo. I have 50 customers. I just need a shared inbox with basic ticket tracking. Why does this cost more than my server?",
    tag: "complaint",
    sourceUrl: "https://reddit.com/r/startups/example29",
    upvotes: 234,
    comments: 98,
    createdAt: hoursAgo(7),
    relatedBriefId: "brief-8",
  },
  {
    id: "fp-30",
    platform: "reddit",
    platformSubSource: "r/webdev",
    title: "Form builders can't handle conditional logic without getting messy",
    excerpt:
      "Typeform charges a fortune, Google Forms is too basic, and everything in between falls apart when you need show/hide logic based on previous answers.",
    tag: "need",
    sourceUrl: "https://reddit.com/r/webdev/example30",
    upvotes: 145,
    comments: 63,
    createdAt: hoursAgo(10),
  },
  {
    id: "fp-31",
    platform: "github",
    platformSubSource: "GitHub Trending",
    title: "Open-source invoicing tool gaining traction",
    excerpt:
      "A new open-source invoicing CLI tool just hit 2K stars in a week. Simple YAML config, generates PDF invoices, and integrates with Stripe for payments.",
    tag: "discussion",
    sourceUrl: "https://github.com/example/simple-invoice",
    upvotes: 2100,
    comments: 45,
    createdAt: hoursAgo(4),
    relatedBriefId: "brief-1",
  },
  {
    id: "fp-32",
    platform: "github",
    platformSubSource: "GitHub Trending",
    title: "Self-hosted alternative to Intercom with 5K stars",
    excerpt:
      "Open-source customer support platform built with Elixir. Live chat, shared inbox, and basic analytics. Self-host for free or use their cloud at $29/mo.",
    tag: "discussion",
    sourceUrl: "https://github.com/example/open-support",
    upvotes: 5200,
    comments: 128,
    createdAt: hoursAgo(6),
    relatedBriefId: "brief-8",
  },
  {
    id: "fp-33",
    platform: "github",
    platformSubSource: "GitHub Trending",
    title: "Zero-config deployment tool for static sites",
    excerpt:
      "Drop your HTML/CSS/JS folder and get a live URL. No Docker, no CI/CD. Just works. Built in Rust, deploys to Cloudflare Workers under the hood.",
    tag: "discussion",
    sourceUrl: "https://github.com/example/deploy-simple",
    upvotes: 3400,
    comments: 67,
    createdAt: hoursAgo(2),
    relatedBriefId: "brief-3",
  },
];

export const ALL_FEED_TAGS = [
  ...new Set(mockFeedPosts.map((p) => p.tag)),
] as const;

export const mockBriefs: Brief[] = [
  {
    id: "brief-1",
    title: "Invoicing Pain Points for Freelancers",
    summary:
      "Freelancers are frustrated with bloated, expensive invoicing tools that don't handle recurring billing well. There is a clear gap for a simple, affordable solution.",
    postCount: 83,
    platforms: ["reddit", "appstore"],
    recencyLabel: "Last 30 days",
    tags: ["SaaS", "invoicing", "freelancer"],
  },
  {
    id: "brief-2",
    title: "Dashboard Export Limitations Across Tools",
    summary:
      "Users can't export dashboards in useful formats. PDF and CSV are inadequate for the analysis workflows users need.",
    postCount: 61,
    platforms: ["reddit", "producthunt"],
    recencyLabel: "Last 30 days",
    tags: ["SaaS", "export", "analytics"],
  },
  {
    id: "brief-3",
    title: "Simple Deployment for Non-DevOps Developers",
    summary:
      "Developers want to deploy simple websites without learning Docker, Kubernetes, or complex CI/CD pipelines. The gap between FTP and modern infra is too large.",
    postCount: 54,
    platforms: ["reddit", "producthunt", "github"],
    recencyLabel: "Last 14 days",
    tags: ["DevTools", "deployment"],
  },
  {
    id: "brief-4",
    title: "Lightweight Customer Feedback Collection",
    summary:
      "Small teams need a feedback widget that's simpler than Canny or UserVoice. Current tools are designed for enterprise product teams, not 2-person startups.",
    postCount: 47,
    platforms: ["producthunt", "reddit"],
    recencyLabel: "Last 30 days",
    tags: ["SaaS", "feedback"],
  },
  {
    id: "brief-5",
    title: "CRM for Small Businesses, Not Enterprise",
    summary:
      "Small business owners want to track 30 customers, not manage a sales pipeline. Every CRM assumes enterprise workflows.",
    postCount: 42,
    platforms: ["reddit"],
    recencyLabel: "Last 30 days",
    tags: ["SaaS", "CRM"],
  },
  {
    id: "brief-6",
    title: "Cross-Device Sync Reliability Issues",
    summary:
      "Users consistently report that cloud-synced apps fail to sync reliably between devices, leading to data loss and trust erosion.",
    postCount: 38,
    platforms: ["appstore", "playstore"],
    recencyLabel: "Last 14 days",
    tags: ["Mobile", "sync"],
  },
  {
    id: "brief-7",
    title: "Analytics Tool Usability Regression",
    summary:
      "GA4 migration frustration signals broader demand for simpler analytics. Users want pageview data without building custom reports.",
    postCount: 35,
    platforms: ["reddit"],
    recencyLabel: "Last 7 days",
    tags: ["SaaS", "analytics"],
  },
  {
    id: "brief-8",
    title: "Affordable Customer Support for Startups",
    summary:
      "Early-stage startups find Intercom and Zendesk prohibitively expensive. They need shared inbox + basic ticketing at a fraction of the price.",
    postCount: 31,
    platforms: ["reddit", "producthunt", "github"],
    recencyLabel: "Last 30 days",
    tags: ["SaaS", "support"],
  },
];

export const mockBriefDetails: BriefDetail[] = [
  {
    id: "brief-1",
    title: "Invoicing Pain Points for Freelancers",
    postCount: 83,
    platforms: ["reddit", "appstore"],
    recencyLabel: "Active last 30 days",
    tags: ["SaaS", "invoicing", "freelancer"],
    sections: [
      {
        heading: "Problem",
        body: "Freelancers consistently report that existing invoicing tools require too much configuration. [1][2] The most common complaint is the lack of recurring invoice templates. [3][4][5] Pricing has also become a major friction point, with multiple tools tripling prices on legacy plans.",
      },
      {
        heading: "Demand Signals",
        body: "83 posts across Reddit and App Store. 78% negative sentiment. Growing: 15 new posts in last 7 days.",
      },
    ],
    suggestedDirections: [
      "Minimal invoicing tool focused on recurring templates for solo freelancers",
      "Invoice plugin/extension for existing tools that simplifies the setup flow",
    ],
    sourceEvidence: [
      {
        id: "se-1",
        platform: "reddit",
        excerpt: "Why is every invoicing tool so bloated and expensive for freelancers?",
        platformSubSource: "r/SaaS",
        sourceUrl: "https://reddit.com/r/SaaS/example1",
        upvotes: 142,
        createdAt: hoursAgo(2),
      },
      {
        id: "se-2",
        platform: "reddit",
        excerpt: "I just want to send an invoice without learning accounting",
        platformSubSource: "r/freelance",
        sourceUrl: "https://reddit.com/r/freelance/example4",
        upvotes: 89,
        createdAt: hoursAgo(12),
      },
      {
        id: "se-3",
        platform: "appstore",
        excerpt: "Terrible app. Can't even set recurring invoices.",
        platformSubSource: "App Store",
        sourceUrl: "https://apps.apple.com/app/example5",
        helpfulVotes: 15,
        createdAt: daysAgo(1),
      },
      {
        id: "se-4",
        platform: "reddit",
        excerpt: "Switched from FreshBooks because the pricing tripled",
        platformSubSource: "r/Entrepreneur",
        sourceUrl: "https://reddit.com/r/Entrepreneur/example6",
        upvotes: 67,
        createdAt: daysAgo(1),
      },
      {
        id: "se-5",
        platform: "appstore",
        excerpt: "3 stars because recurring billing is missing entirely",
        platformSubSource: "App Store",
        sourceUrl: "https://apps.apple.com/app/example5b",
        helpfulVotes: 8,
        createdAt: daysAgo(3),
      },
    ],
    relatedBriefs: [
      { id: "brief-2", title: "Dashboard Export Limitations Across Tools", postCount: 61 },
      { id: "brief-5", title: "CRM for Small Businesses, Not Enterprise", postCount: 42 },
    ],
  },
  {
    id: "brief-2",
    title: "Dashboard Export Limitations Across Tools",
    postCount: 61,
    platforms: ["reddit", "producthunt"],
    recencyLabel: "Active last 30 days",
    tags: ["SaaS", "export", "analytics"],
    sections: [
      {
        heading: "Problem",
        body: "61 users across Reddit and Product Hunt report inability to export dashboard data in useful formats. [1][2] Most tools only offer PDF or basic CSV, which lose formatting and relationships.",
      },
      {
        heading: "Demand Signals",
        body: "61 posts across 2 platforms. Stable volume over the past month.",
      },
    ],
    suggestedDirections: [
      "Dashboard export tool that preserves formatting and relationships in Excel/Google Sheets",
      "API-first dashboard platform with native export in multiple formats",
    ],
    sourceEvidence: [
      {
        id: "se-6",
        platform: "reddit",
        excerpt: "Why can't any dashboard tool export to a proper spreadsheet format?",
        platformSubSource: "r/analytics",
        sourceUrl: "https://reddit.com/r/analytics/example-export1",
        upvotes: 89,
        createdAt: daysAgo(2),
      },
      {
        id: "se-7",
        platform: "producthunt",
        excerpt: "Love the dashboards, but exporting is useless. PDF loses all interactivity.",
        platformSubSource: "Product Hunt",
        sourceUrl: "https://producthunt.com/posts/example-export2",
        upvotes: 34,
        createdAt: daysAgo(3),
      },
    ],
    relatedBriefs: [
      { id: "brief-1", title: "Invoicing Pain Points for Freelancers", postCount: 83 },
    ],
  },
  {
    id: "brief-3",
    title: "Simple Deployment for Non-DevOps Developers",
    postCount: 54,
    platforms: ["reddit", "producthunt", "github"],
    recencyLabel: "Active last 14 days",
    tags: ["DevTools", "deployment"],
    sections: [
      {
        heading: "Problem",
        body: "54 developers expressed frustration that deploying simple websites requires expertise in Docker, CI/CD, and cloud infrastructure. [1][2] The jump from localhost to production is too steep.",
      },
      {
        heading: "Demand Signals",
        body: "54 posts across 3 platforms. Growing: 18 new posts in last 7 days.",
      },
    ],
    suggestedDirections: [
      "Zero-config deployment CLI for static sites (drop a folder, get a URL)",
      "Simplified hosting platform that auto-detects project type",
    ],
    sourceEvidence: [
      {
        id: "se-8",
        platform: "reddit",
        excerpt: "Why can't I deploy a simple static site without a PhD in DevOps?",
        platformSubSource: "r/webdev",
        sourceUrl: "https://reddit.com/r/webdev/example7",
        upvotes: 234,
        createdAt: hoursAgo(3),
      },
      {
        id: "se-9",
        platform: "producthunt",
        excerpt: "Great concept but the deployment process needs to be way simpler",
        platformSubSource: "Product Hunt",
        sourceUrl: "https://producthunt.com/posts/example-deploy",
        upvotes: 45,
        createdAt: daysAgo(2),
      },
    ],
    relatedBriefs: [
      { id: "brief-7", title: "Analytics Tool Usability Regression", postCount: 35 },
    ],
  },
];

export const mockProducts: Product[] = [
  {
    id: "product-1",
    name: "FreshBooks",
    description:
      "Cloud accounting and invoicing software for small businesses and freelancers. Recently tripled pricing on legacy plans.",
    platforms: ["reddit", "producthunt", "appstore"],
    category: "Invoicing",
    complaintCount: 247,
    topIssue: "Pricing tripled overnight",
    tags: ["SaaS", "invoicing"],
    trendingIndicator: true,
    websiteUrl: "https://freshbooks.com",
  },
  {
    id: "product-2",
    name: "Notion Calendar",
    description:
      "Calendar app integrated with Notion workspace. Syncs tasks, databases, and events across devices.",
    platforms: ["producthunt", "appstore", "playstore"],
    category: "Productivity",
    complaintCount: 184,
    topIssue: "Sync reliability issues",
    tags: ["Productivity", "calendar"],
    trendingIndicator: true,
    websiteUrl: "https://notion.so/calendar",
  },
  {
    id: "product-3",
    name: "Linear",
    description:
      "Streamlined issue tracking and project management for software teams. Known for speed and keyboard-first UX.",
    platforms: ["producthunt", "reddit", "github"],
    category: "Project Management",
    complaintCount: 73,
    topIssue: "Missing custom fields",
    tags: ["DevTools", "project-management"],
    websiteUrl: "https://linear.app",
  },
  {
    id: "product-4",
    name: "Canny",
    description:
      "Customer feedback management platform for tracking feature requests and prioritizing roadmaps.",
    platforms: ["producthunt", "reddit"],
    category: "Feedback",
    complaintCount: 134,
    topIssue: "Too complex for small teams",
    tags: ["SaaS", "feedback"],
    websiteUrl: "https://canny.io",
  },
  {
    id: "product-5",
    name: "Vercel",
    description:
      "Frontend cloud platform for deploying web applications. Optimized for Next.js with edge functions and analytics.",
    platforms: ["github", "producthunt", "reddit"],
    category: "Deployment",
    complaintCount: 91,
    topIssue: "Framework lock-in",
    tags: ["DevTools", "deployment"],
    trendingIndicator: true,
    websiteUrl: "https://vercel.com",
  },
  {
    id: "product-6",
    name: "Intercom",
    description:
      "Customer messaging platform with live chat, bots, and help desk. Widely used but increasingly expensive.",
    platforms: ["reddit", "producthunt"],
    category: "Customer Support",
    complaintCount: 210,
    topIssue: "Prohibitively expensive for startups",
    tags: ["SaaS", "support"],
    trendingIndicator: true,
    websiteUrl: "https://intercom.com",
  },
  {
    id: "product-7",
    name: "Typeform",
    description:
      "Conversational form builder with beautiful UI. Popular for surveys, quizzes, and lead generation.",
    platforms: ["producthunt", "reddit", "playstore"],
    category: "Forms",
    complaintCount: 156,
    topIssue: "Conditional logic limitations",
    tags: ["SaaS", "forms"],
    websiteUrl: "https://typeform.com",
  },
  {
    id: "product-8",
    name: "Plausible Analytics",
    description:
      "Lightweight, privacy-friendly web analytics. Open-source alternative to Google Analytics without cookies.",
    platforms: ["github", "producthunt"],
    category: "Analytics",
    complaintCount: 48,
    topIssue: "Missing real-time dashboard",
    tags: ["DevTools", "analytics"],
    websiteUrl: "https://plausible.io",
  },
];

export const mockProductDetails: ProductDetail[] = [
  {
    ...mockProducts[0],
    complaintBreakdown: [
      {
        theme: "Price increases on existing plans",
        postCount: 89,
        posts: [
          {
            id: "pp-1",
            platform: "reddit",
            excerpt:
              "Switched from FreshBooks because the pricing tripled. Was paying $15/mo, now they want $45 for the same features.",
            platformSubSource: "r/Entrepreneur",
            sourceUrl: "https://reddit.com/r/Entrepreneur/example6",
            upvotes: 67,
            createdAt: daysAgo(1),
          },
          {
            id: "pp-2",
            platform: "reddit",
            excerpt:
              "FreshBooks just sent me an email that my plan is going up 200%. No new features, just higher prices.",
            platformSubSource: "r/freelance",
            sourceUrl: "https://reddit.com/r/freelance/freshbooks-pricing",
            upvotes: 134,
            createdAt: daysAgo(3),
          },
          {
            id: "pp-3",
            platform: "appstore",
            excerpt:
              "1 star. They tripled the price and removed features from the cheaper tier. Uninstalling.",
            platformSubSource: "App Store",
            sourceUrl: "https://apps.apple.com/app/freshbooks-review1",
            helpfulVotes: 42,
            createdAt: daysAgo(5),
          },
        ],
      },
      {
        theme: "Missing recurring invoice features",
        postCount: 67,
        posts: [
          {
            id: "pp-4",
            platform: "appstore",
            excerpt:
              "Terrible app. Can't even set recurring invoices. I have retainer clients and have to manually create the same invoice every month.",
            platformSubSource: "App Store",
            sourceUrl: "https://apps.apple.com/app/example5",
            helpfulVotes: 15,
            createdAt: daysAgo(1),
          },
          {
            id: "pp-5",
            platform: "reddit",
            excerpt:
              "FreshBooks recurring invoices are broken. Half the time they don't send, and there's no retry mechanism.",
            platformSubSource: "r/SaaS",
            sourceUrl: "https://reddit.com/r/SaaS/freshbooks-recurring",
            upvotes: 45,
            createdAt: daysAgo(4),
          },
        ],
      },
      {
        theme: "Bloated UI for simple tasks",
        postCount: 91,
        posts: [
          {
            id: "pp-6",
            platform: "reddit",
            excerpt:
              "Why is every invoicing tool so bloated? I just want to send an invoice and get paid. 10 clicks for something that should take 2.",
            platformSubSource: "r/SaaS",
            sourceUrl: "https://reddit.com/r/SaaS/example1",
            upvotes: 142,
            createdAt: hoursAgo(2),
          },
          {
            id: "pp-7",
            platform: "producthunt",
            excerpt:
              "FreshBooks used to be simple. Now the dashboard has 20 menu items and I still can't find the 'send invoice' button quickly.",
            platformSubSource: "Product Hunt",
            sourceUrl: "https://producthunt.com/posts/freshbooks-review",
            upvotes: 23,
            createdAt: daysAgo(2),
          },
        ],
      },
    ],
    relatedBriefs: [
      { id: "brief-1", title: "Invoicing Pain Points for Freelancers", postCount: 83 },
    ],
  },
  {
    ...mockProducts[1],
    complaintBreakdown: [
      {
        theme: "Cross-device sync failures",
        postCount: 78,
        posts: [
          {
            id: "pp-8",
            platform: "appstore",
            excerpt:
              "Syncing between devices is completely broken. I add events on my phone and they don't show up on iPad for hours.",
            platformSubSource: "App Store",
            sourceUrl: "https://apps.apple.com/app/notion-cal-review1",
            helpfulVotes: 29,
            createdAt: daysAgo(2),
          },
          {
            id: "pp-9",
            platform: "playstore",
            excerpt:
              "Calendar events created on desktop don't appear on Android until I force-close and reopen the app.",
            platformSubSource: "Google Play",
            sourceUrl: "https://play.google.com/store/apps/notion-cal-review1",
            helpfulVotes: 34,
            createdAt: daysAgo(3),
          },
        ],
      },
      {
        theme: "Notification reliability",
        postCount: 56,
        posts: [
          {
            id: "pp-10",
            platform: "playstore",
            excerpt:
              "Notifications are completely unreliable. I miss important meetings because the app just doesn't send reminders.",
            platformSubSource: "Google Play",
            sourceUrl: "https://play.google.com/store/apps/notion-cal-review2",
            helpfulVotes: 33,
            createdAt: hoursAgo(16),
          },
          {
            id: "pp-11",
            platform: "producthunt",
            excerpt:
              "Love the Notion integration but the calendar notifications are a dealbreaker. Missed 3 meetings this week.",
            platformSubSource: "Product Hunt",
            sourceUrl: "https://producthunt.com/posts/notion-calendar-review",
            upvotes: 19,
            createdAt: daysAgo(1),
          },
        ],
      },
    ],
    relatedBriefs: [
      { id: "brief-6", title: "Cross-Device Sync Reliability Issues", postCount: 38 },
    ],
  },
  {
    ...mockProducts[2],
    complaintBreakdown: [
      {
        theme: "Custom field limitations",
        postCount: 38,
        posts: [
          {
            id: "pp-12",
            platform: "reddit",
            excerpt:
              "Linear is amazing for speed but the lack of custom fields is a dealbreaker for our team.",
            platformSubSource: "r/SaaS",
            sourceUrl: "https://reddit.com/r/SaaS/linear-custom-fields",
            upvotes: 56,
            createdAt: daysAgo(2),
          },
          {
            id: "pp-13",
            platform: "github",
            excerpt:
              "Feature request: Custom fields on issues. Currently using labels as a workaround but it's messy.",
            platformSubSource: "GitHub Trending",
            sourceUrl: "https://github.com/linear/linear/issues/custom-fields",
            upvotes: 89,
            createdAt: daysAgo(5),
          },
        ],
      },
      {
        theme: "Enterprise workflow gaps",
        postCount: 35,
        posts: [
          {
            id: "pp-14",
            platform: "producthunt",
            excerpt:
              "Linear is perfect for small teams but starts to break down at 50+ engineers. Missing role-based permissions.",
            platformSubSource: "Product Hunt",
            sourceUrl: "https://producthunt.com/posts/linear-enterprise",
            upvotes: 34,
            createdAt: daysAgo(3),
          },
          {
            id: "pp-15",
            platform: "reddit",
            excerpt:
              "We love Linear but had to switch back to Jira because Linear doesn't support our compliance requirements.",
            platformSubSource: "r/startups",
            sourceUrl: "https://reddit.com/r/startups/linear-enterprise",
            upvotes: 41,
            createdAt: daysAgo(7),
          },
        ],
      },
    ],
    relatedBriefs: [
      { id: "brief-4", title: "Lightweight Customer Feedback Collection", postCount: 47 },
    ],
  },
];
