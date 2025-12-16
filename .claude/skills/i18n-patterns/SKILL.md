---
name: i18n-patterns
description: Internationalization (i18n) patterns for web applications including folder structure, translation management, pluralization, date/number formatting, and framework-specific implementations (Next.js App Router, React). Use when adding multi-language support to applications.
---

# Internationalization (i18n) Patterns

Comprehensive guide for implementing multi-language support in web applications.

## When to Use This Skill

- Adding multi-language support to applications
- Setting up translation file structure
- Handling pluralization and gender
- Formatting dates, numbers, currencies by locale
- Implementing language switcher
- SEO optimization for multiple languages

---

## 1. Translation File Structure

### Recommended Structure

```
locales/
├── en/
│   ├── common.json      # Shared translations (nav, footer, buttons)
│   ├── home.json        # Page-specific
│   ├── auth.json        # Feature-specific
│   ├── errors.json      # Error messages
│   └── validation.json  # Form validation
├── ko/
│   ├── common.json
│   ├── home.json
│   ├── auth.json
│   ├── errors.json
│   └── validation.json
└── ja/
    └── ...
```

### Key Naming Conventions

```json
// ✅ Good: Hierarchical, descriptive
{
  "nav": {
    "home": "Home",
    "products": "Products",
    "about": "About Us"
  },
  "auth": {
    "login": {
      "title": "Sign In",
      "submit": "Sign In",
      "forgotPassword": "Forgot Password?"
    },
    "register": {
      "title": "Create Account",
      "submit": "Sign Up"
    }
  },
  "product": {
    "addToCart": "Add to Cart",
    "outOfStock": "Out of Stock",
    "price": "Price: {{price}}"
  }
}

// ❌ Bad: Flat, unclear
{
  "login": "Sign In",
  "login_btn": "Sign In",
  "forgot": "Forgot Password?",
  "add": "Add to Cart"
}
```

### Namespace Organization

| Namespace | Content |
|-----------|---------|
| `common` | Header, footer, buttons, labels used everywhere |
| `auth` | Login, register, password reset |
| `errors` | Error messages, 404, 500 |
| `validation` | Form validation messages |
| `[page]` | Page-specific content (home, about, contact) |
| `[feature]` | Feature-specific (cart, checkout, profile) |

---

## 2. Next.js App Router Implementation

### Setup with next-intl

```bash
npm install next-intl
```

### Project Structure

```
app/
├── [locale]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── products/
│       └── page.tsx
├── layout.tsx         # Root layout (minimal)
└── not-found.tsx
locales/
├── en.json
└── ko.json
middleware.ts
i18n.ts
next.config.js
```

### Configuration

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'ko', 'ja'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // 'always' | 'as-needed' | 'never'
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

```javascript
// next.config.js
const withNextIntl = require('next-intl/plugin')('./i18n.ts');

module.exports = withNextIntl({
  // other Next.js config
});
```

### Layout Setup

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Server Component Usage

```tsx
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </main>
  );
}
```

### Client Component Usage

```tsx
// components/AddToCartButton.tsx
'use client';

import { useTranslations } from 'next-intl';

export function AddToCartButton({ productId }: { productId: string }) {
  const t = useTranslations('product');

  return (
    <button onClick={() => addToCart(productId)}>
      {t('addToCart')}
    </button>
  );
}
```

---

## 3. Interpolation & Variables

### Basic Interpolation

```json
// locales/en.json
{
  "greeting": "Hello, {name}!",
  "itemCount": "You have {count} items in your cart",
  "price": "Price: {price}"
}
```

```tsx
t('greeting', { name: 'John' })          // "Hello, John!"
t('itemCount', { count: 5 })             // "You have 5 items in your cart"
t('price', { price: '$99.99' })          // "Price: $99.99"
```

### Rich Text / HTML

```json
{
  "terms": "By signing up, you agree to our <link>Terms of Service</link>",
  "highlight": "This is <bold>important</bold> information"
}
```

```tsx
t.rich('terms', {
  link: (chunks) => <a href="/terms">{chunks}</a>
})

t.rich('highlight', {
  bold: (chunks) => <strong>{chunks}</strong>
})
```

---

## 4. Pluralization

### ICU Message Format

```json
// locales/en.json
{
  "cart": {
    "items": "{count, plural, =0 {No items} one {# item} other {# items}} in cart"
  },
  "notifications": "{count, plural, =0 {No notifications} one {1 notification} other {# notifications}}"
}

// locales/ko.json
{
  "cart": {
    "items": "장바구니에 {count}개 상품"
  },
  "notifications": "알림 {count}개"
}
```

```tsx
t('cart.items', { count: 0 })   // "No items in cart"
t('cart.items', { count: 1 })   // "1 item in cart"
t('cart.items', { count: 5 })   // "5 items in cart"
```

### Complex Pluralization

```json
{
  "results": "{count, plural, =0 {No results found} one {Found # result} other {Found # results}} for \"{query}\""
}
```

```tsx
t('results', { count: 0, query: 'shoes' })   // "No results found for "shoes""
t('results', { count: 1, query: 'shoes' })   // "Found 1 result for "shoes""
t('results', { count: 42, query: 'shoes' })  // "Found 42 results for "shoes""
```

