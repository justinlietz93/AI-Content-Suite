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


## Collapsed/Expanded Sidebar Reordering – Verification Checklist (New)

Use this checklist to validate the drag-and-drop experience for features and categories in both collapsed (icon-only) and expanded sidebar modes, while honoring the Requirements & Constraints listed above.

### A. Presentation & Mode Parity

- [ ] Collapsed mode renders icon-only with no text, titles, or stray labels visible.
- [ ] Collapsed and expanded modes share the same reorder capabilities for both features and categories.
- [ ] Switching between collapsed and expanded preserves current order and selection without visual jumps.
- [ ] No unintended mode flips occur as a result of drag interactions (click suppression immediately post-drag is effective).

### B. Drag & Drop Interactions

- [ ] Drag start is reliable from icon buttons and shared handles in collapsed mode, and from list rows/handles in expanded mode (`FeatureItem`, `CollapsedCategoryHandle`).
- [ ] Drag preview uses the native-centering helper from `useDragPreview` and follows the cursor smoothly; cleans up on drag end or cancel.
- [ ] Drop events are captured in the capture phase where needed so button-level drops trigger reorder (`CategorySection` / `FeatureList`).
- [ ] Drop guards prevent accidental drops into ambient whitespace; explicit drop zones are respected and differentiated from container gaps.
- [ ] Category reordering works in both modes; feature reordering within a category and across categories works and updates model consistently.
- [ ] Rapid drag sequences and short drags don’t misfire clicks or get ignored; click suppression window is tuned and covered by tests.

### C. Visual Feedback & Tokens

- [ ] Hover highlights and drop indicators meet contrast requirements on dark theme and remain legible in dense icon stacks.
- [ ] Thicker drop indicators render at correct insertion points and do not overlap icons awkwardly.
- [ ] Highlight metadata correctly applies to collapsed sections and the uncategorized bucket; no lingering highlights after cancel.
- [ ] Visuals adhere to existing design tokens (colors, borders, focus rings) with no reintroduction of white accents.

### D. Accessibility & Focus Management

- [ ] Screen reader announcements correctly describe drag source, destination, and result (e.g., "Moved Feature X before Feature Y in Category Z").
- [ ] ARIA attributes are applied to draggable and droppable elements; roles and states are updated during drag lifecycle.
- [ ] Keyboard focus is preserved: focus returns to the moved item (or its new handle) after drop, with visible focus outline.
- [ ] Tab order remains logical after reordering; no trapped focus in collapsed icons or category handles.

### E. State, Events, and Data Integrity

- [ ] Reorder actions update state atomically; `SidebarOrganizer` does not read stale ordering data immediately after dispatch.
- [ ] State remains consistent across components (`SidebarOrganizer`, `CategorySection`, `FeatureList`, `DropZone`).
- [ ] Escape cancels drag and restores pre-drag visuals; leaving the window or dropping outside valid zones results in no-op without side effects.
- [ ] No crashes or console errors during drag lifecycle, even under rapid drags or window resizes.

### F. Edge Cases

- [ ] Empty category (no features) shows valid drop target and accepts first insertion.
- [ ] First/last position drops render correctly; inserting before the first icon or after the last icon is unambiguous.
- [ ] Reordering within the uncategorized bucket works; cross-category moves into/out of uncategorized work and persist.
- [ ] Very small sidebar width (fully collapsed) still supports precise drop targeting; zoomed UI (125%/150%) remains usable.

### G. Performance & Cleanup

- [ ] Drag preview and highlight updates are jank-free on mid-tier hardware; no long tasks in performance profiler during drag.
- [ ] `useDragPreview` cleans up listeners/objects on unmount and on drag end; no memory leaks detected.
- [ ] No additional dependencies were introduced to implement DnD fixes.

### H. Persistence & Telemetry (if applicable)

- [ ] Reordered state persists across app reloads for the active workspace/session.
- [ ] Any optional analytics/telemetry for reorder events (if present) fire once per successful drop and include category/feature IDs only (no PII).

### I. Tests & Coverage

- [ ] Unit: click suppression after drag prevents mode switches in `FeatureItem`.
- [ ] Unit: `useDragPreview` mounts/unmounts with proper cleanup; preview positions correctly relative to cursor.
- [ ] Unit: `DropZone` renders thicker indicators and computes insertion index for first/last positions.
- [ ] Integration: feature reorder within category (collapsed and expanded) persists and updates list order.
- [ ] Integration: cross-category feature move updates both source and target lists correctly.
- [ ] Integration: category reorder (collapsed and expanded) updates ordering consistently and announces changes.
- [ ] Accessibility: SR announcement strings reflect the final destination and order; focus returns to moved item.
- [ ] Snapshots/regression: no white accents reappear; tokens applied consistently across states.
- [ ] Maintain or exceed existing project coverage thresholds; no test flakiness under repeated DnD sequences.

Suggested test naming (for reference; adapt to project patterns):

- [ ] `Sidebar/collapsed-dnd_feature-reorder.spec.tsx`
- [ ] `Sidebar/collapsed-dnd_category-reorder.spec.tsx`
- [ ] `Sidebar/expanded-dnd_feature-reorder.spec.tsx`
- [ ] `Sidebar/accessibility_aria-announcements.spec.tsx`
- [ ] `Sidebar/visuals_drop-indicator-tokens.spec.tsx`

### J. Manual QA Pass

- [ ] Chrome, Firefox, and Safari (or WebKit) manual runs validate drag affordances, previews, and indicators.
- [ ] High DPI and zoomed UI (125%/150%) maintain drop precision and readable highlights.
- [ ] Keyboard navigation pre/post drag maintains logical focus order; no focus loss.
- [ ] Verify no console warnings/errors during 20+ consecutive drags across mixed categories.

### K. Sign-off

- [ ] Product/design review of visuals in collapsed/expanded modes signed off.
- [ ] Accessibility review signed off (screen reader checks and focus behavior).
- [ ] Engineering sign-off confirming no new dependencies, coverage preserved, and no crashes under stress.
