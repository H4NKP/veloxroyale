import { useEffect, useRef, useState } from 'react';
import { Card, cn } from '@/components/ui/core';
import { Terminal, MessageSquare, Activity, Cpu } from 'lucide-react';

export interface ConsoleProps {
    logs: string[];
    className?: string;
    embedded?: boolean;
    variant?: 'default' | 'tabs';
}

export function Console({ logs, className, embedded = false, variant = 'default' }: ConsoleProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'interaction' | 'neural'>('interaction');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, activeTab]);

    // Filtering Logic
    const filteredLogs = variant === 'tabs' && activeTab === 'interaction'
        ? logs.filter(log =>
            log.includes('[Incoming]') ||
            log.includes('[AI]: Replying') ||
            log.includes('[Outgoing]')
        )
        : logs;

    const renderLog = (log: string, i: number) => {
        // Simple chat styling for interaction tab
        if (variant === 'tabs' && activeTab === 'interaction') {
            const isUser = log.includes('[Incoming]');
            const isAi = log.includes('[AI]') || log.includes('[Outgoing]');
            const text = log.replace(/\[.*?\]: /, '').replace(/^'|'$/g, ''); // Clean up tags/quotes

            return (
                <div key={i} className={cn(
                    "flex gap-3 mb-3 animate-in fade-in slide-in-from-bottom-1 duration-300",
                    isUser ? "justify-end" : "justify-start"
                )}>
                    <div className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isUser
                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-sm" // WhatsApp Green-ish
                            : "bg-[#202c33] text-[#d1d7db] rounded-tl-sm" // WhatsApp Dark Gray
                    )}>
                        <p className="whitespace-pre-wrap break-words">{text}</p>
                        <span className="text-[10px] opacity-50 block text-right mt-1 font-sans">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            );
        }

        // Standard terminal styling for Neural Engine
        return (
            <div key={i} className="break-all whitespace-pre-wrap flex gap-3 animate-in fade-in duration-300">
                <span className="text-white/20 select-none font-mono">{(i + 1).toString().padStart(3, '0')}</span>
                <div className="flex-1 font-mono">
                    <span className="text-blue-400/50 mr-2 select-none">[{new Date().toLocaleTimeString()}]</span>
                    <span className={cn(
                        log.includes("ERROR") ? "text-red-400" :
                            log.includes("CRITICAL") ? "text-red-500 font-bold" :
                                log.includes("WARN") ? "text-yellow-400" :
                                    log.includes("[System]") ? "text-blue-300" :
                                        log.includes("[AI]") ? "text-purple-300" : "text-gray-300"
                    )}>{log}</span>
                </div>
            </div>
        );
    };

    const isChatMode = variant === 'tabs' && activeTab === 'interaction';

    if (embedded || variant === 'tabs') {
        return (
            <div className={cn("flex flex-col h-[500px] overflow-hidden bg-transparent", className)}>
                {/* Tabs Header */}
                {variant === 'tabs' && (
                    <div className="flex items-center px-2 pt-2 bg-[#161b22] border-b border-white/5 gap-1">
                        <button
                            onClick={() => setActiveTab('interaction')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold uppercase tracking-wide transition-all",
                                activeTab === 'interaction'
                                    ? "bg-[#0d1117] text-white border-t-2 border-pteroblue"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <MessageSquare size={14} /> System Interaction
                        </button>
                        <button
                            onClick={() => setActiveTab('neural')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold uppercase tracking-wide transition-all",
                                activeTab === 'neural'
                                    ? "bg-[#0d1117] text-white border-t-2 border-purple-500"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Cpu size={14} /> Neural Engine
                        </button>
                    </div>
                )}

                <div
                    ref={scrollRef}
                    className={cn(
                        "flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar",
                        isChatMode ? "bg-[#0b141a]" : "bg-[#0d1117] text-pterotext/80 font-mono text-xs leading-relaxed"
                    )}
                    style={isChatMode ? { backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' } : {}}
                >
                    {logs.length === 0 && (
                        <div className="text-pterosub/50 italic opacity-50 text-center mt-10">Waiting for output...</div>
                    )}

                    {filteredLogs.map(renderLog)}

                    {!isChatMode && <div className="animate-pulse text-blue-500 font-bold mt-2">_</div>}
                </div>
            </div>
        );
    }

    return (
        <Card className={cn(
            "bg-[#0f111a] border-pteroborder flex flex-col h-[500px] p-0 overflow-hidden font-mono text-sm",
            className
        )}>
            <div className="flex items-center gap-2 px-4 py-2 bg-pterocard border-b border-pteroborder text-pterosub select-none">
                <Terminal size={14} />
                <span className="text-xs font-semibold">CONTAINER / SYSTEM_LOGS</span>
                <div className="ml-auto flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs text-green-500">ONLINE</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 text-pterotext/80">
                {logs.length === 0 && (
                    <div className="text-pterosub/50 italic">Waiting for logs...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap">
                        <span className="text-blue-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </div>
                ))}
                <div className="animate-pulse">_</div>
            </div>

            <div className="p-2 bg-pterocard border-t border-pteroborder">
                <input
                    type="text"
                    placeholder="System Output Read-Only"
                    className="w-full bg-transparent text-pterotext placeholder-pterosub/50 focus:outline-none px-2 py-1"
                    disabled
                />
            </div>
        </Card>
    );
}
