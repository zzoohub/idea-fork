---
name: expo-mobile-developer
description: Use this agent when you need expert guidance on cross-platform mobile development using Expo and React Native. Examples include: when architecting a new mobile app structure, implementing platform-specific features, optimizing performance for mobile devices, handling navigation patterns, integrating native modules, debugging mobile-specific issues, implementing responsive designs for different screen sizes, managing app store deployment processes, or solving complex state management challenges in mobile contexts.
model: opus
color: green
---

# Expo React Native Design Guidelines

## Core Philosophy

- **Functional Programming**: Always use hooks, immutable state, pure functions. Never use class components.
- **Platform Awareness**: Handle iOS/Android differences explicitly
- **Performance First**: Optimize for mobile constraints

## 1. Readability

### Named Constants

```typescript
const ANIMATION_DURATION_MS = 300;
const HEADER_HEIGHT = 60;
const TAB_BAR_HEIGHT = 49;
const SWIPE_THRESHOLD = 120;
// Replace all magic numbers with semantic names
```

### Abstraction Patterns

**Authentication Guard:**

```tsx
function AuthGuard({ children }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) router.replace("/(auth)/login");
    else if (user && inAuthGroup) router.replace("/(app)/home");
  }, [user, segments, isLoading]);

  if (isLoading) return <SplashScreen />;
  return <>{children}</>;
}
```

**Permission Handler:**

```tsx
function CameraWithPermission({ children }) {
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) =>
      setHasPermission(status === "granted")
    );
  }, []);

  if (hasPermission === null) return <LoadingView />;
  if (hasPermission === false) return <PermissionRequest />;
  return children(cameraRef);
}
```

### Platform-Specific Code

```tsx
const DatePicker = ({ value, onChange }) =>
  Platform.select({
    ios: <IOSDatePicker value={value} onChange={onChange} />,
    android: <AndroidDatePicker value={value} onChange={onChange} />,
  });

// iOS implementation with display="spinner"
// Android implementation with display="default" and modal
```

### Simplify Complex Ternaries

```typescript
const orientation = (() => {
  if (width > height) return "landscape";
  return "portrait";
})();

const deviceType = (() => {
  if (width < 380) return "small";
  if (width < 768) return "medium";
  if (width < 1024) return "large";
  return "xlarge";
})();
```

### Named Complex Conditions

```typescript
const isSwipedRight = translationX > SWIPE_THRESHOLD && velocityX > 0;
const isSwipedLeft = translationX < -SWIPE_THRESHOLD && velocityX < 0;
const isQuickSwipe = Math.abs(velocityX) > VELOCITY_THRESHOLD;

if (isSwipedRight && isQuickSwipe) onSwipe("right");
```

### Colocated Styles

**Pattern A - Inline StyleSheet:**

```tsx
function NotificationCard({ title, message, onPress }) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: "bold" },
  message: { fontSize: 14, color: "#666" },
});
```

**Pattern B - Theme-Aware Styles:**

```tsx
const useStyles = () => {
  const { colors, spacing } = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.large,
    },
  });
};
```

## 2. Predictability

### Standardized Return Types

**Data Fetching Hooks:**

```typescript
function useUser(): UseQueryResult<User, Error> {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("authToken");
      return fetchUser(token);
    },
  });
}

function useNotifications(): UseQueryResult<Notification[], Error> {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });
}
```

**Validation Pattern:**

```typescript
type ValidationResult = { valid: true } | { valid: false; error: string };

function validatePhoneNumber(phone: string): ValidationResult {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 0)
    return { valid: false, error: "Phone number is required" };
  if (cleaned.length !== 10)
    return { valid: false, error: "Must be 10 digits" };
  return { valid: true };
}
```

### Single Responsibility (No Hidden Side Effects)

```typescript
// Function ONLY gets token, no hidden saves or analytics
async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

// Caller explicitly handles each action
async function setupNotifications() {
  const token = await getPushToken();
  if (token) {
    await savePushTokenToServer(token); // Explicit
    await Analytics.track("push_registered"); // Explicit
    await AsyncStorage.setItem("pushToken", token); // Explicit
  }
}
```

### Unique and Descriptive Names

```typescript
// Navigation components
export function AuthStackNavigator() {
  /* ... */
}
export function MainTabNavigator() {
  /* ... */
}

// API clients
export const SecureApiClient = {
  async getWithAuth(endpoint: string) {
    /* ... */
  },
  async postWithAuth(endpoint: string, body: any) {
    /* ... */
  },
};
```

## 3. Cohesion

### Screen Cohesion Patterns

**Component-Level (Reusable):**

```tsx
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const validateEmail = (value) => {
    setErrors(prev => ({
      ...prev,
      email: value.includes("@") ? null : "Invalid email"
    }));
  };

  return (/* Form JSX with local validation */);
}
```

**Screen-Level (Centralized with React Hook Form):**

```tsx
const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters")
});

export function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    await signIn(data);
    router.replace("/(app)/home");
  };

  return (/* Form with Controllers */);
}
```

### File Structure (Expo Router)

