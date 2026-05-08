# Daily Return Reset Time Plan

## Goal

Daily returns should use a user-facing "habit day," not UTC. The default should be 4:00 AM in the user's local timezone, with a setting that lets users change when their day resets.

## Product Recommendation

Do not keep UTC as the default reset behavior. A daily habit app should follow the user's lived day. A Melbourne user whose "new day" starts at 10:00 AM or 11:00 AM will experience the app as incorrect.

Recommended first version:

- Default to 4:00 AM local time.
- Add a simple reset-time setting with fixed options.
- Avoid fully custom time until users ask for it.

The product principle is that most users should never have to think about reset time, but users with night shifts, late routines, travel, or sleep issues should not be punished by the app's clock.

## Implementation Plan

### 1. Add Profile Settings

Add fields to the user profile:

- `timezone`: IANA timezone string, for example `Australia/Melbourne` or `America/New_York`.
- `dayResetTime`: minutes after local midnight, for example `240` for 4:00 AM.

Defaults:

- `timezone`: browser-detected timezone on first client load, fallback to `UTC` if unavailable.
- `dayResetTime`: `240`.

Existing profiles without these fields should receive defaults on read.

### 2. Create A Canonical Return-Day Helper

Replace the current UTC-only `todayUTC()` behavior with a helper such as:

```ts
returnDayForUser({
  now,
  timezone,
  resetMinutes,
})
```

Logic:

- Determine the user's local date and time.
- If local time is before `resetMinutes`, return yesterday's `YYYY-MM-DD`.
- Otherwise return today's `YYYY-MM-DD`.

Place this in `lib/returns/returns.ts` or a new focused module such as `lib/dates/returnDay.ts`.

Add unit tests for:

- Melbourne timezone.
- UTC timezone.
- US timezones.
- Before reset time.
- After reset time.
- DST edge cases.

### 3. Update `POST /api/return`

When `date` is omitted:

- The profile is already loaded by this handler (for the active-practice check). Extract `timezone` and `dayResetTime` from it — no extra DB call is needed.
- Use `returnDayForUser()` to calculate the return date.
- Store the return using the existing key shape: `DATE#YYYY-MM-DD`.

Keep explicit `date` support for tests, admin workflows, or future backfill needs. Normal UI logging should omit `date`.

### 4. Update `GET /api/returns`

Load the user's profile to get `timezone` and `dayResetTime`. Use `returnDayForUser()` to get `currentReturnDate`, then pass it into `dateRange()` as the `endDate` argument. The current `dateRange()` already accepts an `endDate` parameter; no new variant is needed.

The response should include the server's current return date, for example:

```json
{
  "currentReturnDate": "2026-05-08",
  "returns": []
}
```

This prevents the Today page from independently calculating "today" and disagreeing with the server.

### 5. Update `GET /api/progress` And `computeStreaks`

`GET /api/progress` computes streaks and uses `todayUTC()` for both the streak anchor and the DynamoDB date range query. This must be updated alongside the other endpoints or streaks will remain UTC-based even after returns are timezone-aware.

Changes:

- Load `timezone` and `dayResetTime` from the user's profile (already fetched by this handler).
- Call `returnDayForUser()` to get the user's current return date.
- Pass it to `dateRange()` as `endDate` and to `computeStreaks()` as `today`.

`computeStreaks()` already accepts `today` as an optional parameter, so no signature change is needed — just pass the user's return date instead of letting it default to `todayUTC()`.

### 6. Update The Today Page

Stop importing `todayUTC()` client-side for deciding today's dot.

Instead:

- Use `currentReturnDate` from `GET /api/returns`.
- Find the current dot by matching `date === currentReturnDate`.
- Continue omitting `date` when calling `POST /api/return`.

This keeps the UI and API aligned.

### 7. Persist Timezone On First Load

`timezone` must be written to the profile or it defaults to `UTC` indefinitely.

Mechanism:

- Add a PATCH `/api/me` endpoint that accepts `{ timezone, dayResetTime }` and updates the profile record.
- On the client, detect the browser timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- In the app layout or root Today page effect, after the profile is loaded: if `profile.timezone` is `UTC` or missing, and the browser timezone differs, fire the PATCH once to persist it. This is a silent background write — no UI shown to the user.
- The Settings UI (Step 8) lets users override this later.

This keeps the default experience zero-friction while ensuring the profile reflects the user's actual timezone after first load.

### 8. Add Settings UI

Add an Account or Settings section for:

- Timezone display/select.
- "Day resets at" select or segmented control.

Initial reset-time options:

- Midnight
- 3:00 AM
- 4:00 AM recommended
- 6:00 AM

Avoid fully custom time in the first version unless there is a clear user need.

### 9. Migration And Backward Compatibility

No table migration is required.

Existing return records remain valid. Their dates were previously UTC-derived, but future records will use the configured habit-day date.

Profiles without `timezone` or `dayResetTime` should behave as:

- `timezone = UTC`
- `dayResetTime = 240`

The silent PATCH on first load (Step 7) handles the transition for existing users without requiring manual action.

### 10. Docs And Tests

Update docs:

- API contract: define "today" as the user's configured return day.
- DB schema: document the new profile fields.
- Product/canon docs: explain reset-time behavior and defaults.

Add tests for:

- Default settings.
- Changing reset time.
- Logging before reset.
- Logging after reset.
- Date range generation in `GET /api/returns`.
- Today page using server-provided `currentReturnDate`.
- `GET /api/progress` streak computation using user's return date, not UTC.
- PATCH `/api/me` updating `timezone` and `dayResetTime`.

## Open Decisions

- Should changing reset time affect only future logs, or can it reinterpret today's current log during the same calendar day? (Recommend: future only, to prevent streak gaming.)
- Should travelers keep their home timezone or follow their device timezone? (The silent first-load PATCH will update timezone on each new device, which follows the device. If home-timezone is the preference, the Settings UI must let users lock it.)

## Suggested First Version

Ship timezone-aware daily returns with:

- Browser-detected timezone persisted to profile.
- 4:00 AM local reset by default.
- Fixed reset-time options in Account settings.
- Server-provided `currentReturnDate` in `GET /api/returns`.

This fixes the core daily-return bug while keeping the settings experience simple.
