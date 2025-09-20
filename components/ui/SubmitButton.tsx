

import React from 'react';
import type { AppState } from '../../types';

interface SubmitButtonProps {
    onClick: () => void;
    disabled: boolean;
    appState: AppState;
    buttonText: string;
    wrapperClassName?: string;
}

/**
 * Renders the primary call-to-action button used by non-chat feature tabs. Consumers can
 * optionally override the wrapper class to integrate the button into custom layout
 * containers without duplicating its styling logic.
 */
export const SubmitButton: React.FC<SubmitButtonProps> = ({ onClick, disabled, appState, buttonText, wrapperClassName = 'mt-6 text-center' }) => {
    return (
        <div className={wrapperClassName}>
            <button
                onClick={onClick}
                disabled={disabled}
                className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface text-lg"
                aria-live="polite"
            >
                {appState === 'processing' ? 'Processing...' : buttonText}
            </button>
        </div>
    );
};