### Gender

```json
{
  "welcomeBack": "{gender, select, male {Welcome back, Mr. {name}} female {Welcome back, Ms. {name}} other {Welcome back, {name}}}"
}
```

---

## 5. Date, Time, Number Formatting

### Date Formatting

```tsx
import { useFormatter } from 'next-intl';

function DateDisplay({ date }: { date: Date }) {
  const format = useFormatter();

  return (
    <div>
      {/* "Dec 16, 2025" (en) / "2025년 12월 16일" (ko) */}
      <p>{format.dateTime(date, { dateStyle: 'medium' })}</p>
      
      {/* "December 16, 2025 at 3:30 PM" */}
      <p>{format.dateTime(date, { dateStyle: 'long', timeStyle: 'short' })}</p>
      
      {/* Relative: "3 days ago" */}
      <p>{format.relativeTime(date)}</p>
    </div>
  );
}
```

### Number Formatting

```tsx
import { useFormatter } from 'next-intl';

function PriceDisplay({ amount }: { amount: number }) {
  const format = useFormatter();

  return (
    <div>
      {/* Currency: "$1,234.56" (en-US) / "₩1,234" (ko-KR) */}
      <p>{format.number(amount, { style: 'currency', currency: 'USD' })}</p>
      
      {/* Percentage: "85%" */}
      <p>{format.number(0.85, { style: 'percent' })}</p>
      
      {/* Compact: "1.2K" */}
      <p>{format.number(1234, { notation: 'compact' })}</p>
    </div>
  );
}
```

### Server-Side Formatting

```tsx
import { getFormatter } from 'next-intl/server';

export default async function Page() {
  const format = await getFormatter();
  
  return (
    <p>Updated: {format.dateTime(new Date(), { dateStyle: 'full' })}</p>
  );
}
```

---

## 6. Language Switcher

### Component

```tsx
// components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

const languageNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    // Replace current locale in path with new locale
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <select
      value={locale}
      onChange={(e) => handleChange(e.target.value as Locale)}
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {languageNames[loc]}
        </option>
      ))}
    </select>
  );
}
```

### With Link (Better UX)

```tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { locales, type Locale } from '@/i18n';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const getLocalizedPath = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
  };

  return (
    <div role="navigation" aria-label="Language selection">
      {locales.map((loc) => (
        <Link
          key={loc}
          href={getLocalizedPath(loc)}
          hrefLang={loc}
          className={locale === loc ? 'active' : ''}
          aria-current={locale === loc ? 'true' : undefined}
        >
          {loc.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
```

---

## 7. SEO Optimization

### Alternate Links

```tsx
// app/[locale]/layout.tsx
import { locales } from '@/i18n';

export async function generateMetadata({ params: { locale } }: Props) {
  const baseUrl = 'https://example.com';
  
  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: Object.fromEntries(
        locales.map((loc) => [loc, `${baseUrl}/${loc}`])
      ),
    },
  };
}
```

### Sitemap with Locales

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { locales } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://example.com';
  
  const pages = ['', '/about', '/products', '/contact'];
  
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: page === '' ? 1 : 0.8,
    }))
  );
}
```

### HTML Lang Attribute

```tsx
// Automatically handled by layout
<html lang={locale}>
```

---

## 8. React (Non-Next.js) Implementation

### Setup with react-i18next

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ko from './locales/ko.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

```tsx
// main.tsx
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
// Component usage
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('ko')}>한국어</button>
    </div>
  );
}
```

---

## 9. Translation Management Best Practices

### Keep Translations Organized

```json
// ✅ Group by feature/page
{
  "auth": {
    "login": { ... },
    "register": { ... }
  },
  "product": {
    "list": { ... },
    "detail": { ... }
  }
}
```

### Use Meaningful Keys

```json
// ✅ Self-documenting keys
{
  "cart.empty.title": "Your cart is empty",
  "cart.empty.description": "Add items to get started",
  "cart.checkout.button": "Proceed to Checkout"
}

// ❌ Cryptic keys
{
  "msg1": "Your cart is empty",
  "btn_checkout": "Proceed to Checkout"
}
```

### Handle Missing Translations

```typescript
// i18n config
{
  fallbackLng: 'en',
  returnNull: false,
  returnEmptyString: false,
  missingKeyHandler: (lng, ns, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation: ${lng}/${ns}/${key}`);
    }
  },
}
```

### Type Safety

```typescript
// types/i18n.d.ts
import en from '../locales/en.json';

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
```

---

## 10. Common Patterns

### Conditional Content by Locale

```tsx
const locale = useLocale();

// Different content structure per locale
{locale === 'ja' && <RubyText />}
{locale === 'ar' && <div dir="rtl">...</div>}
```

### RTL Support

```tsx
// app/[locale]/layout.tsx
const rtlLocales = ['ar', 'he', 'fa'];

export default function Layout({ params: { locale } }) {
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
  
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

### Locale-Specific Assets

```tsx
// Different images per locale
<Image 
  src={`/images/hero-${locale}.jpg`}
  alt={t('hero.alt')}
/>
```

---

## Related Skills

- For Next.js patterns, see: `nextjs`
- For React patterns, see: `react-patterns`
