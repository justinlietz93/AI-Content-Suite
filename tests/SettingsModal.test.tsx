/* @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SettingsModal } from '../components/modals/SettingsModal';
import { INITIAL_CHAT_SETTINGS } from '../constants';
import type { AIProviderSettings, ChatSettings, ProviderInfo } from '../types';

if (typeof window !== 'undefined' && !window.PointerEvent) {
  class CustomPointerEvent extends MouseEvent {
    constructor(type: string, params?: PointerEventInit) {
      super(type, params);
    }
  }
  // @ts-ignore - jsdom provides MouseEvent but not PointerEvent by default
  window.PointerEvent = CustomPointerEvent as unknown as typeof PointerEvent;
}

const createChatSettings = (): ChatSettings => JSON.parse(JSON.stringify(INITIAL_CHAT_SETTINGS));

const baseProviderSettings: AIProviderSettings = {
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o-mini',
  apiKeys: { openai: 'test-key' },
};

const providers: ProviderInfo[] = [
  { id: 'openai', label: 'OpenAI', requiresApiKey: true },
];

afterEach(() => {
  cleanup();
});

describe('SettingsModal', () => {
  it('does not close when resizing the modal', async () => {
    const onClose = vi.fn();
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        currentSettings={createChatSettings()}
        providerSettings={baseProviderSettings}
        providers={providers}
        onSave={vi.fn()}
        onFetchModels={async () => []}
        savedPrompts={[]}
        onSavePreset={vi.fn()}
        onDeletePreset={vi.fn()}
      />,
    );

    await screen.findByRole('dialog');
    const resizer = screen.getByTestId('settings-modal-resize-handle');

    act(() => {
      fireEvent.pointerDown(resizer, { clientX: 100, clientY: 100, pointerId: 1 });
    });

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 160, clientY: 140, pointerId: 1 }));
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 160, clientY: 140, pointerId: 1 }));
    });

    const overlay = screen.getByRole('dialog');

    fireEvent.click(overlay, { target: overlay, currentTarget: overlay });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    fireEvent.click(overlay, { target: overlay, currentTarget: overlay });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('avoids width and height transitions on the modal container', async () => {
    render(
      <SettingsModal
        isOpen
        onClose={vi.fn()}
        currentSettings={createChatSettings()}
        providerSettings={baseProviderSettings}
        providers={providers}
        onSave={vi.fn()}
        onFetchModels={async () => []}
        savedPrompts={[]}
        onSavePreset={vi.fn()}
        onDeletePreset={vi.fn()}
      />,
    );

    const modalWindows = await screen.findAllByTestId('settings-modal-window');
    expect(modalWindows.length).toBeGreaterThan(0);
    const modalWindow = modalWindows[0];
    expect(modalWindow.style.transition).toBe('box-shadow 220ms ease, opacity 220ms ease');
    expect(modalWindow.style.transition.includes('width')).toBe(false);
    expect(modalWindow.style.transition.includes('height')).toBe(false);
  });
});
