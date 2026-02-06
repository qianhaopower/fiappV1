# UI System Rules

## Spacing Scale (Approved Only)

Use these spacing values for layout and structure:

### Page Padding
- Mobile: `py-8`
- Desktop: `py-10`

### Section Gaps
- Grid gaps: `gap-8` or `gap-10`
- Section spacing: `mb-10 pb-10`

### Card Padding
- Small: `p-4`
- Default: `p-6`
- Large: `p-8`

### Form Vertical Spacing
- Compact: `space-y-4`
- Default: `space-y-6`

## Rules

- **Do not invent new layout spacing values.**
- **Use only the approved scale** above for layout and structure.
- **Component micro-spacing** (e.g. `gap-2` for inline controls) is acceptable.

## Layout Components (Required)

Every route must use one of:
- `StandardPage`
- `NarrowFormPage`
- `DashboardPage`
- `ListDetailPage`

## Reference

- See `/design` for live examples.
- Update the design system before introducing new spacing.
