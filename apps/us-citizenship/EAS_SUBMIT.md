# Submitting to the App Store

Submit credentials are deliberately **not** in `eas.json`, because this repository is
public. `eas.json` keeps only `ascAppId`, which is public anyway — it is in the App Store
URL.

Everything else is supplied at submit time from the environment. Set these locally (in your
shell profile, or a gitignored file you source) before submitting:

```sh
export EXPO_APPLE_ID="…"                       # the Apple ID that owns the app
export EXPO_ASC_API_KEY_PATH="…/AuthKey_XXXXXXXXXX.p8"
export EXPO_ASC_KEY_ID="…"
export EXPO_ASC_ISSUER_ID="…"
export EXPO_APPLE_TEAM_ID="…"
```

Then:

```sh
cd apps/us-citizenship
eas submit --platform ios --profile production
```

`eas submit` prompts for anything it cannot find, so a missing variable is a question, not
a failure.

## The .p8 key

It stays on the machine and is never committed — `.gitignore` blocks `*.p8` outright. If
you move machines, download a fresh key from App Store Connect → Users and Access → Keys
rather than copying the old one around, and revoke the old one.

## Why this changed

The submit block used to hold the Apple ID, team ID, key ID, issuer ID and a local path to
the `.p8`. None of it is a credential on its own — the private key was never in the
repository — but it is account metadata that does not belong on the public internet, and a
path under one person's home directory means the config only works on one machine.
