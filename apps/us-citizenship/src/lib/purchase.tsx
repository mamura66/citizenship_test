import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

// ============================================================================
// PURCHASE ABSTRACTION - real RevenueCat on iOS and Android. The only other
// path is a local mock for the web design preview, and it is reachable ONLY when
// somebody opts in explicitly; see the SAFETY note below.
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

// SAFETY: the mock grants the entitlement locally, so a missing key must never be
// what selects it. It used to be - the condition was
// `!USE_REAL_REVENUECAT && Platform.OS === 'web'` - which meant the mock was
// chosen for the *absence* of configuration. Nothing shipped that way, because
// the Expo web build is not deployed (the public site is the separate Cloudflare
// Worker in site/, which decides access server-side from a verified Paddle
// payment). But `expo export --platform web` on a machine without .env.local
// would have produced a bundle that handed out lifetime access to every visitor,
// and that is one command away from a real incident.
//
// So the mock now needs somebody to ask for it, by name, on web only:
//
//     EXPO_PUBLIC_MOCK_PURCHASES=1 npx expo start --web
//
// Anything else fails CLOSED. No key on iOS or Android (bad EAS environment
// binding, Android not configured yet) means purchases are unavailable and the
// paywall says so; it never means access is granted. eas.json binds each build
// profile to an EAS environment so the real key is injected, and the flag below
// is never set in any of those environments.
const MOCK_PURCHASES_OPT_IN = process.env.EXPO_PUBLIC_MOCK_PURCHASES === '1';
const USE_MOCK_PURCHASES = Platform.OS === 'web' && MOCK_PURCHASES_OPT_IN && !USE_REAL_REVENUECAT;
const PURCHASES_UNAVAILABLE = !USE_REAL_REVENUECAT && !USE_MOCK_PURCHASES;

// Named in every user-facing message, because "the store" is vague and the
// recovery step differs (re-signing in with a different Apple ID vs a Google
// account). iOS is the only shipping platform today; Android is planned.
const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : 'the App Store';

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

/**
 * Why a restore ended the way it did.
 *
 * Restore used to answer `{ success: false, restored: false }` for a store error,
 * a network failure AND an account that genuinely owns nothing, and both callers
 * turned all three into "No previous purchase found for this account." That tells
 * a customer who has paid, and whose Wi-Fi dropped, that they never bought the
 * app - which sends them to request a refund or buy a second copy instead of
 * simply retrying. The outcomes are worded separately now.
 */
export type RestoreResult =
  | { outcome: 'restored' }
  /** The store answered, and this account owns no entitlement. */
  | { outcome: 'no-purchase' }
  /** We never got an answer, so we know nothing about what they own. */
  | { outcome: 'store-unreachable'; error: string }
  /** This build has no purchase backend at all. */
  | { outcome: 'unavailable' };

interface PurchaseContextValue {
  isPro: boolean;
  loading: boolean;
  priceDisplay: string;
  usingRealBackend: boolean;
  /** True when the local mock is standing in for a real store. Screens must say so
   *  on screen: a stub that looks like the real thing is how a purchase bug hides. */
  usingMockBackend: boolean;
  purchaseLifetime: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<RestoreResult>;
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
      // Fail closed and say so. Never grant anything from here.
      return {
        success: false,
        error: `In-app purchases aren't available in this build, so nothing can be unlocked here. Please update the app from ${STORE_NAME}.`,
      };
    }
    // Mock path - web design preview only, and only with EXPO_PUBLIC_MOCK_PURCHASES=1.
    // Unreachable on iOS and Android, and unreachable on web without the opt-in.
    await new Promise((r) => setTimeout(r, 600));
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setIsPro(true);
    return { success: true };
  };

  const restorePurchases = async (): Promise<RestoreResult> => {
    if (USE_REAL_REVENUECAT) {
      try {
        const customerInfo = await Purchases.restorePurchases();
        const restored = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        // Only ever upgrade on restore. A restore that finds nothing (wrong Apple
        // ID, offline, transient failure) must not revoke access from someone who
        // has already paid - RevenueCat's own listener handles real expiry.
        if (restored) setIsPro(true);
        return restored ? { outcome: 'restored' } : { outcome: 'no-purchase' };
      } catch (e: any) {
        // A thrown error means the check never completed. We do NOT know whether
        // this account owns the product, so we must not say it owns nothing.
        return { outcome: 'store-unreachable', error: e?.message ?? `Couldn't reach ${STORE_NAME}.` };
      }
    }
    if (PURCHASES_UNAVAILABLE) return { outcome: 'unavailable' };
    await new Promise((r) => setTimeout(r, 500));
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    const restored = v === 'true';
    if (restored) setIsPro(true);
    return restored ? { outcome: 'restored' } : { outcome: 'no-purchase' };
  };

  const value = useMemo(
    () => ({
      isPro: entitled,
      loading,
      priceDisplay: LIFETIME_PRICE_DISPLAY,
      usingRealBackend: USE_REAL_REVENUECAT,
      usingMockBackend: USE_MOCK_PURCHASES,
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

/**
 * The message to show for a restore outcome, shared by the paywall and Settings so
 * the two cannot drift. 'store-unreachable' deliberately does NOT claim anything
 * about what the account owns, and says the purchase is still intact.
 */
export function restoreMessage(result: RestoreResult): string {
  switch (result.outcome) {
    case 'restored':
      return 'Purchase restored — you have full access.';
    case 'no-purchase':
      return `No purchase found on this ${Platform.OS === 'android' ? 'Google' : 'Apple'} account. If you bought it with a different one, sign in with that account and try again.`;
    case 'store-unreachable':
      return `Couldn't reach ${STORE_NAME} to check your purchases, so we don't know yet — your purchase is safe. Check your connection and try again.`;
    case 'unavailable':
      return `In-app purchases aren't available in this build, so there's nothing to restore here.`;
  }
}

export { LIFETIME_PRODUCT_ID, ENTITLEMENT_ID };
