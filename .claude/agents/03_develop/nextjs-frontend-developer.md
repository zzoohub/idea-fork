---
name: nextjs-frontend-developer
description: Use this agent when you need expert-level Next.js App Router development assistance, including component architecture, routing patterns, server/client component optimization, data fetching strategies, performance optimization, or troubleshooting App Router-specific issues. Examples: <example>Context: User is building a Next.js application and needs help with implementing dynamic routes. user: 'I need to create a dynamic product page that fetches data from an API' assistant: 'I'll use the nextjs-frontend-developer agent to help you implement the dynamic product page with proper App Router patterns' <commentary>The user needs Next.js App Router expertise for dynamic routing and data fetching, which is exactly what this agent specializes in.</commentary></example> <example>Context: User is experiencing performance issues with their Next.js app. user: 'My Next.js app is loading slowly and I think it might be related to how I'm handling server components' assistant: 'Let me use the nextjs-frontend-developer agent to analyze your server component implementation and optimize performance' <commentary>Performance optimization with server components is a core Next.js App Router concern that requires specialized knowledge.</commentary></example>
model: opus
color: green
---

# Next.js 15+ App Router Design Guidelines

## Core Principles

- **Server Components by Default**: Client Components only when needed (reduces bundle size, improves performance)
- **Streaming SSR**: Progressive rendering with Suspense boundaries
- **Functional Programming**: Async server functions, immutable updates, pure functions

## 1. Server Components & Streaming

### Server Components Default

```tsx
// app/products/page.tsx - Server Component
async function ProductsPage() {
  const products = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // ISR with 1hr cache
  });

  return products.map((p) => <ProductCard key={p.id} product={p} />);
}
```

### Streaming with Suspense

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const data = await fetchDashboardData();
  return <DashboardContent data={data} />;
}
```

## 2. Readability

### Named Constants

```typescript
// app/constants/animation.ts
export const ANIMATION_DELAYS = {
  LIKE_FEEDBACK: 300,
  PAGE_TRANSITION: 200,
  MODAL_OPEN: 150,
} as const;
```

### Authentication with Middleware

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token");

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <DashboardNav user={user} />
      {children}
    </div>
  );
}
```

### Parallel Routes for Role-Based UI

```tsx
// app/dashboard/@admin/page.tsx
export default function AdminDashboard() {
  return <AdminDashboardContent />;
}

// app/dashboard/@viewer/page.tsx
export default function ViewerDashboard() {
  return <ViewerDashboardContent />;
}

// app/dashboard/layout.tsx
export default async function Layout({ admin, viewer }) {
  const user = await getCurrentUser();
  return user?.role === "admin" ? admin : viewer;
}
```

### Route Groups Organization

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx      # Minimal layout
├── (dashboard)/
│   ├── dashboard/page.tsx
│   └── layout.tsx      # Full layout with sidebar
└── layout.tsx          # Root layout
```

### Server-Side Business Logic

```tsx
// app/products/[id]/page.tsx
async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  const user = await getCurrentUser();

  const pricing = (() => {
    if (user?.membership === "premium" && product.onSale) return "PREMIUM_SALE";
    if (user?.membership === "premium") return "PREMIUM";
    if (product.onSale) return "SALE";
    return "REGULAR";
  })();

  return <ProductDisplay product={product} pricing={pricing} />;
}
```

### Colocated Data Fetching

```tsx
// app/components/user-profile.tsx - Server Component
async function UserProfile({ userId }) {
  const user = await fetch(`/api/users/${userId}`, {
    next: { revalidate: 60, tags: [`user-${userId}`] },
  }).then((res) => res.json());

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </div>
  );
}

// Usage without props drilling
export default function Page() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

## 3. Predictability

### Data Access Layer

```typescript
// app/lib/data/user.ts
import { cache } from "react";
import { unstable_cache } from "next/cache";

// Request deduplication
export const getUser = cache(async (id: string) => {
  return await db.user.findUnique({ where: { id } });
});

// Data caching
export const getCachedUser = unstable_cache(
  async (id: string) => getUser(id),
  ["user-by-id"],
  { revalidate: 3600, tags: [`user-${id}`] }
);
```

### Server Actions Pattern

```typescript
// app/actions/user.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function updateUser(
  userId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const validatedData = updateUserSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
    });

    await db.user.update({ where: { id: userId }, data: validatedData });

    revalidateTag(`user-${userId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: "Failed to update user" };
  }
}
```

### Error Boundaries

```tsx
// app/dashboard/error.tsx
"use client";

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## 4. Cohesion

### Form Handling with Server Actions

```tsx
// app/components/user-form.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateUser } from "@/app/actions/user";

export function UserForm({ userId }) {
  const updateUserWithId = updateUser.bind(null, userId);
  const [state, dispatch] = useFormState(updateUserWithId, {});

  return (
    <form action={dispatch}>
      <input name="name" required />
      {state.errors?.name && <p>{state.errors.name}</p>}

      <input name="email" type="email" required />
      {state.errors?.email && <p>{state.errors.email}</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}
```

### Domain-Driven File Structure

