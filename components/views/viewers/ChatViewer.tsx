

import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../types';
import { UserIcon } from '../../icons/UserIcon';
import { SparklesIcon } from '../../icons/SparklesIcon';
import { CopyIcon } from '../../icons/CopyIcon';
import { CheckCircleIcon } from '../../icons/CheckCircleIcon';
import { ChevronRightIcon } from '../../icons/ChevronRightIcon';
import { ProcessingIcon } from '../../icons/ProcessingIcon';
import { enhanceCodeBlocks } from '../../../utils/uiUtils';


declare var marked: any;

interface ChatViewerProps {
  history: ChatMessage[];
  isStreaming: boolean;
}

const ThinkingIndicator = () => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(intervalId);
  }, []);

  // Use min-w and text-left to prevent layout shift as dots are added
  return (
    <span className="inline-block min-w-[1.5rem] text-left font-mono text-xl leading-none text-text-secondary animate-pulse">
      {dots}
    </span>
  );
};


export const ChatViewer: React.FC<ChatViewerProps> = ({ history, isStreaming }) => {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedThinkingIndex, setCopiedThinkingIndex] = useState<number | null>(null);
    const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});

    useEffect(() => {
        // Render markdown for new/updated messages
        history.forEach((msg, index) => {
            if (msg.role === 'model') {
                const msgRef = messageRefs.current.get(index);
                if (msgRef) {
                    try {
                        const content = msg.parts.map(p => 'text' in p ? p.text : '').join('');
                         if (content.trim()) {
                            msgRef.innerHTML = marked.parse(content);
                            enhanceCodeBlocks(msgRef);
                        } else {
                            msgRef.innerHTML = ''; // Clear it if content is empty
                        }
                    } catch(e) {
                        console.error("Markdown parsing error", e);
                        msgRef.innerText = msg.parts.map(p => 'text' in p ? p.text : '').join('');
                    }
                }
            }
        });
        
        // Auto-scroll to the bottom
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history, isStreaming]);
    
    useEffect(() => {
        setExpandedThinking(prev => {
            const preserved: Record<number, boolean> = {};
            history.forEach((message, index) => {
                if (prev[index]) {
                    preserved[index] = true;
                }
            });
            const lastIndex = history.length - 1;
            if (lastIndex >= 0) {
                const lastMessage = history[lastIndex];
                if (lastMessage.role === 'model' && lastMessage.thinking && lastMessage.thinking.length > 0) {
                    preserved[lastIndex] = true;
                }
            }
            return preserved;
        });
    }, [history]);

    const toggleThinking = (index: number) => {
        setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleCopy = (message: ChatMessage, index: number) => {
        const contentToCopy = message.parts.map(part => {
            if ('text' in part) {
                return part.text;
            }
            if ('inlineData' in part) {
                return `[Attached File: ${part.inlineData.mimeType}]`;
            }
            return '';
        }).join('\n').trim();

        if (contentToCopy) {
            navigator.clipboard.writeText(contentToCopy).then(() => {
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const handleCopyThinking = (segments: ChatMessage['thinking'], index: number) => {
        if (!segments || segments.length === 0) {
            return;
        }
        const contentToCopy = segments
            .map((segment) => {
                const label = segment.label ? `${segment.label}:` : '';
                return [label, segment.text].filter(Boolean).join('\n');
            })
            .filter(Boolean)
            .join('\n\n')
            .trim();

        if (!contentToCopy) {
            return;
        }

        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopiedThinkingIndex(index);
            setTimeout(() => setCopiedThinkingIndex(null), 2000);
        }).catch(err => {
            console.error('Failed to copy thinking: ', err);
        });
    };


    return (
        <div
            ref={chatContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 rounded-lg"
        >
            {history.map((message, index) => {
                const isLastMessage = index === history.length - 1;
                const modelContent = message.role === 'model'
                    ? message.parts.map(p => 'text' in p ? p.text : '').join('')
                    : '';
                const isModelThinking = isStreaming && isLastMessage && message.role === 'model' && modelContent.trim() === '';
                const isUserMessage = message.role === 'user';
                const messageAlignmentClass = isUserMessage ? 'justify-end mr-11' : 'justify-start ml-11';
                const thinkingSegments = Array.isArray(message.thinking)
                    ? message.thinking.filter(segment => segment && segment.text && segment.text.trim() !== '')
                    : [];
                const hasThinkingSegments = thinkingSegments.length > 0;
                const isThinkingExpanded = !!expandedThinking[index];
                const showActiveSpinner = isStreaming && isLastMessage && message.role === 'model';
                const shouldShowThinkingPanel = message.role === 'model' && (hasThinkingSegments || showActiveSpinner);

                return (
                    <div key={index} className="group">
                        {shouldShowThinkingPanel && (
                            <div className={`mb-2 px-3 flex ${messageAlignmentClass}`}>
                                <div className="w-full max-w-xl space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleThinking(index)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border-color/60 transition-colors ${isThinkingExpanded ? 'bg-muted/40 text-text-primary' : 'bg-muted/20 text-muted-foreground hover:text-text-primary'} disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:text-muted-foreground`}
                                        aria-expanded={hasThinkingSegments ? isThinkingExpanded : false}
                                        disabled={!hasThinkingSegments}
                                    >
                                        <span className={`transition-transform duration-200 ${isThinkingExpanded ? 'rotate-90' : ''}`}>
                                            <ChevronRightIcon className="w-4 h-4" />
                                        </span>
                                        <span className="flex items-center gap-2">
                                            {showActiveSpinner ? (
                                                <ProcessingIcon className="w-4 h-4 text-primary" />
                                            ) : (
                                                <SparklesIcon className="w-4 h-4 text-primary" />
                                            )}
                                            <span className="font-medium">Model thinking</span>
                                        </span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {hasThinkingSegments
                                                ? thinkingSegments.length > 1
                                                    ? `${thinkingSegments.length} steps`
                                                    : '1 step'
                                                : 'Streaming...'}
                                        </span>
                                    </button>
                                    {hasThinkingSegments && isThinkingExpanded && (
                                        <div className="space-y-3 rounded-lg border border-border-color/60 bg-background/80 p-3 shadow-inner">
                                            {thinkingSegments.map((segment, segIndex) => (
                                                <div key={`${index}-thinking-${segIndex}`} className="space-y-2">
                                                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                                                        <span>{segment.label || `Step ${segIndex + 1}`}</span>
                                                        <span className="font-mono text-[10px] text-muted-foreground/70">#{segIndex + 1}</span>
                                                    </div>
                                                    <div className="rounded-md border border-border-color/40 bg-surface/70 p-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                                        {segment.text}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-1">
                                                {copiedThinkingIndex === index ? (
                                                    <div className="flex items-center gap-1 text-xs text-green-400">
                                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                                        <span>Copied thinking!</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCopyThinking(thinkingSegments, index)}
                                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-text-primary transition-colors"
                                                        aria-label="Copy model thinking"
                                                    >
                                                        <CopyIcon className="w-3.5 h-3.5" />
                                                        <span>Copy thinking</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className={`flex items-start gap-3 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                            {message.role === 'model' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                            )}
                            
                            <div className={`max-w-xl p-3 rounded-lg shadow ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background text-text-primary'}`}>
                                {message.role === 'model' ? (
                                    <>
                                        {isModelThinking && <ThinkingIndicator />}
                                        <div 
                                            className="prose prose-base prose-invert max-w-none" 
                                            ref={el => {
                                                if (el) {
                                                    messageRefs.current.set(index, el);
                                                } else {
                                                    messageRefs.current.delete(index);
                                                }
                                            }}
                                        >
                                            {/* Content is rendered via useEffect */}
                                        </div>
                                    </>
                                ) : (
                                    <div className="whitespace-pre-wrap text-base">
                                        {message.parts.map((part, partIndex) => {
                                            if ('text' in part) {
                                                return <p key={partIndex} className="mb-2 last:mb-0">{part.text}</p>;
                                            }
                                            return <p key={partIndex} className="text-xs italic text-muted-foreground">[File content provided]</p>;
                                        })}
                                    </div>
                                )}
                            </div>

                            {message.role === 'user' && (
                                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                        <div className={`mt-1.5 px-3 flex ${messageAlignmentClass}`}>
                            {copiedIndex === index ? (
                                <div className="flex items-center gap-1 text-xs text-green-400">
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    <span>Copied!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleCopy(message, index)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    aria-label="Copy message to clipboard"
                                >
                                    <CopyIcon className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
             {history.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                    <SparklesIcon className="w-12 h-12 mb-4" />
                    <h2 className="text-xl font-semibold text-text-primary">LLM Chat</h2>
                    <p>Start a conversation by typing a message below.</p>
                </div>
            )}
        </div>
    );
};