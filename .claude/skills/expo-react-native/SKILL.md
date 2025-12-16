---
name: expo-react-native
description: Expo and React Native development patterns including project structure, navigation, platform-specific code, animations, and mobile-specific optimizations. Use when building cross-platform mobile applications with Expo.
---

# Expo & React Native Patterns

Comprehensive guide for building cross-platform mobile applications with Expo and React Native.

## When to Use This Skill

- Building mobile apps with Expo
- Implementing Expo Router navigation
- Handling platform-specific (iOS/Android) differences
- Optimizing mobile performance
- Managing mobile-specific state and permissions

---

## 1. Project Structure (Expo Router)

```
src/
├── app/                      # Expo Router screens
│   ├── (auth)/               # Auth group (unauthenticated)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (app)/                # Main app group (authenticated)
│   │   ├── _layout.tsx
│   │   ├── (tabs)/           # Tab navigator
│   │   │   ├── _layout.tsx
│   │   │   ├── home.tsx
│   │   │   ├── search.tsx
│   │   │   └── profile.tsx
│   │   └── settings/
│   │       └── index.tsx
│   ├── _layout.tsx           # Root layout
│   └── +not-found.tsx
├── components/
│   ├── ui/                   # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── layout/
│       ├── Header.tsx
│       └── TabBar.tsx
├── domains/                  # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── notifications/
│   └── payments/
├── hooks/                    # Global hooks
├── utils/                    # Global utilities
├── constants/                # App constants
└── stores/                   # Zustand stores
```

---

## 2. Navigation & Routing

### Root Layout with Auth Guard

```tsx
// app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(app)/(tabs)/home');
    }
  }, [user, segments, isLoading]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return <Slot />;
}
```

### Tab Navigator Layout

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Search, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### Stack Navigator Layout

```tsx
// app/(app)/_layout.tsx
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
```

### Navigation Actions

```tsx
import { useRouter, Link } from 'expo-router';

function MyComponent() {
  const router = useRouter();

  // Programmatic navigation
  const handlePress = () => {
    router.push('/profile/123');        // Push to stack
    router.replace('/(app)/home');      // Replace current
    router.back();                       // Go back
  };

  return (
    <>
      {/* Declarative navigation */}
      <Link href="/profile/123">
        <Text>View Profile</Text>
      </Link>

      {/* With params */}
      <Link href={{ pathname: '/product/[id]', params: { id: '456' } }}>
        <Text>View Product</Text>
      </Link>
    </>
  );
}
```

---

## 3. Platform-Specific Code

### Platform.select

```tsx
import { Platform, StyleSheet } from 'react-native';

// Component selection
const DatePicker = ({ value, onChange }) =>
  Platform.select({
    ios: <IOSDatePicker value={value} onChange={onChange} display="spinner" />,
    android: <AndroidDatePicker value={value} onChange={onChange} display="default" />,
  });

// Style selection
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 20, android: 0 }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
```

### Platform Constants

```typescript
// constants/platform.ts
import { Platform, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const PLATFORM = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  
  statusBarHeight: Platform.select({
    ios: 20,
    android: StatusBar.currentHeight || 0,
  }),
  
  headerHeight: Platform.select({ ios: 44, android: 56 }),
  tabBarHeight: Platform.select({ ios: 49, android: 48 }),
  
  keyboardBehavior: Platform.select({
    ios: 'padding' as const,
    android: 'height' as const,
  }),
  
  screenWidth: width,
  screenHeight: height,
};
```

### Platform-Specific Files

```
components/
├── Button.tsx          # Shared logic
├── Button.ios.tsx      # iOS-specific (auto-selected)
└── Button.android.tsx  # Android-specific (auto-selected)
```

---

## 4. Styling Patterns

### StyleSheet with Theme

```tsx
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

function Card({ title, children }) {
  const { colors, spacing } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const useStyles = () => {
  const { colors, spacing } = useTheme();

  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: spacing.md,
      marginVertical: spacing.sm,
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
  });
};
```

### Responsive Sizing

```typescript
// utils/responsive.ts
import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const baseWidth = 375; // iPhone X width

export const scale = (size: number) => (width / baseWidth) * size;
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// Usage
const styles = StyleSheet.create({
  title: {
    fontSize: moderateScale(16),
    padding: scale(12),
  },
});
```

### Device Type Detection

```typescript
const getDeviceType = () => {
  const { width } = Dimensions.get('window');
  if (width < 380) return 'small';
  if (width < 768) return 'medium';
  if (width < 1024) return 'large';
  return 'xlarge';
};

const deviceType = getDeviceType();
```

