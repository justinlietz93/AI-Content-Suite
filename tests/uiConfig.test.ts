import { describe, it, expect } from 'vitest';
import { UI_DIMENSIONS, WORKSPACE_CARD_MIN_HEIGHT, CHAT_VIEWER_MAX_HEIGHT } from '../config/uiConfig';

describe('uiConfig', () => {
  it('keeps chat viewer height aligned with workspace card height', () => {
    expect(CHAT_VIEWER_MAX_HEIGHT).toBe(WORKSPACE_CARD_MIN_HEIGHT);
  });

  it('uses matching viewport ratios for workspace and chat content', () => {
    expect(UI_DIMENSIONS.chat.viewerMaxHeightRatio).toBe(UI_DIMENSIONS.workspace.cardMinHeightViewportRatio);
  });
});
