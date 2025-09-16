


import React from 'react';
import type { RequestSplitterSettings, SplitterPersona } from '../types';

interface RequestSplitterControlsProps {
  spec: string;
  onSpecChange: (spec: string) => void;
  settings: RequestSplitterSettings;
  onSettingsChange: (settings: RequestSplitterSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const RequestSplitterControls: React.FC<RequestSplitterControlsProps> = ({ spec, onSpecChange, settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof RequestSplitterSettings>(key: K, value: RequestSplitterSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="animate-fade-in-scale space-y-6">
            <div>
                <Label htmlFor="splitter-spec">Specification Document</Label>
                <textarea
                    id="splitter-spec"
                    rows={8}
                    value={spec}
                    onChange={(e) => onSpecChange(e.target.value)}
                    placeholder="Paste your large request, markdown spec, plan, or requirements document here..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>

            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="project-name">Project Name (optional)</Label>
                    <input type="text" id="project-name" value={settings.projectName} onChange={e => handleSettingChange('projectName', e.target.value)} placeholder="e.g., Comprehensive Codebase Summary" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <Label htmlFor="persona-bias">Persona Bias</Label>
                    <select id="persona-bias" value={settings.persona} onChange={e => handleSettingChange('persona', e.target.value as SplitterPersona)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="none">None (Default Architect)</option>
                        <option value="engineer">Engineer</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="physicist">Physicist</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                 {settings.persona === 'custom' && (
                    <div className="col-span-2">
                         <Label htmlFor="custom-persona" className="sr-only">Custom Persona Directive</Label>
                        <textarea id="custom-persona" rows={2} value={settings.customPersonaDirective} onChange={e => handleSettingChange('customPersonaDirective', e.target.value)} placeholder="Enter custom persona directive..." className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                )}
            </fieldset>
        </div>
    );
};