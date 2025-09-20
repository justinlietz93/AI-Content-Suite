

import React, { useRef, FormEvent } from 'react';
import type { ChatMessage } from '../../types';
import { ChatViewer } from '../views/viewers/ChatViewer';
import { SendIcon } from '../icons/SendIcon';
import { PaperclipIcon } from '../icons/PaperclipIcon';
import { CogIcon } from '../icons/CogIcon';
import { XCircleIcon } from '../icons/XCircleIcon';

export interface ChatInterfaceProps {
    history: ChatMessage[];
    isStreaming: boolean;
    chatInput: string;
    onChatInputChange: (input: string) => void;
    chatFiles: File[] | null;
    onChatFilesChange: (files: File[] | null) => void;
    onSubmit: (e?: FormEvent<HTMLFormElement>) => void;
    canSubmit: boolean;
    onOpenSettings: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    history, isStreaming,
    chatInput, onChatInputChange,
    chatFiles, onChatFilesChange,
    onSubmit, canSubmit, onOpenSettings
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = React.useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onChatFilesChange([...(chatFiles || []), ...Array.from(e.dataTransfer.files)]);
        }
    };
    const handlePaperclipClick = () => { fileInputRef.current?.click(); };
    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onChatFilesChange([...(chatFiles || []), ...Array.from(event.target.files!)]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const handleRemoveChatFile = (fileToRemove: File) => {
        onChatFilesChange(chatFiles ? chatFiles.filter(file => file !== fileToRemove) : null);
    };

    return (
        <div
            className={`relative animate-fade-in-scale flex flex-col h-[75vh] transition-all duration-300 rounded-lg ${isDraggingOver ? 'ring-4 ring-primary ring-offset-4 ring-offset-surface' : ''}`}
            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        >
            {isDraggingOver && (
                <div className="absolute inset-0 bg-primary/20 rounded-lg pointer-events-none flex items-center justify-center z-10">
                    <div className="text-center text-primary font-bold text-2xl p-8 bg-surface/80 rounded-lg">
                        Drop files to attach
                    </div>
                </div>
            )}

            <ChatViewer history={history} isStreaming={isStreaming} />

            {chatFiles && chatFiles.length > 0 && (
                <div className="mt-2 px-1 flex items-center gap-2 overflow-x-auto pb-2">
                    {chatFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex-shrink-0 flex items-center gap-2 bg-muted text-xs text-text-primary rounded-full py-1 pl-3 pr-2">
                            <span className="truncate max-w-xs">{file.name}</span>
                            <button onClick={() => handleRemoveChatFile(file)} className="text-muted-foreground hover:text-text-primary" aria-label={`Remove ${file.name}`}>
                                <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={onSubmit} className="mt-2 flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileInputChange} className="hidden" multiple accept=".txt,.md,text/plain,text/markdown,image/png,image/jpeg,image/webp,application/pdf,.js,.ts,.jsx,.tsx,.py,.html,.css,.json,.xml,.yaml,.yml" />
                <button type="button" onClick={handlePaperclipClick} aria-label="Attach files" className="p-2.5 bg-secondary text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface h-full">
                    <PaperclipIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={onOpenSettings} aria-label="Chat settings" className="p-2.5 bg-secondary text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface h-full">
                    <CogIcon className="w-5 h-5" />
                </button>
                <textarea
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (canSubmit) {
                                onSubmit();
                            }
                        }
                    }}
                    placeholder="Type your message or drop files here..."
                    className="flex-grow w-full px-3 py-2 bg-input border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-text-primary placeholder-text-secondary text-sm resize-none"
                    rows={1}
                    disabled={isStreaming}
                />
                <button type="submit" disabled={!canSubmit} className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface h-full">
                    <SendIcon className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
