import React from 'react';
import type { PromptEnhancerSettings, PromptEnhancerTemplate } from '../types';
import { PROMPT_ENHANCER_TEMPLATE_OPTIONS } from '../data/promptEnhancerTemplates';

interface PromptEnhancerControlsProps {
  settings: PromptEnhancerSettings;
  onSettingsChange: (settings: PromptEnhancerSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const PromptEnhancerControls: React.FC<PromptEnhancerControlsProps> = ({ settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof PromptEnhancerSettings>(key: K, value: PromptEnhancerSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        onSettingsChange(newSettings);
    };

    return (
        <div className="animate-fade-in-scale space-y-6">
            <div>
                <Label htmlFor="enhancer-prompt">Raw Request</Label>
                <textarea
                    id="enhancer-prompt"
                    rows={8}
                    value={settings.rawPrompt}
                    onChange={(e) => handleSettingChange('rawPrompt', e.target.value)}
                    placeholder="Paste your raw request, notes, or shorthand here... (e.g., 'fix the login timeout bug')"
                    className="w-full px-3 py-2 bg-slate-900 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                />
            </div>

            <fieldset>
                <Label htmlFor="template-selector">Enhancement Template</Label>
                <select 
                    id="template-selector" 
                    value={settings.template} 
                    onChange={e => handleSettingChange('template', e.target.value as PromptEnhancerTemplate)} 
                    className="w-full px-3 py-2 bg-slate-700 border-border-color rounded-md text-sm"
                    aria-describedby="template-description"
                >
                    {PROMPT_ENHANCER_TEMPLATE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <p id="template-description" className="mt-1 text-xs text-text-secondary">
                    {PROMPT_ENHANCER_TEMPLATE_OPTIONS.find(o => o.value === settings.template)?.description}
                </p>
            </fieldset>
        </div>
    );
};
