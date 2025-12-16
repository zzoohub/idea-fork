---
name: google-analytics
description: User behavior analytics with Google Analytics 4 (GA4). Setup guides for Next.js, React, and React Native (Firebase Analytics). Covers page views, custom events, e-commerce tracking, and event design patterns.
---

# Analytics with GA4

Track user behavior, measure engagement, and understand your users.

## When to Use

- Setting up analytics for new projects
- Implementing page view tracking
- Adding custom event tracking
- Designing event taxonomy
- E-commerce tracking
- Debugging analytics implementation

## What to Track (Funnel Minimum)

Don't over-track. Focus on funnel steps to see where users drop off.

### The Minimum Funnel

```
[Landing] → [Key Page] → [Pre-conversion Action] → [Conversion]
```

| Step | Event | Auto/Manual | Example |
|------|-------|-------------|---------|
| Landing | `page_view` | Auto | Homepage |
| Key Page | `page_view` | Auto | Pricing, Signup page |
| Pre-conversion | Custom event | Manual | `begin_checkout`, `click_signup` |
| Conversion | Custom event | Manual | `sign_up`, `purchase` |

### Events by Business Type

| Business | Pre-conversion | Conversion |
|----------|----------------|------------|
| SaaS | `click_signup`, `start_trial` | `sign_up`, `purchase` |
| E-commerce | `add_to_cart`, `begin_checkout` | `purchase` |
| Content | `click_subscribe` | `subscribe`, `sign_up` |
| Lead gen | `click_contact` | `form_submit` |

### Mark Conversions in GA4

1. Admin → Events
2. Find your conversion events
3. Toggle **"Mark as conversion"**

Then view in **Reports → Conversions**

### Don't Bother (Early Stage)

- Every button click
- Scroll depth
- Form field interactions
- Hover events

Add these later when you have traffic and need to optimize specific flows.

## Platform Setup

### Next.js (Recommended: @next/third-parties)

This is the official recommended approach from Next.js docs.

```bash
npm install @next/third-parties
```

**Google Analytics:**

```tsx
// app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </html>
  );
}
```

**Google Tag Manager (alternative):**

If you're already using GTM, configure GA4 through it instead of adding separately.

```tsx
// app/layout.tsx
import { GoogleTagManager } from "@next/third-parties/google";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-XXXXXXX" />
      <body>{children}</body>
    </html>
  );
}
```

**Event tracking:**

```tsx
"use client";

import { sendGAEvent } from "@next/third-parties/google";

export function SignupButton() {
  return (
    <button
      onClick={() => {
        sendGAEvent("event", "sign_up", { method: "email" });
      }}
    >
      Sign Up
    </button>
  );
}
```

**For single route only:**

```tsx
// app/landing/page.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function LandingPage() {
  return (
    <>
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      {/* page content */}
    </>
  );
}
```

### React (Vite / CRA)

**Option 1: react-ga4 (recommended for React)**

```bash
npm install react-ga4
```

```tsx
// main.tsx
import ReactGA from "react-ga4";

ReactGA.initialize("G-XXXXXXXXXX");

// Track page views with router
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
    });
  }, [location]);
}

function App() {
  usePageTracking();
  return <Routes>{/* ... */}</Routes>;
}
```

```typescript
// Event tracking
import ReactGA from "react-ga4";

// GA4 recommended event
ReactGA.event("sign_up", { method: "email" });

// Or with category (legacy style)
ReactGA.event({
  category: "User",
  action: "Sign Up",
  label: "Email",
});
```

**Option 2: gtag directly**

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

```typescript
// lib/analytics.ts
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function trackEvent(action: string, params?: Record<string, any>) {
  window.gtag("event", action, params);
}
```

### React Native (Firebase Analytics)

Firebase Analytics syncs with GA4 automatically when linked.

```bash
# Bare React Native
yarn add @react-native-firebase/app @react-native-firebase/analytics
cd ios && pod install

# Expo (with dev client)
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

```typescript
// App.tsx
import analytics from "@react-native-firebase/analytics";

