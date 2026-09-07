import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

// ============================================================================
// PURCHASE ABSTRACTION - real RevenueCat on iOS and Android. The only other
// path is a local mock used by the web design preview, which is not shipped;
// see the SAFETY note below for why native never falls back to it.
//
// Both paths share one public interface so no screen code needs to know which
// is active. See docs/BUILD_PLAN.md "Payments" for setup context.
//
// Entitlement identifier in RevenueCat's dashboard: "pro" (must match exactly).
// Offering/package: a "Lifetime" package attached to product ID
// LIFETIME_PRODUCT_ID below, attached to the "pro" entitlement.
// ============================================================================

const STORAGE_KEY = 'mockPurchase.isPro';
const LIFETIME_PRICE_DISPLAY = '$9.99';
// Must match the App Store Connect / Play Console product ID exactly.
// NOTE: this replaced 'lifetime_unlock', which Apple had recorded as a CONSUMABLE.
// A lifetime unlock must be NON-CONSUMABLE or Apple will never return it from a
// restore, which would break reinstall recovery permanently. An IAP's type cannot
// be changed after creation and Apple never releases a used product ID, so the
// product had to be recreated under a new ID. Do not point this back at the old one.
const LIFETIME_PRODUCT_ID = 'lifetime_access';
const ENTITLEMENT_ID = 'pro'; // matches the Entitlement identifier created in the RevenueCat dashboard

// Expo inlines EXPO_PUBLIC_* env vars at build time - see .env.example.
// Real purchases only activate when BOTH a key exists for this platform AND
// we're on a native build (react-native-purchases has no web implementation).
const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : Platform.OS === 'android'
      ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      : undefined;

const USE_REAL_REVENUECAT = Platform.OS !== 'web' && !!REVENUECAT_API_KEY;

// SAFETY: a build with no RevenueCat key must NOT fall back to the local mock -
// that would grant lifetime access for free to everyone. The mock exists ONLY for
// the web design preview, which is not a shipping target. On iOS and Android,
// with or without a key, there is no path that grants an entitlement locally:
// if the key is missing (bad EAS environment binding, Android not set up yet)
// purchases fail CLOSED with a clear message instead of unlocking.
// eas.json binds each build profile to an EAS environment so the key is injected.
const USE_MOCK_PURCHASES = !USE_REAL_REVENUECAT && Platform.OS === 'web';
const PURCHASES_UNAVAILABLE = !USE_REAL_REVENUECAT && !USE_MOCK_PURCHASES;

// Apple's FIRST product fetch after an in-app purchase is created can take
// 60s+ on a cold cache; a short timeout turns "slow" into a false "failed".
// The real defense against a spinning button is the launch-time warm-up below,
// which means the paywall is normally reading an already-cached result.
const OFFERINGS_TIMEOUT_MS = 90000;

/** Rejects if `p` has not settled within `ms`, so a stalled StoreKit call can't hang the UI. */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

interface PurchaseContextValue {
  isPro: boolean;
  loading: boolean;
  priceDisplay: string;
  usingRealBackend: boolean;
  purchaseLifetime: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; restored: boolean }>;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [entitled, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const configured = useRef(false);

  useEffect(() => {
    if (USE_REAL_REVENUECAT) {
      if (!configured.current) {
        configured.current = true;
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          // RevenueCat reports SDK-level problems via console.error, which the
          // dev client turns into a full-screen red LogBox. In development we
          // route them to console.warn (a dismissible yellow banner) so a known
          // config-in-progress state - e.g. "None of the products ... could be
          // fetched from App Store Connect" while Apple's Paid Apps agreement or
          // the IAP's "Ready to Submit" status is pending - doesn't block
          // testing the rest of the app. Release builds don't show LogBox at all.
          Purchases.setLogHandler((level, message) => {
            if (level === LOG_LEVEL.ERROR) console.warn(`[RevenueCat] ${message}`);
            else console.log(`[RevenueCat] ${message}`);
          });
        }
        Purchases.configure({ apiKey: REVENUECAT_API_KEY! });
        Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate);
        // Warm the offerings cache at launch so the paywall doesn't pay for the
        // slow first StoreKit round-trip when the user actually taps Unlock.
        Purchases.getOfferings().catch(() => {});
      }
      Purchases.getCustomerInfo()
        .then(onCustomerInfoUpdate)
        .catch(() => setLoading(false));
    } else if (USE_MOCK_PURCHASES) {
      AsyncStorage.getItem(STORAGE_KEY).then((v) => {
        setIsPro(v === 'true');
        setLoading(false);
      });
    } else {
      // Release build without a key: nobody is pro, and nobody can become pro.
      setIsPro(false);
      setLoading(false);
    }
  }, []);

  function onCustomerInfoUpdate(customerInfo: CustomerInfo) {
    setIsPro(customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
    setLoading(false);
  }

  const purchaseLifetime = async () => {
    if (USE_REAL_REVENUECAT) {
      try {
        const offerings = await withTimeout(
          Purchases.getOfferings(),
          OFFERINGS_TIMEOUT_MS,
          'The App Store is taking longer than usual. Please try again in a moment.'
        );
        const pkg = offerings.current?.lifetime;
        if (!pkg) {
          // RevenueCat is reachable but the App Store returned no product for this
          // account/region. Nothing the user can do, so say so plainly.
          return { success: false, error: 'This purchase is temporarily unavailable. Please try again later.' };
        }
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const unlocked = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        setIsPro(unlocked);
        if (unlocked) return { success: true };
        // Paid, but nothing was granted. This is a store-side configuration fault
        // (the product is not attached to the entitlement), never the user's doing -
        // so never fail silently here: they have been charged and must be told what
        // to do next. Restore is the recovery path once the mapping is fixed.
        return {
          success: false,
          error:
            "Your purchase went through, but access couldn't be activated. Tap Restore Purchases, or contact support if it doesn't unlock.",
        };
      } catch (e: any) {
        if (e?.userCancelled) return { success: false, error: 'cancelled' };
        return { success: false, error: e?.message ?? 'Purchase failed' };
      }
    }
    if (PURCHASES_UNAVAILABLE) {
      return {
        success: false,
        error: 'In-app purchases are not available in this build. Please update the app from the App Store.',
      };
    }
    // Mock path - web design preview only (never reached on iOS/Android).
    await new Promise((r) => setTimeout(r, 600));
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setIsPro(true);
    return { success: true };
  };

  const restorePurchases = async () => {
    if (USE_REAL_REVENUECAT) {
      try {
        const customerInfo = await Purchases.restorePurchases();
        const restored = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        // Only ever upgrade on restore. A restore that finds nothing (wrong Apple
        // ID, offline, transient failure) must not revoke access from someone who
        // has already paid - RevenueCat's own listener handles real expiry.
        if (restored) setIsPro(true);
        return { success: true, restored };
      } catch (e) {
        return { success: false, restored: false };
      }
    }
    if (PURCHASES_UNAVAILABLE) return { success: false, restored: false };
    await new Promise((r) => setTimeout(r, 500));
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    const restored = v === 'true';
    if (restored) setIsPro(true);
    return { success: true, restored };
  };

  const value = useMemo(
    () => ({
      isPro: entitled,
      loading,
      priceDisplay: LIFETIME_PRICE_DISPLAY,
      usingRealBackend: USE_REAL_REVENUECAT,
      purchaseLifetime,
      restorePurchases,
    }),
    [entitled, loading]
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchase must be used within PurchaseProvider');
  return ctx;
}

export { LIFETIME_PRODUCT_ID, ENTITLEMENT_ID };
