# CLAUDE.md: ai-ad-studio (AdVerse)

## Layout
- `src/app/` screens: `index.tsx` (login), `paywall.tsx` (plans), `create.tsx` (whole creative flow)
- `src/app/api/*+api.ts` server routes: director, multiverse, crossover, video, account
- `src/server/` server-only helpers: `fal.ts` (fal calls, retry, watermark), `ledger.ts` (free tier, credits, history), `revenuecat.ts` (REST v2, optional), `http.ts`
- `src/lib/` shared: `universes.ts` (6 universes + prompt rules), `i18n.ts` (EN/TR), `session.ts`, `media.ts`, `theme.ts`
- `scripts/` smoke tests against a running server (they spend real fal credits)
- `docs/architecture/` diagrams · `docs/handovers/` status · `_template_archive/` untouched Expo template code
- `data/ledger.json` runtime state (git-ignored)

## Commands
- `npx expo start --port 8082` (web + LAN) · `npx expo start --tunnel ngrok --port 8083` (phone on another network)
- `npx tsc --noEmit` · `node scripts/check-*.mjs 8082`

## Never
- Never put `FAL_KEY` or `RC_SECRET_KEY` in app code or in any `EXPO_PUBLIC_` variable.
- Never commit `.env` or `data/`.
- Never send a prompt to fal without the product-protection rules (`RULES`, `VIDEO_RULES` in `src/lib/universes.ts`).
- Never charge credits for an image or video that did not come back.
- Never return `rawUrl` (clean original of a free image) to the app.
