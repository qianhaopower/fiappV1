# FIApp Design System & Guardrails

This is the single source of truth for UI consistency. Every new page must follow these rules.

---

## 1) Required Page Layouts (Pick One)
Every route must use one of these components:

- `StandardPage`
- `NarrowFormPage`
- `DashboardPage`
- `ListDetailPage`

**Rule:** No page may define its own layout container or header outside these layouts.

---

## 2) App Shell (Global)
- Top bar with navigation + Account + Sign out.
- Navigation must include: Today, Practices, Progress, Assessment.
- AppShell provides the only global header. Do not add extra headers elsewhere.

---

## 3) Design Tokens (Theme)
All colors are CSS variables in [app/globals.css](app/globals.css).

**Palette**
- Primary (Teal): brand actions, focus rings
- Secondary (Emerald): positive highlights
- Accent (Amber): warnings
- Destructive (Red): errors
- Background: warm-neutral tint
- Card: clean white

**Rule:** Use token classes (`bg-background`, `text-foreground`, etc.) instead of hard-coded colors.

---

## 4) Signature Motif (Brand)
- Subtle radial highlight in AppShell header.
- Eyebrow labels use pill badges.

**Rule:** Motif lives only in AppShell + PageHeader so it propagates everywhere.

---

## 5) Spacing Scale (Approved Only)
Use only these values for layout:

- Page padding: `py-8` (mobile), `py-10` (desktop)
- Section spacing: `mb-10 pb-10`
- Grid gaps: `gap-8` or `gap-10`
- Card padding: `p-4`, `p-6`, `p-8`
- Form spacing: `space-y-4` or `space-y-6`

**Rule:** Do not invent new layout spacing values.

---

## 6) Card Language
- Default card radius: `rounded-xl`.
- Shadows: `shadow-sm`, hover `shadow-md`.
- Use smaller radius only intentionally (rare).

---

## 7) Typography & Hierarchy
- Inter font (global).
- Section headers use PageHeader/Section with eyebrow label.
- PageHeader eyebrow is a pill badge.

---

## 8) UI Components (No Native Controls)
Use only components from `@/components/ui`.

✅ Allowed: `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `Textarea`, `Dialog`, `Toaster`, `Skeleton`.

❌ Avoid: raw `<button>`, `<input>`, `<select>`, `<textarea>` in app pages.

---

## 9) Content Primitives (Use These)
- `PageHeader`, `Section`
- `Card` variants: default / subtle / interactive
- `StatCard`
- `EmptyState`
- `SkeletonList`, `SkeletonCard`, `SkeletonPage`
- `ConfirmDialog`, `ToastTrigger`

---

## 10) Interaction Rules
- Focus rings use primary token.
- Disabled states are styled (not default browser).
- Error/Success states use token colors (`destructive`, `accent`).

---

## 11) File Structure (Design-Specific)

```
components/
	ui/                      # shadcn + content primitives
	layout/                  # AppShell + required page layouts

app/
	globals.css              # tokens
	design/page.tsx          # truth screen
	today/ practices/ progress/ assessment/  # placeholder routes

docs/
	design-guardrails.md     # this file
```

---

## 12) How to Add Components

```bash
npx shadcn@latest add <component-name>
```

Then export from `components/ui/index.ts`.

---

## 13) Design System Reference
- `/design` is the truth screen (keep forever).
- Update `/design` whenever tokens or component patterns change.

---

## 14) E2E Smoke Tests

Run smoke tests with:

```bash
npm run test:e2e
```

---

## Quick Checklist (Before Shipping)
- [ ] Page uses one of the 4 layouts
- [ ] Only UI components from `@/components/ui`
- [ ] No raw HTML controls
- [ ] Spacing uses approved scale
- [ ] Token-based colors only
- [ ] Single AppShell header
- [ ] Tested on `/design`
