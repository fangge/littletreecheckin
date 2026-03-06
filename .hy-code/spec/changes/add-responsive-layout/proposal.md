## Why

The application is currently constrained to a mobile-only layout (`max-w-md`, 448px) with a fixed bottom navigation bar. On tablet and desktop screens, the content renders as a narrow centered column with wasted whitespace on both sides, and the bottom navigation bar spans the full browser width rather than aligning with the content. This degrades the experience for users accessing the app on non-mobile devices.

## What Changes

- **Responsive app shell**: Remove the hard `max-w-md` constraint from the root container. On desktop (≥ `lg`, 1024px), the layout switches to a two-column shell: a fixed left sidebar for navigation + a scrollable main content area.
- **Adaptive navigation**: The bottom navigation bar (`Navigation.tsx`) becomes a left sidebar on desktop, preserving the same nav items but rendered vertically with labels.
- **Content width scaling**: View content areas adopt responsive max-widths (`max-w-2xl` on tablet, unconstrained or `max-w-4xl` on desktop) so they fill available space naturally.
- **Dashboard grid**: The tree card grid scales from 2 columns (mobile) → 3 columns (tablet `md`) → 4 columns (desktop `lg`).
- **Form views**: Goal setting, check-in, and other form-heavy views center their content with a comfortable reading width (`max-w-xl`) on large screens.
- **Fixed/floating elements**: The FAB button and fixed bottom action bars are repositioned or hidden on desktop where the sidebar navigation replaces them.

## Impact

- Affected files (frontend only — no backend changes):
  - `src/App.tsx` — root layout shell, responsive two-column structure
  - `src/components/Navigation.tsx` — bottom bar → responsive sidebar
  - `src/views/Dashboard.tsx` — tree grid columns, content max-width
  - `src/views/GoalSetting.tsx` — form content centering
  - `src/views/CheckIn.tsx` — content centering
  - `src/views/ParentControl.tsx` — content centering
  - `src/views/Store.tsx` — content centering
  - `src/views/Medals.tsx` — content centering
  - `src/views/Login.tsx` / `src/views/Register.tsx` — centered card layout
  - `src/index.css` — optional global responsive helpers
- No backend, database, or API changes required.
- No breaking changes to existing functionality.