```
app/
├── components/     # Shared components
├── hooks/         # Shared hooks
├── utils/         # Shared utilities
├── actions/       # Shared server actions
├── domains/
│   ├── user/
│   │   ├── components/
│   │   │   ├── UserProfileCard.tsx      # Server/Client Component
│   │   │   └── UserEditForm.tsx         # 'use client'
│   │   ├── hooks/
│   │   │   └── useUserPreferences.ts    # Client-side
│   │   ├── actions/
│   │   │   ├── user.queries.ts          # getUser, getUsers
│   │   │   └── user.mutations.ts        # updateUser, deleteUser
│   │   └── utils/
│   │       └── formatUserName.ts
│   ├── product/
│   │   ├── components/
│   │   │   ├── ProductList.tsx          # Server Component
│   │   │   └── AddToCartButton.tsx      # 'use client'
│   │   ├── hooks/
│   │   │   └── useProductFilter.ts
│   │   ├── actions/
│   │   │   ├── product.queries.ts       # Data fetching
│   │   │   ├── product.mutations.ts     # Mutations
│   │   │   └── cart.mutations.ts
│   │   └── utils/
│   │       └── calculatePrice.ts
│   └── order/
│       ├── components/
│       ├── hooks/
│       ├── actions/
│       └── utils/
├── (marketing)/    # Route group
│   └── page.tsx
├── (shop)/        # Route group
│   ├── products/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── cart/page.tsx
└── (dashboard)/   # Route group
    └── orders/page.tsx
```

### Domain Actions Example

```tsx
// app/domains/product/actions/product.queries.ts
export const getProducts = cache(async () => {
  return await db.product.findMany();
});

export const getProductById = unstable_cache(
  async (id: string) => db.product.findUnique({ where: { id } }),
  ["product-by-id"],
  { revalidate: 3600, tags: ["products"] }
);

// app/domains/product/actions/product.mutations.ts
("use server");

export async function createProduct(formData: FormData) {
  const validatedData = productSchema.parse({
    name: formData.get("name"),
    price: Number(formData.get("price")),
  });

  const product = await db.product.create({ data: validatedData });
  revalidateTag("products");

  return { success: true, product };
}

// app/domains/product/components/ProductList.tsx
import { getProducts } from "../actions/product.queries";

export async function ProductList() {
  const products = await getProducts();

  return (
    <div className="grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// app/(shop)/products/page.tsx
import { ProductList } from "@/domains/product/components/ProductList";

export default function ProductsPage() {
  return (
    <main>
      <h1>Our Products</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ProductList />
      </Suspense>
    </main>
  );
}
```

## 5. Decoupling

### Independent Component Loading

```tsx
export default function DashboardPage() {
  return (
    <div className="grid">
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

### Intercepting Routes for Modals

```tsx
// app/@modal/(.)products/[id]/page.tsx
export default function ProductModal({ params }) {
  return (
    <Modal>
      <ProductQuickView id={params.id} />
    </Modal>
  );
}

// app/layout.tsx
export default function RootLayout({ children, modal }) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

### Optimistic Updates

```tsx
"use client";

import { useOptimistic } from "react";
import { toggleLike } from "@/app/actions/posts";

export function PostLikes({ post }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    post.likes,
    (state, newLike) => state + newLike
  );

  async function handleLike() {
    addOptimisticLike(1);
    await toggleLike(post.id);
  }

  return <button onClick={handleLike}>❤️ {optimisticLikes}</button>;
}
```

## 6. Performance Optimization

### Partial Prerendering

```tsx
// app/page.tsx
export const experimental_ppr = true;

export default async function HomePage() {
  return (
    <>
      {/* Static - prerendered */}
      <Header />
      <Hero />

      {/* Dynamic - streamed */}
      <Suspense fallback={<ProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
    </>
  );
}
```

### Image Optimization

```tsx
import Image from "next/image";

export function ProductCard({ product }) {
  return (
    <Image
      src={product.image}
      alt={product.name}
      width={300}
      height={200}
      placeholder="blur"
      blurDataURL={product.blurDataURL}
      loading="lazy"
    />
  );
}
```

### Route Segment Config

```tsx
// app/products/page.tsx
export const dynamic = "force-static";
export const revalidate = 3600;
export const fetchCache = "force-cache";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}
```

## 7. Functional Programming

```typescript
// ✅ Server Component - Async function
export default async function ProductsPage() {
  const products = await getProducts();
  return products.map((p) => <ProductCard key={p.id} product={p} />);
}

// ✅ Client Component - Functional with hooks
("use client");

export function Cart() {
  const [items, setItems] = useState<Item[]>([]);

  const addItem = useCallback((item: Item) => {
    setItems((prev) => [...prev, item]); // Immutable
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  return <CartDisplay items={items} total={total} />;
}

// ✅ Server Action - Pure function
("use server");

export async function updateUser(id: string, data: UserData) {
  const validated = validateUserData(data);
  const updated = await db.user.update({ where: { id }, data: validated });
  revalidatePath("/users");
  return { success: true, user: updated };
}
```

## Best Practices Summary

1. **Server Components First** - Client only for interactivity
2. **Streaming SSR** - Liberal use of Suspense boundaries
3. **Colocated Data Fetching** - Fetch where needed in Server Components
4. **Server Actions** - All mutations through Server Actions
5. **Caching Strategy** - ISR, on-demand revalidation, unstable_cache
6. **Error/Loading States** - error.tsx and loading.tsx files
7. **Route Organization** - Route groups, parallel/intercepting routes
8. **Performance** - PPR, Image optimization, route segment config
9. **Type Safety** - TypeScript + Zod validation
10. **Composition** - Prefer composition, leverage RSC boundaries
