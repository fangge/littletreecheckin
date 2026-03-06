# Design: Responsive Layout

## Breakpoint Strategy

Using TailwindCSS v4 default breakpoints (mobile-first):

| Breakpoint | Width | Layout |
|------------|-------|--------|
| (default) | < 768px | Mobile: bottom nav + full-width single column |
| `md` | ≥ 768px | Tablet: bottom nav retained, content expands |
| `lg` | ≥ 1024px | Desktop: left sidebar nav + wide content area |

## App Shell Architecture

```
Mobile (< lg)                    Desktop (≥ lg)
┌─────────────────────┐          ┌──────────┬──────────────────────────┐
│                     │          │          │                          │
│   Content View      │          │ Sidebar  │    Content View          │
│   (full width)      │          │  Nav     │    (flex-1, scrollable)  │
│                     │          │ (fixed,  │                          │
│                     │          │  240px)  │                          │
├─────────────────────┤          │          │                          │
│  Bottom Navigation  │          │          │                          │
└─────────────────────┘          └──────────┴──────────────────────────┘
```

## Navigation Component

**Mobile**: Fixed bottom bar (current behavior preserved)
```
fixed bottom-0 left-0 right-0
flex flex-row items-center justify-around
```

**Desktop (≥ lg)**:
```
fixed left-0 top-0 h-screen w-60
flex flex-col items-start gap-2 pt-8 px-4
```

Sidebar nav items render with icon + label side-by-side (horizontal), with the app logo/name at the top.

## Content Area

**Mobile**: `pb-32` (padding for bottom nav) — unchanged  
**Desktop**: `ml-60` (margin for sidebar width) + `pb-0`

Content views themselves adopt:
- `max-w-2xl mx-auto` on tablet for comfortable reading
- `max-w-4xl mx-auto` on desktop for wider views (Dashboard, lists)
- Form views (`GoalSetting`, `CheckIn`): `max-w-xl mx-auto` to keep forms readable

## Dashboard Grid

```
grid-cols-2          (mobile, default)
md:grid-cols-3       (tablet)
lg:grid-cols-4       (desktop)
```

## Fixed/Floating Elements

- **FAB button** (Dashboard): `lg:hidden` — hidden on desktop since sidebar provides navigation
- **Fixed bottom action bars** (GoalSetting, etc.): On desktop, convert to `sticky bottom-0` within the scrollable content area, or use `lg:relative lg:mt-8` to flow naturally

## Trade-offs

| Option | Pros | Cons |
|--------|------|------|
| Phone-frame on desktop | Zero layout changes | Poor UX, wastes screen space |
| Full responsive (chosen) | Great desktop UX, scalable | More files to touch |
| Sidebar-only on desktop | Clean separation | Requires conditional rendering logic |

**Decision**: Full responsive with TailwindCSS breakpoint classes. No JavaScript-based layout switching — pure CSS. This keeps the implementation simple and avoids hydration issues.

## Files Affected

| File | Change |
|------|--------|
| `src/App.tsx` | Remove `max-w-md`, add `lg:flex lg:flex-row` shell |
| `src/components/Navigation.tsx` | Add `lg:` sidebar variant classes |
| `src/views/Dashboard.tsx` | `lg:grid-cols-4`, content `max-w-4xl`, hide FAB on `lg` |
| `src/views/GoalSetting.tsx` | `max-w-xl mx-auto` content wrapper |
| `src/views/CheckIn.tsx` | `max-w-xl mx-auto` content wrapper |
| `src/views/ParentControl.tsx` | `max-w-2xl mx-auto` content wrapper |
| `src/views/Store.tsx` | `max-w-2xl mx-auto` content wrapper |
| `src/views/Medals.tsx` | `max-w-2xl mx-auto` content wrapper |
| `src/views/Login.tsx` | Centered card `max-w-md mx-auto` (already good) |
| `src/views/Register.tsx` | Centered card `max-w-md mx-auto` (already good) |