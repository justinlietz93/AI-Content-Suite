# UI and Settings Enhancements Checklist

- [x] Ensure main UI and all feature tabs maintain consistent size matching the LLM Chat window.
- [x] Fix the Workspace Settings modal so resizing no longer causes it to close.
- [x] Enlarge the Workspace Settings modal and remove white border accents from the application.
- [x] Populate all model selectors dynamically using SDK `getModel` functions.
- [x] Centralize configuration values to eliminate hardcoded values across the app.
- [x] Verify all acceptance criteria with manual or automated checks.

## Dark Theme & Model Regression Fixes

- [x] Restore dark theme borders and remove unintended white accents.
- [x] Apply consistent focus styling with the blue selected border token.
- [x] Normalize scrollbar theming across browsers to maintain dark appearance.
- [x] Align all feature tab layouts to the LLM Chat baseline height without squishing content.
- [x] Ensure Workspace Settings modal resizing interactions do not trigger dismissal and add regression coverage.
- [x] Restore GPT-5 and reasoning model parameter handling, including temperature, thinking, and max token support.
- [x] Add automated tests covering theme tokens, scrollbars, tab sizing, modal resize behavior, and model parameter pass-through.
- [x] Perform manual QA for cross-browser appearance and confirm GPT-5 requests succeed. (See `manual-qa-report.md`.)

## Regression Fix Follow-up

- [x] Reinforce border and focus tokens in Tailwind config with CSS fallbacks to eliminate white accents.
- [x] Reconcile workspace tab height handling so non-chat tabs grow to match the chat baseline instead of compressing it.
- [x] Fortify Workspace Settings modal resize handling to prevent overlay dismissal during drag interactions.
- [x] Restore default GPT-5 reasoning payloads (temperature, reasoning, thinking, and max tokens) even when the UI leaves toggles off.
- [x] Expand automated coverage for theme tokens, layout parity, modal resize interactions, and provider payload defaults.

## Sidebar Organizer UI/UX Regression Checklist

- [x] Collapsed sidebar mode removes category headers entirely, leaving no drag handles to reorder categories without expanding the panel (see `CategorySection.tsx`).
- [x] Dragging a feature still fires the mode-selection click handler on mouseup, which flips the active view during reordering and disrupts drag/drop feedback (`FeatureItem.tsx`).
- [x] Collapsed category containers never change styling when targeted for a drop, so users get no visual confirmation that the icon bucket will accept the feature (`CategorySection.tsx`).
- [x] Drop indicators render as a one-pixel line with no alternate highlight, making the target border effectively invisible against dense icon stacks (`DropZone.tsx`).
- [x] Category drop announcements read stale ordering data because `SidebarOrganizer` looks up the destination immediately after dispatching the reorder action, confusing screen readers about the new placement (`SidebarOrganizer.tsx`).