---

## 5. Permissions & Native Features

### Camera Permission

```tsx
import { Camera } from 'expo-camera';
import { useState, useEffect, useRef } from 'react';

function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) return <LoadingView />;
  if (hasPermission === false) return <PermissionDenied onRetry={requestPermission} />;

  return (
    <Camera ref={cameraRef} style={{ flex: 1 }}>
      <CameraControls cameraRef={cameraRef} />
    </Camera>
  );
}
```

### Push Notifications

```typescript
// utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function setupNotifications() {
  const token = await getPushToken();
  
  if (token) {
    await savePushTokenToServer(token);
  }

  // Configure notification handling
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
```

### Location

```typescript
import * as Location from 'expo-location';

async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
```

---

## 6. State Management

### Zustand Store

```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### React Query for Server State

```typescript
// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
```

### Context for Screen-Scoped State

```tsx
// Checkout flow with shared state
const CheckoutContext = createContext<CheckoutContextType | null>(null);

export function CheckoutProvider({ children }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);

  return (
    <CheckoutContext.Provider value={{
      address, setAddress,
      payment, setPayment,
      items, setItems,
      canCheckout: !!address && !!payment && items.length > 0,
    }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckout must be within CheckoutProvider');
  return context;
};
```

---

## 7. Animations

### Animated API

```tsx
import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

const ANIMATION_DURATION = 300;

function FadeInView({ children }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}
```

### Reanimated (Advanced)

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function SwipeableCard({ onSwipe }) {
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 120;

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(event.translationX > 0 ? 500 : -500);
        runOnJS(onSwipe)(direction);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <CardContent />
      </Animated.View>
    </GestureDetector>
  );
}
```

---

## 8. Forms

### React Hook Form + Zod

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    await signIn(data.email, data.password);
  };

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Password"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
          />
        )}
      />

      <Button
        title={isSubmitting ? 'Signing in...' : 'Sign In'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </View>
  );
}
```

---

## 9. Performance Optimization

### FlashList for Long Lists

```tsx
import { FlashList } from '@shopify/flash-list';

function ProductList({ products }) {
  return (
    <FlashList
      data={products}
      renderItem={({ item }) => <ProductCard product={item} />}
      estimatedItemSize={120}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const ProductCard = memo(function ProductCard({ product, onPress }) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Image source={{ uri: product.image }} />
      <Text>{product.name}</Text>
    </Pressable>
  );
});

// Memoize callbacks passed to children
function ProductList({ products }) {
  const handlePress = useCallback((id: string) => {
    router.push(`/product/${id}`);
  }, []);

  return (
    <FlashList
      data={products}
      renderItem={({ item }) => (
        <ProductCard product={item} onPress={handlePress} />
      )}
      estimatedItemSize={120}
    />
  );
}
```

### InteractionManager

```tsx
import { InteractionManager } from 'react-native';

function HeavyScreen() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for navigation animation to complete
    InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) return <SkeletonLoader />;

  return <HeavyContent />;
}
```

---

## 10. Constants & Configuration

### Named Constants

```typescript
// constants/app.ts
export const ANIMATION = {
  DURATION_FAST: 150,
  DURATION_NORMAL: 300,
  DURATION_SLOW: 500,
} as const;

export const LAYOUT = {
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 49,
  SPACING_XS: 4,
  SPACING_SM: 8,
  SPACING_MD: 16,
  SPACING_LG: 24,
  SPACING_XL: 32,
} as const;

export const GESTURE = {
  SWIPE_THRESHOLD: 120,
  VELOCITY_THRESHOLD: 500,
} as const;
```

### Environment Config

```typescript
// constants/config.ts
import Constants from 'expo-constants';

export const CONFIG = {
  API_URL: Constants.expoConfig?.extra?.apiUrl || 'https://api.example.com',
  ENV: Constants.expoConfig?.extra?.env || 'development',
  VERSION: Constants.expoConfig?.version || '1.0.0',
};
```

---

## Best Practices Summary

1. **Functional components only** - No class components
2. **Immutable state** - Never mutate, always return new objects
3. **Platform awareness** - Handle iOS/Android differences explicitly
4. **Performance first** - FlashList, memoization, lazy loading
5. **Type safety** - TypeScript + Zod everywhere
6. **Colocated styles** - StyleSheet next to component
7. **Named constants** - No magic numbers

## Related Skills

- For React patterns, see: `react-patterns`
- For performance optimization, see: `performance-patterns`