// Log screen view
await analytics().logScreenView({
  screen_name: "HomeScreen",
  screen_class: "HomeScreen",
});

// Log predefined events
await analytics().logSignUp({ method: "email" });
await analytics().logLogin({ method: "google" });
await analytics().logSelectContent({
  content_type: "product",
  item_id: "SKU123",
});

// Log custom event
await analytics().logEvent("add_to_cart", {
  item_id: "SKU123",
  item_name: "Blue Shirt",
  price: 29.99,
});
```

**GDPR Consent (opt-in flow):**

```json
// firebase.json - disable auto collection
{
  "react-native": {
    "analytics_auto_collection_enabled": false
  }
}
```

```typescript
// After user consent
await analytics().setAnalyticsCollectionEnabled(true);
await analytics().setConsent({
  analytics_storage: true,
  ad_storage: true,
  ad_user_data: true,
  ad_personalization: true,
});
```

**Link Firebase to GA4:**
1. Firebase Console → Project Settings → Integrations
2. Link Google Analytics
3. Data flows to GA4 automatically

**Kids App (disable IDFA on iOS):**

```ruby
# Podfile
$RNFirebaseAnalyticsWithoutAdIdSupport = true
```

## Page View Tracking

### Next.js App Router

Automatic with `@next/third-parties`. For custom tracking on route change:

```tsx
// app/providers.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    sendGAEvent("event", "page_view", {
      page_path: pathname,
      page_search: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

### React Native

```typescript
import analytics from "@react-native-firebase/analytics";
import { useEffect } from "react";
import { useNavigationState } from "@react-navigation/native";

function useScreenTracking() {
  const routeName = useNavigationState(
    (state) => state?.routes[state.index]?.name
  );

  useEffect(() => {
    if (routeName) {
      analytics().logScreenView({
        screen_name: routeName,
        screen_class: routeName,
      });
    }
  }, [routeName]);
}
```

## Event Design

### Naming Convention

```typescript
// Use snake_case for event names and parameters
// Good
sendGAEvent("event", "add_to_cart", { item_id: "SKU123" });

// Bad
sendGAEvent("event", "AddToCart", { itemId: "SKU123" });
```

### GA4 Recommended Events

```typescript
// Authentication
sendGAEvent("event", "login", { method: "google" });
sendGAEvent("event", "sign_up", { method: "email" });

// Engagement
sendGAEvent("event", "share", { content_type: "article", item_id: "123" });
sendGAEvent("event", "search", { search_term: "blue shoes" });

// E-commerce
sendGAEvent("event", "view_item", { 
  currency: "USD",
  value: 29.99,
  items: [{ item_id: "SKU123", item_name: "T-Shirt" }]
});
sendGAEvent("event", "add_to_cart", { ... });
sendGAEvent("event", "begin_checkout", { ... });
sendGAEvent("event", "purchase", { 
  transaction_id: "T12345",
  value: 59.98,
  currency: "USD",
  items: [...]
});
```

### Event Taxonomy Template

```typescript
// lib/analytics/events.ts
import { sendGAEvent } from "@next/third-parties/google";

export const Analytics = {
  // Auth
  signUp: (method: string) => {
    sendGAEvent("event", "sign_up", { method });
  },
  login: (method: string) => {
    sendGAEvent("event", "login", { method });
  },

  // E-commerce
  viewItem: (item: Item) => {
    sendGAEvent("event", "view_item", {
      currency: "USD",
      value: item.price,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
      }],
    });
  },
  addToCart: (item: Item, quantity: number) => {
    sendGAEvent("event", "add_to_cart", {
      currency: "USD",
      value: item.price * quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity,
      }],
    });
  },

  // Engagement
  search: (term: string) => {
    sendGAEvent("event", "search", { search_term: term });
  },
};

// Usage
Analytics.addToCart(product, 1);
```

## User Properties

