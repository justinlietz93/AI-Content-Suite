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

- [x] Collapsed sidebar stays icon-only while preserving drag-and-drop for feature icons inside each category (`CategorySection.tsx`).
- [x] Dragging a feature still fires the mode-selection click handler on mouseup, which flips the active view during reordering and disrupts drag/drop feedback (`FeatureItem.tsx`).
- [x] Drop indicators use thicker styling and contrast so drag targets remain visible even against dense icon stacks (`DropZone.tsx`).
- [x] Category drop announcements read stale ordering data because `SidebarOrganizer` looks up the destination immediately after dispatching the reorder action, confusing screen readers about the new placement (`SidebarOrganizer.tsx`).

### Attempted Fixes To Date

- Captured drop events during the capture phase so button-level drops still trigger the reorder logic for features and verified with focused regression tests.
- Reintroduced icon-only rendering for collapsed categories while keeping drag handlers wired through `FeatureList` to restore the prior interaction model.
- Implemented a neutral collapsed drag handle glyph and accompanying `useDragPreview` helper so feature and category drags follow the cursor with cleanup on reset.
- Added collapsed sidebar drop guards, whitespace detection, and drop-zone metadata to differentiate explicit indicators from ambient container whitespace.
- Applied highlight metadata to collapsed sections and uncategorized buckets, plus thicker drop indicators, to ensure hover and insertion feedback remains visible in dense icon stacks.
- Suppressed the mode-selection click handler immediately after drag gestures and added regression coverage to prevent mode flips when reorganizing features.
- Introduced a dedicated `CollapsedCategoryHandle`, unified drop-zone coordination in `CategorySection`, and restored category reordering coverage for collapsed mode.
- Replaced cloned drag previews with a native-centering helper to recover expanded-category reordering while preserving the improved drag feedback visuals.
- Enabled shared drag handles between collapsed feature buttons and icons so collapsed sidebar interactions once again initiate drags reliably.

### Requirements & Constraints

- Maintain a fully collapsed, icon-only sidebar presentation with **no** category titles or text labels visible in the minimized state.
- Support click-and-drag reordering for both features and categories in **collapsed and expanded** sidebar modes without triggering unintended mode switches or crashes.
- Ensure drop indicators, hover highlights, and drag previews remain visually clear against dense icon groupings while aligning with existing design tokens.
- Avoid introducing regressions to accessibility behaviors, including accurate screen reader announcements for drop targets and maintained keyboard focus states.
- Preserve existing coverage thresholds and refrain from adding new dependencies; leverage current project tooling and patterns for any fixes.
