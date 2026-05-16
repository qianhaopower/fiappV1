# FIApp v1 — Manual Launch Checklist (v2 UI)

Run this end-to-end before any public launch or major release. Use a real device (phone + desktop). Automated tests cover rules; this covers the human experience.

Last revised: 2026-05-13 (v2 business-logic refactor).

**Sign in as a real test user with a populated account before starting sections 2–8.**

---

## 0. Pre-launch infra

- [ ] Production URL loads (`main.*.amplifyapp.com` and `friendsintelligence.net`)
- [ ] Amplify environment variables are set (`FIAPP_AWS_ACCESS_KEY_ID`, `FIAPP_AWS_SECRET_ACCESS_KEY`, `FIAPP_AWS_REGION`, `FIAPP_RETURNS_TABLE`, `FIAPP_MAIN_TABLE`)
- [ ] CI is green on `main` branch (lint + typecheck + unit + Layer 3 E2E smoke)
- [ ] No open `P0` GitHub issues

---

## 1. Auth flow

- [ ] `/auth` loads — Friends Intelligence logo, sign in tab visible, no layout breaks
- [ ] Sign up: create a new account with email + password — confirmation email received
- [ ] Confirm email → redirected into app (lands on `/onboarding` for new users, `/today` for returning users with assessment)
- [ ] Sign in with confirmed account → lands on correct page per `decideRoute` (auth → `/auth`; authed without assessment → `/onboarding`; authed with assessment → `/today`)
- [ ] Wrong password → error message visible, not cryptic
- [ ] "Forgot password" flow — email sent, reset works
- [ ] Sign out → redirected to `/auth`, cannot navigate back to protected pages
- [ ] **Mobile**: auth form not cut off, keyboard doesn't obscure input fields

---

## 2. Assessment

- [ ] All **35** questions load, no missing text
- [ ] Yes / No buttons respond — question auto-advances
- [ ] Back button works — previous answer is preserved
- [ ] Progress bar advances correctly
- [ ] Restart button clears answers (confirm dialog works)
- [ ] Submit on last question → spinner visible, then redirected to `/results`
- [ ] **Mobile**: question text readable, buttons not overlapping, progress bar visible

---

## 3. Results / Insights

- [ ] Focus Pillar card shows the user's lowest-scoring pillar with the correct pillar colour
- [ ] Help tooltip on Focus Pillar opens and reads correctly
- [ ] Radar chart renders — all 7 pillars visible, focus pillar dot highlighted
- [ ] All 7 pillars listed below with correct scores (N/5) and coloured progress bars; the focus pillar has the `focus` tag
- [ ] **3 suggested practices** shown, all from the lowest-scoring pillar, in deterministic order (weakest-answer first)
- [ ] Each suggestion card shows: pillar badge, title, description, rationale
- [ ] **CTA per suggestion** matches state:
  - No `UserPractice` yet → "Start this practice"
  - Currently paused → "Resume" + the helper line "You started this before — currently paused. Resume anytime."
  - Currently active → "Active" badge + "View on Today" link
- [ ] **"Browse all 35 practices →"** secondary link is present
- [ ] **"Go to Today →"** primary CTA at bottom
- [ ] **"Retake assessment"** button visible with explainer text
- [ ] Empty state (no assessment yet): CTA to start assessment shown — radar/scores absent
- [ ] **Mobile**: radar chart not clipped, pillar labels readable
- [ ] **No v1 vocabulary** anywhere: "Try this practice", "Your focus", "Go to My Practices", "Inactive", "Bring this back" must not appear

---

## 4. Practices (the 35-practice bank)

- [ ] Heading reads **"Practice Bank"** with subtitle "All 35 practices, grouped by pillar."
- [ ] All **7 pillar sections** present in pillar order: Financial / Relationship / Information / Emotional / Nutrition / Dynamic / Sleep — each as a `Pillar Intelligence` heading with a coloured dot
- [ ] Each pillar section contains exactly **5 cards** (total: 35)
- [ ] Each card shows pillar badge, title, description; one of three states:
  - **No record** — just the pillar badge; right side shows "Start this practice"
  - **Active** — pillar badge + "Active" badge; right side shows "View on Today" (link) + "Pause" (ghost)
  - **Paused** — pillar badge + "Paused" badge; helper line below description ("You've practiced this N times before — currently paused. Resume anytime." or "You started this before — currently paused. Resume anytime." if N=0); right side shows "Resume"
- [ ] Clicking **Start this practice** when 0 active: practice becomes Active immediately, no dialog
- [ ] Clicking **Start this practice** when 1 active (Free user): the **switch dialog** appears with:
  - Title: `Switch to "[new practice title]"?`
  - Body: `"[current title]" will be paused. You can resume it anytime.`
  - Buttons: `Switch` and `Cancel`
- [ ] **Switch** action: old practice moves to Paused, new one becomes Active
- [ ] **Cancel** closes the dialog with no state change
- [ ] Clicking **Pause** on an active card → moves it to the same pillar's Paused state
- [ ] Clicking **Resume** on a paused card → activates it (subject to cap; triggers switch dialog if Free at cap)
- [ ] Paid user with 10 active → "Start" on an 11th shows the cap message: `You're at the 10-practice limit. Pause one first.`
- [ ] Top-right action is **"Go to Today →"**
- [ ] **No v1 controls** anywhere: Set focus, Replace, Promote, Discard, Trying out, days-remaining badge, "Bring this back", "Make inactive", "Inactive" badge
- [ ] **Mobile**: cards stack cleanly; pillar headings readable; switch dialog fits the viewport

