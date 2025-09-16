


import React from 'react';
import type { ReasoningSettings, Persona, EvidenceMode, ReasoningStyle } from '../types';

interface ReasoningControlsProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  settings: ReasoningSettings;
  onSettingsChange: (settings: ReasoningSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const ReasoningControls: React.FC<ReasoningControlsProps> = ({ prompt, onPromptChange, settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof ReasoningSettings>(key: K, value: ReasoningSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const handleSafetyChange = (key: keyof ReasoningSettings['safety'], value: boolean) => {
        onSettingsChange({
            ...settings,
            safety: { ...settings.safety, [key]: value }
        });
    };

    return (
        <div className="animate-fade-in-scale space-y-6">
            <div>
                <Label htmlFor="reasoning-prompt">Prompt</Label>
                <textarea
                    id="reasoning-prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="Enter the high-level goal for the reasoning engine..."
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>

            <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <legend className="sr-only">Core Parameters</legend>
                <div>
                    <Label htmlFor="depth">Depth</Label>
                    <input type="number" id="depth" value={settings.depth} onChange={e => handleSettingChange('depth', parseInt(e.target.value, 10))} min="1" max="10" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <Label htmlFor="breadth">Breadth</Label>
                    <input type="number" id="breadth" value={settings.breadth} onChange={e => handleSettingChange('breadth', parseInt(e.target.value, 10))} min="1" max="10" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <Label htmlFor="criticRounds">Critic Rounds</Label>
                    <input type="number" id="criticRounds" value={settings.criticRounds} onChange={e => handleSettingChange('criticRounds', parseInt(e.target.value, 10))} min="0" max="3" className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                    <Label htmlFor="evidence">Evidence</Label>
                    <select id="evidence" value={settings.evidenceMode} onChange={e => handleSettingChange('evidenceMode', e.target.value as EvidenceMode)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="none">None</option>
                        <option value="rag">RAG</option>
                        <option value="web">Web</option>
                    </select>
                </div>
            </fieldset>

            <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-1">Persona Bias</legend>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="persona-bias" className="sr-only">Persona Bias</Label>
                        <select id="persona-bias" value={settings.persona} onChange={e => handleSettingChange('persona', e.target.value as Persona)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                            <option value="none">None</option>
                            <option value="physicist">Physicist</option>
                            <option value="software_engineer">Software Engineer</option>
                            <option value="project_manager">Project Manager</option>
                            <option value="strategist">Strategist</option>
                            <option value="data_scientist">Data Scientist</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                     {settings.persona === 'custom' && (
                        <div className="col-span-2">
                             <Label htmlFor="custom-persona" className="sr-only">Custom Persona Directive</Label>
                            <textarea id="custom-persona" rows={2} value={settings.customPersonaDirective} onChange={e => handleSettingChange('customPersonaDirective', e.target.value)} placeholder="Enter custom persona directive..." className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                    )}
                 </div>
            </fieldset>
            
             <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="temperature">Temperature</Label>
                    <input type="range" id="temperature" value={settings.temperature} onChange={e => handleSettingChange('temperature', parseFloat(e.target.value))} min="0" max="1" step="0.1" className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring" />
                 </div>
                <div>
                     <Label htmlFor="seed">Seed</Label>
                    <input type="number" id="seed" value={settings.seed} onChange={e => handleSettingChange('seed', parseInt(e.target.value, 10))} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
             </fieldset>

             <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-2">Safety</legend>
                <div className="flex items-center justify-around bg-secondary p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="pii-check" checked={settings.safety.pii} onChange={e => handleSafetyChange('pii', e.target.checked)} className="h-4 w-4 rounded bg-input border-border-color text-primary focus:ring-2 focus:ring-ring" />
                        <Label htmlFor="pii-check" className="mb-0">PII</Label>
                    </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" id="claim-check" checked={settings.safety.claimCheck} onChange={e => handleSafetyChange('claimCheck', e.target.checked)} className="h-4 w-4 rounded bg-input border-border-color text-primary focus:ring-2 focus:ring-ring" />
                        <Label htmlFor="claim-check" className="mb-0">Claim-check</Label>
                    </div>
                     <div className="flex items-center gap-2">
                        <input type="checkbox" id="jailbreak-check" checked={settings.safety.jailbreak} onChange={e => handleSafetyChange('jailbreak', e.target.checked)} className="h-4 w-4 rounded bg-input border-border-color text-primary focus:ring-2 focus:ring-ring" />
                        <Label htmlFor="jailbreak-check" className="mb-0">Jailbreak</Label>
                    </div>
                </div>
            </fieldset>
        </div>
    );
};