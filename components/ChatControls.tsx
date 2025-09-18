
import React from 'react';
import type { ChatSettings } from '../types';

interface ChatControlsProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const ChatControls: React.FC<ChatControlsProps> = ({ settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="animate-fade-in-scale space-y-4 my-4">
            <div>
                <Label htmlFor="system-instruction">System Prompt</Label>
                <textarea
                    id="system-instruction"
                    rows={3}
                    value={settings.systemInstruction}
                    onChange={(e) => handleSettingChange('systemInstruction', e.target.value)}
                    placeholder="Define the AI's persona and instructions..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>
        </div>
    );
};
