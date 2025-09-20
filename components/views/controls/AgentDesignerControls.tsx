
import React from 'react';
import type { AgentDesignerSettings, AgentProvider, ExecutionTrigger, AgentSystemType } from '../../../types';

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

    type CapabilityKey = keyof AgentDesignerSettings['capabilities'];

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
                    className="w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm"
                />
            </div>

            <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-2">System Type</legend>
                <div className="flex items-center space-x-2 bg-secondary rounded-lg p-1" role="radiogroup">
                  {(['singleAgent', 'multiAgent'] as AgentSystemType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => handleSettingChange('systemType', type)}
                      role="radio"
                      aria-checked={settings.systemType === type}
                      className={`flex-1 py-1.5 text-sm rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary ${
                        settings.systemType === type
                          ? 'bg-primary text-primary-foreground font-semibold shadow'
                          : 'text-text-secondary hover:bg-muted'
                      }`}
                    >
                      {type === 'singleAgent' ? 'Single Agent' : 'Multi-Agent'}
                    </button>
                  ))}
                </div>
                 <p className="mt-1 text-xs text-text-secondary">
                    {settings.systemType === 'singleAgent'
                        ? "Design one specialized agent with a fine-tuning plan."
                        : "Design a collaborative system of multiple agents."}
                </p>
            </fieldset>

            <fieldset className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="agent-provider">Agent Provider</Label>
                    <select id="agent-provider" value={settings.provider} onChange={e => handleSettingChange('provider', e.target.value as AgentProvider)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="gemini">Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="execution-trigger">Execution Trigger</Label>
                    <select id="execution-trigger" value={settings.trigger} onChange={e => handleSettingChange('trigger', e.target.value as ExecutionTrigger)} className="w-full px-3 py-2 bg-input border border-border-color rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="manual">Manual</option>
                        <option value="eventDriven">Event-Driven</option>
                        <option value="scheduled">Scheduled</option>
                    </select>
                </div>
            </fieldset>

            <fieldset>
                <legend className="block text-xs font-medium text-text-secondary mb-2">Core Capabilities (Tools)</legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 bg-secondary p-3 rounded-lg">
                    {(Object.entries(settings.capabilities) as [CapabilityKey, boolean][]).map(([capKey, enabled]) => {
                         const label = capKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                         return (
                            <div key={capKey} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id={`cap-${capKey}`}
                                    checked={enabled}
                                    onChange={e => handleCapabilityChange(capKey, e.target.checked)}
                                    className="h-4 w-4 rounded bg-input border-border-color text-primary focus:ring-2 focus:ring-ring"
                                />
                                <Label htmlFor={`cap-${capKey}`} className="mb-0 text-sm text-text-primary">{label}</Label>
                            </div>
                         );
                    })}
                </div>
            </fieldset>
        </div>
    );
};