
import React from 'react';
import type { AgentDesignerSettings, AgentProvider, ExecutionTrigger } from '../types';

interface AgentDesignerControlsProps {
  settings: AgentDesignerSettings;
  onSettingsChange: (settings: AgentDesignerSettings) => void;
}

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className }) => (
    <label htmlFor={htmlFor} className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>{children}</label>
);

export const AgentDesignerControls: React.FC<AgentDesignerControlsProps> = ({ settings, onSettingsChange }) => {
    
    const handleSettingChange = <K extends keyof AgentDesignerSettings>(key: K, value: AgentDesignerSettings[K]) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const handleCapabilityChange = (key: keyof AgentDesignerSettings['capabilities'], value: boolean) => {
        onSettingsChange({
            ...settings,
            capabilities: { ...settings.capabilities, [key]: value }
        });
    };

    return (
        <div className="animate-fade-in-scale space-y-6">
            <div>
                <Label htmlFor="agent-goal">High-Level Goal</Label>
                <textarea
                    id="agent-goal"
                    rows={4}
                    value={settings.goal}
                    onChange={(e) => handleSettingChange('goal', e.target.value)}
                    placeholder="Describe the overall mission for your agent system. e.g., 'Research a topic online and write a summary report'."
                    className="w-full px-3 py-2 bg-slate-900 border border-border-color rounded-md shadow-sm focus:ring-primary focus:border-primary text-text-primary placeholder-slate-500 text-sm"
                />
            </div>

            <fieldset className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="agent-provider">Agent Provider</Label>
                    <select id="agent-provider" value={settings.provider} onChange={e => handleSettingChange('provider', e.target.value as AgentProvider)} className="w-full px-3 py-2 bg-slate-700 border-border-color rounded-md text-sm">
                        <option value="gemini">Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="execution-trigger">Execution Trigger</Label>
                    <select id="execution-trigger" value={settings.trigger} onChange={e => handleSettingChange('trigger', e.target.value as ExecutionTrigger)} className="w-full px-3 py-2 bg-slate-700 border-border-color rounded-md text-sm">
                        <option value="manual">Manual</option>
                        <option value="eventDriven">Event-Driven</option>
                        <option value="scheduled">Scheduled</option>
                    </select>
                </div>
            </fieldset>

            <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-2">Core Capabilities (Tools)</legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 bg-slate-700/50 p-3 rounded-lg">
                    {Object.keys(settings.capabilities).map((key) => {
                         const capKey = key as keyof typeof settings.capabilities;
                         const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                         return (
                            <div key={key} className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id={`cap-${key}`} 
                                    checked={settings.capabilities[capKey]} 
                                    onChange={e => handleCapabilityChange(capKey, e.target.checked)} 
                                    className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-primary focus:ring-primary" 
                                />
                                <Label htmlFor={`cap-${key}`} className="mb-0 text-sm text-text-primary">{label}</Label>
                            </div>
                         );
                    })}
                </div>
            </fieldset>
        </div>
    );
};
