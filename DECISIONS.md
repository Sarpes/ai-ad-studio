# DECISIONS: AdVerse (ai-ad-studio)

Built at the Third Room × Neon Apps × RevenueCat × fal AI Hackathon, 7 Nov 2026 (Utilities category).
Sources: `AI_Ad_Studio_Tam_Is_Plani_ve_Uygulama_Sureci.pdf` (plan), `AdVerse_Brand_Kit.pdf` (brand).

### D1. One Expo project with API routes instead of a separate backend
- **Context:** the plan (p.09) asks for a small Node/Next.js backend that hides keys and starts generation.
- **Options considered:** separate Next.js app; Expo Router API routes (`src/app/api/*+api.ts`).
- **Chosen:** Expo Router API routes.
- **Why:** one project, one start command; Expo Go on the phone and the web build call the same server on the laptop.
- **Rejected:** Next.js, because it adds a second project and deploy inside a 2-hour window.
- **Cost / trade-off:** the demo server is the laptop; no public URL unless deployed (EAS Hosting).
- **What would make you change it:** a public launch with real traffic, which needs hosting and auth.

### D2. Login name = RevenueCat customer ID
- **Context:** the free tier is "per account", but accounts are post-hackathon (plan p.07, C list).
- **Options considered:** anonymous RevenueCat ID; name-only login via `Purchases.logIn(name)`; real auth.
- **Chosen:** name-only login; the jury sees the customer "A Lab Study Club" and its purchase in RevenueCat.
- **Why:** real RevenueCat identity with no password system; re-login restores the plan (verified: "rehearsal 1" came back as Studio).
- **Rejected:** anonymous ID (cannot be shown on stage, reinstall = new free month); real auth (time).
- **Cost / trade-off:** anyone who types the same name is the same customer. Demo-only.
- **What would make you change it:** any real users, which means Sign in with Apple/Google plus RevenueCat aliasing.

### D3. Plans: Free + Creator/Studio monthly + one-time top-up
- **Context:** plan p.11 has credit packs; brand kit p.04 has "40 credits a month, cancel anytime".
- **Options considered:** packs only; subscription only; tiers plus a top-up.
- **Chosen:** Free (3 images/week for the first 30 days, watermark, no video) · Creator $12.99/mo, 40 credits, short video · Studio $29.99/mo, 100 credits, premium video · Top-up $4.99, +10 credits. Costs: image 1 (Multiverse 3), Crossover 1, short video 5, premium video 10.
- **Why:** tiers carry the demo story (free → premium) and show subscriptions plus a consumable in RevenueCat.
- **Rejected:** packs only (no tier story); subscription only (loses the plan's credit logic).
- **Cost / trade-off:** measured fal cost: image $0.0398, Kling $0.07/s, so a premium video costs $0.70 for 10 credits (~$3 at Studio price).
- **What would make you change it:** real conversion data (plan p.11, "3 tests").

### D4. Watermark and standard quality are applied on the server
- **Context:** a watermark drawn only in the app disappears when the image is downloaded.
- **Options considered:** in-app overlay; server-side stamping.
- **Chosen:** `sharp` resizes free images to 720 px and stamps "Made with AdVerse" bottom-right at 60% (brand kit p.09).
- **Why:** the free/paid difference has to survive a download; verified on a downloaded free image.
- **Rejected:** in-app overlay (bypassed by saving the image).
- **Cost / trade-off:** one extra upload per free image (~1 s).
- **What would make you change it:** None: this is the minimum for the free tier to be real.

### D5. Credits: RevenueCat Virtual Currency "CRD", local ledger fallback
- **Context:** plan p.09 says balance and spending belong on the backend, not the app.
- **Options considered:** RevenueCat Virtual Currency; own server ledger; on-device balance.
- **Chosen:** Virtual Currency CRD (Creator 40 and Studio 100 expire at cycle end; top-up 10). The server spends via REST v2 only when `RC_SECRET_KEY` is set; otherwise `data/ledger.json` holds the balance.
- **Why:** RevenueCat becomes the source of truth with no code change once the secret key exists.
- **Rejected:** on-device balance (anyone can bypass it).
- **Cost / trade-off:** without the secret key the server can only trust the app's tier claim, and it does so **only when `ALLOW_INSECURE_DEMO=1`** (set in the local demo `.env`; off by default, so a fresh deploy fails closed to Free). The fal spend cap `FAL_MAX_JOBS` (default 120) bounds the damage on the venue Wi-Fi.
- **What would make you change it:** setting `RC_SECRET_KEY` (switches automatically).

### D6. fal models
- **Context:** plan p.15 names packaging drift as the top risk; brand kit wants 9:16.
- **Options considered:** image `nano-banana/edit` ($0.0398) vs `nano-banana-2/edit` ($0.08); video Kling 2.5 turbo ($0.07/s, 5 or 10 s) vs Kling 3 standard ($0.14/s); Director `any-llm`.
- **Chosen:** `fal-ai/nano-banana/edit`, `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`, `fal-ai/any-llm` (Gemini 2.5 Flash) with template fallback.
- **Why:** cheapest models that take the product photo as input and give exactly 5 s / 10 s; measured a 10 s clip in 109 s.
- **Rejected:** the pricier variants until the side-by-side test on real product photos.
- **Cost / trade-off:** nano-banana sometimes returns `no_media_generated` (4 of 6 calls on fal's sample photo); one automatic retry, and only delivered images are charged.
- **What would make you change it:** the side-by-side test on the team's real product photos.

### D7. Human in the loop before any spend
- **Context:** plan p.08 says claims must be approved by the user; image models misspell text.
- **Options considered:** text drawn into the image; text approved and overlaid by the app; no text.
- **Chosen:** the Director's headlines and captions are shown and editable before "Open Multiverse"; images carry no text; the app overlays the approved headline.
- **Why:** reliable spelling, the user approves every word, and nothing is charged at the idea step.
- **Rejected:** drawn-in text (misspellings, invented claims).
- **Cost / trade-off:** the downloaded image has no headline; the user posts the caption themselves.
- **What would make you change it:** a model that renders text reliably, plus a claim filter.

## Assumptions
- The RevenueCat Test Store purchase flow behaves in Expo Go as it does in the browser (browser verified 7 Nov).
- The venue Wi-Fi lets the phone reach the laptop's dev server.

## Not done (and why)
- Real accounts, purchase history, multi-scene video, brand kit, auto-posting: plan p.07 C list, after the hackathon.
- Server-side RevenueCat verification: waits for a v2 secret key (D5).
- Brand-kit animations (Multiverse fan-out, V loading fill): time.
