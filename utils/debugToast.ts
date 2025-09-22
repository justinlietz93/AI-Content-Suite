/**
 * Module Purpose: Lightweight debug toast for in-app development diagnostics.
 * External Dependencies: None. Pure DOM manipulation; no network or CLI usage.
 * Fallback Semantics: If DOM is unavailable or gated by test environment, calls are no-ops.
 * Timeout Strategy: Each toast auto-dismisses after a short duration (default 1500ms).
 */

/** Container element id to host debug toasts. */
const CONTAINER_ID = 'aics-debug-toast-container';

/**
 * Ensures a toast container exists in the DOM and returns it. Creates it if missing.
 * The container is positioned fixed in the bottom-right with pointer events disabled.
 */
function ensureContainer(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    Object.assign(el.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      zIndex: '2147483647', // top-most
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Shows a small debug toast message in the bottom-right corner during development.
 * This function is a no-op when executed under unit tests (import.meta.vitest) or
 * without DOM access.
 *
 * Parameters:
 * - message: Text content to display inside the toast.
 * - durationMs: How long to keep the toast visible before auto-dismissing.
 */
export function debugToast(message: string, durationMs = 1500): void {
  // Skip in non-browser environments and during Vitest runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isVitest = typeof import.meta !== 'undefined' && (import.meta as any)?.vitest;
  if (typeof window === 'undefined' || typeof document === 'undefined' || isVitest) {
    return;
  }

  const container = ensureContainer();
  if (!container) {
    return;
  }

  const item = document.createElement('div');
  Object.assign(item.style, {
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontSize: '12px',
    borderRadius: '6px',
    padding: '8px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
    maxWidth: '320px',
    pointerEvents: 'none',
    opacity: '0',
    transform: 'translateY(6px)',
    transition: 'opacity 120ms ease-out, transform 120ms ease-out',
  } as CSSStyleDeclaration);
  item.textContent = String(message ?? '');

  container.appendChild(item);
  // trigger enter animation
  requestAnimationFrame(() => {
    item.style.opacity = '1';
    item.style.transform = 'translateY(0)';
  });

  // auto-remove after duration
  window.setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(6px)';
    window.setTimeout(() => {
      if (item.parentElement === container) {
        container.removeChild(item);
      }
    }, 180);
  }, Math.max(250, durationMs | 0));
}

/**
 * Convenience helper to emit a namespaced toast when starting a drag on a feature.
 */
export function debugToastDragStart(featureId: string, collapsed: boolean): void {
  const mode = collapsed ? 'collapsed' : 'expanded';
  debugToast(`Drag start: ${featureId} (${mode})`);
}

/**
 * Convenience helper to emit a namespaced toast when ending a drag on a feature.
 */
export function debugToastDragEnd(featureId: string): void {
  debugToast(`Drag end: ${featureId}`);
}

/**
 * Console-only logger for development diagnostics. No-ops under Vitest.
 * Use this to trace high-frequency events (e.g., dragover) without UI noise.
 */
export function debugLog(label: string, data?: unknown): void {
  // Skip in non-browser environments and during Vitest runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isVitest = typeof import.meta !== 'undefined' && (import.meta as any)?.vitest;
  if (isVitest || typeof console === 'undefined') {
    return;
  }
  try {
    if (data !== undefined) {
      // eslint-disable-next-line no-console
      console.log(`[DND] ${label}`, data);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[DND] ${label}`);
    }
  } catch {
    /* no-op */
  }
}