```typescript
// Next.js - set via gtag config
sendGAEvent("set", "user_properties", {
  subscription_tier: "premium",
  account_type: "business",
});

// React Native
analytics().setUserProperties({
  subscription_tier: "premium",
  account_type: "business",
});
```

## User ID Tracking

```typescript
// Next.js - after login
window.gtag("config", "G-XXXXXXXXXX", {
  user_id: "USER_123",
});

// React Native
analytics().setUserId("USER_123");
```

## E-commerce Full Flow

```typescript
// 1. View item
sendGAEvent("event", "view_item", {
  currency: "USD",
  value: 29.99,
  items: [{
    item_id: "SKU123",
    item_name: "Blue T-Shirt",
    item_category: "Apparel",
    price: 29.99,
  }],
});

// 2. Add to cart
sendGAEvent("event", "add_to_cart", {
  currency: "USD",
  value: 29.99,
  items: [{ item_id: "SKU123", item_name: "Blue T-Shirt", price: 29.99, quantity: 1 }],
});

// 3. Begin checkout
sendGAEvent("event", "begin_checkout", {
  currency: "USD",
  value: 29.99,
  items: [{ ... }],
});

// 4. Add payment info
sendGAEvent("event", "add_payment_info", {
  currency: "USD",
  value: 29.99,
  payment_type: "credit_card",
});

// 5. Purchase
sendGAEvent("event", "purchase", {
  transaction_id: "T12345",
  value: 32.99,
  tax: 3.00,
  shipping: 0,
  currency: "USD",
  items: [{
    item_id: "SKU123",
    item_name: "Blue T-Shirt",
    price: 29.99,
    quantity: 1,
  }],
});
```

## Debug Mode

### Browser

```typescript
// Enable debug mode
window.gtag("config", "G-XXXXXXXXXX", { debug_mode: true });
```

Use **GA4 DebugView**: GA4 Dashboard → Admin → DebugView

### Chrome Extension

Install **Google Analytics Debugger** extension.

### React Native

Events won't show in DebugView by default. Enable per platform:

**iOS:** Add `-FIRDebugEnabled` flag in Xcode scheme (Product → Scheme → Edit Scheme → Arguments)

**Android:** Run in terminal:
```bash
adb shell setprop debug.firebase.analytics.app <your.package.name>
```

Then view in Firebase Console → Analytics → DebugView

## Environment Config

```env
# .env.local (Next.js)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# .env (Vite)
VITE_GA_ID=G-XXXXXXXXXX
```

### Disable in Development

```tsx
// Only include in production
{process.env.NODE_ENV === "production" && (
  <GoogleAnalytics gaId="G-XXXXXXXXXX" />
)}
```

## Consent Mode

```typescript
// Default: deny all
window.gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
});

// After user consent
function acceptCookies() {
  window.gtag("consent", "update", {
    analytics_storage: "granted",
  });
}
```

## Checklist

- [ ] Install GA4 SDK for your platform
- [ ] Configure measurement ID
- [ ] Verify page views are tracking
- [ ] Define event naming convention (snake_case)
- [ ] Set up key events for core user actions
- [ ] Configure user ID tracking (if applicable)
- [ ] Set user properties for segmentation
- [ ] Test with DebugView
- [ ] Disable or use test ID in development
- [ ] Implement consent mode (if required by region)
- [ ] Mark key events as conversions in GA4 dashboard


## References

Next.js Third Parties (GA4): https://nextjs.org/docs/app/guides/third-party-libraries
Next.js Script for GA: https://nextjs.org/docs/messages/next-script-for-ga
react-ga4: https://github.com/codler/react-ga4
Firebase Analytics (React Native): https://rnfirebase.io/analytics/usage
Firebase Analytics Screen Tracking: https://rnfirebase.io/analytics/screen-tracking
GA4 Recommended Events: https://support.google.com/analytics/answer/9267735
GA4 Measurement Protocol: https://developers.google.com/analytics/devguides/collection/protocol/ga4
