# FIApp v1 — Manual Launch Checklist

> **PARTIALLY SUPERSEDED 2026-05-13 by [business-logic-v2.md](business-logic-v2.md).** This checklist will need full revision once v2 UI ships (Cuts 3-4 of the v2 refactor). Specifically: §3 "Try this practice → starts trial", all of §4 (Set focus / Pause / Resume / Replace / Trial promote+discard), §5 Today (focus chip, Trying-out section, trial logging, "no focus → redirect" hint), and §9 "Free user can replace…" are all replaced by the v2 active/inactive lifecycle and the always-accessible /today empty state. Sections 0-2, 6-8, 10-12 remain valid.

Run this end-to-end before any public launch or major release. Use a real device (phone + desktop). Automated tests cover rules; this covers the human experience.

**Sign in as a real test user with a populated account before starting sections 2–8.**

---

## 0. Pre-launch infra

- [ ] Production URL loads (`main.*.amplifyapp.com`)
- [ ] Amplify environment variables are set (`FIAPP_AWS_ACCESS_KEY_ID`, `FIAPP_AWS_SECRET_ACCESS_KEY`, `FIAPP_AWS_REGION`, `FIAPP_RETURNS_TABLE`, `FIAPP_MAIN_TABLE`)
- [ ] CI is green on `main` branch (lint + typecheck + unit + E2E smoke)
- [ ] No open `P0` GitHub issues

---

## 1. Auth flow

- [ ] `/auth` loads — Friends Intelligence logo, sign in tab visible, no layout breaks
- [ ] Sign up: create a new account with email + password — confirmation email received
- [ ] Confirm email → redirected into app (not stuck on auth screen)
- [ ] Sign in with confirmed account → lands on correct page (assessment if new, today if returning)
- [ ] Wrong password → error message visible, not cryptic
- [ ] "Forgot password" flow — email sent, reset works
- [ ] Sign out → redirected to `/auth`, cannot navigate back to protected pages
- [ ] **Mobile**: auth form not cut off, keyboard doesn't obscure input fields

---

## 2. Assessment

- [ ] All 35 questions load, no missing text
- [ ] Yes / No buttons respond — question auto-advances
- [ ] Back button works — previous answer is preserved
- [ ] Progress bar advances correctly
- [ ] Restart button clears answers (confirm dialog works)
- [ ] Submit on last question → spinner visible, then redirected to `/results`
- [ ] **Mobile**: question text readable, buttons not overlapping, progress bar visible

---

## 3. Results / Insights

- [ ] Focus pillar card shows correct pillar with correct colour
- [ ] Radar chart renders — all 7 pillars visible, focus pillar dot is larger/highlighted
- [ ] All pillars listed with correct scores and coloured progress bars
- [ ] 3 suggested practices shown with pillar badge, description, rationale
- [ ] "Try this practice" → starts trial, redirects to `/practices`
- [ ] "Retake assessment" button visible top-right, works
- [ ] "Go to My Practices →" button at bottom works
- [ ] Empty state (no assessment): CTA to start assessment shown
- [ ] **Mobile**: radar chart not clipped, pillar labels readable

---

## 4. Practices

- [ ] Active practices shown with correct status badges
- [ ] "Set as today's focus" works — badge updates to "Today's focus"
- [ ] Pause: practice moves to paused section
- [ ] Resume: practice becomes active again
- [ ] Replace: 2-step flow — candidate list shown, amber warning, confirm works
- [ ] Trial cards show days remaining badge and Promote / Discard actions
- [ ] Promote trial → moves to active, disappears from trials section
- [ ] Discard trial → card removed
- [ ] Free plan cap: attempting to resume at cap shows error (not silent failure)
- [ ] Empty state: no practices CTA is helpful
- [ ] **Mobile**: action buttons large enough to tap, no horizontal overflow

---

## 5. Today

