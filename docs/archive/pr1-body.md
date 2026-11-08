## Goal
The whole AdVerse hackathon build (Third Room AI Hackathon, 7 Nov 2026, category Utilities): one product photo → ads for 1–3 audiences ("universes") → optional video, with a free tier and RevenueCat-paid plans.

## Choices
- **One Expo project with API routes** instead of a separate Next.js backend: one start command; the fal key stays on the server. (DECISIONS D1)
- **Login name = RevenueCat customer ID**, no password; rejected anonymous IDs because they cannot be shown on stage. (D2)
- **Free + Creator $12.99 + Studio $29.99 monthly + $4.99 top-up**, 1 credit per image; rejected packs-only (no tier story). (D3)
- **Watermark stamped on the server**; rejected an in-app overlay (lost on download). (D4)
- **Credits as RevenueCat Virtual Currency** when `RC_SECRET_KEY` is set, local ledger otherwise; trusting the app's plan only behind `ALLOW_INSECURE_DEMO=1`. (D5)
- **Models (team decision):** GPT Image 2.6 Sunburst (images), MiniMax H3 Max (video, prompt rewriting off), Gemini 2.5 Flash via any-llm (ideas). (D6)
- **Human in the loop:** headline, caption and the exact fal prompt are editable before anything is charged. (D7)

## Measurements
- `scripts/check-count.mjs` → PASS (1-image Multiverse charged 1, free 3→2; 0 picks → 400), run on Sunburst.
- `scripts/check-clean-source.mjs` → PASS (clean originals stored server-side, none leaked to the app).
- `scripts/check-video.mjs` → 5 s H3 Max clip in 16 s, charged 5 (Kling before: 10 s in 109 s).
- Browser walk-through (Opera, 420 px): login → paywall → free Multiverse 3/3 → video blocked on Free → Test Store Studio purchase → paid images unwatermarked → premium video.
- Secret scan of full history: 0 hits; `.env` and `data/` ignored.

## How to check
1. `npm install`, create `.env` (see README), `npx expo start --port 8082`, open http://localhost:8082.
2. Log in as a new name → Continue with Free → upload a product photo → Show me the ideas → Open Multiverse.
3. Upgrade → Test valid purchase → Premium video.
4. `npx tsc --noEmit` should be clean.

Not yet re-tested on the phone: single-video-player crash fix, editable prompts, H3 Max, Sunburst. Sunburst's price per image is not disclosed by the fal pricing API.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
