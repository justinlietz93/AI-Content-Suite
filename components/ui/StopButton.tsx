

import React from 'react';
import { XCircleIcon } from '../icons/XCircleIcon';

interface StopButtonProps {
    onClick: () => void;
}

export const StopButton: React.FC<StopButtonProps> = ({ onClick }) => {
    return (
        <div className="mt-4 text-center">
            <button
                onClick={onClick}
                className="px-6 py-2 bg-destructive text-destructive-foreground font-semibold rounded-lg hover:bg-destructive/80 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface flex items-center justify-center gap-2 mx-auto"
                aria-live="polite"
                aria-label="Stop current processing"
            >
                <XCircleIcon className="w-5 h-5" />
                <span>Stop Processing</span>
            </button>
        </div>
    );
};