# AI-Agents: how this project was built with Claude Code

Built 7 Nov 2026 in one hackathon evening; Claude Code wrote the code, the team planned, tested on a phone and decided.

### 1. Planning (grilling rounds)
- **Prompt (or summary of it):** plan the app from the team's plan PDF, brand kit and the hackathon rules before building anything.
- **What the AI produced:** rounds of decision questions (scope, backend, credits, free tier, pricing, video, demo flow).
- **What I kept:** A + B scope, Expo API routes, RevenueCat tiers + top-up, name login, server-side watermark.
- **What I changed or rejected, and why:** free tier = 3 images/week for a month; app name AdVerse; 1–3 universes instead of always 3, so a free user gets more tries.
- **Where the AI was wrong, and how I noticed:** it started building before the plan was agreed; we stopped it ("nothing gets built without planning") and the draft was archived.

### 2. Backend and app
- **Prompt (or summary of it):** build the agreed flow on fal.ai and RevenueCat.
- **What the AI produced:** API routes, credit ledger, RevenueCat products/entitlements/virtual currency via MCP, screens in the brand kit look.
- **What I kept:** all of it after phone tests.
- **What I changed or rejected, and why:** asked for an upgrade button, the fal logo on loading, a RevenueCat badge and editable prompts, so the jury sees the sponsors and we control the output.
- **Where the AI was wrong, and how I noticed:** on the phone, a video made after upgrading still carried the free watermark, and the app crashed while playing videos (several players at once). Both fixed; the watermark fix has a check script.

### 3. Model choices
- **Prompt (or summary of it):** pick fal models; later, use MiniMax H3 Max for video and GPT Image 2.6 Sunburst for images.
- **What the AI produced:** schema and price checks via the fal MCP, per-model input mapping, one measured test run per switch.
- **What I kept:** the team's model choices.
- **What I changed or rejected, and why:** replaced the AI's first picks (Kling 2.5, Nano Banana) with H3 Max and Sunburst.
- **Where the AI was wrong, and how I noticed:** None: the switches were team decisions, not corrections.

### 4. Pitch material
- **Prompt (or summary of it):** architecture schema, 2-minute pitch deck, PDF export.
- **What the AI produced:** an architecture page, a 7-slide deck with speaker notes, a PDF built locally with headless Edge.
- **What I kept:** structure and timing around the live demo.
- **What I changed or rejected, and why:** team name still to confirm (Club or Group).
- **Where the AI was wrong, and how I noticed:** deck numbers went stale after each model switch; caught when switching models.
