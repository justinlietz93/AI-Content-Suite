import React, { type CSSProperties, type ReactNode } from 'react';

interface FeaturePanelProps {
  /**
   * Primary content rendered within the standardized feature panel. The node should
   * stretch to fill the available space and manage any internal scrolling behavior.
   */
  children: ReactNode;
  /**
   * Optional footer region rendered at the bottom of the panel. When provided the panel
   * reserves vertical space using the supplied footer height token so the overall
   * bounding box remains stable across feature switches.
   */
  footer?: ReactNode;
  /**
   * Explicit footer height token. Defaults to the shared footer reserve size when omitted.
   */
  footerHeight?: string;
  /**
   * Additional class names applied to the outer panel container for styling overrides.
   */
  className?: string;
  /**
   * Optional class names merged onto the scrollable content container inside the panel.
   */
  contentClassName?: string;
}

type FeaturePanelStyle = CSSProperties & {
  '--feature-panel-footer-height': string;
};

/**
 * Establishes a shared, token-driven bounding box for feature tab content. The wrapper
 * consumes layout tokens defined on the workspace card to keep every tab aligned with
 * the LLM chat reference dimensions while delegating scrolling to the inner content
 * region. An optional footer channel is provided for mode-specific controls such as
 * submit buttons or progress indicators without affecting the panel height.
 */
export const FeaturePanel: React.FC<FeaturePanelProps> = ({
  children,
  footer,
  footerHeight,
  className,
  contentClassName,
}) => {
  const resolvedFooterHeight = footer
    ? footerHeight ?? 'var(--feature-panel-footer-default)'
    : '0px';

  const panelStyle: FeaturePanelStyle = {
    '--feature-panel-footer-height': resolvedFooterHeight,
  };

  return (
    <section
      data-testid="feature-panel"
      className={`feature-panel relative flex min-h-0 flex-1 flex-col overflow-hidden ${className ?? ''}`.trim()}
      style={panelStyle}
    >
      <div
        className={`feature-panel__content flex min-h-0 flex-1 flex-col overflow-hidden ${
          contentClassName ?? ''
        }`.trim()}
      >
        {children}
      </div>
      {footer ? (
        <div
          className="feature-panel__footer flex w-full shrink-0 items-stretch"
          style={{
            height: resolvedFooterHeight,
            minHeight: resolvedFooterHeight,
          }}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
};
