# docs/canon/practice-caps-and-trials.md
# FIApp v1 — Practice Caps, Warnings & Trials (LOCKED)

**Status:** Canonical  
**Purpose:** Define hard limits, warnings, and trial rules that protect users and system integrity.

---

## 1. Active Practice Caps (Hard Limits)

### Free users
- Maximum **1** active practice
- Hard stop: cannot add more
- Replacement is allowed (count remains 1)

### Paid users
- Maximum **10** active practices
- Hard stop at 10 (cannot exceed under any circumstance)

Caps are enforced **server-side only**.

---

## 2. Progressive Warnings (Paid Users)

Warnings are **non-blocking** but intentional:

| Active Practices | Behaviour |
|------------------|----------|
| 5 | Soft warning — “This is a lot to do in parallel.” |
| 7 | Strong warning — “Very demanding. Consider reducing.” |
| 10 | Hard stop — cannot add more |

Warnings exist to:
- surface cognitive cost
- encourage reflection
- preserve long-term adherence

---

## 3. Trial Practices (Critical Distinction)

### What trials are
- Time-limited experiments
- Low-commitment activation mechanism
- A way to “try before committing”

### What trials are not
- Not a way to bypass caps
- Not permanent practices

---

## 4. Trial Rules (LOCKED)

- ❌ Trials **do not count** toward active practice caps
- ✅ Trials **do count** toward:
  - counters
  - milestones
  - engagement metrics

---

## 5. Trial Lifecycle

1. `startTrial`
   - Creates TRIAL item
   - No cap impact

2. `promoteTrial`
   - Converts trial to active practice
   - **Must respect caps**
   - If cap reached → user must replace or abort

3. `discardTrial`
   - Ends trial
   - No impact on active practices

---

## 6. Rationale (Why This Exists)

Without caps:
- users overload themselves
- metrics lose meaning
- the app encourages unrealistic behaviour

Without trials:
- activation friction is too high
- commitment feels risky

This balance is intentional and locked.

---

## 7. Canon Rule

No feature may:
- increase caps
- bypass caps
- silently auto-promote trials

without explicitly changing this document.
