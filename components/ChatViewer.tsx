

import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';
import { UserIcon } from './icons/UserIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { enhanceCodeBlocks } from '../utils/uiUtils';


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


    return (
        <div ref={chatContainerRef} className="flex-grow h-full max-h-[65vh] overflow-y-auto p-4 space-y-4 rounded-lg">
            {history.map((message, index) => {
                const isLastMessage = index === history.length - 1;
                const modelContent = message.role === 'model'
                    ? message.parts.map(p => 'text' in p ? p.text : '').join('')
                    : '';
                const isModelThinking = isStreaming && isLastMessage && message.role === 'model' && modelContent.trim() === '';

                return (
                    <div key={index} className="group">
                        <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                                            className="prose prose-sm prose-invert max-w-none" 
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
                                    <div className="whitespace-pre-wrap text-sm">
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
                         <div className={`mt-1.5 px-3 flex ${message.role === 'user' ? 'justify-end mr-11' : 'justify-start ml-11'}`}>
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