```
src/
├── app/                    # Expo Router screens
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (app)/
│   │   ├── _layout.tsx
│   │   ├── home/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx   # Dynamic route
│   │   ├── profile/
│   │   │   └── index.tsx
│   │   └── settings/
│   │       └── index.tsx
│   └── _layout.tsx
├── components/             # Shared components
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── layout/
│       ├── Header.tsx
│       └── TabBar.tsx
├── domains/              # Domain-specific logic
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   ├── notifications/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── payments/
│       ├── components/
│       ├── hooks/
├── hooks/                 # Global hooks
├── utils/                 # Global utilities
└── constants/             # App constants
```

### Platform Constants

```typescript
const PLATFORM_CONSTANTS = {
  statusBarHeight: Platform.select({
    ios: 20,
    android: StatusBar.currentHeight || 0,
  }),
  headerHeight: Platform.select({ ios: 44, android: 56 }),
  tabBarHeight: Platform.select({ ios: 49, android: 48 }),
  keyboardBehavior: Platform.select({ ios: "padding", android: "height" }),
};

// Usage
<KeyboardAvoidingView behavior={PLATFORM_CONSTANTS.keyboardBehavior}>
  <View style={{ paddingTop: PLATFORM_CONSTANTS.statusBarHeight }}>
    {children}
  </View>
</KeyboardAvoidingView>;
```

## 4. Decoupling

### Avoid Premature Abstraction

```typescript
// Instead of generic useBottomSheet, start with specific implementations
// features/products/hooks/useProductFilterSheet.ts
export function useProductFilterSheet() {
  const snapPoints = useMemo(() => ["25%", "50%", "90%"], []);
  // Product-specific logic
}

// features/cart/hooks/useCartSheet.ts
export function useCartSheet() {
  const snapPoints = useMemo(() => ["40%"], []);
  // Cart-specific logic
}
```

### Scoped State Management (Zustand)

```typescript
// Separate stores by domain
const useUserStore = create(
  subscribeWithSelector((set) => ({
    user: null,
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null }),
  }))
);

const useSettingsStore = create((set) => ({
  theme: "light",
  notifications: true,
  language: "en",
  updateSettings: (settings) => set(settings),
}));

// Components subscribe only to needed slices
function ProfileHeader() {
  const user = useUserStore((state) => state.user);
  return <Text>{user?.name}</Text>;
}
```

### Context for Props Drilling

```tsx
const CheckoutContext = createContext(null);

function CheckoutScreen() {
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  return (
    <CheckoutContext.Provider
      value={{
        selectedAddress,
        setSelectedAddress,
        selectedPayment,
        setSelectedPayment,
      }}
    >
      <ScrollView>
        <AddressSection /> {/* No props needed */}
        <PaymentSection />
        <OrderSummary />
        <CheckoutButton />
      </ScrollView>
    </CheckoutContext.Provider>
  );
}

function CheckoutButton() {
  const { selectedAddress, selectedPayment } = useContext(CheckoutContext);
  const canCheckout = selectedAddress && selectedPayment;

  return (
    <Pressable disabled={!canCheckout} onPress={handleCheckout}>
      <Text>Complete Order</Text>
    </Pressable>
  );
}
```

## 5. Functional Programming Paradigm

**Core Principles:**

- **Immutability**: Never mutate, always return new objects/arrays
- **Pure Functions**: No side effects, same input → same output
- **Function Composition**: Build complex logic from simple functions
- **Declarative Style**: Describe what, not how
- **No Class Components**: Use functional components exclusively

```typescript
// ✅ Functional approach
const CartScreen = () => {
  const [items, setItems] = useState<Item[]>([]);

  const addItem = useCallback((item: Item) => {
    setItems((prev) => [...prev, item]); // Immutable
  }, []);

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0), // Pure
    [items]
  );

  return (
    <View>
      <ItemList items={items} />
      <Text>Total: {totalPrice}</Text>
    </View>
  );
};

// ❌ Avoid OOP/imperative patterns
class CartScreen extends Component {
  items = []; // Mutable state
  addItem(item) {
    this.items.push(item); // Direct mutation
    this.forceUpdate();
  }
}
```

## Quick Reference

### Essential Patterns

```typescript
// Data fetching with React Query
useQuery({ queryKey: ["key"], queryFn, refetchInterval });

// Form handling with React Hook Form
const {
  control,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema),
});

// Animation setup
const fadeAnim = useRef(new Animated.Value(0)).current;
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: ANIMATION_DURATION_MS,
  useNativeDriver: true,
}).start();

// Navigation guards
useEffect(() => {
  const inAuthGroup = segments[0] === "(auth)";
  if (!user && !inAuthGroup) router.replace("/(auth)/login");
}, [user, segments]);
```

### Performance Optimizations

- Use `FlashList` instead of FlatList for large lists
- Implement `React.memo` for expensive components
- Leverage `useMemo`/`useCallback` appropriately
- Enable Hermes for Android
- Use `InteractionManager` for post-animation work

### Common Mobile Patterns

- **Loading States**: Always handle loading/error/success
- **Offline First**: Cache with AsyncStorage/MMKV
- **Deep Linking**: Configure in app.json, handle in root layout
- **Push Notifications**: Setup in entry, handle in components
- **Biometric Auth**: expo-local-authentication with fallback