- [ ] Focus practice shown with correct pillar badge and "Today's focus" chip
- [ ] "✓ Did it" → button fills, confirmation text shows "You've done this N times."
- [ ] Dot pop animation plays on today's dot in 14-day strip
- [ ] Button pulse animation on "Did it" click
- [ ] "Not today" → compassionate copy ("No worries. Tomorrow is a fresh start.")
- [ ] Toggle: clicking "Did it" again un-logs (dot clears, count decreases)
- [ ] 14-day strip: only shown after first check-in; filled dot = blue, skipped = grey, empty = faint
- [ ] Hover on dot shows formatted date + status tooltip
- [ ] Active trials shown in "Trying out" section with countdown badge
- [ ] Trial "Did it" / "Not today" work independently from focus practice
- [ ] Milestone banner: appears after unlock, dismisses cleanly
- [ ] No focus practice set: helpful message with link to practices
- [ ] Error state: "Try again" reloads correctly
- [ ] **Mobile**: buttons full width, dots not too small to see

---

## 6. Progress

- [ ] Total check-ins, current streak, longest streak all display
- [ ] Practices started count correct
- [ ] "Coming up" milestones section shows next milestone with progress bar (if any)
- [ ] Achieved milestones listed (or empty state if none)
- [ ] Empty state (zero activity): page doesn't crash, zero values shown cleanly
- [ ] **Mobile**: stats grid doesn't overflow

---

## 7. Account

- [ ] Email displayed correctly
- [ ] Plan label shows "Free plan" or "Plus plan" correctly
- [ ] "Retake assessment" link works
- [ ] Sign out works
- [ ] **Mobile**: readable, no layout issues

---

## 8. Navigation & App shell

- [ ] All 4 nav items work: Today, Practices, Insights, Progress
- [ ] Active nav item is visually highlighted
- [ ] Account dropdown: opens/closes, shows email + plan + sign out
- [ ] Free plan: "Upgrade to Plus" appears in dropdown, click shows "coming soon" toast
- [ ] Plus plan: no upgrade CTA shown
- [ ] **Mobile**: hamburger menu opens/closes, all items tappable, no overflow
- [ ] Trackpad horizontal scroll: page does not shake/overflow

---

## 9. Plan gating spot check

- [ ] Free user at 1 active practice cannot add another (error shown)
- [ ] Free user can replace their 1 active practice
- [ ] Dev toggle (`NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true`): Free ↔ Plus toggle works in dev, invisible in prod

---

## 10. Copy & tone

- [ ] No "Premium" or "Paid" labels visible anywhere (all show "Plus plan" / "Free plan")
- [ ] Error messages are human — not raw codes or stack traces
- [ ] Empty states have helpful CTAs — not blank screens
- [ ] No placeholder text, "TODO", or lorem ipsum visible
- [ ] Loading states have friendly copy ("Loading your insights…" etc.)

---

## 11. Mobile UX pass (real device or DevTools mobile)

- [ ] Auth page: keyboard doesn't cover input
- [ ] Assessment: buttons easy to tap, no mis-taps
- [ ] Today: "Did it" button large and prominent
- [ ] Practices: action buttons not too small
- [ ] No horizontal scroll on any page
- [ ] Font sizes readable without zooming
- [ ] No text clipping or truncation in unexpected places

---

## 12. Performance spot check

- [ ] Today page loads in < 3s on a mobile connection (DevTools throttle to Fast 3G)
- [ ] Assessment loads all 35 questions without lag
- [ ] No visible layout shift (CLS) after initial load
- [ ] Radar chart renders without flicker

---

## Sign-off

| Area | Checked by | Date | Notes |
|---|---|---|---|
| Auth | | | |
| Assessment | | | |
| Results | | | |
| Practices | | | |
| Today | | | |
| Progress | | | |
| Account | | | |
| Navigation | | | |
| Copy & tone | | | |
| Mobile | | | |
| Performance | | | |
