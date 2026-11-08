# AdVerse

**One product. Every universe.** AdVerse turns one product photo into ready-to-post ads for different audiences ("universes"), side by side, plus a short video. Built in one evening at the Third Room × Neon Apps × RevenueCat × fal AI Hackathon (Istanbul, 7 Nov 2026, category: Utilities).

## What it does

1. Log in with a name (it becomes the RevenueCat customer ID).
2. Upload a product photo; optionally add a creator photo for a Crossover (consent required).
3. Let the AI Director choose 1–3 universes (Luxe, Neon, Wild, Pulse, Glow, Cozy), pick them yourself, or write your own idea.
4. Check and edit the headline, caption and the exact prompt sent to fal.ai. Nothing is generated before you approve.
5. Open the Multiverse: one image per universe. Free images carry a "Made with AdVerse" watermark.
6. Upgrade through RevenueCat, then describe what happens and make a 5 s or 10 s video.

## Stack

| Layer | Tool |
|---|---|
| App (Android via Expo Go, and web) | Expo SDK 58, Expo Router, React Native, TypeScript |
| Server | Expo Router API routes (`src/app/api/*+api.ts`), same project |
| AI (all on fal.ai) | `fal-ai/any-llm` (Gemini 2.5 Flash) for ideas · `openai/gpt-image-2.6/sunburst/edit` for images · `minimax/h3-max/image-to-video` for video |
| Payments | RevenueCat (Test Store): monthly Creator/Studio subscriptions, one-time top-up, Virtual Currency `CRD` |

Architecture diagrams: `docs/architecture/adverse-architecture.html`. Decisions and trade-offs: `DECISIONS.md`.

## Run it

Requirements: Node 24, an Android phone with Expo Go, a fal.ai key, a RevenueCat Test Store public key.

```bash
npm install
# .env (never committed)
#   FAL_KEY=...                          server only
#   EXPO_PUBLIC_REVENUECAT_KEY=test_...  RevenueCat public SDK key
#   ALLOW_INSECURE_DEMO=1                demo only: trust the app's plan when no RC secret key is set
#   FAL_MAX_JOBS=40                      cap on fal jobs per server run
#   RC_SECRET_KEY=...                    optional: verify plans and spend credits via RevenueCat REST v2
npx expo start --port 8082                 # web: http://localhost:8082
npx expo start --tunnel ngrok --port 8083  # phone on another network: open the exp.direct URL in Expo Go
```

## Checks

These call real fal models and cost a few cents to a few dollars each.

```bash
npx tsc --noEmit
node scripts/smoke-api.mjs 8082          # director + multiverse on the free tier
node scripts/check-count.mjs 8082        # 1-3 universes, charged per delivered image
node scripts/check-clean-source.mjs 8082 # free images keep a server-only clean original
node scripts/check-video.mjs 8082        # one 5 s video, charged 5 credits
```

## Known limits

Hackathon build. No real user accounts (the login name is the identity); without `RC_SECRET_KEY` the server trusts the app's plan on the demo machine; the dev server runs on one PC. See `DECISIONS.md`, "Not done (and why)".
