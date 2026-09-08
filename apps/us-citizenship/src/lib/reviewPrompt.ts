/* Asking for an App Store rating - at the one moment it is earned.
 *
 * Ratings are what moves an app in App Store search. The apps this one competes with
 * have 65,000 to 104,000 of them; this one launched with none, and no amount of listing
 * copy closes that gap. The only honest way to close it is to ask people who have just
 * had a good experience, and Apple's own prompt (SKStoreReviewController, via
 * expo-store-review) is the only way to ask that does not leave the app.
 *
 * WHEN. After a PASSED practice test, and only the first time that happens. Somebody who
 * has just cleared the pass line is pleased and has proof the app works; somebody who has
 * just failed is neither, and asking them is both unkind and counter-productive. Never on
 * launch, never from a button - Apple's guidance is explicit that the prompt must not be
 * tied to a user action, and that you should not ask while the person is doing something
 * time-sensitive. The results screen is the one place in this app that is neither.
 *
 * HOW OFTEN. Apple decides. The system shows the sheet at most three times in 365 days per
 * app, and silently shows nothing the rest of the time - `requestReview()` resolves either
 * way, so this code cannot know whether anything appeared. On top of that this file asks
 * at most ONCE per app version, so a person who passes forty tests is not asked forty
 * times. Apple's cap is the ceiling; ours is much lower.
 *
 * WHAT IT NEVER DOES. No "Rate us!" button, no pre-prompt asking "do you like the app?"
 * to filter out the unhappy (Apple rejects that pattern and it is a dark pattern besides),
 * no reward, no gate. Studying is free regardless.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

const KEY = 'reviewPrompt.askedForVersion';

/** The version string of the running build, so a new release may ask once more. */
function currentVersion(): string {
  return Constants.expoConfig?.version || 'unknown';
}

/**
 * Ask for a rating if this version has not asked before and the platform can show it.
 *
 * Safe to call freely: every failure path is a no-op. Storage errors, an unavailable
 * store review API (web, some Android builds, simulators) and a rejected promise all just
 * mean nothing happens - a rating prompt must never be able to break the results screen.
 */
export async function maybeAskForReview(): Promise<void> {
  const version = currentVersion();
  try {
    const asked = await AsyncStorage.getItem(KEY);
    if (asked === version) return;
  } catch {
    // Cannot tell whether we have asked. Do not ask: a missing prompt costs nothing,
    // a repeated one is exactly what this key exists to prevent.
    return;
  }

  let available = false;
  try {
    available = await StoreReview.isAvailableAsync();
  } catch {
    available = false;
  }
  if (!available) return;

  // Record BEFORE asking. If the app is backgrounded or killed while the sheet is up, the
  // next pass would otherwise ask again - and "asked once" has to mean once.
  try {
    await AsyncStorage.setItem(KEY, version);
  } catch {
    return;
  }

  try {
    await StoreReview.requestReview();
  } catch {
    // Apple declined to show it, or the platform refused. Nothing to do and nothing to
    // retry - the version is marked, and that is the correct state either way.
  }
}

/**
 * The condition under which a rating is worth asking for.
 *
 * Kept as a pure function so the rule can be read and tested on its own: a pass, on a
 * full-length test. A pass on a three-question practice run is not the moment.
 */
export function isReviewWorthyResult(passed: boolean, questionsAsked: number, realTestLength: number): boolean {
  return passed && questionsAsked >= Math.min(realTestLength, 10);
}
