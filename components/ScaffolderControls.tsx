


import React from 'react';
import type { ScaffolderSettings, ScriptLanguage, ProjectTemplate, PackageManager, License } from '../types';

interface ScaffolderControlsProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  settings: ScaffolderSettings;
  onSettingsChange: (settings: ScaffolderSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const ScaffolderControls: React.FC<ScaffolderControlsProps> = ({ prompt, onPromptChange, settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof ScaffolderSettings>(key: K, value: ScaffolderSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="animate-fade-in-scale space-y-6">
            <div>
                <Label htmlFor="scaffolder-prompt">Project Description</Label>
                <textarea
                    id="scaffolder-prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="Describe the project, tech stack, target runtime, and any constraints..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>

            <fieldset className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="script-language">Script Language</Label>
                    <select id="script-language" value={settings.language} onChange={e => handleSettingChange('language', e.target.value as ScriptLanguage)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="python">Python</option>
                        <option value="bash">Bash</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="template">Template</Label>
                    <select id="template" value={settings.template} onChange={e => handleSettingChange('template', e.target.value as ProjectTemplate)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="api">API</option>
                        <option value="cli">CLI</option>
                        <option value="service">Service</option>
                        <option value="library">Library</option>
                        <option value="web">Web App</option>
                        <option value="pipeline">Data Pipeline</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="package-manager">Package Manager</Label>
                    <select id="package-manager" value={settings.packageManager} onChange={e => handleSettingChange('packageManager', e.target.value as PackageManager)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="pip">pip/uv</option>
                        <option value="npm">npm/pnpm</option>
                        <option value="cargo">cargo</option>
                        <option value="go">go</option>
                        <option value="none">none</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="license">License</Label>
                    <select id="license" value={settings.license} onChange={e => handleSettingChange('license', e.target.value as License)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="mit">MIT</option>
                        <option value="apache">Apache-2.0</option>
                        <option value="unlicense">Unlicense</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
            </fieldset>
            
            <fieldset className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="depth">Prompt Depth</Label>
                    <input type="number" id="depth" value={settings.depth} onChange={e => handleSettingChange('depth', parseInt(e.target.value, 10))} min="1" max="3" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <Label htmlFor="criticRounds">Critic Rounds</Label>
                    <input type="number" id="criticRounds" value={settings.criticRounds} onChange={e => handleSettingChange('criticRounds', parseInt(e.target.value, 10))} min="0" max="2" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
            </fieldset>

            <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-2">Enforced Constraints</legend>
                <div className="bg-secondary p-3 rounded-lg text-xs text-slate-400 space-y-1">
                    <p><span className="font-semibold text-slate-300">Architecture:</span> Hybrid-Clean (Locked)</p>
                    <p><span className="font-semibold text-slate-300">File Size:</span> &le; 500 LOC per file (Locked)</p>
                    <p><span className="font-semibold text-slate-300">Dependencies:</span> No outer-to-inner direct dependencies (Locked)</p>
                </div>
            </fieldset>
        </div>
    );
};