---

## 5. Today

- [ ] Heading reads **"Today"**
- [ ] **`/today` is always reachable** once authed + has assessment — never redirects to `/results` or `/practices`
- [ ] **0 active practices** → empty state:
  - Heading text: "Choose one practice to start."
  - Sub-copy: "Pick something from your practice bank to begin building a daily habit."
  - CTAs: "Browse practices →" (link) and "Take assessment" (link)
- [ ] **1+ active practices** → each rendered as its own card with:
  - Pillar badge (no "Today's focus" badge anywhere)
  - Title + description
  - `✓ Did it` primary button + `Not today` secondary button
  - Help tooltip explains Did it / Not today
- [ ] Logging **Did it** → button confirms, completion count appears ("You've done this N times."), 14-day dots show today filled
- [ ] Logging **Did it** again → toggles off (dot clears, count decreases)
- [ ] Logging **Not today** → "No worries. Tomorrow is a fresh start."
- [ ] **14-day dot strip** only appears after the first check-in for that practice; filled = blue, skipped = grey, empty = faint
- [ ] Hover on dot shows formatted date + status tooltip
- [ ] **Milestone banner** appears after unlock, dismisses cleanly
- [ ] Bottom nav: `← Browse practices` and `View progress →` links
- [ ] Error state: "Try again" reloads correctly
- [ ] **No v1 elements** anywhere: "Today's focus" chip, "Trying out" section, trial day countdown, "No focus practice set yet"
- [ ] **Mobile**: buttons full width, dots not too small to see

---

## 6. Progress

- [ ] Total check-ins, current streak, longest streak, practices started all display
- [ ] **Streak** number reflects pure rolling logic — consecutive days ending today with `didIt=true`. A gap (whether from missed days or a paused period) breaks the streak.
- [ ] "Coming up" milestones section shows next milestone with progress bar (if any)
- [ ] Achieved milestones listed (or empty state if none)
- [ ] Empty state (zero activity): page doesn't crash, zero values shown cleanly
- [ ] **Mobile**: stats grid doesn't overflow

---

## 7. Account

- [ ] Email displayed correctly
- [ ] Plan label shows "Free plan" or "Plus plan" correctly
- [ ] "Retake assessment" link navigates to `/assessment`
- [ ] Sign out works
- [ ] **Mobile**: readable, no layout issues

---

## 8. Navigation & App shell

- [ ] All 4 nav items work: Today, Practices, Insights (Results), Progress
- [ ] Active nav item is visually highlighted
- [ ] Account dropdown: opens/closes, shows email + plan + sign out
- [ ] Free plan: "Upgrade to Plus" appears in dropdown, click shows the appropriate flow
- [ ] Plus plan: no upgrade CTA shown
- [ ] **Mobile**: hamburger menu opens/closes, all items tappable, no overflow
- [ ] Trackpad horizontal scroll: page does not shake/overflow

---

## 9. Plan gating spot check

- [ ] **Free user, 1 active practice** — clicking "Start this practice" on a different practice opens the switch dialog (not a hard error); confirming switches; cancelling does nothing
- [ ] **Free user, 0 active practices** — Start works immediately, no dialog
- [ ] **Paid user, 0–9 active practices** — Start works, no warning
- [ ] **Paid user, 10 active practices** — Start shows inline error: `You're at the 10-practice limit. Pause one first.` (no switch dialog at 10 — that's Free-only)
- [ ] **No 5+/7+ warnings** appear on Paid plan (v2 dropped these)
- [ ] Dev toggle (`NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true`): Free ↔ Plus toggle works in dev, invisible in prod

---

## 10. Copy & tone

- [ ] No `Premium` or `Paid` labels visible anywhere (all show `Plus plan` / `Free plan`)
- [ ] Error messages are human — not raw codes or stack traces
- [ ] Empty states have helpful CTAs — not blank screens
- [ ] No placeholder text, `TODO`, or lorem ipsum visible
- [ ] Loading states have friendly copy (`Loading your insights…` etc.)
- [ ] **v1 vocabulary absent everywhere**: "Try this practice", "Today's focus", "Trying out", "Inactive" (as user-facing), "Bring this back", "Make inactive", "Welcome back" (as a section heading), "Set focus", "Replace", "Promote", "Discard"

---

## 11. Mobile UX pass (real device or DevTools mobile)

- [ ] Auth page: keyboard doesn't cover input
- [ ] Assessment: buttons easy to tap, no mis-taps
- [ ] Today: "Did it" button large and prominent
- [ ] Practices: pillar sections scroll cleanly, switch dialog fits viewport
- [ ] No horizontal scroll on any page
- [ ] Font sizes readable without zooming
- [ ] No text clipping or truncation in unexpected places

---

## 12. Performance spot check

- [ ] Today page loads in < 3s on a mobile connection (DevTools throttle to Fast 3G)
- [ ] Assessment loads all 35 questions without lag
- [ ] /practices renders 35 cards smoothly (no jank when scrolling)
- [ ] No visible layout shift (CLS) after initial load
- [ ] Radar chart renders without flicker

---

## Sign-off

| Area | Checked by | Date | Notes |
|---|---|---|---|
| Auth | | | |
| Assessment | | | |
| Results | | | |
| Practices (Bank) | | | |
| Today | | | |
| Progress | | | |
| Account | | | |
| Navigation | | | |
| Plan gating | | | |
| Copy & tone | | | |
| Mobile | | | |
| Performance | | | |
