

import React from 'react';
import type { AppState } from '../../types';

interface SubmitButtonProps {
    onClick: () => void;
    disabled: boolean;
    appState: AppState;
    buttonText: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ onClick, disabled, appState, buttonText }) => {
    return (
        <div className="mt-6 text-center">
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